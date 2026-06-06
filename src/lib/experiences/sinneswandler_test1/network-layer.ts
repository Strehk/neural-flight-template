import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { seededRandom2D } from "$lib/three/random";
import type { BatBiomeId } from "./config";
import type { BatWorld } from "./world";

const BIRD_MODEL_URL = "/sinneswandler_test1/models/bird/bird_BS.glb";
const BIRD_WORLD_SIZE = 2.88;
const BIRD_GLOW_OUTER_SCALE = 17;
const BIRD_GLOW_MID_SCALE = 9.5;
const BIRD_GLOW_CORE_SCALE = 4.4;
const CELL_SIZE = 24;
const VIEW_DISTANCE = 260;
const MAX_NODES = 520;
const MAX_CONNECTIONS = 1600;
const CONNECTION_DISTANCE = 112;
const CONNECTIONS_PER_NODE = 4;

// Fewer cells become flocks, but each flock can be much larger.
const CLUSTER_CHANCE = 0.16;
const AERIAL_CLUSTER_CHANCE = 0.45;

// Flock type distribution (checked against seed after aerial is decided):
//   LOW_CHANCE  → near-ground swarm, small, chaotic
//   LARGE_CHANCE → high-altitude, many birds
//   else         → normal aerial flock
const LOW_FLOCK_CHANCE   = 0.30;
const LARGE_FLOCK_CHANCE = 0.28;

// Size per type
const NORMAL_SIZE_MIN = 8;
const NORMAL_SIZE_MAX = 14;
const LARGE_SIZE_MIN  = 22;
const LARGE_SIZE_MAX  = 40;
const LOW_SIZE_MIN    = 3;
const LOW_SIZE_MAX    = 8;

const GROUND_SIZE_MIN = 3;
const GROUND_SIZE_MAX = 6;
const GROUND_CLUSTER_RADIUS = 6.5;

const AERIAL_ALT_MIN = 18;
const AERIAL_ALT_MAX = 42;
const LOW_ALT_MIN    = 1.5;
const LOW_ALT_MAX    = 6.0;

// Boids physics — shared ranges, per-flock weights stored on AerialFlock
const BOID_MAX_FORCE = 18;          // units/second²
const BOID_SEP_RANGE = 8;
const BOID_ALI_RANGE = 22;
const BOID_COH_RANGE = 28;
const BOID_ALT_SPRING = 2.2;
const BOID_BOUNDARY_RADIUS = 85;
const BOID_BOUNDARY_WEIGHT = 2.8;

const NETWORK_BIOMES = new Set<BatBiomeId>(["forest", "grassland", "snow"]);

const COLOR_SOLO = 0xff1a2e;
const COLOR_CORE = 0xff0022;
const COLOR_MEMBER = 0xff3344;

interface Boid {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
}

interface BirdInstance {
  object: THREE.Object3D;
  mixer: THREE.AnimationMixer | null;
}

interface AerialFlock {
  boids: Boid[];
  birds: BirdInstance[];
  homeX: number;
  homeZ: number;
  targetY: number;
  clusterId: number;
  maxSpeed: number;
  sepWeight: number;
  aliWeight: number;
  cohWeight: number;
  noiseStrength: number; // per-frame turbulence for low/ground flocks
}

interface NetworkNode {
  x: number;
  y: number;
  z: number;
  color: THREE.Color;
  clusterId: number;
  isAerial?: boolean;
}

function cellSeed(gx: number, gz: number): number {
  return gx * 83492791 + gz * 2654435761 + 1949;
}

// Reusable vectors to avoid allocation in the hot boids loop.
const _sep = new THREE.Vector3();
const _ali = new THREE.Vector3();
const _coh = new THREE.Vector3();
const _diff = new THREE.Vector3();
const _acc = new THREE.Vector3();
const _birdLookTarget = new THREE.Vector3();
const _birdBox = new THREE.Box3();
const _birdSize = new THREE.Vector3();
const _birdCenter = new THREE.Vector3();

function makeBirdMaterial(source: THREE.Material): THREE.Material {
  const sourceMap =
    (source as THREE.Material & { map?: THREE.Texture | null }).map ?? null;
  const material = new THREE.MeshBasicMaterial({
    map: sourceMap,
    color: sourceMap ? 0xffffff : 0x242018,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    depthTest: true,
    fog: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  material.userData.baseOpacity = 1;
  return material;
}

function createBirdGlowTexture(): THREE.CanvasTexture {
  const size = 96;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable for bird glow");

  const gradient = ctx.createRadialGradient(
    size * 0.5,
    size * 0.5,
    0,
    size * 0.5,
    size * 0.5,
    size * 0.5,
  );
  gradient.addColorStop(0, "rgba(255,176,64,0.8)");
  gradient.addColorStop(0.3, "rgba(255,126,28,0.45)");
  gradient.addColorStop(0.66, "rgba(255,94,22,0.16)");
  gradient.addColorStop(1, "rgba(255,94,22,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createBirdGlowSprite(
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
  sprite.name = "network-bird-orange-glow";
  sprite.renderOrder = 6;
  sprite.scale.set(scale, scale, 1);
  (sprite.material as THREE.SpriteMaterial).userData.baseOpacity = opacity;
  return sprite;
}

function addBirdGlow(object: THREE.Object3D, texture: THREE.Texture): void {
  object.add(
    createBirdGlowSprite(texture, BIRD_GLOW_OUTER_SCALE, 0.78, 0xff7a1f),
    createBirdGlowSprite(texture, BIRD_GLOW_MID_SCALE, 0.9, 0xff9b35),
    createBirdGlowSprite(texture, BIRD_GLOW_CORE_SCALE, 1, 0xffc36b),
  );
}

function prepareBirdTemplate(root: THREE.Object3D): THREE.Object3D {
  const model = cloneSkeleton(root);
  model.updateMatrixWorld(true);
  _birdBox.setFromObject(model);
  _birdBox.getCenter(_birdCenter);
  _birdBox.getSize(_birdSize);
  const maxDimension = Math.max(_birdSize.x, _birdSize.y, _birdSize.z);

  model.position.sub(_birdCenter);
  model.renderOrder = 7;
  model.traverse((child: THREE.Object3D) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.renderOrder = 7;
    child.frustumCulled = false;
    child.material = Array.isArray(child.material)
      ? child.material.map(makeBirdMaterial)
      : makeBirdMaterial(child.material);
  });

  const wrapper = new THREE.Group();
  wrapper.name = "network-bird-template";
  wrapper.renderOrder = 7;
  wrapper.add(model);
  if (maxDimension > 0) {
    wrapper.scale.setScalar(BIRD_WORLD_SIZE / maxDimension);
  }
  return wrapper;
}

function createBirdMixer(
  object: THREE.Object3D,
  clips: THREE.AnimationClip[],
): THREE.AnimationMixer | null {
  if (clips.length === 0) return null;
  const mixer = new THREE.AnimationMixer(object);
  const clip = clips[0];
  const action = mixer.clipAction(clip);
  action.reset();
  action.setLoop(THREE.LoopRepeat, Infinity);
  action.timeScale = 0.82 + Math.random() * 0.34;
  action.play();
  mixer.setTime(Math.random() * clip.duration);
  return mixer;
}

export class NetworkLayer {
  readonly group = new THREE.Group();

  private readonly world: BatWorld;
  private readonly linePositions: THREE.BufferAttribute;
  private readonly lineColors: THREE.BufferAttribute;
  private readonly nodePositions: THREE.BufferAttribute;
  private readonly nodeColors: THREE.BufferAttribute;
  private readonly birdGroup = new THREE.Group();
  private readonly birdGlowTexture: THREE.CanvasTexture;
  private readonly lines: THREE.LineSegments;
  private readonly nodes: THREE.Points;
  private readonly aerialFlocks = new Map<string, AerialFlock>();
  private birdTemplate: THREE.Object3D | null = null;
  private birdClips: THREE.AnimationClip[] = [];
  private factor = 0;

  constructor(world: BatWorld) {
    this.world = world;
    this.birdGlowTexture = createBirdGlowTexture();

    const lineGeo = new THREE.BufferGeometry();
    this.linePositions = new THREE.BufferAttribute(
      new Float32Array(MAX_CONNECTIONS * 2 * 3), 3,
    ).setUsage(THREE.DynamicDrawUsage);
    this.lineColors = new THREE.BufferAttribute(
      new Float32Array(MAX_CONNECTIONS * 2 * 3), 3,
    ).setUsage(THREE.DynamicDrawUsage);
    lineGeo.setAttribute("position", this.linePositions);
    lineGeo.setAttribute("color", this.lineColors);
    lineGeo.setDrawRange(0, 0);

    const lineMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.NormalBlending,
      toneMapped: false,
      fog: false,
    });
    this.lines = new THREE.LineSegments(lineGeo, lineMat);
    this.lines.frustumCulled = false;
    this.lines.renderOrder = 4;

    const nodeGeo = new THREE.BufferGeometry();
    this.nodePositions = new THREE.BufferAttribute(
      new Float32Array(MAX_NODES * 3), 3,
    ).setUsage(THREE.DynamicDrawUsage);
    this.nodeColors = new THREE.BufferAttribute(
      new Float32Array(MAX_NODES * 3), 3,
    ).setUsage(THREE.DynamicDrawUsage);
    nodeGeo.setAttribute("position", this.nodePositions);
    nodeGeo.setAttribute("color", this.nodeColors);
    nodeGeo.setDrawRange(0, 0);

    const nodeMat = new THREE.PointsMaterial({
      size: 0.625,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.NormalBlending,
      toneMapped: false,
      fog: false,
    });
    this.nodes = new THREE.Points(nodeGeo, nodeMat);
    this.nodes.frustumCulled = false;
    this.nodes.renderOrder = 5;

    this.birdGroup.name = "network-aerial-birds";
    this.birdGroup.renderOrder = 7;

    this.group.add(this.lines, this.nodes, this.birdGroup);
    this.loadBirdModel();
  }

  setFactor(factor: number): void {
    this.factor = THREE.MathUtils.clamp(factor, 0, 1);
    (this.lines.material as THREE.LineBasicMaterial).opacity = this.factor * 0.72;
    (this.nodes.material as THREE.PointsMaterial).opacity = this.factor * 0.88;
    this.group.visible = this.factor > 0.01;
    this.updateBirdOpacity();
  }

  tick(playerPos: THREE.Vector3, delta: number, elapsed: number): void {
    if (this.factor <= 0.01) return;
    this.maintainFlocks(playerPos, delta, elapsed);
    const nodes = this.collectNodes(playerPos, elapsed);
    this.writeNodes(nodes, elapsed);
    this.writeConnections(nodes, elapsed);
  }

  dispose(): void {
    this.lines.geometry.dispose();
    (this.lines.material as THREE.Material).dispose();
    this.nodes.geometry.dispose();
    (this.nodes.material as THREE.Material).dispose();
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    this.birdGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        geometries.add(child.geometry);
      }
      if (!(child instanceof THREE.Mesh || child instanceof THREE.Sprite)) return;
      const mats =
        child instanceof THREE.Mesh && Array.isArray(child.material)
          ? child.material
          : [child.material];
      for (const material of mats) materials.add(material);
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    this.birdGlowTexture.dispose();
    this.birdGroup.clear();
    this.aerialFlocks.clear();
  }

  private async loadBirdModel(): Promise<void> {
    const loader = new GLTFLoader();
    try {
      const gltf = await loader.loadAsync(BIRD_MODEL_URL);
      this.birdTemplate = prepareBirdTemplate(gltf.scene);
      this.birdClips = gltf.animations;
      for (const flock of this.aerialFlocks.values()) {
        this.ensureBirdInstances(flock);
      }
      this.updateBirdOpacity();
    } catch (error) {
      console.warn("[network-layer] Failed to load bird model.", error);
    }
  }

  private createBirdInstance(): BirdInstance | null {
    if (!this.birdTemplate) return null;
    const object = cloneSkeleton(this.birdTemplate);
    addBirdGlow(object, this.birdGlowTexture);
    object.visible = this.factor > 0.01;
    this.birdGroup.add(object);
    return {
      object,
      mixer: createBirdMixer(object, this.birdClips),
    };
  }

  private ensureBirdInstances(flock: AerialFlock): void {
    while (flock.birds.length < flock.boids.length) {
      const bird = this.createBirdInstance();
      if (!bird) return;
      flock.birds.push(bird);
    }
  }

  private removeFlockBirds(flock: AerialFlock): void {
    for (const bird of flock.birds) {
      bird.object.removeFromParent();
      bird.mixer?.stopAllAction();
    }
    flock.birds.length = 0;
  }

  private updateBirdOpacity(): void {
    this.birdGroup.visible = this.factor > 0.01 && !!this.birdTemplate;
    this.birdGroup.traverse((child) => {
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
        material.opacity = baseOpacity * this.factor;
        material.needsUpdate = true;
      }
    });
  }

  // ── Flock lifecycle ───────────────────────────────────────────────────────

  private maintainFlocks(playerPos: THREE.Vector3, delta: number, elapsed: number): void {
    const halfCells = Math.ceil(VIEW_DISTANCE / CELL_SIZE);
    const centerGX = Math.round(playerPos.x / CELL_SIZE);
    const centerGZ = Math.round(playerPos.z / CELL_SIZE);
    const activeCellKeys = new Set<string>();

    for (let gx = centerGX - halfCells; gx <= centerGX + halfCells; gx++) {
      for (let gz = centerGZ - halfCells; gz <= centerGZ + halfCells; gz++) {
        const seed = cellSeed(gx, gz);
        if (seededRandom2D(seed, 1) > 0.82) continue;
        if (seededRandom2D(seed, 10) >= CLUSTER_CHANCE) continue;
        if (seededRandom2D(seed, 15) >= AERIAL_CLUSTER_CHANCE) continue;

        const jitterX = (seededRandom2D(seed, 2) - 0.5) * CELL_SIZE * 0.72;
        const jitterZ = (seededRandom2D(seed, 3) - 0.5) * CELL_SIZE * 0.72;
        const cx = gx * CELL_SIZE + jitterX;
        const cz = gz * CELL_SIZE + jitterZ;
        const dx = cx - playerPos.x;
        const dz = cz - playerPos.z;
        if (dx * dx + dz * dz > VIEW_DISTANCE * VIEW_DISTANCE) continue;

        const biome = this.world.sampleBiome(cx, cz);
        if (!NETWORK_BIOMES.has(biome)) continue;

        const key = `${gx},${gz}`;
        activeCellKeys.add(key);
        if (!this.aerialFlocks.has(key)) {
          this.aerialFlocks.set(key, this.createFlock(seed, cx, cz));
        }
      }
    }

    for (const key of this.aerialFlocks.keys()) {
      if (!activeCellKeys.has(key)) {
        const flock = this.aerialFlocks.get(key);
        if (flock) this.removeFlockBirds(flock);
        this.aerialFlocks.delete(key);
      }
    }

    const clampedDelta = Math.min(delta, 0.05); // cap for large frames
    for (const flock of this.aerialFlocks.values()) {
      this.ensureBirdInstances(flock);
      this.stepBoids(flock, clampedDelta);
      this.updateBirdInstances(flock, clampedDelta, elapsed);
    }
  }

  private createFlock(seed: number, cx: number, cz: number): AerialFlock {
    const typeRoll = seededRandom2D(seed, 23);
    const isLow   = typeRoll < LOW_FLOCK_CHANCE;
    const isLarge = !isLow && typeRoll < LOW_FLOCK_CHANCE + LARGE_FLOCK_CHANCE;

    const groundY = this.world.sampleHeight(cx, cz);
    const altRange = isLow
      ? { min: LOW_ALT_MIN,    max: LOW_ALT_MAX }
      : { min: AERIAL_ALT_MIN, max: AERIAL_ALT_MAX };
    const targetY = groundY + altRange.min + seededRandom2D(seed, 22) * (altRange.max - altRange.min);

    const sizeRange = isLow ? { min: LOW_SIZE_MIN, max: LOW_SIZE_MAX }
      : isLarge             ? { min: LARGE_SIZE_MIN, max: LARGE_SIZE_MAX }
      :                       { min: NORMAL_SIZE_MIN, max: NORMAL_SIZE_MAX };
    const count = sizeRange.min +
      Math.floor(seededRandom2D(seed, 11) * (sizeRange.max - sizeRange.min + 1));

    // Low flocks: chaotic, slower, less aligned. High flocks: organised, faster.
    const maxSpeed      = isLow ? 4  : isLarge ? 22 : 18;
    const sepWeight     = isLow ? 2.4 : 1.6;
    const aliWeight     = isLow ? 0.3 : 1.0;
    const cohWeight     = isLow ? 0.7 : 1.0;
    const noiseStrength = isLow ? 9   : 0;

    const heading = seededRandom2D(seed, 17) * Math.PI * 2;
    const initialSpeed = maxSpeed * 0.65;
    const spreadMax = isLow ? 6 : 10;

    const boids: Boid[] = [];
    for (let ci = 0; ci < count; ci++) {
      const spreadAngle = seededRandom2D(seed, 60 + ci) * Math.PI * 2;
      const spreadR = seededRandom2D(seed, 70 + ci) * spreadMax;
      const velAngle = heading + (seededRandom2D(seed, 90 + ci) - 0.5) * (isLow ? 2.0 : 0.7);
      boids.push({
        position: new THREE.Vector3(
          cx + Math.cos(spreadAngle) * spreadR,
          targetY + (seededRandom2D(seed, 80 + ci) - 0.5) * 4,
          cz + Math.sin(spreadAngle) * spreadR,
        ),
        velocity: new THREE.Vector3(
          Math.cos(velAngle) * initialSpeed,
          (seededRandom2D(seed, 100 + ci) - 0.5) * 1.5,
          Math.sin(velAngle) * initialSpeed,
        ),
      });
    }

    return {
      boids,
      birds: [],
      homeX: cx,
      homeZ: cz,
      targetY,
      clusterId: (seed >>> 0) || 1,
      maxSpeed,
      sepWeight,
      aliWeight,
      cohWeight,
      noiseStrength,
    };
  }

  // ── Boids simulation ──────────────────────────────────────────────────────

  private stepBoids(flock: AerialFlock, delta: number): void {
    const boids = flock.boids;
    const maxForce = BOID_MAX_FORCE * delta;
    const { maxSpeed, sepWeight, aliWeight, cohWeight, noiseStrength } = flock;

    for (let i = 0; i < boids.length; i++) {
      const b = boids[i];
      _sep.set(0, 0, 0);
      _ali.set(0, 0, 0);
      _coh.set(0, 0, 0);
      let sepN = 0, aliN = 0, cohN = 0;

      for (let j = 0; j < boids.length; j++) {
        if (i === j) continue;
        const o = boids[j];
        const dist = b.position.distanceTo(o.position);

        if (dist < BOID_SEP_RANGE && dist > 0) {
          _diff.subVectors(b.position, o.position).divideScalar(dist);
          _sep.add(_diff);
          sepN++;
        }
        if (dist < BOID_ALI_RANGE) { _ali.add(o.velocity); aliN++; }
        if (dist < BOID_COH_RANGE) { _coh.add(o.position); cohN++; }
      }

      _acc.set(0, 0, 0);

      if (sepN > 0) {
        _sep.divideScalar(sepN).normalize().multiplyScalar(maxSpeed)
          .sub(b.velocity).clampLength(0, maxForce).multiplyScalar(sepWeight);
        _acc.add(_sep);
      }
      if (aliN > 0) {
        _ali.divideScalar(aliN).normalize().multiplyScalar(maxSpeed)
          .sub(b.velocity).clampLength(0, maxForce).multiplyScalar(aliWeight);
        _acc.add(_ali);
      }
      if (cohN > 0) {
        _coh.divideScalar(cohN)
          .sub(b.position).normalize().multiplyScalar(maxSpeed)
          .sub(b.velocity).clampLength(0, maxForce).multiplyScalar(cohWeight);
        _acc.add(_coh);
      }

      // Random turbulence for low/ground flocks (gives chaotic murmuration feel).
      if (noiseStrength > 0) {
        _acc.x += (Math.random() - 0.5) * noiseStrength * delta;
        _acc.z += (Math.random() - 0.5) * noiseStrength * delta;
        _acc.y += (Math.random() - 0.5) * noiseStrength * 0.25 * delta;
      }

      // Soft altitude spring.
      _acc.y -= (b.position.y - flock.targetY) * BOID_ALT_SPRING * delta;

      // Horizontal boundary return force.
      const hx = b.position.x - flock.homeX;
      const hz = b.position.z - flock.homeZ;
      const hDist = Math.sqrt(hx * hx + hz * hz);
      if (hDist > BOID_BOUNDARY_RADIUS) {
        const pull = BOID_BOUNDARY_WEIGHT * ((hDist - BOID_BOUNDARY_RADIUS) / BOID_BOUNDARY_RADIUS);
        _acc.x -= (hx / hDist) * pull;
        _acc.z -= (hz / hDist) * pull;
      }

      b.velocity.add(_acc).clampLength(0, maxSpeed);
      b.position.addScaledVector(b.velocity, delta);
    }
  }

  private updateBirdInstances(flock: AerialFlock, delta: number, elapsed: number): void {
    for (let i = 0; i < flock.boids.length; i++) {
      const bird = flock.birds[i];
      if (!bird) continue;
      const boid = flock.boids[i];
      bird.mixer?.update(delta);
      bird.object.position.copy(boid.position);
      _birdLookTarget.copy(boid.position).add(boid.velocity);
      bird.object.lookAt(_birdLookTarget);
      bird.object.rotateY(-Math.PI * 0.5);
      bird.object.rotateZ(Math.sin(elapsed * 3.6 + i) * 0.08);
      bird.object.visible = this.factor > 0.01;
    }
  }

  // ── Node collection ───────────────────────────────────────────────────────

  private collectNodes(playerPos: THREE.Vector3, elapsed: number): NetworkNode[] {
    const nodes: NetworkNode[] = [];

    // Aerial flocks: read from live boid positions.
    for (const flock of this.aerialFlocks.values()) {
      for (let ci = 0; ci < flock.boids.length; ci++) {
        const b = flock.boids[ci];
        nodes.push({
          x: b.position.x,
          y: b.position.y,
          z: b.position.z,
          color: new THREE.Color(ci === 0 ? COLOR_CORE : COLOR_MEMBER),
          clusterId: flock.clusterId,
          isAerial: true,
        });
      }
    }

    // Ground clusters + solo nodes: seeded positions.
    const halfCells = Math.ceil(VIEW_DISTANCE / CELL_SIZE);
    const centerGX = Math.round(playerPos.x / CELL_SIZE);
    const centerGZ = Math.round(playerPos.z / CELL_SIZE);

    for (let gx = centerGX - halfCells; gx <= centerGX + halfCells; gx++) {
      for (let gz = centerGZ - halfCells; gz <= centerGZ + halfCells; gz++) {
        const seed = cellSeed(gx, gz);
        if (seededRandom2D(seed, 1) > 0.82) continue;

        const jitterX = (seededRandom2D(seed, 2) - 0.5) * CELL_SIZE * 0.72;
        const jitterZ = (seededRandom2D(seed, 3) - 0.5) * CELL_SIZE * 0.72;
        const cx = gx * CELL_SIZE + jitterX;
        const cz = gz * CELL_SIZE + jitterZ;
        const dx = cx - playerPos.x;
        const dz = cz - playerPos.z;
        if (dx * dx + dz * dz > VIEW_DISTANCE * VIEW_DISTANCE) continue;

        const biome = this.world.sampleBiome(cx, cz);
        if (!NETWORK_BIOMES.has(biome)) continue;

        const isCluster = seededRandom2D(seed, 10) < CLUSTER_CHANCE;

        if (!isCluster) {
          const wave = Math.sin(elapsed * 0.55 + seededRandom2D(seed, 4) * Math.PI * 2);
          const y = this.world.sampleHeight(cx, cz) + 1.2 + wave * 0.35;
          nodes.push({ x: cx, y, z: cz, color: new THREE.Color(COLOR_SOLO), clusterId: 0 });
          continue;
        }

        // Skip aerial clusters — handled above via aerialFlocks map.
        if (seededRandom2D(seed, 15) < AERIAL_CLUSTER_CHANCE) continue;

        // Ground cluster.
        const clusterId = (seed >>> 0) || 1;
        const clusterSize = GROUND_SIZE_MIN +
          Math.floor(seededRandom2D(seed, 11) * (GROUND_SIZE_MAX - GROUND_SIZE_MIN + 1));

        for (let ci = 0; ci < clusterSize; ci++) {
          let nx = cx, nz = cz;
          if (ci > 0) {
            const angle = seededRandom2D(seed, 12 + ci * 2) * Math.PI * 2;
            const r = seededRandom2D(seed, 13 + ci * 2) * GROUND_CLUSTER_RADIUS;
            nx = cx + Math.cos(angle) * r;
            nz = cz + Math.sin(angle) * r;
          }
          const wave = Math.sin(elapsed * 0.55 + seededRandom2D(seed, 4 + ci) * Math.PI * 2);
          const y = this.world.sampleHeight(nx, nz) + 1.2 + wave * 0.35;
          nodes.push({
            x: nx, y, z: nz,
            color: new THREE.Color(ci === 0 ? COLOR_CORE : COLOR_MEMBER),
            clusterId,
          });
        }
      }
    }

    nodes.sort((a, b) => {
      const adx = a.x - playerPos.x, adz = a.z - playerPos.z;
      const bdx = b.x - playerPos.x, bdz = b.z - playerPos.z;
      return adx * adx + adz * adz - (bdx * bdx + bdz * bdz);
    });
    return nodes.slice(0, MAX_NODES);
  }

  // ── Geometry write ────────────────────────────────────────────────────────

  private writeNodes(nodes: NetworkNode[], elapsed: number): void {
    const pos = this.nodePositions.array as Float32Array;
    const col = this.nodeColors.array as Float32Array;
    let visibleNodeCount = 0;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.isAerial) continue;
      const pulse = 0.74 + 0.26 * Math.sin(elapsed * 1.8 + i * 0.37);
      pos[visibleNodeCount * 3] = node.x;
      pos[visibleNodeCount * 3 + 1] = node.y;
      pos[visibleNodeCount * 3 + 2] = node.z;
      col[visibleNodeCount * 3] = node.color.r * pulse;
      col[visibleNodeCount * 3 + 1] = node.color.g * pulse;
      col[visibleNodeCount * 3 + 2] = node.color.b * pulse;
      visibleNodeCount++;
    }
    this.nodePositions.needsUpdate = true;
    this.nodeColors.needsUpdate = true;
    this.nodes.geometry.setDrawRange(0, visibleNodeCount);
  }

  private writeConnections(nodes: NetworkNode[], elapsed: number): void {
    const pos = this.linePositions.array as Float32Array;
    const col = this.lineColors.array as Float32Array;
    let connectionCount = 0;

    for (let i = 0; i < nodes.length && connectionCount < MAX_CONNECTIONS; i++) {
      const a = nodes[i];
      const intra: { index: number; distanceSq: number }[] = [];

      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const sameGroup =
          (a.clusterId !== 0 && a.clusterId === b.clusterId) ||
          (a.clusterId === 0 && b.clusterId === 0);
        if (!sameGroup) continue;

        const ddx = a.x - b.x, ddy = a.y - b.y, ddz = a.z - b.z;
        const distanceSq = ddx * ddx + ddy * ddy + ddz * ddz;
        if (distanceSq >= CONNECTION_DISTANCE * CONNECTION_DISTANCE) continue;

        intra.push({ index: j, distanceSq });
      }

      intra.sort((x, y) => x.distanceSq - y.distanceSq);
      const maxIntra = Math.min(CONNECTIONS_PER_NODE, intra.length);
      for (let ci = 0; ci < maxIntra && connectionCount < MAX_CONNECTIONS; ci++) {
        this.emitConnection(pos, col, a, nodes[intra[ci].index], elapsed, i, connectionCount);
        connectionCount++;
      }
    }

    this.linePositions.needsUpdate = true;
    this.lineColors.needsUpdate = true;
    this.lines.geometry.setDrawRange(0, connectionCount * 2);
  }

  private emitConnection(
    pos: Float32Array, col: Float32Array,
    a: NetworkNode, b: NetworkNode,
    elapsed: number, i: number, connectionCount: number,
  ): void {
    const base = connectionCount * 6;
    const colorPulse = 0.66 + 0.34 * Math.sin(elapsed * 1.25 + i * 0.41);
    pos[base] = a.x;     pos[base + 1] = a.y;     pos[base + 2] = a.z;
    pos[base + 3] = b.x; pos[base + 4] = b.y;     pos[base + 5] = b.z;
    col[base] = a.color.r * colorPulse;
    col[base + 1] = a.color.g * colorPulse;
    col[base + 2] = a.color.b * colorPulse;
    col[base + 3] = b.color.r * colorPulse;
    col[base + 4] = b.color.g * colorPulse;
    col[base + 5] = b.color.b * colorPulse;
  }
}
