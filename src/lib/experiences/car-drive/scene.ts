import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import type { ExperienceState, SetupContext, TickContext } from "../types";

// ── Terrain constants ──
const WORLD_SIZE = 400;
const NCELLS = 48;
const NVERTS = NCELLS + 1;

// ── Car constants ──
const CHASSIS_HW = 1.0;   // half-width
const CHASSIS_HH = 0.35;  // half-height
const CHASSIS_HL = 2.0;   // half-length
const WHEEL_RADIUS = 0.38;
const WHEEL_HALF_WIDTH = 0.2;
const MAX_ENGINE_FORCE = 2800;
const MAX_STEERING = 0.42;
const BRAKE_FORCE = 120;

// ── Input handler ──

class CarInput {
  forward = false;
  backward = false;
  left = false;
  right = false;
  brake = false;
  private _reset = false;

  private readonly _down: (e: KeyboardEvent) => void;
  private readonly _up: (e: KeyboardEvent) => void;

  constructor() {
    this._down = (e) => this.handle(e, true);
    this._up = (e) => this.handle(e, false);
    window.addEventListener("keydown", this._down);
    window.addEventListener("keyup", this._up);
  }

  private handle(e: KeyboardEvent, pressed: boolean) {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    switch (e.code) {
      case "ArrowUp":   case "KeyW": this.forward  = pressed; break;
      case "ArrowDown": case "KeyS": this.backward = pressed; break;
      case "ArrowLeft": case "KeyA": this.left     = pressed; break;
      case "ArrowRight":case "KeyD": this.right    = pressed; break;
      case "Space": this.brake = pressed; if (pressed) e.preventDefault(); break;
      case "KeyR":  if (pressed) this._reset = true; break;
    }
  }

  consumeReset(): boolean {
    const v = this._reset;
    this._reset = false;
    return v;
  }

  dispose() {
    window.removeEventListener("keydown", this._down);
    window.removeEventListener("keyup", this._up);
  }
}

// ── State ──

export interface CarDriveState extends ExperienceState {
  rapierWorld: RAPIER.World;
  chassisBody: RAPIER.RigidBody;
  vehicle: RAPIER.DynamicRayCastVehicleController;
  chassisMesh: THREE.Group;
  wheelMeshes: THREE.Mesh[];
  terrainGeo: THREE.BufferGeometry;
  terrainMat: THREE.Material;
  terrainMesh: THREE.Mesh;
  lights: THREE.Object3D[];
  input: CarInput;
  currentSteering: number;
  engineForce: number;
  cameraDistance: number;
  cameraHeight: number;
  spawnY: number;
}

// ── Helpers ──

function buildTerrainGeometry(worldRuntime: { sampleHeight(x: number, z: number): number } | null): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, NCELLS, NCELLS);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, worldRuntime ? worldRuntime.sampleHeight(pos.getX(i), pos.getZ(i)) : 0);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function createChassisVisual(): THREE.Group {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xe63946 });
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(CHASSIS_HW * 2, CHASSIS_HH * 2, CHASSIS_HL * 2),
    bodyMat,
  );
  body.castShadow = true;
  group.add(body);

  const roofMat = new THREE.MeshLambertMaterial({ color: 0xc1121f });
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(CHASSIS_HW * 1.5, CHASSIS_HH * 1.4, CHASSIS_HL * 0.85),
    roofMat,
  );
  roof.position.set(0, CHASSIS_HH * 1.7, -CHASSIS_HL * 0.08);
  roof.castShadow = true;
  group.add(roof);

  return group;
}

function createWheelMesh(geo: THREE.BufferGeometry, mat: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  return m;
}

// ── Lifecycle ──

export async function setup(ctx: SetupContext): Promise<CarDriveState> {
  await RAPIER.init();

  const rapierWorld = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  rapierWorld.timestep = 1 / 60;

  const runtime = ctx.worldRuntime ?? null;

  // Terrain visual
  const terrainGeo = buildTerrainGeometry(runtime);
  const terrainMat = new THREE.MeshLambertMaterial({ color: 0x5a8a4a, side: THREE.FrontSide });
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  ctx.scene.add(terrainMesh);

  // Terrain physics — same vertex/index data as the visual mesh
  const groundBody = rapierWorld.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  const verts = new Float32Array(terrainGeo.attributes.position.array);
  const idx   = new Uint32Array(terrainGeo.index!.array);
  rapierWorld.createCollider(RAPIER.ColliderDesc.trimesh(verts, idx), groundBody);

  // Spawn height — sample center of world + offset
  const spawnY = (runtime ? runtime.sampleHeight(0, 0) : 0) + 3;

  // Chassis rigid body
  const chassisDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(0, spawnY, 0)
    .setLinearDamping(0.05)
    .setAngularDamping(0.8);
  const chassisBody = rapierWorld.createRigidBody(chassisDesc);
  rapierWorld.createCollider(
    RAPIER.ColliderDesc.cuboid(CHASSIS_HW, CHASSIS_HH, CHASSIS_HL).setMass(1200),
    chassisBody,
  );

  // Vehicle controller
  const vehicle = rapierWorld.createVehicleController(chassisBody);

  const down = { x: 0, y: -1, z: 0 };
  const axle = { x: -1, y: 0, z: 0 };
  const suspRest = 0.45;

  // Wheel order: FL, FR, RL, RR
  const wheelOffsets = [
    { x:  CHASSIS_HW + 0.1, y: -CHASSIS_HH * 0.5, z:  CHASSIS_HL * 0.62 },
    { x: -(CHASSIS_HW + 0.1), y: -CHASSIS_HH * 0.5, z:  CHASSIS_HL * 0.62 },
    { x:  CHASSIS_HW + 0.1, y: -CHASSIS_HH * 0.5, z: -CHASSIS_HL * 0.62 },
    { x: -(CHASSIS_HW + 0.1), y: -CHASSIS_HH * 0.5, z: -CHASSIS_HL * 0.62 },
  ];

  for (const wp of wheelOffsets) {
    vehicle.addWheel(wp, down, axle, suspRest, WHEEL_RADIUS);
  }
  for (let i = 0; i < 4; i++) {
    vehicle.setWheelSuspensionStiffness(i, 22);
    vehicle.setWheelMaxSuspensionTravel(i, 0.4);
    vehicle.setWheelFrictionSlip(i, 2.5);
  }

  // Chassis visual
  const chassisMesh = createChassisVisual();
  ctx.scene.add(chassisMesh);

  // Wheel visuals
  const wheelGeo = new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, WHEEL_HALF_WIDTH * 2, 20);
  wheelGeo.rotateZ(Math.PI / 2); // align cylinder axis with X (wheel axle)
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const wheelMeshes: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const wm = createWheelMesh(wheelGeo, wheelMat);
    ctx.scene.add(wm);
    wheelMeshes.push(wm);
  }

  // Lighting
  const sun = new THREE.DirectionalLight("#fff8e0", 1.4);
  sun.position.set(80, 150, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 800;
  const sc = sun.shadow.camera as THREE.OrthographicCamera;
  sc.left = sc.bottom = -250;
  sc.right = sc.top = 250;
  ctx.scene.add(sun);

  const ambient = new THREE.AmbientLight("#6080b0", 0.7);
  ctx.scene.add(ambient);

  const input = new CarInput();

  return {
    rapierWorld,
    chassisBody,
    vehicle,
    chassisMesh,
    wheelMeshes,
    terrainGeo,
    terrainMat,
    terrainMesh,
    lights: [sun, ambient],
    input,
    currentSteering: 0,
    engineForce: MAX_ENGINE_FORCE,
    cameraDistance: 12,
    cameraHeight: 5,
    spawnY,
  };
}

export function tick(
  state: ExperienceState,
  ctx: TickContext,
): { state: ExperienceState } {
  const s = state as CarDriveState;
  const dt = Math.min(ctx.delta, 0.05);

  // Reset
  if (s.input.consumeReset()) {
    s.chassisBody.setTranslation({ x: 0, y: s.spawnY, z: 0 }, true);
    s.chassisBody.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
    s.chassisBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    s.chassisBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
    s.currentSteering = 0;
  }

  // Forces
  let engineForce = 0;
  let targetSteering = 0;
  let brakeForce = 0;

  if (s.input.forward)  engineForce =  s.engineForce;
  if (s.input.backward) engineForce = -s.engineForce * 0.5;
  if (s.input.left)     targetSteering =  MAX_STEERING;
  if (s.input.right)    targetSteering = -MAX_STEERING;
  if (s.input.brake)    brakeForce = BRAKE_FORCE;

  s.currentSteering = THREE.MathUtils.lerp(s.currentSteering, targetSteering, Math.min(1, dt * 5));

  const v = s.vehicle;
  // Rear-wheel drive
  v.setWheelEngineForce(2, engineForce);
  v.setWheelEngineForce(3, engineForce);
  v.setWheelEngineForce(0, 0);
  v.setWheelEngineForce(1, 0);
  // Front-wheel steering
  v.setWheelSteering(0, s.currentSteering);
  v.setWheelSteering(1, s.currentSteering);
  // Brakes on all wheels
  v.setWheelBrake(0, brakeForce);
  v.setWheelBrake(1, brakeForce);
  v.setWheelBrake(2, brakeForce);
  v.setWheelBrake(3, brakeForce);

  // Physics step
  v.updateVehicle(dt);
  s.rapierWorld.step();

  // Sync chassis visual
  const cp = s.chassisBody.translation();
  const cr = s.chassisBody.rotation();
  s.chassisMesh.position.set(cp.x, cp.y, cp.z);
  s.chassisMesh.quaternion.set(cr.x, cr.y, cr.z, cr.w);

  // Sync wheel visuals
  const cr2 = s.chassisBody.rotation();
  const chassisQuat = new THREE.Quaternion(cr2.x, cr2.y, cr2.z, cr2.w);
  const worldDown = new THREE.Vector3(0, -1, 0).applyQuaternion(chassisQuat);
  for (let i = 0; i < 4; i++) {
    const hardPoint = v.wheelHardPoint(i);
    if (!hardPoint) continue;
    const suspLength = v.wheelSuspensionLength(i) ?? 0.5;
    const steering   = v.wheelSteering(i) ?? 0;
    const rotation   = v.wheelRotation(i) ?? 0;
    s.wheelMeshes[i].position
      .set(hardPoint.x, hardPoint.y, hardPoint.z)
      .addScaledVector(worldDown, suspLength);
    const steerQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), steering);
    const rollQ  = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), rotation);
    s.wheelMeshes[i].quaternion.copy(chassisQuat).multiply(steerQ).multiply(rollQ);
  }

  // Chase camera — follows behind and above car
  const carPos = s.chassisMesh.position.clone();
  const behind = new THREE.Vector3(0, 0, -s.cameraDistance);
  behind.applyQuaternion(s.chassisMesh.quaternion);
  const targetCamPos = carPos.clone()
    .add(behind)
    .setY(carPos.y + s.cameraHeight + behind.y);
  ctx.camera.position.lerp(targetCamPos, Math.min(1, dt * 4));
  ctx.camera.lookAt(carPos.clone().add(new THREE.Vector3(0, 0.8, 0)));

  return { state: s };
}

export function dispose(state: ExperienceState, scene: THREE.Scene): void {
  const s = state as CarDriveState;

  s.input.dispose();

  scene.remove(s.chassisMesh);
  scene.remove(s.terrainMesh);
  for (const wm of s.wheelMeshes) scene.remove(wm);
  for (const l of s.lights) scene.remove(l);

  s.terrainGeo.dispose();
  s.terrainMat.dispose();

  s.chassisMesh.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (child.material instanceof THREE.Material) child.material.dispose();
    }
  });

  if (s.wheelMeshes.length > 0) {
    const wm = s.wheelMeshes[0];
    if (wm instanceof THREE.Mesh) {
      wm.geometry.dispose();
      if (wm.material instanceof THREE.Material) wm.material.dispose();
    }
  }
}
