import { createNoise2D } from "simplex-noise";
import * as THREE from "three";
import { seededRandom, seededRandom2D } from "$lib/three/random";
import {
  BAT_BIOME_COLORS,
  type BatBiomeId,
  BAT_FOG_DISTANCE,
  BAT_MOTH_DEFAULTS,
  BAT_SCENE,
  type BatWorldSettings,
} from "./config";
import {
  createInstancedRevealMaterial,
  createSharedEchoUniforms,
  createTerrainRevealMaterial,
  syncEchoUniforms,
  type EchoPulseRenderState,
  type SharedEchoUniforms,
} from "./shaders";

interface TerrainPointData {
  height: number;
  dominantBiome: BatBiomeId;
  forestWeight: number;
  grasslandWeight: number;
  mountainWeight: number;
  swampWeight: number;
  barrensWeight: number;
  basinWeight: number;
  cliffiness: number;
  treeCluster: number;
  grassCluster: number;
  rockCluster: number;
}

export type EchoSurfaceType = "terrain" | "tree" | "rock" | "grass" | "moth";

export interface EchoProbeHit {
  point: THREE.Vector3;
  distance: number;
  delay: number;
  pan: number;
  elevation: number;
  material: EchoSurfaceType;
  biome: BatBiomeId;
  density: number;
  ruggedness: number;
  reflectivity: number;
}

export interface EchoProbeProfile {
  hits: EchoProbeHit[];
  density: number;
  terrainVariance: number;
  nearWeight: number;
  midWeight: number;
  farWeight: number;
  terrainWeight: number;
  treeWeight: number;
  rockWeight: number;
  grassWeight: number;
  mothWeight: number;
}

export interface BatWorldFrameEvents {
  collectedMoths: THREE.Vector3[];
  activeMoths: number;
  nearestMothDistance: number | null;
}

interface MothRenderState {
  key: string;
  position: THREE.Vector3;
  distanceToPlayer: number;
  heading: number;
  bank: number;
  scale: number;
  biome: BatBiomeId;
  tint: number;
}

interface ActiveMothTarget {
  position: THREE.Vector3;
  biome: BatBiomeId;
}

interface WorldChunk {
  key: string;
  gridX: number;
  gridZ: number;
  terrain: THREE.Mesh;
  decorations: THREE.Group;
  dispose(): void;
}

const TERRAIN_BASE_COLOR = new THREE.Color("#9eb0cb");
const FOREST_COLOR = new THREE.Color(BAT_BIOME_COLORS.forest);
const GRASSLAND_COLOR = new THREE.Color(BAT_BIOME_COLORS.grassland);
const MOUNTAIN_COLOR = new THREE.Color(BAT_BIOME_COLORS.mountains);
const SWAMP_COLOR = new THREE.Color(BAT_BIOME_COLORS.swamp);
const BARRENS_COLOR = new THREE.Color(BAT_BIOME_COLORS.barrens);
const TREE_TRUNK_COLOR = new THREE.Color("#9b9789");
const PINE_CROWN_COLOR = new THREE.Color("#b8fff0");
const BROAD_CROWN_COLOR = new THREE.Color("#d8f4d4");
const DEAD_TREE_COLOR = new THREE.Color("#ddd4be");
const ROCK_COLOR = new THREE.Color("#d8e0eb");
const ROCK_HIGHLIGHT = new THREE.Color("#f4f1e5");
const GRASS_COLOR = new THREE.Color("#d7f0b4");
const GRASS_SWAMP_COLOR = new THREE.Color("#c2f0cf");
const MOTH_CORE_COLOR = new THREE.Color("#ffb0b0");
const MOTH_FOREST_COLOR = new THREE.Color("#ff4b57");
const MOTH_SWAMP_COLOR = new THREE.Color("#ff6670");
const MOTH_GRASSLAND_COLOR = new THREE.Color("#ff5f4d");
const MOTH_BARRENS_COLOR = new THREE.Color("#ff7a63");
const MOTH_MOUNTAIN_COLOR = new THREE.Color("#ff6f7f");
const ECHO_ELEVATION_BANDS = [-0.48, -0.28, -0.12, 0.02, 0.18] as const;
const ECHO_AZIMUTH_STEPS = 18;
const ECHO_MAX_HITS = 72;
const ECHO_MOTH_BUDGET = 12;

function createEchoDirections(): THREE.Vector3[] {
  const directions: THREE.Vector3[] = [];

  for (const elevation of ECHO_ELEVATION_BANDS) {
    const cosElevation = Math.cos(elevation);
    const sinElevation = Math.sin(elevation);

    for (let i = 0; i < ECHO_AZIMUTH_STEPS; i++) {
      const azimuth = (i / ECHO_AZIMUTH_STEPS) * Math.PI * 2;
      directions.push(
        new THREE.Vector3(
          Math.cos(azimuth) * cosElevation,
          sinElevation,
          Math.sin(azimuth) * cosElevation,
        ).normalize(),
      );
    }
  }

  return directions;
}

const ECHO_DIRECTIONS = createEchoDirections();

function saturate(value: number): number {
  return THREE.MathUtils.clamp(value, 0, 1);
}

function remapNoise(value: number): number {
  return value * 0.5 + 0.5;
}

function makeNoise(seed: number): ReturnType<typeof createNoise2D> {
  let offset = 0;
  return createNoise2D(() => seededRandom(seed + offset++ * 17));
}

function fbm(
  noise: ReturnType<typeof createNoise2D>,
  x: number,
  z: number,
  octaves: number,
  lacunarity: number,
  gain: number,
): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let totalAmplitude = 0;

  for (let i = 0; i < octaves; i++) {
    value += noise(x * frequency, z * frequency) * amplitude;
    totalAmplitude += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }

  return totalAmplitude > 0 ? value / totalAmplitude : 0;
}

function ridge(value: number): number {
  return 1 - Math.abs(value);
}

function addBarycentricAttribute(
  geometry: THREE.BufferGeometry,
): THREE.BufferGeometry {
  const base = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  const count = base.attributes.position.count;
  const barycentric = new Float32Array(count * 3);

  for (let i = 0; i < count; i += 3) {
    barycentric.set([1, 0, 0], i * 3);
    barycentric.set([0, 1, 0], (i + 1) * 3);
    barycentric.set([0, 0, 1], (i + 2) * 3);
  }

  base.setAttribute("barycentric", new THREE.BufferAttribute(barycentric, 3));
  return base;
}

function dominantBiome(point: {
  forestWeight: number;
  grasslandWeight: number;
  mountainWeight: number;
  swampWeight: number;
  barrensWeight: number;
}): BatBiomeId {
  if (
    point.mountainWeight > point.forestWeight &&
    point.mountainWeight > point.grasslandWeight &&
    point.mountainWeight > point.swampWeight &&
    point.mountainWeight > point.barrensWeight
  ) {
    return "mountains";
  }

  if (
    point.forestWeight > point.grasslandWeight &&
    point.forestWeight > point.swampWeight &&
    point.forestWeight > point.barrensWeight
  ) {
    return "forest";
  }

  if (
    point.swampWeight > point.grasslandWeight &&
    point.swampWeight > point.barrensWeight
  ) {
    return "swamp";
  }

  return point.barrensWeight > point.grasslandWeight ? "barrens" : "grassland";
}

export class BatWorld {
  readonly group = new THREE.Group();
  readonly sharedUniforms: SharedEchoUniforms;
  readonly terrainMaterial: THREE.ShaderMaterial;
  readonly trunkMaterial: THREE.ShaderMaterial;
  readonly crownMaterial: THREE.ShaderMaterial;
  readonly rockMaterial: THREE.ShaderMaterial;
  readonly grassMaterial: THREE.ShaderMaterial;
  readonly mothMaterial: THREE.ShaderMaterial;
  readonly treeTrunkGeometry: THREE.BufferGeometry;
  readonly pineCrownGeometry: THREE.BufferGeometry;
  readonly broadCrownGeometry: THREE.BufferGeometry;
  readonly rockGeometry: THREE.BufferGeometry;
  readonly grassGeometry: THREE.BufferGeometry;
  readonly mothGeometry: THREE.BufferGeometry;
  readonly mothMesh: THREE.InstancedMesh;

  settings: BatWorldSettings;

  private readonly active = new Map<string, WorldChunk>();
  private readonly noiseWarpX = makeNoise(11);
  private readonly noiseWarpZ = makeNoise(23);
  private readonly noiseTemp = makeNoise(41);
  private readonly noiseMoisture = makeNoise(59);
  private readonly noiseRugged = makeNoise(71);
  private readonly noiseContinent = makeNoise(83);
  private readonly noiseBasins = makeNoise(97);
  private readonly noiseChains = makeNoise(113);
  private readonly noiseRidges = makeNoise(131);
  private readonly noiseCliffs = makeNoise(149);
  private readonly noiseDetail = makeNoise(167);
  private readonly noiseTreeCluster = makeNoise(181);
  private readonly noiseGrassCluster = makeNoise(197);
  private readonly noiseRockScatter = makeNoise(211);
  private readonly sampleColorA = new THREE.Color();
  private readonly sampleColorB = new THREE.Color();
  private readonly sampleColorC = new THREE.Color();
  private readonly echoRaycaster = new THREE.Raycaster();
  private readonly echoDirection = new THREE.Vector3();
  private readonly echoLocal = new THREE.Vector3();
  private readonly echoOrientationInverse = new THREE.Quaternion();
  private readonly mothDummy = new THREE.Object3D();
  private readonly collectedMothKeys = new Set<string>();
  private collectedMothCount = 0;
  private activeMothTargets: ActiveMothTarget[] = [];

  constructor(
    settings: BatWorldSettings,
    options?: { mothGeometry?: THREE.BufferGeometry | null },
  ) {
    this.settings = { ...settings };
    this.sharedUniforms = createSharedEchoUniforms();
    this.terrainMaterial = createTerrainRevealMaterial(this.sharedUniforms);
    this.trunkMaterial = createInstancedRevealMaterial(this.sharedUniforms, {
      tintColor: "#f4f0df",
      fillStrength: 0.08,
      edgeStrength: 1.18,
      silhouetteStrength: 0.9,
      baseVisibilityBoost: 0.74,
    });
    this.crownMaterial = createInstancedRevealMaterial(this.sharedUniforms, {
      tintColor: "#effff8",
      fillStrength: 0.1,
      edgeStrength: 1.55,
      silhouetteStrength: 1.05,
      baseVisibilityBoost: 0.56,
    });
    this.rockMaterial = createInstancedRevealMaterial(this.sharedUniforms, {
      tintColor: "#f0f7ff",
      fillStrength: 0.1,
      edgeStrength: 1.72,
      silhouetteStrength: 0.96,
      baseVisibilityBoost: 0.86,
    });
    this.grassMaterial = createInstancedRevealMaterial(this.sharedUniforms, {
      tintColor: "#efffd6",
      fillStrength: 0.06,
      edgeStrength: 1.04,
      silhouetteStrength: 0.46,
      baseVisibilityBoost: 0.3,
      doubleSided: true,
    });
    this.mothMaterial = createInstancedRevealMaterial(this.sharedUniforms, {
      tintColor: "#ff3649",
      fillStrength: 0,
      edgeStrength: 6.2,
      silhouetteStrength: 0,
      baseVisibilityBoost: 0,
      trailBoost: BAT_MOTH_DEFAULTS.echoTrailBoost,
      pulseBoost: BAT_MOTH_DEFAULTS.echoPulseBoost,
      doubleSided: true,
    });

    this.treeTrunkGeometry = addBarycentricAttribute(
      new THREE.CylinderGeometry(0.16, 0.22, 1.85, 5, 1, false),
    );
    this.pineCrownGeometry = addBarycentricAttribute(
      new THREE.ConeGeometry(0.9, 2.85, 6, 1, false),
    );
    this.broadCrownGeometry = addBarycentricAttribute(
      new THREE.IcosahedronGeometry(1.15, 0),
    );
    this.rockGeometry = addBarycentricAttribute(
      new THREE.DodecahedronGeometry(0.95, 0),
    );
    this.grassGeometry = addBarycentricAttribute(
      new THREE.ConeGeometry(0.16, 1.0, 3, 1, false),
    );
    const sourceMothGeometry =
      options?.mothGeometry ?? new THREE.OctahedronGeometry(0.58, 0);
    this.mothGeometry = addBarycentricAttribute(sourceMothGeometry);
    sourceMothGeometry.dispose();
    this.mothMesh = new THREE.InstancedMesh(
      this.mothGeometry,
      this.mothMaterial,
      BAT_MOTH_DEFAULTS.maxActive,
    );
    this.mothMesh.userData.echoSurface = "moth";
    this.mothMesh.frustumCulled = false;
    this.mothMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(this.mothMesh);
    this.finalizeInstancedMesh(this.mothMesh, 0);

    this.applyEnvironment();
  }

  prepare(playerPosition: THREE.Vector3): BatWorldFrameEvents {
    this.ensureChunks(playerPosition);
    return this.updateMoths(playerPosition);
  }

  renderEcho(pulses: EchoPulseRenderState[], elapsed: number): void {
    syncEchoUniforms(this.sharedUniforms, pulses, elapsed);
  }

  sampleHeight(x: number, z: number): number {
    return this.sampleTerrainPoint(x, z, this.sampleColorA).height;
  }

  sampleEchoProfile(
    origin: THREE.Vector3,
    orientation: THREE.Quaternion,
    range: number,
    speed: number,
  ): EchoProbeProfile {
    const hits: EchoProbeHit[] = [];
    let densitySum = 0;
    let terrainVarianceSum = 0;
    let nearWeight = 0;
    let midWeight = 0;
    let farWeight = 0;
    let terrainWeight = 0;
    let treeWeight = 0;
    let rockWeight = 0;
    let grassWeight = 0;
    let mothWeight = 0;

    this.echoOrientationInverse.copy(orientation).invert();
    this.echoRaycaster.near = 0.6;
    this.echoRaycaster.far = range;

    for (const direction of ECHO_DIRECTIONS) {
      this.echoDirection
        .copy(direction)
        .applyQuaternion(orientation)
        .normalize();
      this.echoRaycaster.set(origin, this.echoDirection);

      const intersections = this.echoRaycaster.intersectObject(
        this.group,
        true,
      );
      let accepted = 0;
      let lastDistance = -Infinity;
      let lastMaterial: EchoSurfaceType | null = null;

      for (const intersection of intersections) {
        const material = this.getEchoSurface(intersection.object);
        if (!material || intersection.distance <= 1.4) continue;
        if (
          accepted > 0 &&
          material === lastMaterial &&
          intersection.distance - lastDistance < 3.4
        ) {
          continue;
        }

        const pointData = this.sampleTerrainPoint(
          intersection.point.x,
          intersection.point.z,
          this.sampleColorA,
        );
        const densityBase = this.estimateAcousticDensity(pointData);
        const density =
          material === "moth"
            ? saturate(densityBase * 0.72 + 0.28)
            : densityBase;
        const ruggedness = this.estimateAcousticRuggedness(
          origin,
          intersection.point,
          pointData,
          range,
        );
        const reflectivity = this.estimateReflectivity(material, pointData);
        const distanceNorm = saturate(
          intersection.distance / Math.max(range, 1),
        );

        this.echoLocal
          .copy(intersection.point)
          .sub(origin)
          .normalize()
          .applyQuaternion(this.echoOrientationInverse);

        hits.push({
          point: intersection.point.clone(),
          distance: intersection.distance,
          delay: intersection.distance / Math.max(speed, 1),
          pan: THREE.MathUtils.clamp(this.echoLocal.x, -1, 1),
          elevation: THREE.MathUtils.clamp(this.echoLocal.y, -1, 1),
          material,
          biome: pointData.dominantBiome,
          density,
          ruggedness,
          reflectivity,
        });

        densitySum += density;
        terrainVarianceSum += ruggedness;
        nearWeight += Math.pow(1 - distanceNorm, 2.1);
        midWeight += 1 - Math.abs(distanceNorm * 2 - 1);
        farWeight += Math.pow(distanceNorm, 1.25);

        switch (material) {
          case "terrain":
            terrainWeight += reflectivity;
            break;
          case "tree":
            treeWeight += reflectivity;
            break;
          case "rock":
            rockWeight += reflectivity;
            break;
          case "grass":
            grassWeight += reflectivity;
            break;
          case "moth":
            mothWeight += reflectivity;
            break;
        }

        accepted += 1;
        lastDistance = intersection.distance;
        lastMaterial = material;
        if (accepted >= 2 || hits.length >= ECHO_MAX_HITS - ECHO_MOTH_BUDGET) {
          break;
        }
      }

      if (hits.length >= ECHO_MAX_HITS - ECHO_MOTH_BUDGET) break;
    }

    const availableMothSlots = Math.max(
      0,
      Math.min(ECHO_MOTH_BUDGET, ECHO_MAX_HITS - hits.length),
    );
    if (availableMothSlots > 0) {
      const activeMoths = this.activeMothTargets
        .filter(
          (target) =>
            target.position.distanceToSquared(origin) <= range * range,
        )
        .sort(
          (a, b) =>
            a.position.distanceToSquared(origin) -
            b.position.distanceToSquared(origin),
        )
        .slice(0, Math.min(availableMothSlots, 10));

      for (const moth of activeMoths) {
        if (
          hits.some(
            (hit) =>
              hit.material === "moth" &&
              hit.point.distanceToSquared(moth.position) < 6,
          )
        ) {
          continue;
        }

        const pointData = this.sampleTerrainPoint(
          moth.position.x,
          moth.position.z,
          this.sampleColorA,
        );
        const distance = moth.position.distanceTo(origin);
        const densityBase = this.estimateAcousticDensity(pointData);
        const density = saturate(densityBase * 0.72 + 0.28);
        const ruggedness = this.estimateAcousticRuggedness(
          origin,
          moth.position,
          pointData,
          range,
        );
        const reflectivity = this.estimateReflectivity("moth", pointData);
        const distanceNorm = saturate(distance / Math.max(range, 1));

        this.echoLocal
          .copy(moth.position)
          .sub(origin)
          .normalize()
          .applyQuaternion(this.echoOrientationInverse);

        hits.push({
          point: moth.position.clone(),
          distance,
          delay: distance / Math.max(speed, 1),
          pan: THREE.MathUtils.clamp(this.echoLocal.x, -1, 1),
          elevation: THREE.MathUtils.clamp(this.echoLocal.y, -1, 1),
          material: "moth",
          biome: moth.biome,
          density,
          ruggedness,
          reflectivity,
        });

        densitySum += density;
        terrainVarianceSum += ruggedness;
        nearWeight += Math.pow(1 - distanceNorm, 2.1);
        midWeight += 1 - Math.abs(distanceNorm * 2 - 1);
        farWeight += Math.pow(distanceNorm, 1.25);
        mothWeight += reflectivity;
      }
    }

    const count = Math.max(hits.length, 1);
    return {
      hits,
      density: densitySum / count,
      terrainVariance: terrainVarianceSum / count,
      nearWeight: nearWeight / count,
      midWeight: midWeight / count,
      farWeight: farWeight / count,
      terrainWeight: terrainWeight / count,
      treeWeight: treeWeight / count,
      rockWeight: rockWeight / count,
      grassWeight: grassWeight / count,
      mothWeight: mothWeight / count,
    };
  }

  setSettings(nextSettings: Partial<BatWorldSettings>): void {
    this.settings = { ...this.settings, ...nextSettings };
    this.applyEnvironment();
  }

  rebuild(): void {
    for (const chunk of this.active.values()) {
      chunk.dispose();
      this.group.remove(chunk.terrain);
      this.group.remove(chunk.decorations);
    }
    this.active.clear();
  }

  dispose(): void {
    this.rebuild();
    this.terrainMaterial.dispose();
    this.trunkMaterial.dispose();
    this.crownMaterial.dispose();
    this.rockMaterial.dispose();
    this.grassMaterial.dispose();
    this.mothMaterial.dispose();
    this.treeTrunkGeometry.dispose();
    this.pineCrownGeometry.dispose();
    this.broadCrownGeometry.dispose();
    this.rockGeometry.dispose();
    this.grassGeometry.dispose();
    this.mothGeometry.dispose();
  }

  getCollectedMothCount(): number {
    return this.collectedMothCount;
  }

  private applyEnvironment(): void {
    const far = THREE.MathUtils.lerp(
      BAT_FOG_DISTANCE.farMax,
      BAT_FOG_DISTANCE.farMin,
      this.settings.fogIntensity,
    );
    this.sharedUniforms.uFogNear.value = BAT_FOG_DISTANCE.near;
    this.sharedUniforms.uFogFar.value = far;
    this.sharedUniforms.uFogColor.value.set(BAT_SCENE.fogColor);
    this.sharedUniforms.uBaseVisibility.value = this.settings.baseVisibility;
    this.sharedUniforms.uRevealIntensity.value = this.settings.revealIntensity;
    this.sharedUniforms.uWireThickness.value = this.settings.wireThickness;
  }

  private ensureChunks(playerPosition: THREE.Vector3): void {
    const cx = Math.floor(playerPosition.x / this.settings.chunkSize);
    const cz = Math.floor(playerPosition.z / this.settings.chunkSize);
    const needed = new Set<string>();

    for (
      let dx = -this.settings.viewRadius;
      dx <= this.settings.viewRadius;
      dx++
    ) {
      for (
        let dz = -this.settings.viewRadius;
        dz <= this.settings.viewRadius;
        dz++
      ) {
        const chunkX = cx + dx;
        const chunkZ = cz + dz;
        const key = `${chunkX},${chunkZ}`;
        needed.add(key);

        if (!this.active.has(key)) {
          const chunk = this.createChunk(chunkX, chunkZ);
          this.active.set(key, chunk);
          this.group.add(chunk.terrain);
          this.group.add(chunk.decorations);
        }
      }
    }

    for (const [key, chunk] of this.active) {
      if (needed.has(key)) continue;
      chunk.dispose();
      this.group.remove(chunk.terrain);
      this.group.remove(chunk.decorations);
      this.active.delete(key);
    }
  }

  private updateMoths(playerPosition: THREE.Vector3): BatWorldFrameEvents {
    const candidates: MothRenderState[] = [];
    const collectedMoths: THREE.Vector3[] = [];

    for (const chunk of this.active.values()) {
      for (let i = 0; i < BAT_MOTH_DEFAULTS.spawnAttemptsPerChunk; i++) {
        const candidate = this.buildMothCandidate(
          chunk.gridX,
          chunk.gridZ,
          i,
          playerPosition,
        );
        if (candidate) {
          candidates.push(candidate);
        }
      }
    }

    const nearbyNaturalCount = candidates.filter(
      (candidate) =>
        candidate.distanceToPlayer <= BAT_MOTH_DEFAULTS.activeRadius,
    ).length;
    const naturalNearestDistance = candidates.reduce(
      (nearest, candidate) => Math.min(nearest, candidate.distanceToPlayer),
      Infinity,
    );
    if (
      nearbyNaturalCount < BAT_MOTH_DEFAULTS.escortCount ||
      naturalNearestDistance > BAT_MOTH_DEFAULTS.escortRadiusMax
    ) {
      for (let i = 0; i < BAT_MOTH_DEFAULTS.escortCount; i++) {
        const escort = this.buildEscortMothCandidate(playerPosition, i);
        if (escort) {
          candidates.push(escort);
        }
      }
    }

    candidates.sort((a, b) => a.distanceToPlayer - b.distanceToPlayer);
    const nearestMothDistance = candidates[0]?.distanceToPlayer ?? null;
    const activeCandidates =
      candidates.filter(
        (candidate) =>
          candidate.distanceToPlayer <= BAT_MOTH_DEFAULTS.activeRadius,
      ).length >= 8
        ? candidates.filter(
            (candidate) =>
              candidate.distanceToPlayer <= BAT_MOTH_DEFAULTS.activeRadius,
          )
        : candidates;

    let mothIndex = 0;
    this.activeMothTargets = [];

    for (const candidate of activeCandidates) {
      if (candidate.distanceToPlayer <= BAT_MOTH_DEFAULTS.catchRadius) {
        if (!this.collectedMothKeys.has(candidate.key)) {
          this.collectedMothKeys.add(candidate.key);
          this.collectedMothCount += 1;
          collectedMoths.push(candidate.position.clone());
        }
        continue;
      }

      if (mothIndex >= BAT_MOTH_DEFAULTS.maxActive) break;

      this.mothDummy.position.copy(candidate.position);
      this.mothDummy.rotation.set(0, candidate.heading, candidate.bank);
      this.mothDummy.scale.setScalar(candidate.scale * 0.64);
      this.mothDummy.updateMatrix();
      this.mothMesh.setMatrixAt(mothIndex, this.mothDummy.matrix);
      this.mothMesh.setColorAt(
        mothIndex,
        this.sampleMothColor(candidate.biome, candidate.tint),
      );
      this.activeMothTargets.push({
        position: candidate.position.clone(),
        biome: candidate.biome,
      });
      mothIndex += 1;
    }

    this.finalizeInstancedMesh(this.mothMesh, mothIndex);
    return {
      collectedMoths,
      activeMoths: mothIndex,
      nearestMothDistance,
    };
  }

  private buildMothCandidate(
    gridX: number,
    gridZ: number,
    index: number,
    playerPosition: THREE.Vector3,
  ): MothRenderState | null {
    const size = this.settings.chunkSize;
    const baseSeed = gridX * 73856093 + gridZ * 19349663 + 7919;
    const key = `${gridX},${gridZ}:moth:${index}`;
    if (this.collectedMothKeys.has(key)) return null;

    const lx = (seededRandom2D(baseSeed + index, 307) - 0.5) * size;
    const lz = (seededRandom2D(baseSeed + index, 313) - 0.5) * size;
    const wx = lx + gridX * size;
    const wz = lz + gridZ * size;
    const point = this.sampleTerrainPoint(wx, wz, this.sampleColorA);
    const spawnChance = saturate(
      point.forestWeight * 0.66 +
        point.swampWeight * 0.76 +
        point.grasslandWeight * 0.42 +
        point.treeCluster * 0.34 +
        point.grassCluster * 0.18 -
        point.mountainWeight * 0.38 -
        point.barrensWeight * 0.32 -
        point.cliffiness * 0.48,
    );
    if (seededRandom2D(baseSeed + index, 331) > spawnChance) {
      return null;
    }

    const orbitRadius =
      BAT_MOTH_DEFAULTS.orbitRadius *
      (0.54 +
        seededRandom2D(baseSeed + index, 347) * 0.78 +
        point.treeCluster * 0.14);
    const driftRadius =
      BAT_MOTH_DEFAULTS.driftRadius *
      (0.46 +
        seededRandom2D(baseSeed + index, 353) * 0.82 +
        point.swampWeight * 0.18);
    const hoverHeight = THREE.MathUtils.lerp(
      BAT_MOTH_DEFAULTS.minHoverHeight,
      BAT_MOTH_DEFAULTS.maxHoverHeight,
      saturate(
        0.18 +
          point.treeCluster * 0.32 +
          point.grassCluster * 0.18 +
          point.swampWeight * 0.2 +
          seededRandom2D(baseSeed + index, 367) * 0.24,
      ),
    );
    const phaseA = seededRandom2D(baseSeed + index, 373) * Math.PI * 2;
    const phaseB = seededRandom2D(baseSeed + index, 379) * Math.PI * 2;
    const phaseC = seededRandom2D(baseSeed + index, 383) * Math.PI * 2;
    const phaseD = seededRandom2D(baseSeed + index, 389) * Math.PI * 2;
    const orbitA = phaseA;
    const orbitB = phaseB;
    const flutter = phaseC;
    const x =
      wx +
      Math.sin(orbitA) * orbitRadius +
      Math.cos(orbitB * 1.26 + phaseD) * driftRadius;
    const z =
      wz +
      Math.cos(orbitA * 0.92 + phaseB) * orbitRadius * 0.84 +
      Math.sin(orbitB * 1.18 + phaseA) * driftRadius * 0.92;
    const groundHeight = this.sampleHeightOnly(x, z);
    const y =
      groundHeight +
      hoverHeight +
      Math.sin(orbitB * 0.74 + phaseD) * 0.28 +
      Math.sin(flutter) * 0.12;
    const distanceToPlayer = Math.hypot(
      x - playerPosition.x,
      y - playerPosition.y,
      z - playerPosition.z,
    );
    if (distanceToPlayer > BAT_MOTH_DEFAULTS.activeRadius * 1.65) {
      return null;
    }
    const proximityBoost = saturate(
      1 - distanceToPlayer / BAT_MOTH_DEFAULTS.activeRadius,
    );

    return {
      key,
      position: new THREE.Vector3(x, y, z),
      distanceToPlayer,
      heading: phaseA,
      bank: Math.sin(flutter * 0.52 + phaseA) * 0.05,
      scale:
        (0.34 +
          seededRandom2D(baseSeed + index, 397) * 0.14 +
          point.swampWeight * 0.04) *
        (0.92 + proximityBoost * 0.18),
      biome: point.dominantBiome,
      tint: seededRandom2D(baseSeed + index, 401),
    };
  }

  private buildEscortMothCandidate(
    playerPosition: THREE.Vector3,
    index: number,
  ): MothRenderState | null {
    const escortCellX = Math.floor(playerPosition.x / 48);
    const escortCellZ = Math.floor(playerPosition.z / 48);
    const baseSeed =
      escortCellX * 92821 + escortCellZ * 68917 + index * 1013 + 4177;
    const key = `escort:${escortCellX},${escortCellZ}:${index}`;
    if (this.collectedMothKeys.has(key)) return null;

    const radius = THREE.MathUtils.lerp(
      BAT_MOTH_DEFAULTS.escortRadiusMin,
      BAT_MOTH_DEFAULTS.escortRadiusMax,
      seededRandom2D(baseSeed, 421),
    );
    const phaseA = seededRandom2D(baseSeed, 431) * Math.PI * 2;
    const phaseB = seededRandom2D(baseSeed, 439) * Math.PI * 2;
    const escortOriginX = escortCellX * 48 + 24;
    const escortOriginZ = escortCellZ * 48 + 24;
    const angle = phaseA + index * 1.17;
    const wobble = phaseB;
    const x =
      escortOriginX +
      Math.cos(angle) * radius +
      Math.sin(wobble * 1.2) * (0.9 + index * 0.12);
    const z =
      escortOriginZ +
      Math.sin(angle) * radius * 0.86 +
      Math.cos(wobble) * (1 + index * 0.1);
    const point = this.sampleTerrainPoint(x, z, this.sampleColorA);
    const groundHeight = this.sampleHeightOnly(x, z);
    const hoverHeight = THREE.MathUtils.lerp(
      BAT_MOTH_DEFAULTS.minHoverHeight,
      BAT_MOTH_DEFAULTS.maxHoverHeight,
      0.32 + seededRandom2D(baseSeed, 457) * 0.32,
    );
    const y = groundHeight + hoverHeight + Math.sin(wobble * 2.2) * 0.18;
    const distanceToPlayer = Math.hypot(
      x - playerPosition.x,
      y - playerPosition.y,
      z - playerPosition.z,
    );
    const proximityBoost = saturate(
      1 - distanceToPlayer / BAT_MOTH_DEFAULTS.escortRadiusMax,
    );

    return {
      key,
      position: new THREE.Vector3(x, y, z),
      distanceToPlayer,
      heading: angle,
      bank: Math.sin(wobble * 0.7 + phaseA) * 0.06,
      scale:
        (0.36 +
          seededRandom2D(baseSeed, 467) * 0.16 +
          point.swampWeight * 0.04) *
        (0.94 + proximityBoost * 0.14),
      biome: point.dominantBiome,
      tint: seededRandom2D(baseSeed, 479),
    };
  }

  private sampleMothColor(biome: BatBiomeId, tint: number): THREE.Color {
    const biomeColor =
      biome === "forest"
        ? MOTH_FOREST_COLOR
        : biome === "swamp"
          ? MOTH_SWAMP_COLOR
          : biome === "grassland"
            ? MOTH_GRASSLAND_COLOR
            : biome === "barrens"
              ? MOTH_BARRENS_COLOR
              : MOTH_MOUNTAIN_COLOR;

    return this.sampleColorB
      .copy(biomeColor)
      .lerp(MOTH_CORE_COLOR, 0.4 + tint * 0.35);
  }

  private createChunk(gridX: number, gridZ: number): WorldChunk {
    const terrainGeometry = this.createTerrainGeometry(gridX, gridZ);
    const terrain = new THREE.Mesh(terrainGeometry, this.terrainMaterial);
    terrain.userData.echoSurface = "terrain";
    terrain.position.set(
      gridX * this.settings.chunkSize,
      0,
      gridZ * this.settings.chunkSize,
    );

    const decorations = this.createDecorations(gridX, gridZ);
    decorations.position.copy(terrain.position);

    return {
      key: `${gridX},${gridZ}`,
      gridX,
      gridZ,
      terrain,
      decorations,
      dispose() {
        terrain.geometry.dispose();
        for (const child of decorations.children) {
          if (child instanceof THREE.InstancedMesh) {
            child.dispose();
          }
        }
      },
    };
  }

  private createTerrainGeometry(
    gridX: number,
    gridZ: number,
  ): THREE.BufferGeometry {
    const geometry = addBarycentricAttribute(
      new THREE.PlaneGeometry(
        this.settings.chunkSize,
        this.settings.chunkSize,
        this.settings.terrainSegments,
        this.settings.terrainSegments,
      ),
    );
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(positions.count * 3);
    const tempColor = new THREE.Color();

    for (let i = 0; i < positions.count; i++) {
      const wx = positions.getX(i) + gridX * this.settings.chunkSize;
      const wz = positions.getZ(i) + gridZ * this.settings.chunkSize;
      const point = this.sampleTerrainPoint(wx, wz, tempColor);
      positions.setY(i, point.height);
      colors[i * 3] = tempColor.r;
      colors[i * 3 + 1] = tempColor.g;
      colors[i * 3 + 2] = tempColor.b;
    }

    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    return geometry;
  }

  private createDecorations(gridX: number, gridZ: number): THREE.Group {
    const group = new THREE.Group();
    const size = this.settings.chunkSize;
    const baseSeed = gridX * 73856093 + gridZ * 19349663;
    const pineCapacity = Math.max(
      10,
      Math.round(this.settings.treeDensity * 1.35),
    );
    const broadCapacity = Math.max(
      8,
      Math.round(this.settings.treeDensity * 1.05),
    );
    const deadCapacity = Math.max(
      4,
      Math.round(this.settings.treeDensity * 0.5),
    );
    const grassCapacity = Math.max(
      20,
      Math.round(this.settings.grassDensity * 3.8),
    );
    const rockCapacity = Math.max(
      10,
      Math.round(14 + this.settings.mountainHeight * 0.22),
    );

    const pineTrunks = new THREE.InstancedMesh(
      this.treeTrunkGeometry,
      this.trunkMaterial,
      pineCapacity,
    );
    const pineCrowns = new THREE.InstancedMesh(
      this.pineCrownGeometry,
      this.crownMaterial,
      pineCapacity,
    );
    const broadTrunks = new THREE.InstancedMesh(
      this.treeTrunkGeometry,
      this.trunkMaterial,
      broadCapacity,
    );
    const broadCrowns = new THREE.InstancedMesh(
      this.broadCrownGeometry,
      this.crownMaterial,
      broadCapacity,
    );
    const deadTrees = new THREE.InstancedMesh(
      this.treeTrunkGeometry,
      this.trunkMaterial,
      deadCapacity,
    );
    const rocks = new THREE.InstancedMesh(
      this.rockGeometry,
      this.rockMaterial,
      rockCapacity,
    );
    const grass = new THREE.InstancedMesh(
      this.grassGeometry,
      this.grassMaterial,
      grassCapacity,
    );
    pineTrunks.userData.echoSurface = "tree";
    pineCrowns.userData.echoSurface = "tree";
    broadTrunks.userData.echoSurface = "tree";
    broadCrowns.userData.echoSurface = "tree";
    deadTrees.userData.echoSurface = "tree";
    rocks.userData.echoSurface = "rock";
    grass.userData.echoSurface = "grass";

    const dummy = new THREE.Object3D();
    const tempColor = new THREE.Color();
    let pineIndex = 0;
    let broadIndex = 0;
    let deadIndex = 0;
    let rockIndex = 0;
    let grassIndex = 0;

    for (let i = 0; i < pineCapacity * 5 && pineIndex < pineCapacity; i++) {
      const lx = (seededRandom2D(baseSeed + i, 17) - 0.5) * size;
      const lz = (seededRandom2D(baseSeed + i, 31) - 0.5) * size;
      const wx = lx + gridX * size;
      const wz = lz + gridZ * size;
      const point = this.sampleTerrainPoint(wx, wz, tempColor);
      const pineChance = saturate(
        point.forestWeight * 1.02 +
          point.mountainWeight * 0.28 +
          point.treeCluster * 0.72 -
          point.basinWeight * 0.18 -
          point.cliffiness * 0.45 -
          point.barrensWeight * 0.24,
      );
      if (seededRandom2D(baseSeed + i, 53) > pineChance) continue;

      const scale =
        0.9 +
        seededRandom2D(baseSeed + i, 61) * 2.5 +
        point.mountainWeight * 0.5;
      const crownColor = this.sampleColorB
        .copy(tempColor)
        .lerp(PINE_CROWN_COLOR, 0.55 + point.forestWeight * 0.18);

      dummy.position.set(lx, point.height + 0.92 * scale, lz);
      dummy.scale.set(scale * 0.2, scale * 1.55, scale * 0.2);
      dummy.rotation.set(0, seededRandom2D(baseSeed + i, 67) * Math.PI, 0);
      dummy.updateMatrix();
      pineTrunks.setMatrixAt(pineIndex, dummy.matrix);
      pineTrunks.setColorAt(
        pineIndex,
        tempColor.copy(TREE_TRUNK_COLOR).lerp(crownColor, 0.08),
      );

      dummy.position.set(lx, point.height + 3.15 * scale, lz);
      dummy.scale.set(scale * 0.9, scale * 1.85, scale * 0.9);
      dummy.rotation.set(0, seededRandom2D(baseSeed + i, 79) * Math.PI, 0);
      dummy.updateMatrix();
      pineCrowns.setMatrixAt(pineIndex, dummy.matrix);
      pineCrowns.setColorAt(pineIndex, crownColor);
      pineIndex++;
    }

    for (let i = 0; i < broadCapacity * 5 && broadIndex < broadCapacity; i++) {
      const lx = (seededRandom2D(baseSeed + i, 89) - 0.5) * size;
      const lz = (seededRandom2D(baseSeed + i, 97) - 0.5) * size;
      const wx = lx + gridX * size;
      const wz = lz + gridZ * size;
      const point = this.sampleTerrainPoint(wx, wz, tempColor);
      const broadChance = saturate(
        point.grasslandWeight * 0.82 +
          point.swampWeight * 0.72 +
          point.forestWeight * 0.36 +
          point.treeCluster * 0.48 -
          point.mountainWeight * 0.62 -
          point.barrensWeight * 0.32 -
          point.cliffiness * 0.3,
      );
      if (seededRandom2D(baseSeed + i, 109) > broadChance) continue;

      const scale =
        0.9 +
        seededRandom2D(baseSeed + i, 127) * 1.9 +
        point.swampWeight * 0.35;
      const crownColor = this.sampleColorB
        .copy(tempColor)
        .lerp(BROAD_CROWN_COLOR, 0.5 + point.grasslandWeight * 0.2);

      dummy.position.set(lx, point.height + 0.72 * scale, lz);
      dummy.scale.set(scale * 0.32, scale * 1.25, scale * 0.32);
      dummy.rotation.set(0, seededRandom2D(baseSeed + i, 131) * Math.PI, 0);
      dummy.updateMatrix();
      broadTrunks.setMatrixAt(broadIndex, dummy.matrix);
      broadTrunks.setColorAt(
        broadIndex,
        tempColor.copy(TREE_TRUNK_COLOR).lerp(crownColor, 0.1),
      );

      dummy.position.set(lx, point.height + 2.55 * scale, lz);
      dummy.scale.set(
        scale * 1.28,
        scale * (0.92 + point.swampWeight * 0.34),
        scale * 1.28,
      );
      dummy.rotation.set(
        seededRandom2D(baseSeed + i, 137) * 0.25,
        seededRandom2D(baseSeed + i, 149) * Math.PI,
        seededRandom2D(baseSeed + i, 151) * 0.25,
      );
      dummy.updateMatrix();
      broadCrowns.setMatrixAt(broadIndex, dummy.matrix);
      broadCrowns.setColorAt(broadIndex, crownColor);
      broadIndex++;
    }

    for (let i = 0; i < deadCapacity * 6 && deadIndex < deadCapacity; i++) {
      const lx = (seededRandom2D(baseSeed + i, 173) - 0.5) * size;
      const lz = (seededRandom2D(baseSeed + i, 181) - 0.5) * size;
      const wx = lx + gridX * size;
      const wz = lz + gridZ * size;
      const point = this.sampleTerrainPoint(wx, wz, tempColor);
      const deadChance = saturate(
        point.barrensWeight * 0.84 +
          point.mountainWeight * 0.2 +
          point.cliffiness * 0.18 +
          point.rockCluster * 0.2 -
          point.forestWeight * 0.28 -
          point.swampWeight * 0.34,
      );
      if (seededRandom2D(baseSeed + i, 191) > deadChance) continue;

      const scale =
        0.75 +
        seededRandom2D(baseSeed + i, 197) * 1.8 +
        point.barrensWeight * 0.45;
      dummy.position.set(lx, point.height + 0.9 * scale, lz);
      dummy.scale.set(scale * 0.18, scale * 1.5, scale * 0.18);
      dummy.rotation.set(
        seededRandom2D(baseSeed + i, 211) * 0.14,
        seededRandom2D(baseSeed + i, 223) * Math.PI,
        seededRandom2D(baseSeed + i, 227) * 0.16,
      );
      dummy.updateMatrix();
      deadTrees.setMatrixAt(deadIndex, dummy.matrix);
      deadTrees.setColorAt(
        deadIndex,
        tempColor.copy(DEAD_TREE_COLOR).lerp(ROCK_HIGHLIGHT, 0.18),
      );
      deadIndex++;
    }

    for (let i = 0; i < rockCapacity * 5 && rockIndex < rockCapacity; i++) {
      const lx = (seededRandom2D(baseSeed + i, 233) - 0.5) * size;
      const lz = (seededRandom2D(baseSeed + i, 239) - 0.5) * size;
      const wx = lx + gridX * size;
      const wz = lz + gridZ * size;
      const point = this.sampleTerrainPoint(wx, wz, tempColor);
      const rockChance = saturate(
        0.08 +
          point.mountainWeight * 1.2 +
          point.barrensWeight * 0.76 +
          point.cliffiness * 0.82 +
          point.rockCluster * 0.34 -
          point.swampWeight * 0.5,
      );
      if (seededRandom2D(baseSeed + i, 241) > rockChance) continue;

      const scale =
        0.55 + seededRandom2D(baseSeed + i, 251) * 2.4 + point.cliffiness * 0.8;
      dummy.position.set(lx, point.height - 0.18, lz);
      dummy.scale.set(
        scale,
        scale * (0.82 + point.cliffiness * 0.25),
        scale * 1.1,
      );
      dummy.rotation.set(
        seededRandom2D(baseSeed + i, 257) * Math.PI,
        seededRandom2D(baseSeed + i, 263) * Math.PI,
        0,
      );
      dummy.updateMatrix();
      rocks.setMatrixAt(rockIndex, dummy.matrix);
      rocks.setColorAt(
        rockIndex,
        tempColor
          .copy(ROCK_COLOR)
          .lerp(ROCK_HIGHLIGHT, 0.24 + point.mountainWeight * 0.16),
      );
      rockIndex++;
    }

    for (let i = 0; i < grassCapacity * 4 && grassIndex < grassCapacity; i++) {
      const lx = (seededRandom2D(baseSeed + i, 271) - 0.5) * size;
      const lz = (seededRandom2D(baseSeed + i, 277) - 0.5) * size;
      const wx = lx + gridX * size;
      const wz = lz + gridZ * size;
      const point = this.sampleTerrainPoint(wx, wz, tempColor);
      const grassChance = saturate(
        point.grasslandWeight * 1.05 +
          point.forestWeight * 0.28 +
          point.swampWeight * 0.42 +
          point.grassCluster * 0.74 -
          point.mountainWeight * 0.62 -
          point.barrensWeight * 0.42 -
          point.cliffiness * 0.72,
      );
      if (seededRandom2D(baseSeed + i, 281) > grassChance) continue;

      const scale =
        0.45 +
        seededRandom2D(baseSeed + i, 283) * 1.55 +
        point.swampWeight * 0.35;
      dummy.position.set(lx, point.height + 0.3, lz);
      dummy.scale.set(
        scale * (0.18 + point.swampWeight * 0.06),
        scale * (1.0 + point.swampWeight * 0.65),
        scale * 0.18,
      );
      dummy.rotation.set(
        0,
        seededRandom2D(baseSeed + i, 293) * Math.PI,
        seededRandom2D(baseSeed + i, 307) * 0.18,
      );
      dummy.updateMatrix();
      grass.setMatrixAt(grassIndex, dummy.matrix);
      grass.setColorAt(
        grassIndex,
        tempColor
          .copy(
            point.swampWeight > point.grasslandWeight
              ? GRASS_SWAMP_COLOR
              : GRASS_COLOR,
          )
          .lerp(this.sampleColorB.copy(tempColor), 0.28),
      );
      grassIndex++;
    }

    this.finalizeInstancedMesh(pineTrunks, pineIndex);
    this.finalizeInstancedMesh(pineCrowns, pineIndex);
    this.finalizeInstancedMesh(broadTrunks, broadIndex);
    this.finalizeInstancedMesh(broadCrowns, broadIndex);
    this.finalizeInstancedMesh(deadTrees, deadIndex);
    this.finalizeInstancedMesh(rocks, rockIndex);
    this.finalizeInstancedMesh(grass, grassIndex);
    group.add(
      pineTrunks,
      pineCrowns,
      broadTrunks,
      broadCrowns,
      deadTrees,
      rocks,
      grass,
    );
    return group;
  }

  private finalizeInstancedMesh(
    mesh: THREE.InstancedMesh,
    count: number,
  ): void {
    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
    mesh.computeBoundingSphere();
  }

  private getEchoSurface(object: THREE.Object3D): EchoSurfaceType | null {
    const surface = (object.userData as { echoSurface?: unknown }).echoSurface;

    switch (surface) {
      case "terrain":
      case "tree":
      case "rock":
      case "grass":
      case "moth":
        return surface;
      default:
        return null;
    }
  }

  private estimateAcousticDensity(point: TerrainPointData): number {
    return saturate(
      point.treeCluster * (0.3 + point.forestWeight * 0.55) +
        point.grassCluster *
          (0.14 + point.grasslandWeight * 0.32 + point.swampWeight * 0.28) +
        point.rockCluster *
          (0.12 + point.mountainWeight * 0.42 + point.barrensWeight * 0.26) +
        point.basinWeight * 0.08,
    );
  }

  private estimateAcousticRuggedness(
    origin: THREE.Vector3,
    point: THREE.Vector3,
    terrainPoint: TerrainPointData,
    range: number,
  ): number {
    const slope = this.estimateSlope(point.x, point.z);
    const verticalOffset = Math.abs(point.y - origin.y) / Math.max(range, 1);
    return saturate(
      slope * 0.52 +
        terrainPoint.cliffiness * 0.7 +
        terrainPoint.mountainWeight * 0.24 +
        verticalOffset * 0.44,
    );
  }

  private estimateReflectivity(
    material: EchoSurfaceType,
    terrainPoint: TerrainPointData,
  ): number {
    switch (material) {
      case "tree":
        return (
          0.42 +
          terrainPoint.forestWeight * 0.18 -
          terrainPoint.swampWeight * 0.06
        );
      case "rock":
        return (
          0.84 +
          terrainPoint.mountainWeight * 0.16 +
          terrainPoint.barrensWeight * 0.08
        );
      case "grass":
        return (
          0.28 +
          terrainPoint.grasslandWeight * 0.1 +
          terrainPoint.swampWeight * 0.06
        );
      case "moth":
        return (
          0.92 +
          terrainPoint.forestWeight * 0.06 +
          terrainPoint.swampWeight * 0.08 +
          terrainPoint.grasslandWeight * 0.04
        );
      case "terrain":
      default:
        return (
          0.6 +
          terrainPoint.mountainWeight * 0.12 +
          terrainPoint.barrensWeight * 0.06
        );
    }
  }

  private estimateSlope(x: number, z: number): number {
    const step = 2.8;
    const dx = Math.abs(
      this.sampleHeightOnly(x + step, z) - this.sampleHeightOnly(x - step, z),
    );
    const dz = Math.abs(
      this.sampleHeightOnly(x, z + step) - this.sampleHeightOnly(x, z - step),
    );
    return saturate((dx + dz) * 0.045);
  }

  private sampleHeightOnly(x: number, z: number): number {
    return this.sampleTerrainPoint(x, z, this.sampleColorC).height;
  }

  private sampleTerrainPoint(
    x: number,
    z: number,
    outColor: THREE.Color,
  ): TerrainPointData {
    const scale = this.settings.biomeScale;
    const warp = 52;
    const wx = x + this.noiseWarpX(x * scale * 1.7, z * scale * 1.7) * warp;
    const wz = z + this.noiseWarpZ(x * scale * 1.7, z * scale * 1.7) * warp;

    const temperature = remapNoise(
      fbm(this.noiseTemp, wx * scale * 0.8, wz * scale * 0.8, 3, 2.1, 0.55),
    );
    const moisture = remapNoise(
      fbm(this.noiseMoisture, wx * scale * 0.9, wz * scale * 0.9, 4, 2.0, 0.52),
    );
    const rugged = Math.pow(
      remapNoise(
        fbm(
          this.noiseRugged,
          wx * scale * 1.3,
          wz * scale * 1.3,
          4,
          2.24,
          0.58,
        ),
      ),
      1.5,
    );
    const continent = fbm(
      this.noiseContinent,
      wx * scale * 0.34,
      wz * scale * 0.34,
      5,
      2.0,
      0.54,
    );
    const basinNoise = remapNoise(
      fbm(
        this.noiseBasins,
        wx * scale * 0.52,
        wz * scale * 0.52,
        4,
        2.05,
        0.52,
      ),
    );
    const chainNoise = remapNoise(
      fbm(this.noiseChains, wx * scale * 0.4, wz * scale * 0.4, 4, 2.06, 0.54),
    );
    const highlandSignal = saturate(
      chainNoise * 0.82 + rugged * 0.78 - moisture * 0.08,
    );
    const basinWeight = saturate(
      (1 - basinNoise) * 0.72 +
        (1 - chainNoise) * 0.2 +
        moisture * 0.16 -
        rugged * 0.12,
    );

    const forestScore =
      Math.pow(
        saturate(
          moisture * 0.98 +
            (1 - rugged) * 0.58 +
            chainNoise * 0.12 -
            basinWeight * 0.08,
        ),
        2.2,
      ) * saturate(1 - Math.abs(temperature - 0.46) * 1.55);
    const grasslandScore = Math.pow(
      saturate(
        (1 - rugged) * 1.02 +
          (1 - Math.abs(moisture - 0.42)) * 0.46 +
          temperature * 0.18 -
          basinWeight * 0.08,
      ),
      1.9,
    );
    const mountainScore = Math.pow(
      saturate(highlandSignal * 1.15 + chainNoise * 0.42 + rugged * 0.3),
      2.8,
    );
    const swampScore = Math.pow(
      saturate(
        moisture * 1.14 +
          basinWeight * 1.05 -
          highlandSignal * 0.48 -
          temperature * 0.12,
      ),
      2.4,
    );
    const barrensScore = Math.pow(
      saturate(
        (1 - moisture) * 1.08 +
          rugged * 0.62 +
          chainNoise * 0.18 +
          temperature * 0.16,
      ),
      2.1,
    );

    const total =
      forestScore +
      grasslandScore +
      mountainScore +
      swampScore +
      barrensScore +
      1e-5;
    const forestWeight = forestScore / total;
    const grasslandWeight = grasslandScore / total;
    const mountainWeight = mountainScore / total;
    const swampWeight = swampScore / total;
    const barrensWeight = barrensScore / total;

    const rolling = fbm(
      this.noiseContinent,
      wx * scale * 0.86 + 19.0,
      wz * scale * 0.86 - 11.0,
      4,
      2.05,
      0.52,
    );
    const ridgePrimary = Math.pow(
      ridge(
        fbm(
          this.noiseRidges,
          wx * scale * 1.35,
          wz * scale * 1.35,
          5,
          2.2,
          0.56,
        ),
      ),
      3.8,
    );
    const ridgeSecondary = Math.pow(
      ridge(
        fbm(
          this.noiseCliffs,
          wx * scale * 3.25,
          wz * scale * 3.25,
          4,
          2.16,
          0.48,
        ),
      ),
      5.4,
    );
    const cliffNoise = saturate(ridgeSecondary * 1.35 - 0.18);
    const mountainMass = Math.pow(
      saturate(mountainWeight * 1.15 + highlandSignal * 0.42),
      1.55,
    );
    const mountainLift =
      mountainMass *
      (22 +
        ridgePrimary * this.settings.mountainHeight * 1.35 +
        cliffNoise * this.settings.mountainHeight * 0.55);
    const barrenLift =
      barrensWeight * (6 + rugged * 12 + ridgePrimary * 10 + cliffNoise * 6);
    const forestRelief = forestWeight * (5 + rolling * 7);
    const grassRelief = grasslandWeight * (2 + rolling * 4);
    const swampDepth = swampWeight * (14 + basinWeight * 12);
    const canyonCut = basinWeight * (6 + (1 - chainNoise) * 6);
    const detail =
      fbm(this.noiseDetail, wx * scale * 5.4, wz * scale * 5.4, 3, 2.45, 0.45) *
      (2.5 + rugged * 4.4 + mountainMass * 4.2);

    const height =
      continent * 24 +
      rolling * 9 +
      forestRelief +
      grassRelief +
      barrenLift +
      mountainLift +
      detail -
      canyonCut -
      swampDepth;

    const cliffiness = saturate(
      mountainMass * 0.35 + cliffNoise * 0.95 + rugged * 0.24,
    );
    const treeCluster = remapNoise(
      fbm(
        this.noiseTreeCluster,
        wx * scale * 2.1,
        wz * scale * 2.1,
        3,
        2.08,
        0.52,
      ),
    );
    const grassCluster = remapNoise(
      fbm(
        this.noiseGrassCluster,
        wx * scale * 2.5,
        wz * scale * 2.5,
        3,
        2.16,
        0.5,
      ),
    );
    const rockCluster = remapNoise(
      fbm(
        this.noiseRockScatter,
        wx * scale * 2.35,
        wz * scale * 2.35,
        3,
        2.14,
        0.52,
      ),
    );

    outColor.setRGB(
      FOREST_COLOR.r * forestWeight +
        GRASSLAND_COLOR.r * grasslandWeight +
        MOUNTAIN_COLOR.r * mountainWeight +
        SWAMP_COLOR.r * swampWeight +
        BARRENS_COLOR.r * barrensWeight,
      FOREST_COLOR.g * forestWeight +
        GRASSLAND_COLOR.g * grasslandWeight +
        MOUNTAIN_COLOR.g * mountainWeight +
        SWAMP_COLOR.g * swampWeight +
        BARRENS_COLOR.g * barrensWeight,
      FOREST_COLOR.b * forestWeight +
        GRASSLAND_COLOR.b * grasslandWeight +
        MOUNTAIN_COLOR.b * mountainWeight +
        SWAMP_COLOR.b * swampWeight +
        BARRENS_COLOR.b * barrensWeight,
    );
    outColor.lerp(TERRAIN_BASE_COLOR, 0.08 + cliffiness * 0.06);
    if (cliffiness > 0.45) {
      outColor.lerp(MOUNTAIN_COLOR, cliffiness * 0.2);
    }
    if (swampWeight > 0.42) {
      outColor.lerp(SWAMP_COLOR, swampWeight * 0.12);
    }

    return {
      height,
      dominantBiome: dominantBiome({
        forestWeight,
        grasslandWeight,
        mountainWeight,
        swampWeight,
        barrensWeight,
      }),
      forestWeight,
      grasslandWeight,
      mountainWeight,
      swampWeight,
      barrensWeight,
      basinWeight,
      cliffiness,
      treeCluster,
      grassCluster,
      rockCluster,
    };
  }
}
