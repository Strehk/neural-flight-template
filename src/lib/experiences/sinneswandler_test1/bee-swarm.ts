import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

const BEE_MODEL_URL = "/sinneswandler_test1/models/bee/bee.glb";
const BEE_COUNT = 54;
const BEE_WORLD_SIZE = 1.9;
const SPAWN_RADIUS = 260;
const DESPAWN_RADIUS = 320;
const MIN_SPAWN_RADIUS = 18;
const HEIGHT_SPREAD = 12;
const FLIGHT_SPEED_MIN = 1.6;
const FLIGHT_SPEED_MAX = 5.2;
const COURSE_SMOOTHING = 1.25;
const HEIGHT_SMOOTHING = 0.85;
const BEE_GLOW_OUTER_SCALE = 18;
const BEE_GLOW_MID_SCALE = 10;
const BEE_GLOW_CORE_SCALE = 4.8;

interface BeeAgent {
  object: THREE.Object3D;
  mixer: THREE.AnimationMixer | null;
  velocity: THREE.Vector3;
  targetVelocity: THREE.Vector3;
  heightOffset: number;
  targetHeightOffset: number;
  nextCourseChangeAt: number;
  wobblePhase: number;
  wobbleSpeed: number;
}

const _position = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _box = new THREE.Box3();
const _size = new THREE.Vector3();
const _center = new THREE.Vector3();

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomSigned(minAbs: number, maxAbs: number): number {
  const value = randomRange(minAbs, maxAbs);
  return Math.random() < 0.5 ? -value : value;
}

function randomWorldOffset(target: THREE.Vector3): THREE.Vector3 {
  const angle = Math.random() * Math.PI * 2;
  const radius = randomRange(MIN_SPAWN_RADIUS, SPAWN_RADIUS);
  target.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
  return target;
}

function randomFlightVelocity(target: THREE.Vector3): THREE.Vector3 {
  target.set(
    randomSigned(FLIGHT_SPEED_MIN, FLIGHT_SPEED_MAX),
    randomRange(-0.45, 0.45),
    randomSigned(FLIGHT_SPEED_MIN, FLIGHT_SPEED_MAX),
  );
  target.multiplyScalar(0.72 + Math.random() * 0.56);
  return target;
}

function createGlowTexture(): THREE.CanvasTexture {
  const size = 96;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable for bee glow");

  const gradient = ctx.createRadialGradient(
    size * 0.5,
    size * 0.5,
    0,
    size * 0.5,
    size * 0.5,
    size * 0.5,
  );
  gradient.addColorStop(0, "rgba(255,238,118,0.82)");
  gradient.addColorStop(0.28, "rgba(255,218,68,0.46)");
  gradient.addColorStop(0.64, "rgba(255,190,36,0.18)");
  gradient.addColorStop(1, "rgba(255,206,54,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function makeVisibleMaterial(source: THREE.Material): THREE.Material {
  const sourceMap =
    (source as THREE.Material & { map?: THREE.Texture | null }).map ?? null;
  return new THREE.MeshBasicMaterial({
    map: sourceMap,
    color: sourceMap ? 0xffffff : 0xffd21f,
    depthWrite: false,
    depthTest: false,
    fog: false,
    side: THREE.DoubleSide,
    toneMapped: false,
    transparent: true,
  });
}

function prepareTemplate(root: THREE.Object3D): THREE.Object3D {
  const model = cloneSkeleton(root);
  model.updateMatrixWorld(true);
  _box.setFromObject(model);
  _box.getCenter(_center);
  _box.getSize(_size);
  const maxDimension = Math.max(_size.x, _size.y, _size.z);

  model.position.sub(_center);
  model.renderOrder = 80;
  model.traverse((child: THREE.Object3D) => {
    if (!(child instanceof THREE.Mesh)) return;

    child.renderOrder = 80;
    child.frustumCulled = false;
    child.material = Array.isArray(child.material)
      ? child.material.map(makeVisibleMaterial)
      : makeVisibleMaterial(child.material);
  });

  const wrapper = new THREE.Group();
  wrapper.name = "bee-model-template";
  wrapper.renderOrder = 80;
  wrapper.add(model);
  if (maxDimension > 0) {
    wrapper.scale.setScalar(BEE_WORLD_SIZE / maxDimension);
  }

  return wrapper;
}

function createBeeFallback(): THREE.Object3D {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({
    color: 0xf2c84b,
    depthTest: false,
    depthWrite: false,
    fog: false,
    toneMapped: false,
  });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), material);
  body.scale.set(1.55, 0.72, 0.72);
  group.add(body);
  group.scale.setScalar(BEE_WORLD_SIZE);
  return group;
}

function createGlowSprite(
  texture: THREE.Texture,
  scale: number,
  opacity: number,
  color: number,
): THREE.Sprite {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      depthTest: false,
      fog: false,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  sprite.name = "bee-soft-glow";
  sprite.renderOrder = 76;
  sprite.scale.set(scale, scale, 1);
  return sprite;
}

function addGlow(object: THREE.Object3D, texture: THREE.Texture): void {
  object.add(
    createGlowSprite(texture, BEE_GLOW_OUTER_SCALE, 0.85, 0xffc247),
    createGlowSprite(texture, BEE_GLOW_MID_SCALE, 0.95, 0xffd85c),
    createGlowSprite(texture, BEE_GLOW_CORE_SCALE, 1, 0xfff0a6),
  );
}

function cloneTemplate(
  template: THREE.Object3D,
  glowTexture: THREE.Texture,
): THREE.Object3D {
  const clone = cloneSkeleton(template);
  clone.renderOrder = 80;
  clone.traverse((child: THREE.Object3D) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.renderOrder = 80;
    child.frustumCulled = false;
  });
  addGlow(clone, glowTexture);
  return clone;
}

function createMixer(
  object: THREE.Object3D,
  clips: THREE.AnimationClip[],
): THREE.AnimationMixer | null {
  if (clips.length === 0) return null;

  const mixer = new THREE.AnimationMixer(object);
  const clip = clips[0];
  const action = mixer.clipAction(clip);
  action.reset();
  action.setLoop(THREE.LoopRepeat, Infinity);
  action.timeScale = randomRange(0.86, 1.18);
  action.play();
  mixer.setTime(Math.random() * clip.duration);
  return mixer;
}

export class BeeSwarm {
  readonly group = new THREE.Group();

  private readonly glowTexture: THREE.CanvasTexture;
  private readonly clips: THREE.AnimationClip[];
  private readonly bees: BeeAgent[] = [];
  private opacity = -1;
  private activeRatio = -1;

  static async load(): Promise<BeeSwarm> {
    const loader = new GLTFLoader();
    try {
      const gltf = await loader.loadAsync(BEE_MODEL_URL);
      return new BeeSwarm(prepareTemplate(gltf.scene), gltf.animations);
    } catch (error) {
      console.warn("[bee-swarm] Falling back to simple bee mesh.", error);
      return new BeeSwarm(createBeeFallback(), []);
    }
  }

  private constructor(template: THREE.Object3D, clips: THREE.AnimationClip[]) {
    this.glowTexture = createGlowTexture();
    this.clips = clips;
    this.group.name = "bee-world-swarm";
    this.group.renderOrder = 80;

    for (let i = 0; i < BEE_COUNT; i++) {
      const object = cloneTemplate(template, this.glowTexture);
      this.group.add(object);
      const agent: BeeAgent = {
        object,
        mixer: createMixer(object, this.clips),
        velocity: new THREE.Vector3(),
        targetVelocity: new THREE.Vector3(),
        heightOffset: randomRange(-HEIGHT_SPREAD, HEIGHT_SPREAD),
        targetHeightOffset: randomRange(-HEIGHT_SPREAD, HEIGHT_SPREAD),
        nextCourseChangeAt: 0,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleSpeed: randomRange(1.1, 3.4),
      };
      this.randomizeBee(agent, new THREE.Vector3(), true, 0);
      this.bees.push(agent);
    }

    this.setFactor(0);
  }

  setFactor(factor: number, activeRatio = 1): void {
    const nextOpacity = THREE.MathUtils.clamp(factor, 0, 1);
    const nextActiveRatio = THREE.MathUtils.clamp(activeRatio, 0, 1);
    if (
      Math.abs(nextOpacity - this.opacity) < 0.001 &&
      Math.abs(nextActiveRatio - this.activeRatio) < 0.001
    ) {
      return;
    }

    this.opacity = nextOpacity;
    this.activeRatio = nextActiveRatio;
    this.group.visible = this.opacity > 0.01;
    const activeCount =
      this.opacity > 0.01 ? Math.ceil(this.bees.length * this.activeRatio) : 0;
    for (let i = 0; i < this.bees.length; i++) {
      this.bees[i].object.visible = i < activeCount;
    }
    this.group.traverse((child) => {
      if (!(child instanceof THREE.Mesh || child instanceof THREE.Sprite)) return;
      const materials =
        child instanceof THREE.Mesh && Array.isArray(child.material)
          ? child.material
          : [child.material];
      for (const material of materials) {
        const baseOpacity =
          typeof material.userData.baseOpacity === "number"
            ? material.userData.baseOpacity
            : material.opacity;
        material.userData.baseOpacity = baseOpacity;
        material.transparent = this.opacity < 0.999;
        material.opacity = baseOpacity * this.opacity;
        material.needsUpdate = true;
      }
    });
  }

  tick(
    playerPos: THREE.Vector3,
    _camera: THREE.Camera,
    delta: number,
    elapsed: number,
  ): void {
    if (!this.group.visible) return;

    for (const bee of this.bees) {
      bee.mixer?.update(delta);
      if (elapsed >= bee.nextCourseChangeAt) {
        randomFlightVelocity(bee.targetVelocity);
        bee.targetHeightOffset = randomRange(-HEIGHT_SPREAD, HEIGHT_SPREAD);
        bee.nextCourseChangeAt = elapsed + randomRange(1.4, 4.2);
      }

      const courseBlend = 1 - Math.exp(-delta * COURSE_SMOOTHING);
      bee.velocity.lerp(bee.targetVelocity, courseBlend);
      bee.object.position.addScaledVector(bee.velocity, delta);
      bee.heightOffset = THREE.MathUtils.lerp(
        bee.heightOffset,
        bee.targetHeightOffset,
        1 - Math.exp(-delta * HEIGHT_SMOOTHING),
      );
      bee.object.position.y =
        playerPos.y +
        bee.heightOffset +
        Math.sin(elapsed * bee.wobbleSpeed + bee.wobblePhase) * 1.4;

      if (bee.object.position.distanceToSquared(playerPos) > DESPAWN_RADIUS * DESPAWN_RADIUS) {
        this.randomizeBee(bee, playerPos, false, elapsed);
      }

      _lookTarget.copy(bee.object.position).add(bee.velocity);
      bee.object.lookAt(_lookTarget);
      bee.object.rotateY(-Math.PI * 0.5);
      bee.object.rotateZ(Math.sin(elapsed * 9 + bee.wobblePhase) * 0.22);
    }
  }

  private randomizeBee(
    bee: BeeAgent,
    playerPos: THREE.Vector3,
    initial: boolean,
    elapsed: number,
  ): void {
    randomWorldOffset(_position);
    if (!initial) {
      _position.multiplyScalar(0.78 + Math.random() * 0.22);
    }
    bee.object.position.copy(playerPos).add(_position);
    bee.heightOffset = randomRange(-HEIGHT_SPREAD, HEIGHT_SPREAD);
    bee.targetHeightOffset = randomRange(-HEIGHT_SPREAD, HEIGHT_SPREAD);
    bee.object.position.y = playerPos.y + bee.heightOffset;

    randomFlightVelocity(bee.velocity);
    randomFlightVelocity(bee.targetVelocity);
    bee.nextCourseChangeAt = elapsed + randomRange(0.6, 3.2);
    bee.wobblePhase = Math.random() * Math.PI * 2;
    bee.wobbleSpeed = randomRange(1.1, 3.4);
  }

  dispose(): void {
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
      }
      if (!(child instanceof THREE.Mesh || child instanceof THREE.Sprite)) return;
      const materials =
        child instanceof THREE.Mesh && Array.isArray(child.material)
          ? child.material
          : [child.material];
      for (const material of materials) {
        material.dispose();
      }
    });
    this.glowTexture.dispose();
    this.group.clear();
    this.bees.length = 0;
  }
}
