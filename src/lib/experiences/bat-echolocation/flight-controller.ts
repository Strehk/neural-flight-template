import * as THREE from "three";
import { BAT_CAMERA, BAT_FLIGHT_DEFAULTS, BAT_SCENE } from "./config";

export class BatFlightController {
  readonly rig: THREE.Group;
  readonly camera: THREE.PerspectiveCamera;

  cruiseSpeed: number = BAT_FLIGHT_DEFAULTS.cruiseSpeed;
  boostSpeed: number = BAT_FLIGHT_DEFAULTS.boostSpeed;
  strafeSpeed: number = BAT_FLIGHT_DEFAULTS.strafeSpeed;
  climbSpeed: number = BAT_FLIGHT_DEFAULTS.climbSpeed;
  turnSpeed: number = BAT_FLIGHT_DEFAULTS.turnSpeed;
  lookSmoothing: number = BAT_FLIGHT_DEFAULTS.lookSmoothing;
  minAltitude: number = BAT_FLIGHT_DEFAULTS.minAltitude;
  liftAssist: number = BAT_FLIGHT_DEFAULTS.liftAssist;

  private targetPitch = 0;
  private targetRoll = 0;
  private currentPitch = 0;
  private currentRoll = 0;
  private yaw = 0;
  private accelerating = false;
  private braking = false;
  private readonly desiredVelocity = new THREE.Vector3();
  private readonly velocity = new THREE.Vector3();
  private readonly forward = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private elapsed = 0;

  constructor() {
    this.camera = new THREE.PerspectiveCamera(
      BAT_CAMERA.fov,
      1,
      BAT_CAMERA.near,
      BAT_CAMERA.far,
    );
    this.rig = new THREE.Group();
    this.rig.position.set(
      BAT_SCENE.spawn.x,
      BAT_SCENE.spawn.y,
      BAT_SCENE.spawn.z,
    );
    this.rig.add(this.camera);
  }

  setOrientation(pitch: number, roll: number): void {
    this.targetPitch = THREE.MathUtils.clamp(pitch, -65, 65);
    this.targetRoll = THREE.MathUtils.clamp(roll, -75, 75);
  }

  setSpeed(accelerate: boolean, brake: boolean): void {
    this.accelerating = accelerate;
    this.braking = brake;
  }

  tick(delta: number, sampleHeight: (x: number, z: number) => number): void {
    this.elapsed += delta;

    const alpha = 1 - Math.exp(-delta / Math.max(this.lookSmoothing, 0.01));
    this.currentPitch += (this.targetPitch - this.currentPitch) * alpha;
    this.currentRoll += (this.targetRoll - this.currentRoll) * alpha;

    const pitchRad = THREE.MathUtils.degToRad(this.currentPitch * 0.78);
    const bankRad = THREE.MathUtils.degToRad(this.currentRoll * 0.92);
    const forwardSpeed = this.braking
      ? -this.boostSpeed * 0.55
      : this.accelerating
        ? this.boostSpeed
        : this.cruiseSpeed;

    this.yaw -= bankRad * this.turnSpeed * delta * 0.8;

    this.forward.set(
      -Math.sin(this.yaw) * Math.cos(pitchRad),
      -Math.sin(pitchRad),
      -Math.cos(this.yaw) * Math.cos(pitchRad),
    );
    this.right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const strafeVelocity = Math.sin(bankRad) * this.strafeSpeed;
    const verticalVelocity =
      -Math.sin(pitchRad) * this.climbSpeed +
      Math.abs(Math.sin(bankRad)) * this.liftAssist;

    this.desiredVelocity
      .copy(this.forward)
      .multiplyScalar(forwardSpeed)
      .addScaledVector(this.right, strafeVelocity);
    this.desiredVelocity.y += verticalVelocity;

    const velocityBlend = 1 - Math.exp(-delta * 3.5);
    this.velocity.lerp(this.desiredVelocity, velocityBlend);
    this.rig.position.addScaledVector(this.velocity, delta);

    const minimumY =
      sampleHeight(this.rig.position.x, this.rig.position.z) + this.minAltitude;
    if (this.rig.position.y < minimumY) {
      this.rig.position.y = THREE.MathUtils.lerp(
        this.rig.position.y,
        minimumY,
        0.28,
      );
      if (this.velocity.y < 0) {
        this.velocity.y *= 0.15;
      }
    }

    this.camera.position.set(
      Math.sin(this.elapsed * 1.7) * 0.04,
      Math.sin(this.elapsed * 2.2) * 0.06,
      0,
    );
    this.rig.rotation.set(-pitchRad, this.yaw, -bankRad * 0.55, "YXZ");
  }
}
