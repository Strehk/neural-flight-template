import { createNoise2D } from "simplex-noise";
import * as THREE from "three";
import { seededRandom, seededRandom2D } from "$lib/three/random";
import {
  BAT_BIOME_COLORS,
  BAT_BIOME_ORDER,
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
  snowWeight: number;
  desertWeight: number;
  barrensWeight: number;
  basinWeight: number;
  cliffiness: number;
  treeCluster: number;
  grassCluster: number;
  rockCluster: number;
  clearingWeight: number;
  pondWeight: number;
  altitudeFactor: number;
  vegetationFactor: number;
  midAltitudeFactor: number;
  alpineFactor: number;
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
const SNOW_COLOR = new THREE.Color(BAT_BIOME_COLORS.snow);
const DESERT_COLOR = new THREE.Color(BAT_BIOME_COLORS.desert);
const BARRENS_COLOR = new THREE.Color(BAT_BIOME_COLORS.barrens);

// Daylight terrain colors — naturalistic biome ground colors
const TERRAIN_DAY_BASE = new THREE.Color("#8a9a80");   // neutral sage between biomes
const FOREST_DAY    = new THREE.Color("#553322");      // dark brown forest floor
const GRASSLAND_DAY = new THREE.Color("#a6d978");      // soft meadow green
const MOUNTAIN_DAY  = new THREE.Color("#9aabba");      // rocky alpine gray-blue
const SNOW_DAY      = new THREE.Color("#f3f7fb");      // snow pack
const DESERT_DAY    = new THREE.Color("#d8b66f");      // warm sand
const BARRENS_DAY   = new THREE.Color("#c0a055");      // warm sandy
const TREE_TRUNK_COLOR = new THREE.Color("#9b9789");
const PINE_CROWN_COLOR = new THREE.Color("#b8fff0");
const COMMON_CROWN_COLOR = new THREE.Color("#d8f4d4");
const BIRCH_CROWN_COLOR = new THREE.Color("#e4f1cf");
const WILLOW_CROWN_COLOR = new THREE.Color("#c7e5b0");
const DEAD_TREE_COLOR = new THREE.Color("#ddd4be");
const ROCK_COLOR = new THREE.Color("#d8e0eb");
const MOSS_ROCK_COLOR = new THREE.Color("#9fb48a");
const FOREST_PROP_COLOR = new THREE.Color("#9f8c70");
const ROCK_HIGHLIGHT = new THREE.Color("#f4f1e5");
const HIGH_MOUNTAIN_GRAY = new THREE.Color("#8a8f92");
const MID_MOUNTAIN_GRAY = new THREE.Color("#70777a");
const SNOW_TREE_COLOR = new THREE.Color("#eff7ff");
const SNOW_ROCK_COLOR = new THREE.Color("#eef4fb");
const GRASS_COLOR = new THREE.Color("#d7f0b4");
const BUSH_COLOR = new THREE.Color("#9fd07e");
const FLOWER_COLOR = new THREE.Color("#ffd5dc");
const WATER_COLOR = new THREE.Color("#4f8fa7");
const NOIR_WATER_COLOR = new THREE.Color("#f1f1ea");
const PALM_COLOR = new THREE.Color("#3f7b38");
const CACTUS_COLOR = new THREE.Color("#6ca35a");
const MOTH_CORE_COLOR = new THREE.Color("#ffb0b0");
const MOTH_FOREST_COLOR = new THREE.Color("#ff4b57");
const MOTH_DESERT_COLOR = new THREE.Color("#ff9f55");
const MOTH_GRASSLAND_COLOR = new THREE.Color("#ff5f4d");
const MOTH_BARRENS_COLOR = new THREE.Color("#ff7a63");
const MOTH_MOUNTAIN_COLOR = new THREE.Color("#ff6f7f");
const MOTH_SNOW_COLOR = new THREE.Color("#ff9fb8");
const DEFAULT_INSTANCE_COLOR = new THREE.Color("#ffffff");
const MOUNTAIN_GRAY_HEIGHT_START = 14;
const MOUNTAIN_GRAY_HEIGHT_END = 86;
const VEGETATION_HEIGHT_START = 8;
const VEGETATION_HEIGHT_END = 58;
const MID_ALTITUDE_START = 22;
const MID_ALTITUDE_PEAK = 54;
const ALPINE_HEIGHT_START = 48;
const ALPINE_HEIGHT_END = 88;
const CLEARING_SCALE = 0.0105;
const POND_CELL_SIZE = 82;
const POND_RADIUS_MIN = 7;
const POND_RADIUS_MAX = 16;
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

function smoothRange(value: number, start: number, end: number): number {
  const t = saturate((value - start) / Math.max(end - start, 1e-4));
  return t * t * (3 - 2 * t);
}

function smoothPeak(value: number, center: number, halfWidth: number): number {
  const t = saturate(1 - Math.abs(value - center) / Math.max(halfWidth, 1e-4));
  return t * t * (3 - 2 * t);
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
  snowWeight: number;
  desertWeight: number;
  barrensWeight: number;
}): BatBiomeId {
  if (
    point.snowWeight > point.forestWeight &&
    point.snowWeight > point.grasslandWeight &&
    point.snowWeight > point.mountainWeight &&
    point.snowWeight > point.desertWeight &&
    point.snowWeight > point.barrensWeight
  ) {
    return "snow";
  }

  if (
    point.mountainWeight > point.forestWeight &&
    point.mountainWeight > point.grasslandWeight &&
    point.mountainWeight > point.snowWeight &&
    point.mountainWeight > point.desertWeight &&
    point.mountainWeight > point.barrensWeight
  ) {
    return "mountains";
  }

  if (
    point.forestWeight > point.grasslandWeight &&
    point.forestWeight > point.snowWeight &&
    point.forestWeight > point.desertWeight &&
    point.forestWeight > point.barrensWeight
  ) {
    return "forest";
  }

  if (
    point.desertWeight > point.grasslandWeight &&
    point.desertWeight > point.snowWeight &&
    point.desertWeight > point.barrensWeight
  ) {
    return "desert";
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
  readonly pondMaterial: THREE.MeshBasicMaterial;
  readonly pineTreeGeometry: THREE.BufferGeometry;
  readonly commonTreeGeometry: THREE.BufferGeometry;
  readonly birchTreeGeometry: THREE.BufferGeometry;
  readonly willowTreeGeometry: THREE.BufferGeometry;
  readonly deadTreeGeometry: THREE.BufferGeometry;
  readonly snowTreeGeometry: THREE.BufferGeometry;
  readonly palmTreeGeometry: THREE.BufferGeometry;
  readonly cactusGeometry: THREE.BufferGeometry;
  readonly rockGeometry: THREE.BufferGeometry;
  readonly mossRockGeometry: THREE.BufferGeometry;
  readonly snowRockGeometry: THREE.BufferGeometry;
  readonly grassGeometry: THREE.BufferGeometry;
  readonly bushGeometry: THREE.BufferGeometry;
  readonly flowerGeometry: THREE.BufferGeometry;
  readonly forestPropGeometry: THREE.BufferGeometry;
  readonly snowPlantGeometry: THREE.BufferGeometry;
  readonly pondGeometry: THREE.BufferGeometry;
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
  private mothScaleFactor = 1;
  private biomeOverride: BatBiomeId | null = null;

  constructor(
    settings: BatWorldSettings,
    options?: {
      mothGeometry?: THREE.BufferGeometry | null;
      pineTree?: THREE.BufferGeometry | null;
      commonTree?: THREE.BufferGeometry | null;
      birchTree?: THREE.BufferGeometry | null;
      willowTree?: THREE.BufferGeometry | null;
      deadTree?: THREE.BufferGeometry | null;
      snowTree?: THREE.BufferGeometry | null;
      palmTree?: THREE.BufferGeometry | null;
      cactus?: THREE.BufferGeometry | null;
      rock?: THREE.BufferGeometry | null;
      mossRock?: THREE.BufferGeometry | null;
      snowRock?: THREE.BufferGeometry | null;
      grass?: THREE.BufferGeometry | null;
      bush?: THREE.BufferGeometry | null;
      flower?: THREE.BufferGeometry | null;
      forestProp?: THREE.BufferGeometry | null;
      snowPlant?: THREE.BufferGeometry | null;
    },
  ) {
    this.settings = { ...settings };
    this.sharedUniforms = createSharedEchoUniforms();
    this.terrainMaterial = createTerrainRevealMaterial(this.sharedUniforms);
    this.trunkMaterial = createInstancedRevealMaterial(this.sharedUniforms, {
      tintColor: "#f4f0df",
      daylightTintColor: "#6b4a28",  // brown wood
      fillStrength: 0.08,
      edgeStrength: 1.18,
      silhouetteStrength: 0.9,
      baseVisibilityBoost: 0.74,
    });
    this.crownMaterial = createInstancedRevealMaterial(this.sharedUniforms, {
      tintColor: "#effff8",
      daylightTintColor: "#2e6828",  // forest green
      fillStrength: 0.1,
      edgeStrength: 1.55,
      silhouetteStrength: 1.05,
      baseVisibilityBoost: 0.56,
    });
    this.rockMaterial = createInstancedRevealMaterial(this.sharedUniforms, {
      tintColor: "#f0f7ff",
      daylightTintColor: "#808890",  // gray rock
      fillStrength: 0.1,
      edgeStrength: 1.72,
      silhouetteStrength: 0.96,
      baseVisibilityBoost: 0.86,
    });
    this.grassMaterial = createInstancedRevealMaterial(this.sharedUniforms, {
      tintColor: "#efffd6",
      daylightTintColor: "#74c038",  // light meadow green
      fillStrength: 0.06,
      edgeStrength: 1.04,
      silhouetteStrength: 0.46,
      baseVisibilityBoost: 0.3,
      doubleSided: true,
    });
    this.mothMaterial = createInstancedRevealMaterial(this.sharedUniforms, {
      tintColor: "#ff3649",
      daylightTintColor: "#ff3649",  // keep red — moths should stand out in both modes
      fillStrength: 0,
      edgeStrength: 6.2,
      silhouetteStrength: 0,
      baseVisibilityBoost: 0,
      trailBoost: BAT_MOTH_DEFAULTS.echoTrailBoost,
      pulseBoost: BAT_MOTH_DEFAULTS.echoPulseBoost,
      doubleSided: true,
    });
    this.pondMaterial = new THREE.MeshBasicMaterial({
      color: WATER_COLOR,
      transparent: true,
      opacity: 0.76,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true,
    });

    const srcPineTree =
      options?.pineTree ?? new THREE.ConeGeometry(1.0, 4.4, 7, 2, false);
    this.pineTreeGeometry = addBarycentricAttribute(srcPineTree);
    srcPineTree.dispose();

    const srcCommonTree =
      options?.commonTree ?? new THREE.IcosahedronGeometry(2.1, 0);
    this.commonTreeGeometry = addBarycentricAttribute(srcCommonTree);
    srcCommonTree.dispose();

    const srcBirchTree =
      options?.birchTree ?? this.commonTreeGeometry.clone();
    this.birchTreeGeometry = addBarycentricAttribute(srcBirchTree);
    srcBirchTree.dispose();

    const srcWillowTree =
      options?.willowTree ?? this.commonTreeGeometry.clone();
    this.willowTreeGeometry = addBarycentricAttribute(srcWillowTree);
    srcWillowTree.dispose();

    const srcDeadTree =
      options?.deadTree ?? new THREE.CylinderGeometry(0.2, 0.3, 3.1, 5, 1, false);
    this.deadTreeGeometry = addBarycentricAttribute(srcDeadTree);
    srcDeadTree.dispose();

    const srcSnowTree =
      options?.snowTree ?? this.pineTreeGeometry.clone();
    this.snowTreeGeometry = addBarycentricAttribute(srcSnowTree);
    srcSnowTree.dispose();

    const srcPalmTree =
      options?.palmTree ?? new THREE.ConeGeometry(0.9, 4.8, 7, 2, false);
    this.palmTreeGeometry = addBarycentricAttribute(srcPalmTree);
    srcPalmTree.dispose();

    const srcCactus =
      options?.cactus ?? new THREE.CylinderGeometry(0.22, 0.28, 1.7, 6, 1, false);
    this.cactusGeometry = addBarycentricAttribute(srcCactus);
    srcCactus.dispose();

    const srcRock = options?.rock ?? new THREE.DodecahedronGeometry(0.95, 0);
    this.rockGeometry = addBarycentricAttribute(srcRock);
    srcRock.dispose();

    const srcMossRock = options?.mossRock ?? this.rockGeometry.clone();
    this.mossRockGeometry = addBarycentricAttribute(srcMossRock);
    srcMossRock.dispose();

    const srcSnowRock = options?.snowRock ?? this.rockGeometry.clone();
    this.snowRockGeometry = addBarycentricAttribute(srcSnowRock);
    srcSnowRock.dispose();

    const srcGrass = options?.grass ?? new THREE.ConeGeometry(0.16, 1.0, 3, 1, false);
    this.grassGeometry = addBarycentricAttribute(srcGrass);
    srcGrass.dispose();

    const srcBush =
      options?.bush ?? new THREE.ConeGeometry(0.42, 1.2, 5, 1, false);
    this.bushGeometry = addBarycentricAttribute(srcBush);
    srcBush.dispose();

    const srcFlower =
      options?.flower ?? new THREE.ConeGeometry(0.12, 0.62, 5, 1, false);
    this.flowerGeometry = addBarycentricAttribute(srcFlower);
    srcFlower.dispose();

    const srcForestProp =
      options?.forestProp ?? this.deadTreeGeometry.clone();
    this.forestPropGeometry = addBarycentricAttribute(srcForestProp);
    srcForestProp.dispose();

    const srcSnowPlant = options?.snowPlant ?? this.grassGeometry.clone();
    this.snowPlantGeometry = addBarycentricAttribute(srcSnowPlant);
    srcSnowPlant.dispose();

    this.pondGeometry = new THREE.CircleGeometry(1, 24);
    this.pondGeometry.rotateX(-Math.PI / 2);

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

  setMothScale(factor: number): void {
    this.mothScaleFactor = factor;
  }

  setMonochromeFactors(
    whiteoutFactor: number,
    edgeFactor: number,
    shadowFactor: number,
  ): void {
    const baseOnly = saturate(whiteoutFactor);
    const structure = saturate(edgeFactor);
    const shadow = saturate(shadowFactor);
    const monochrome = saturate(Math.max(baseOnly, structure, shadow));
    this.pondMaterial.color.copy(WATER_COLOR).lerp(NOIR_WATER_COLOR, monochrome);
    const targetOpacity = baseOnly > 0.01 ? 0.18 : shadow > 0.01 ? 0.62 : 0.42;
    this.pondMaterial.opacity = THREE.MathUtils.lerp(
      0.76,
      targetOpacity,
      monochrome,
    );
  }

  sampleHeight(x: number, z: number): number {
    return this.sampleTerrainPoint(x, z, this.sampleColorA).height;
  }

  sampleBiome(x: number, z: number): BatBiomeId {
    return this.sampleTerrainPoint(x, z, this.sampleColorA).dominantBiome;
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
    this.pondMaterial.dispose();
    this.pineTreeGeometry.dispose();
    this.commonTreeGeometry.dispose();
    this.birchTreeGeometry.dispose();
    this.willowTreeGeometry.dispose();
    this.deadTreeGeometry.dispose();
    this.snowTreeGeometry.dispose();
    this.palmTreeGeometry.dispose();
    this.cactusGeometry.dispose();
    this.rockGeometry.dispose();
    this.mossRockGeometry.dispose();
    this.snowRockGeometry.dispose();
    this.grassGeometry.dispose();
    this.bushGeometry.dispose();
    this.flowerGeometry.dispose();
    this.forestPropGeometry.dispose();
    this.snowPlantGeometry.dispose();
    this.pondGeometry.dispose();
    this.mothGeometry.dispose();
  }

  getCollectedMothCount(): number {
    return this.collectedMothCount;
  }

  getBiomeOverride(): BatBiomeId | null {
    return this.biomeOverride;
  }

  setBiomeOverride(biome: BatBiomeId | null): void {
    if (biome !== null && !BAT_BIOME_ORDER.includes(biome)) return;
    if (this.biomeOverride === biome) return;
    this.biomeOverride = biome;
    this.rebuild();
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
      this.mothDummy.scale.setScalar(candidate.scale * 0.64 * this.mothScaleFactor);
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
        point.desertWeight * 0.76 +
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
        point.desertWeight * 0.18);
    const hoverHeight = THREE.MathUtils.lerp(
      BAT_MOTH_DEFAULTS.minHoverHeight,
      BAT_MOTH_DEFAULTS.maxHoverHeight,
      saturate(
        0.18 +
          point.treeCluster * 0.32 +
          point.grassCluster * 0.18 +
          point.desertWeight * 0.2 +
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
          point.desertWeight * 0.04) *
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
          point.desertWeight * 0.04) *
        (0.94 + proximityBoost * 0.14),
      biome: point.dominantBiome,
      tint: seededRandom2D(baseSeed, 479),
    };
  }

  private sampleMothColor(biome: BatBiomeId, tint: number): THREE.Color {
    const biomeColor =
      biome === "forest"
        ? MOTH_FOREST_COLOR
        : biome === "desert"
          ? MOTH_DESERT_COLOR
          : biome === "grassland"
          ? MOTH_GRASSLAND_COLOR
          : biome === "barrens"
            ? MOTH_BARRENS_COLOR
            : biome === "snow"
              ? MOTH_SNOW_COLOR
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
    const colors    = new Float32Array(positions.count * 3);
    const dayColors = new Float32Array(positions.count * 3);
    const tempColor    = new THREE.Color();
    const tempDayColor = new THREE.Color();

    for (let i = 0; i < positions.count; i++) {
      const wx = positions.getX(i) + gridX * this.settings.chunkSize;
      const wz = positions.getZ(i) + gridZ * this.settings.chunkSize;
      const point = this.sampleTerrainPoint(wx, wz, tempColor);
      positions.setY(i, point.height);
      colors[i * 3]     = tempColor.r;
      colors[i * 3 + 1] = tempColor.g;
      colors[i * 3 + 2] = tempColor.b;

      // Daylight color: weighted blend of naturalistic biome colors
      tempDayColor.setRGB(
        FOREST_DAY.r * point.forestWeight + GRASSLAND_DAY.r * point.grasslandWeight +
          MOUNTAIN_DAY.r * point.mountainWeight + SNOW_DAY.r * point.snowWeight +
          DESERT_DAY.r * point.desertWeight +
          BARRENS_DAY.r * point.barrensWeight,
        FOREST_DAY.g * point.forestWeight + GRASSLAND_DAY.g * point.grasslandWeight +
          MOUNTAIN_DAY.g * point.mountainWeight + SNOW_DAY.g * point.snowWeight +
          DESERT_DAY.g * point.desertWeight +
          BARRENS_DAY.g * point.barrensWeight,
        FOREST_DAY.b * point.forestWeight + GRASSLAND_DAY.b * point.grasslandWeight +
          MOUNTAIN_DAY.b * point.mountainWeight + SNOW_DAY.b * point.snowWeight +
          DESERT_DAY.b * point.desertWeight +
          BARRENS_DAY.b * point.barrensWeight,
      );
      tempDayColor.lerp(TERRAIN_DAY_BASE, 0.06 + point.cliffiness * 0.06);
      if (point.cliffiness > 0.45) tempDayColor.lerp(MOUNTAIN_DAY, point.cliffiness * 0.22);
      tempDayColor.lerp(
        MID_MOUNTAIN_GRAY,
        point.midAltitudeFactor * (0.18 + point.mountainWeight * 0.2),
      );
      tempDayColor.lerp(
        HIGH_MOUNTAIN_GRAY,
        point.altitudeFactor * (0.3 + point.mountainWeight * 0.46),
      );
      if (point.snowWeight > 0.34) tempDayColor.lerp(SNOW_DAY, point.snowWeight * 0.82);
      if (point.desertWeight > 0.42) tempDayColor.lerp(DESERT_DAY, point.desertWeight * 0.12);
      if (point.pondWeight > 0.08) tempDayColor.lerp(WATER_COLOR, point.pondWeight * 0.42);

      dayColors[i * 3]     = tempDayColor.r;
      dayColors[i * 3 + 1] = tempDayColor.g;
      dayColors[i * 3 + 2] = tempDayColor.b;
    }

    geometry.setAttribute("color",    new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("dayColor", new THREE.BufferAttribute(dayColors, 3));
    geometry.computeVertexNormals();
    return geometry;
  }

  private sampleForestSection(x: number, z: number): number {
    return remapNoise(
      fbm(this.noiseTreeCluster, x * 0.0024 + 41, z * 0.0024 - 29, 3, 2.05, 0.52),
    );
  }

  private createDecorations(gridX: number, gridZ: number): THREE.Group {
    const group = new THREE.Group();
    const size = this.settings.chunkSize;
    const baseSeed = gridX * 73856093 + gridZ * 19349663;
    const pineCapacity = Math.max(
      34,
      Math.round(this.settings.treeDensity * 4.7),
    );
    const commonCapacity = Math.max(
      32,
      Math.round(this.settings.treeDensity * 4.4),
    );
    const birchCapacity = Math.max(
      24,
      Math.round(this.settings.treeDensity * 3.2),
    );
    const willowCapacity = Math.max(
      18,
      Math.round(this.settings.treeDensity * 2.3),
    );
    const deadCapacity = Math.max(
      4,
      Math.round(this.settings.treeDensity * 0.42),
    );
    const snowCapacity = Math.max(
      8,
      Math.round(this.settings.treeDensity * 0.95),
    );
    const palmCapacity = Math.max(
      2,
      Math.round(this.settings.treeDensity * 0.16),
    );
    const cactusCapacity = Math.max(
      4,
      Math.round(this.settings.grassDensity * 0.2),
    );
    const grassCapacity = Math.max(
      260,
      Math.round(this.settings.grassDensity * 24),
    );
    const bushCapacity = Math.max(
      26,
      Math.round(this.settings.grassDensity * 2.4),
    );
    const flowerCapacity = Math.max(
      36,
      Math.round(this.settings.grassDensity * 3.6),
    );
    const forestPropCapacity = Math.max(
      10,
      Math.round(this.settings.treeDensity * 0.9),
    );
    const snowPlantCapacity = Math.max(
      8,
      Math.round(this.settings.grassDensity * 0.8),
    );
    const rockCapacity = Math.max(
      10,
      Math.round(14 + this.settings.mountainHeight * 0.22),
    );
    const snowRockCapacity = Math.max(
      8,
      Math.round(10 + this.settings.mountainHeight * 0.16),
    );
    const mossRockCapacity = Math.max(
      8,
      Math.round(7 + this.settings.treeDensity * 0.72),
    );
    const pondCapacity = 5;

    const pineTrees = new THREE.InstancedMesh(
      this.pineTreeGeometry,
      this.crownMaterial,
      pineCapacity,
    );
    const commonTrees = new THREE.InstancedMesh(
      this.commonTreeGeometry,
      this.crownMaterial,
      commonCapacity,
    );
    const birchTrees = new THREE.InstancedMesh(
      this.birchTreeGeometry,
      this.crownMaterial,
      birchCapacity,
    );
    const willowTrees = new THREE.InstancedMesh(
      this.willowTreeGeometry,
      this.crownMaterial,
      willowCapacity,
    );
    const deadTrees = new THREE.InstancedMesh(
      this.deadTreeGeometry,
      this.trunkMaterial,
      deadCapacity,
    );
    const snowTrees = new THREE.InstancedMesh(
      this.snowTreeGeometry,
      this.crownMaterial,
      snowCapacity,
    );
    const palmTrees = new THREE.InstancedMesh(
      this.palmTreeGeometry,
      this.crownMaterial,
      palmCapacity,
    );
    const cacti = new THREE.InstancedMesh(
      this.cactusGeometry,
      this.grassMaterial,
      cactusCapacity,
    );
    const rocks = new THREE.InstancedMesh(
      this.rockGeometry,
      this.rockMaterial,
      rockCapacity,
    );
    const mossRocks = new THREE.InstancedMesh(
      this.mossRockGeometry,
      this.rockMaterial,
      mossRockCapacity,
    );
    const snowRocks = new THREE.InstancedMesh(
      this.snowRockGeometry,
      this.rockMaterial,
      snowRockCapacity,
    );
    const grass = new THREE.InstancedMesh(
      this.grassGeometry,
      this.grassMaterial,
      grassCapacity,
    );
    const bushes = new THREE.InstancedMesh(
      this.bushGeometry,
      this.grassMaterial,
      bushCapacity,
    );
    const flowers = new THREE.InstancedMesh(
      this.flowerGeometry,
      this.grassMaterial,
      flowerCapacity,
    );
    const forestProps = new THREE.InstancedMesh(
      this.forestPropGeometry,
      this.trunkMaterial,
      forestPropCapacity,
    );
    const snowPlants = new THREE.InstancedMesh(
      this.snowPlantGeometry,
      this.grassMaterial,
      snowPlantCapacity,
    );
    const ponds = new THREE.InstancedMesh(
      this.pondGeometry,
      this.pondMaterial,
      pondCapacity,
    );
    pineTrees.userData.echoSurface = "tree";
    commonTrees.userData.echoSurface = "tree";
    birchTrees.userData.echoSurface = "tree";
    willowTrees.userData.echoSurface = "tree";
    deadTrees.userData.echoSurface = "tree";
    snowTrees.userData.echoSurface = "tree";
    palmTrees.userData.echoSurface = "tree";
    cacti.userData.echoSurface = "grass";
    rocks.userData.echoSurface = "rock";
    mossRocks.userData.echoSurface = "rock";
    snowRocks.userData.echoSurface = "rock";
    grass.userData.echoSurface = "grass";
    bushes.userData.echoSurface = "grass";
    flowers.userData.echoSurface = "grass";
    forestProps.userData.echoSurface = "tree";
    snowPlants.userData.echoSurface = "grass";
    ponds.userData.echoSurface = "terrain";
    ponds.renderOrder = 2;

    const dummy = new THREE.Object3D();
    const tempColor = new THREE.Color();
    let pineIndex = 0;
    let commonIndex = 0;
    let birchIndex = 0;
    let willowIndex = 0;
    let deadIndex = 0;
    let snowIndex = 0;
    let palmIndex = 0;
    let cactusIndex = 0;
    let rockIndex = 0;
    let mossRockIndex = 0;
    let snowRockIndex = 0;
    let grassIndex = 0;
    let bushIndex = 0;
    let flowerIndex = 0;
    let forestPropIndex = 0;
    let snowPlantIndex = 0;
    let pondIndex = 0;

    for (let i = 0; i < pineCapacity * 8 && pineIndex < pineCapacity; i++) {
      const lx = (seededRandom2D(baseSeed + i, 17) - 0.5) * size;
      const lz = (seededRandom2D(baseSeed + i, 31) - 0.5) * size;
      const wx = lx + gridX * size;
      const wz = lz + gridZ * size;
      const point = this.sampleTerrainPoint(wx, wz, tempColor);
      if (
        point.snowWeight > 0.38 ||
        point.mountainWeight > 0.42 ||
        point.desertWeight > 0.35
      ) {
        continue;
      }
      const section = this.sampleForestSection(wx, wz);
      const sectionFavor = smoothPeak(section, 0.13, 0.19);
      const pineChance = saturate(
        (point.forestWeight * (0.88 + sectionFavor * 1.85) +
          point.treeCluster * point.forestWeight * 0.78) *
          point.vegetationFactor +
          point.forestWeight * 0.22 -
          point.grasslandWeight * 0.62 -
          point.clearingWeight * 1.42 -
          point.pondWeight * 1.24 -
          point.mountainWeight * 0.68 -
          point.alpineFactor * 1.16 -
          point.snowWeight * 1.18 -
          point.desertWeight * 1.1 -
          point.cliffiness * 0.36 -
          point.barrensWeight * 0.62,
      );
      if (seededRandom2D(baseSeed + i, 53) > pineChance) continue;

      const scale =
        0.9 +
        seededRandom2D(baseSeed + i, 61) * 2.5 +
        point.mountainWeight * 0.25;
      const crownColor = this.sampleColorB
        .copy(tempColor)
        .lerp(PINE_CROWN_COLOR, 0.55 + point.forestWeight * 0.18);

      dummy.position.set(lx, point.height + 2.2 * scale, lz);
      dummy.scale.set(scale * 0.72, scale, scale * 0.72);
      dummy.rotation.set(0, seededRandom2D(baseSeed + i, 67) * Math.PI, 0);
      dummy.updateMatrix();
      pineTrees.setMatrixAt(pineIndex, dummy.matrix);
      pineTrees.setColorAt(pineIndex, crownColor);
      pineIndex++;
    }

    for (let i = 0; i < commonCapacity * 8 && commonIndex < commonCapacity; i++) {
      const lx = (seededRandom2D(baseSeed + i, 89) - 0.5) * size;
      const lz = (seededRandom2D(baseSeed + i, 97) - 0.5) * size;
      const wx = lx + gridX * size;
      const wz = lz + gridZ * size;
      const point = this.sampleTerrainPoint(wx, wz, tempColor);
      if (
        point.snowWeight > 0.38 ||
        point.mountainWeight > 0.42 ||
        point.desertWeight > 0.35
      ) {
        continue;
      }
      const section = this.sampleForestSection(wx, wz);
      const sectionFavor = smoothPeak(section, 0.39, 0.2);
      const commonChance = saturate(
        (point.forestWeight * (0.9 + sectionFavor * 1.65) +
          point.treeCluster * point.forestWeight * 0.66) *
          point.vegetationFactor +
          point.forestWeight * 0.18 -
          point.grasslandWeight * 0.72 -
          point.clearingWeight * 1.28 -
          point.pondWeight * 1.12 -
          point.mountainWeight * 0.56 -
          point.alpineFactor -
          point.snowWeight * 1.12 -
          point.desertWeight * 1.08 -
          point.barrensWeight * 0.46 -
          point.cliffiness * 0.3,
      );
      if (seededRandom2D(baseSeed + i, 109) > commonChance) continue;

      const scale = 0.88 + seededRandom2D(baseSeed + i, 127) * 1.9;
      const crownColor = this.sampleColorB
        .copy(tempColor)
        .lerp(COMMON_CROWN_COLOR, 0.54);

      dummy.position.set(lx, point.height + 2.08 * scale, lz);
      dummy.scale.set(scale * 0.92, scale, scale * 0.92);
      dummy.rotation.set(
        seededRandom2D(baseSeed + i, 137) * 0.18,
        seededRandom2D(baseSeed + i, 149) * Math.PI,
        seededRandom2D(baseSeed + i, 151) * 0.18,
      );
      dummy.updateMatrix();
      commonTrees.setMatrixAt(commonIndex, dummy.matrix);
      commonTrees.setColorAt(commonIndex, crownColor);
      commonIndex++;
    }

    for (let i = 0; i < birchCapacity * 8 && birchIndex < birchCapacity; i++) {
      const lx = (seededRandom2D(baseSeed + i, 563) - 0.5) * size;
      const lz = (seededRandom2D(baseSeed + i, 569) - 0.5) * size;
      const wx = lx + gridX * size;
      const wz = lz + gridZ * size;
      const point = this.sampleTerrainPoint(wx, wz, tempColor);
      if (
        point.snowWeight > 0.38 ||
        point.mountainWeight > 0.42 ||
        point.desertWeight > 0.35
      ) {
        continue;
      }
      const section = this.sampleForestSection(wx, wz);
      const sectionFavor = smoothPeak(section, 0.62, 0.18);
      const birchChance = saturate(
        (point.forestWeight * (0.72 + sectionFavor * 1.7) +
          point.treeCluster * point.forestWeight * 0.52 +
          point.clearingWeight * 0.16) *
          point.vegetationFactor -
          point.grasslandWeight * 0.66 -
          point.clearingWeight * 0.96 -
          point.pondWeight * 1.16 -
          point.mountainWeight * 0.62 -
          point.alpineFactor * 1.02 -
          point.snowWeight * 1.08 -
          point.desertWeight * 1.04 -
          point.barrensWeight * 0.44 -
          point.cliffiness * 0.3,
      );
      if (seededRandom2D(baseSeed + i, 571) > birchChance) continue;

      const scale = 0.72 + seededRandom2D(baseSeed + i, 577) * 1.5;
      const crownColor = this.sampleColorB
        .copy(tempColor)
        .lerp(BIRCH_CROWN_COLOR, 0.58);

      dummy.position.set(lx, point.height + 2.02 * scale, lz);
      dummy.scale.set(scale * 0.78, scale * 0.96, scale * 0.78);
      dummy.rotation.set(
        seededRandom2D(baseSeed + i, 587) * 0.14,
        seededRandom2D(baseSeed + i, 593) * Math.PI,
        seededRandom2D(baseSeed + i, 599) * 0.14,
      );
      dummy.updateMatrix();
      birchTrees.setMatrixAt(birchIndex, dummy.matrix);
      birchTrees.setColorAt(birchIndex, crownColor);
      birchIndex++;
    }

    for (let i = 0; i < willowCapacity * 9 && willowIndex < willowCapacity; i++) {
      const lx = (seededRandom2D(baseSeed + i, 521) - 0.5) * size;
      const lz = (seededRandom2D(baseSeed + i, 523) - 0.5) * size;
      const wx = lx + gridX * size;
      const wz = lz + gridZ * size;
      const point = this.sampleTerrainPoint(wx, wz, tempColor);
      if (
        point.snowWeight > 0.38 ||
        point.mountainWeight > 0.42 ||
        point.desertWeight > 0.35
      ) {
        continue;
      }
      const section = this.sampleForestSection(wx, wz);
      const sectionFavor = smoothPeak(section, 0.84, 0.17);
      const willowChance = saturate(
        (point.forestWeight * (0.58 + sectionFavor * 1.7) +
          point.treeCluster * point.forestWeight * 0.38 +
          point.pondWeight * 0.34) *
          point.vegetationFactor -
          point.grasslandWeight * 0.64 -
          point.clearingWeight * 1.0 -
          point.mountainWeight * 0.66 -
          point.alpineFactor -
          point.snowWeight * 1.08 -
          point.desertWeight * 1.08 -
          point.barrensWeight * 0.52 -
          point.cliffiness * 0.34,
      );
      if (seededRandom2D(baseSeed + i, 541) > willowChance) continue;

      const scale = 0.72 + seededRandom2D(baseSeed + i, 547) * 1.45;
      const crownColor = this.sampleColorB
        .copy(tempColor)
        .lerp(WILLOW_CROWN_COLOR, 0.6);

      dummy.position.set(lx, point.height + 1.92 * scale, lz);
      dummy.scale.set(scale * 0.86, scale * 0.9, scale * 0.86);
      dummy.rotation.set(
        seededRandom2D(baseSeed + i, 557) * 0.14,
        seededRandom2D(baseSeed + i, 559) * Math.PI,
        seededRandom2D(baseSeed + i, 561) * 0.14,
      );
      dummy.updateMatrix();
      willowTrees.setMatrixAt(willowIndex, dummy.matrix);
      willowTrees.setColorAt(willowIndex, crownColor);
      willowIndex++;
    }

    for (let i = 0; i < deadCapacity * 6 && deadIndex < deadCapacity; i++) {
      const lx = (seededRandom2D(baseSeed + i, 173) - 0.5) * size;
      const lz = (seededRandom2D(baseSeed + i, 181) - 0.5) * size;
      const wx = lx + gridX * size;
      const wz = lz + gridZ * size;
      const point = this.sampleTerrainPoint(wx, wz, tempColor);
      if (point.snowWeight > 0.42 || point.grasslandWeight > 0.5) continue;
      const deadChance = saturate(
        point.midAltitudeFactor * 0.95 +
          point.barrensWeight * 0.74 +
          point.mountainWeight * 0.34 +
          point.cliffiness * 0.18 +
          point.rockCluster * 0.2 -
          point.grasslandWeight * 0.46 -
          point.alpineFactor * 0.5 -
          point.forestWeight * 0.24 -
          point.snowWeight * 0.72 -
          point.desertWeight * 0.56,
      );
      if (seededRandom2D(baseSeed + i, 191) > deadChance) continue;

      const scale =
        0.75 +
        seededRandom2D(baseSeed + i, 197) * 1.8 +
        point.barrensWeight * 0.32 +
        point.midAltitudeFactor * 0.28;
      dummy.position.set(lx, point.height + 1.55 * scale, lz);
      dummy.scale.set(scale * 0.86, scale, scale * 0.86);
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

    for (let i = 0; i < snowCapacity * 6 && snowIndex < snowCapacity; i++) {
      const lx = (seededRandom2D(baseSeed + i, 311) - 0.5) * size;
      const lz = (seededRandom2D(baseSeed + i, 317) - 0.5) * size;
      const wx = lx + gridX * size;
      const wz = lz + gridZ * size;
      const point = this.sampleTerrainPoint(wx, wz, tempColor);
      const snowChance = saturate(
        (point.snowWeight * 1.18 +
          point.treeCluster * 0.48 +
          point.mountainWeight * 0.12) *
          (1 - point.alpineFactor * 0.74) -
          point.cliffiness * 0.38 -
          point.desertWeight * 0.34,
      );
      if (seededRandom2D(baseSeed + i, 331) > snowChance) continue;

      const scale =
        0.82 +
        seededRandom2D(baseSeed + i, 337) * 1.75 +
        point.snowWeight * 0.35;
      dummy.position.set(lx, point.height + 2.15 * scale, lz);
      dummy.scale.set(scale * 0.82, scale, scale * 0.82);
      dummy.rotation.set(
        seededRandom2D(baseSeed + i, 347) * 0.08,
        seededRandom2D(baseSeed + i, 349) * Math.PI,
        seededRandom2D(baseSeed + i, 353) * 0.08,
      );
      dummy.updateMatrix();
      snowTrees.setMatrixAt(snowIndex, dummy.matrix);
      snowTrees.setColorAt(
        snowIndex,
        tempColor.copy(SNOW_TREE_COLOR).lerp(SNOW_COLOR, 0.22),
      );
      snowIndex++;
    }

    for (let i = 0; i < palmCapacity * 6 && palmIndex < palmCapacity; i++) {
      const lx = (seededRandom2D(baseSeed + i, 401) - 0.5) * size;
      const lz = (seededRandom2D(baseSeed + i, 409) - 0.5) * size;
      const wx = lx + gridX * size;
      const wz = lz + gridZ * size;
      const point = this.sampleTerrainPoint(wx, wz, tempColor);
      if (
        point.snowWeight > 0.25 ||
        point.forestWeight > 0.25 ||
        point.grasslandWeight > 0.35 ||
        point.mountainWeight > 0.35
      ) {
        continue;
      }
      const palmChance = saturate(
        point.desertWeight * 0.34 +
          point.treeCluster * 0.06 -
          point.forestWeight * 1.2 -
          point.grasslandWeight * 0.92 -
          point.snowWeight * 1.2 -
          point.mountainWeight * 0.34 -
          point.alpineFactor * 0.9 -
          point.cliffiness * 0.42,
      );
      if (seededRandom2D(baseSeed + i, 419) > palmChance) continue;

      const scale =
        0.78 +
        seededRandom2D(baseSeed + i, 421) * 1.55 +
        point.desertWeight * 0.36;
      dummy.position.set(lx, point.height + 2.4 * scale, lz);
      dummy.scale.set(scale * 0.88, scale, scale * 0.88);
      dummy.rotation.set(
        seededRandom2D(baseSeed + i, 431) * 0.08,
        seededRandom2D(baseSeed + i, 433) * Math.PI,
        seededRandom2D(baseSeed + i, 439) * 0.08,
      );
      dummy.updateMatrix();
      palmTrees.setMatrixAt(palmIndex, dummy.matrix);
      palmTrees.setColorAt(
        palmIndex,
        tempColor.copy(PALM_COLOR).lerp(DESERT_DAY, 0.18),
      );
      palmIndex++;
    }

    for (let i = 0; i < cactusCapacity * 6 && cactusIndex < cactusCapacity; i++) {
      const lx = (seededRandom2D(baseSeed + i, 443) - 0.5) * size;
      const lz = (seededRandom2D(baseSeed + i, 449) - 0.5) * size;
      const wx = lx + gridX * size;
      const wz = lz + gridZ * size;
      const point = this.sampleTerrainPoint(wx, wz, tempColor);
      if (
        point.snowWeight > 0.25 ||
        point.forestWeight > 0.25 ||
        point.grasslandWeight > 0.35 ||
        point.mountainWeight > 0.35
      ) {
        continue;
      }
      const cactusChance = saturate(
        point.desertWeight * 0.42 +
          point.grassCluster * 0.08 +
          point.rockCluster * 0.12 -
          point.forestWeight * 1.2 -
          point.grasslandWeight * 0.9 -
          point.snowWeight * 1.2 -
          point.mountainWeight * 0.28 -
          point.alpineFactor * 0.72 -
          point.cliffiness * 0.34,
      );
      if (seededRandom2D(baseSeed + i, 457) > cactusChance) continue;

      const scale =
        0.7 +
        seededRandom2D(baseSeed + i, 461) * 1.35 +
        point.desertWeight * 0.28;
      dummy.position.set(lx, point.height + 0.85 * scale, lz);
      dummy.scale.set(scale * 0.8, scale, scale * 0.8);
      dummy.rotation.set(
        0,
        seededRandom2D(baseSeed + i, 463) * Math.PI,
        seededRandom2D(baseSeed + i, 467) * 0.06,
      );
      dummy.updateMatrix();
      cacti.setMatrixAt(cactusIndex, dummy.matrix);
      cacti.setColorAt(
        cactusIndex,
        tempColor.copy(CACTUS_COLOR).lerp(DESERT_DAY, 0.12),
      );
      cactusIndex++;
    }

    for (let i = 0; i < rockCapacity * 5 && rockIndex < rockCapacity; i++) {
      const lx = (seededRandom2D(baseSeed + i, 233) - 0.5) * size;
      const lz = (seededRandom2D(baseSeed + i, 239) - 0.5) * size;
      const wx = lx + gridX * size;
      const wz = lz + gridZ * size;
      const point = this.sampleTerrainPoint(wx, wz, tempColor);
      if (point.snowWeight > 0.42) continue;
      const rockChance = saturate(
        0.08 +
          point.mountainWeight * 1.08 +
          point.barrensWeight * 0.68 +
          point.midAltitudeFactor * 0.48 +
          point.alpineFactor * 1.06 +
          point.cliffiness * 0.82 +
          point.rockCluster * 0.34 -
          point.snowWeight * 0.52 -
          point.desertWeight * 0.5,
      );
      if (seededRandom2D(baseSeed + i, 241) > rockChance) continue;

      const scale =
        0.55 +
        seededRandom2D(baseSeed + i, 251) * 2.4 +
        point.cliffiness * 0.8 +
        point.alpineFactor * 0.55;
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
          .lerp(ROCK_HIGHLIGHT, 0.24 + point.mountainWeight * 0.16)
          .lerp(HIGH_MOUNTAIN_GRAY, point.altitudeFactor * 0.32),
      );
      rockIndex++;
    }

    for (let i = 0; i < mossRockCapacity * 7 && mossRockIndex < mossRockCapacity; i++) {
      const lx = (seededRandom2D(baseSeed + i, 647) - 0.5) * size;
      const lz = (seededRandom2D(baseSeed + i, 653) - 0.5) * size;
      const wx = lx + gridX * size;
      const wz = lz + gridZ * size;
      const point = this.sampleTerrainPoint(wx, wz, tempColor);
      if (
        point.snowWeight > 0.28 ||
        point.desertWeight > 0.22 ||
        point.mountainWeight > 0.35
      ) {
        continue;
      }
      const mossChance = saturate(
        point.forestWeight * 0.52 +
          point.clearingWeight * 0.18 +
          point.pondWeight * 0.26 +
          point.rockCluster * 0.28 -
          point.grasslandWeight * 0.24 -
          point.mountainWeight * 0.18 -
          point.snowWeight * 1.1 -
          point.desertWeight * 1.0 -
          point.barrensWeight * 0.48,
      );
      if (seededRandom2D(baseSeed + i, 659) > mossChance) continue;

      const scale = 0.48 + seededRandom2D(baseSeed + i, 661) * 1.25;
      dummy.position.set(lx, point.height - 0.08, lz);
      dummy.scale.set(scale * 1.15, scale * 0.74, scale);
      dummy.rotation.set(
        seededRandom2D(baseSeed + i, 673) * Math.PI,
        seededRandom2D(baseSeed + i, 677) * Math.PI,
        0,
      );
      dummy.updateMatrix();
      mossRocks.setMatrixAt(mossRockIndex, dummy.matrix);
      mossRocks.setColorAt(
        mossRockIndex,
        tempColor.copy(MOSS_ROCK_COLOR).lerp(ROCK_HIGHLIGHT, 0.16),
      );
      mossRockIndex++;
    }

    for (
      let i = 0;
      i < snowRockCapacity * 5 && snowRockIndex < snowRockCapacity;
      i++
    ) {
      const lx = (seededRandom2D(baseSeed + i, 359) - 0.5) * size;
      const lz = (seededRandom2D(baseSeed + i, 367) - 0.5) * size;
      const wx = lx + gridX * size;
      const wz = lz + gridZ * size;
      const point = this.sampleTerrainPoint(wx, wz, tempColor);
      const snowRockChance = saturate(
        0.04 +
          point.snowWeight * 1.05 +
          point.mountainWeight * 0.42 +
          point.alpineFactor * 0.72 +
          point.cliffiness * 0.42 +
          point.rockCluster * 0.34 -
          point.desertWeight * 0.38,
      );
      if (seededRandom2D(baseSeed + i, 373) > snowRockChance) continue;

      const scale =
        0.5 +
        seededRandom2D(baseSeed + i, 379) * 1.95 +
        point.cliffiness * 0.5;
      dummy.position.set(lx, point.height + 0.22 * scale, lz);
      dummy.scale.set(
        scale,
        scale * (0.78 + point.cliffiness * 0.2),
        scale * 1.08,
      );
      dummy.rotation.set(
        seededRandom2D(baseSeed + i, 383) * Math.PI,
        seededRandom2D(baseSeed + i, 389) * Math.PI,
        0,
      );
      dummy.updateMatrix();
      snowRocks.setMatrixAt(snowRockIndex, dummy.matrix);
      snowRocks.setColorAt(
        snowRockIndex,
        tempColor.copy(SNOW_ROCK_COLOR).lerp(ROCK_HIGHLIGHT, 0.2),
      );
      snowRockIndex++;
    }

    for (
      let i = 0;
      i < snowPlantCapacity * 5 && snowPlantIndex < snowPlantCapacity;
      i++
    ) {
      const lx = (seededRandom2D(baseSeed + i, 479) - 0.5) * size;
      const lz = (seededRandom2D(baseSeed + i, 487) - 0.5) * size;
      const wx = lx + gridX * size;
      const wz = lz + gridZ * size;
      const point = this.sampleTerrainPoint(wx, wz, tempColor);
      const snowPlantChance = saturate(
        point.snowWeight * 0.72 +
          point.grassCluster * 0.22 -
          point.alpineFactor * 0.62 -
          point.cliffiness * 0.36 -
          point.desertWeight * 1.1,
      );
      if (seededRandom2D(baseSeed + i, 491) > snowPlantChance) continue;

      const scale = 0.42 + seededRandom2D(baseSeed + i, 499) * 1.12;
      dummy.position.set(lx, point.height + 0.28 * scale, lz);
      dummy.scale.set(scale, scale, scale);
      dummy.rotation.set(
        0,
        seededRandom2D(baseSeed + i, 503) * Math.PI,
        seededRandom2D(baseSeed + i, 509) * 0.1,
      );
      dummy.updateMatrix();
      snowPlants.setMatrixAt(snowPlantIndex, dummy.matrix);
      snowPlants.setColorAt(
        snowPlantIndex,
        tempColor.copy(SNOW_TREE_COLOR).lerp(SNOW_COLOR, 0.3),
      );
      snowPlantIndex++;
    }

    for (let i = 0; i < grassCapacity * 4 && grassIndex < grassCapacity; i++) {
      const lx = (seededRandom2D(baseSeed + i, 271) - 0.5) * size;
      const lz = (seededRandom2D(baseSeed + i, 277) - 0.5) * size;
      const wx = lx + gridX * size;
      const wz = lz + gridZ * size;
      const point = this.sampleTerrainPoint(wx, wz, tempColor);
      if (
        point.snowWeight > 0.25 ||
        point.desertWeight > 0.35 ||
        point.mountainWeight > 0.35
      ) {
        continue;
      }
      const grassChance = saturate(
        (point.grasslandWeight * 3.8 +
          point.forestWeight * point.clearingWeight * 2.1 +
          point.grassCluster * 1.55 +
          point.clearingWeight * 1.25) *
          point.vegetationFactor +
          point.grasslandWeight * 0.92 -
          point.pondWeight * 0.76 -
          point.forestWeight * 0.28 -
          point.mountainWeight * 0.68 -
          point.alpineFactor * 1.18 -
          point.snowWeight * 1.08 -
          point.desertWeight * 1.02 -
          point.barrensWeight * 0.42 -
          point.cliffiness * 0.72,
      );
      if (seededRandom2D(baseSeed + i, 281) > grassChance) continue;

      const scale =
        0.5 +
        seededRandom2D(baseSeed + i, 283) * 1.35 +
        point.grasslandWeight * 0.55 +
        point.clearingWeight * 0.45;
      dummy.position.set(lx, point.height + 0.3, lz);
      dummy.scale.set(
        scale * 0.18,
        scale,
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
          .copy(GRASS_COLOR)
          .lerp(this.sampleColorB.copy(tempColor), 0.28),
      );
      grassIndex++;
    }

    for (let i = 0; i < bushCapacity * 7 && bushIndex < bushCapacity; i++) {
      const lx = (seededRandom2D(baseSeed + i, 701) - 0.5) * size;
      const lz = (seededRandom2D(baseSeed + i, 709) - 0.5) * size;
      const wx = lx + gridX * size;
      const wz = lz + gridZ * size;
      const point = this.sampleTerrainPoint(wx, wz, tempColor);
      if (
        point.snowWeight > 0.25 ||
        point.desertWeight > 0.3 ||
        point.mountainWeight > 0.35
      ) {
        continue;
      }
      const bushChance = saturate(
        (point.forestWeight * 0.74 +
          point.grasslandWeight * 0.38 +
          point.clearingWeight * 0.58 +
          point.grassCluster * 0.32) *
          point.vegetationFactor -
          point.pondWeight * 0.76 -
          point.mountainWeight * 0.64 -
          point.alpineFactor -
          point.snowWeight * 1.1 -
          point.desertWeight * 1.12 -
          point.barrensWeight * 0.56 -
          point.cliffiness * 0.58,
      );
      if (seededRandom2D(baseSeed + i, 719) > bushChance) continue;

      const scale =
        0.58 +
        seededRandom2D(baseSeed + i, 727) * 1.05 +
        point.forestWeight * 0.22;
      dummy.position.set(lx, point.height + 0.62 * scale, lz);
      dummy.scale.set(scale * 0.86, scale * 0.72, scale * 0.86);
      dummy.rotation.set(
        0,
        seededRandom2D(baseSeed + i, 733) * Math.PI,
        seededRandom2D(baseSeed + i, 739) * 0.12,
      );
      dummy.updateMatrix();
      bushes.setMatrixAt(bushIndex, dummy.matrix);
      bushes.setColorAt(
        bushIndex,
        tempColor.copy(BUSH_COLOR).lerp(this.sampleColorB.copy(tempColor), 0.24),
      );
      bushIndex++;
    }

    for (let i = 0; i < flowerCapacity * 6 && flowerIndex < flowerCapacity; i++) {
      const lx = (seededRandom2D(baseSeed + i, 751) - 0.5) * size;
      const lz = (seededRandom2D(baseSeed + i, 757) - 0.5) * size;
      const wx = lx + gridX * size;
      const wz = lz + gridZ * size;
      const point = this.sampleTerrainPoint(wx, wz, tempColor);
      if (
        point.snowWeight > 0.25 ||
        point.desertWeight > 0.3 ||
        point.mountainWeight > 0.35
      ) {
        continue;
      }
      const flowerChance = saturate(
        (point.grasslandWeight * 1.22 +
          point.forestWeight * point.clearingWeight * 0.64 +
          point.grassCluster * 0.66) *
          point.vegetationFactor -
          point.pondWeight * 0.86 -
          point.forestWeight * 0.24 -
          point.mountainWeight * 0.74 -
          point.alpineFactor * 1.08 -
          point.snowWeight * 1.08 -
          point.desertWeight * 1.12 -
          point.barrensWeight * 0.56 -
          point.cliffiness * 0.64,
      );
      if (seededRandom2D(baseSeed + i, 761) > flowerChance) continue;

      const scale =
        0.46 +
        seededRandom2D(baseSeed + i, 769) * 0.84 +
        point.grasslandWeight * 0.18;
      dummy.position.set(lx, point.height + 0.34 * scale, lz);
      dummy.scale.set(scale * 0.54, scale, scale * 0.54);
      dummy.rotation.set(
        0,
        seededRandom2D(baseSeed + i, 773) * Math.PI,
        seededRandom2D(baseSeed + i, 787) * 0.16,
      );
      dummy.updateMatrix();
      flowers.setMatrixAt(flowerIndex, dummy.matrix);
      flowers.setColorAt(
        flowerIndex,
        tempColor.copy(FLOWER_COLOR).lerp(GRASS_COLOR, seededRandom2D(baseSeed + i, 797) * 0.34),
      );
      flowerIndex++;
    }

    for (
      let i = 0;
      i < forestPropCapacity * 7 && forestPropIndex < forestPropCapacity;
      i++
    ) {
      const lx = (seededRandom2D(baseSeed + i, 811) - 0.5) * size;
      const lz = (seededRandom2D(baseSeed + i, 821) - 0.5) * size;
      const wx = lx + gridX * size;
      const wz = lz + gridZ * size;
      const point = this.sampleTerrainPoint(wx, wz, tempColor);
      if (point.snowWeight > 0.34 || point.desertWeight > 0.35) continue;
      const propChance = saturate(
        point.forestWeight * 0.46 +
          point.clearingWeight * 0.28 +
          point.midAltitudeFactor * 0.2 +
          point.mountainWeight * 0.12 -
          point.grasslandWeight * 0.42 -
          point.pondWeight * 0.74 -
          point.alpineFactor * 0.72 -
          point.snowWeight * 1.04 -
          point.desertWeight * 1.04 -
          point.barrensWeight * 0.24,
      );
      if (seededRandom2D(baseSeed + i, 827) > propChance) continue;

      const scale =
        0.58 +
        seededRandom2D(baseSeed + i, 829) * 1.18 +
        point.midAltitudeFactor * 0.18;
      dummy.position.set(lx, point.height + 0.42 * scale, lz);
      dummy.scale.set(scale * 0.88, scale * 0.72, scale * 0.88);
      dummy.rotation.set(
        seededRandom2D(baseSeed + i, 839) * 0.12,
        seededRandom2D(baseSeed + i, 853) * Math.PI,
        seededRandom2D(baseSeed + i, 857) * 0.12,
      );
      dummy.updateMatrix();
      forestProps.setMatrixAt(forestPropIndex, dummy.matrix);
      forestProps.setColorAt(
        forestPropIndex,
        tempColor.copy(FOREST_PROP_COLOR).lerp(MOSS_ROCK_COLOR, point.forestWeight * 0.22),
      );
      forestPropIndex++;
    }

    for (let i = 0; i < pondCapacity * 6 && pondIndex < pondCapacity; i++) {
      const lx = (seededRandom2D(baseSeed + i, 601) - 0.5) * size;
      const lz = (seededRandom2D(baseSeed + i, 607) - 0.5) * size;
      const wx = lx + gridX * size;
      const wz = lz + gridZ * size;
      const point = this.sampleTerrainPoint(wx, wz, tempColor);
      if (point.snowWeight > 0.34 || point.desertWeight > 0.28) continue;
      if (point.pondWeight < 0.42) continue;
      if (seededRandom2D(baseSeed + i, 613) > point.pondWeight) continue;

      const radius = THREE.MathUtils.lerp(
        POND_RADIUS_MIN,
        POND_RADIUS_MAX,
        saturate(point.pondWeight),
      );
      dummy.position.set(lx, point.height + 0.08, lz);
      dummy.scale.set(radius, 1, radius * (0.72 + seededRandom2D(baseSeed + i, 617) * 0.36));
      dummy.rotation.set(0, seededRandom2D(baseSeed + i, 619) * Math.PI, 0);
      dummy.updateMatrix();
      ponds.setMatrixAt(pondIndex, dummy.matrix);
      pondIndex++;
    }

    this.finalizeInstancedMesh(pineTrees, pineIndex);
    this.finalizeInstancedMesh(commonTrees, commonIndex);
    this.finalizeInstancedMesh(birchTrees, birchIndex);
    this.finalizeInstancedMesh(willowTrees, willowIndex);
    this.finalizeInstancedMesh(deadTrees, deadIndex);
    this.finalizeInstancedMesh(snowTrees, snowIndex);
    this.finalizeInstancedMesh(palmTrees, palmIndex);
    this.finalizeInstancedMesh(cacti, cactusIndex);
    this.finalizeInstancedMesh(rocks, rockIndex);
    this.finalizeInstancedMesh(mossRocks, mossRockIndex);
    this.finalizeInstancedMesh(snowRocks, snowRockIndex);
    this.finalizeInstancedMesh(grass, grassIndex);
    this.finalizeInstancedMesh(bushes, bushIndex);
    this.finalizeInstancedMesh(flowers, flowerIndex);
    this.finalizeInstancedMesh(forestProps, forestPropIndex);
    this.finalizeInstancedMesh(snowPlants, snowPlantIndex);
    this.finalizeInstancedMesh(ponds, pondIndex);
    group.add(
      pineTrees,
      commonTrees,
      birchTrees,
      willowTrees,
      deadTrees,
      snowTrees,
      palmTrees,
      cacti,
      rocks,
      mossRocks,
      snowRocks,
      grass,
      bushes,
      flowers,
      forestProps,
      snowPlants,
      ponds,
    );
    return group;
  }

  private finalizeInstancedMesh(
    mesh: THREE.InstancedMesh,
    count: number,
  ): void {
    if (!mesh.instanceColor) {
      mesh.setColorAt(0, DEFAULT_INSTANCE_COLOR);
    }
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
          (0.14 + point.grasslandWeight * 0.32 + point.desertWeight * 0.28) +
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
          terrainPoint.desertWeight * 0.06
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
          terrainPoint.desertWeight * 0.06
        );
      case "moth":
        return (
          0.92 +
          terrainPoint.forestWeight * 0.06 +
          terrainPoint.desertWeight * 0.08 +
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

  private samplePondField(x: number, z: number): number {
    const gx = Math.floor(x / POND_CELL_SIZE);
    const gz = Math.floor(z / POND_CELL_SIZE);
    let weight = 0;

    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const cellX = gx + dx;
        const cellZ = gz + dz;
        const seed = cellX * 92837111 + cellZ * 689287499;
        const presence = seededRandom2D(seed, 631);
        if (presence > 0.34) continue;

        const centerX =
          (cellX + 0.5 + (seededRandom2D(seed, 641) - 0.5) * 0.72) *
          POND_CELL_SIZE;
        const centerZ =
          (cellZ + 0.5 + (seededRandom2D(seed, 643) - 0.5) * 0.72) *
          POND_CELL_SIZE;
        const radius = THREE.MathUtils.lerp(
          POND_RADIUS_MIN,
          POND_RADIUS_MAX,
          seededRandom2D(seed, 647),
        );
        const dist = Math.hypot(x - centerX, z - centerZ);
        weight = Math.max(weight, smoothRange(radius - dist, 0, radius * 0.42));
      }
    }

    return weight;
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

    let forestScore =
      Math.pow(
        saturate(
          moisture * 0.98 +
            (1 - rugged) * 0.58 +
            chainNoise * 0.12 -
            basinWeight * 0.08,
        ),
        2.2,
      ) * saturate(1 - Math.abs(temperature - 0.46) * 1.55);
    let grasslandScore = Math.pow(
      saturate(
        (1 - rugged) * 1.02 +
          (1 - Math.abs(moisture - 0.42)) * 0.46 +
          temperature * 0.18 -
          basinWeight * 0.08,
      ),
      1.9,
    );
    let mountainScore = Math.pow(
      saturate(highlandSignal * 1.15 + chainNoise * 0.42 + rugged * 0.3),
      2.8,
    );
    let snowScore = Math.pow(
      saturate(
        (1 - temperature) * 1.24 +
          highlandSignal * 0.46 +
          moisture * 0.18 -
          basinWeight * 0.26 -
          (1 - rugged) * 0.1,
      ),
      2.65,
    );
    let desertScore = Math.pow(
      saturate(
        (1 - moisture) * 1.18 +
          temperature * 0.72 +
          basinWeight * 0.28 -
          highlandSignal * 0.34 -
          snowScore * 0.42,
      ),
      2.25,
    );
    let barrensScore = Math.pow(
      saturate(
        (1 - moisture) * 1.08 +
          rugged * 0.62 +
          chainNoise * 0.18 +
          temperature * 0.16,
      ),
      2.1,
    );

    if (this.biomeOverride) {
      forestScore = this.biomeOverride === "forest" ? 1 : 0;
      grasslandScore = this.biomeOverride === "grassland" ? 1 : 0;
      mountainScore = this.biomeOverride === "mountains" ? 1 : 0;
      snowScore = this.biomeOverride === "snow" ? 1 : 0;
      desertScore = this.biomeOverride === "desert" ? 1 : 0;
      barrensScore = this.biomeOverride === "barrens" ? 1 : 0;
    }

    const total =
      forestScore +
      grasslandScore +
      mountainScore +
      snowScore +
      desertScore +
      barrensScore +
      1e-5;
    const forestWeight = forestScore / total;
    const grasslandWeight = grasslandScore / total;
    const mountainWeight = mountainScore / total;
    const snowWeight = snowScore / total;
    const desertWeight = desertScore / total;
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
    const clearingWeight =
      smoothPeak(
        remapNoise(
          fbm(
            this.noiseTreeCluster,
            wx * CLEARING_SCALE + 31.7,
            wz * CLEARING_SCALE - 18.4,
            3,
            2.02,
            0.52,
          ),
        ),
        0.54,
        0.12,
      ) *
      saturate(forestWeight * 1.2 - mountainWeight * 0.32 - snowWeight * 0.42);
    const pondWeight =
      this.samplePondField(wx, wz) *
      saturate(
        forestWeight * 0.72 +
          grasslandWeight * 1.18 +
          clearingWeight * 0.36 -
          mountainWeight * 0.42 -
          snowWeight * 0.62 -
          desertWeight * 1.1 -
          barrensWeight * 0.46 -
          highlandSignal * 0.28,
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
    const snowRelief = snowWeight * (6 + ridgePrimary * 12 + rugged * 5);
    const desertRelief = desertWeight * (1.5 + rolling * 2.2 - basinWeight * 4);
    const canyonCut = basinWeight * (6 + (1 - chainNoise) * 6);
    const detail =
      fbm(this.noiseDetail, wx * scale * 5.4, wz * scale * 5.4, 3, 2.45, 0.45) *
      (2.5 + rugged * 4.4 + mountainMass * 4.2);

    let height =
      continent * 24 +
      rolling * 9 +
      forestRelief +
      grassRelief +
      barrenLift +
      mountainLift +
      snowRelief +
      desertRelief +
      detail -
      canyonCut;
    height -= pondWeight * (3.8 + basinWeight * 3.8 + clearingWeight * 1.6);

    const altitudeFactor = smoothRange(
      height,
      MOUNTAIN_GRAY_HEIGHT_START,
      MOUNTAIN_GRAY_HEIGHT_END,
    );
    const vegetationFactor =
      1 - smoothRange(height, VEGETATION_HEIGHT_START, VEGETATION_HEIGHT_END);
    const midAltitudeFactor =
      smoothRange(height, MID_ALTITUDE_START, MID_ALTITUDE_PEAK) *
      (1 - smoothRange(height, MID_ALTITUDE_PEAK, ALPINE_HEIGHT_END));
    const alpineFactor = smoothRange(
      height,
      ALPINE_HEIGHT_START,
      ALPINE_HEIGHT_END,
    );
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
        SNOW_COLOR.r * snowWeight +
        DESERT_COLOR.r * desertWeight +
        BARRENS_COLOR.r * barrensWeight,
      FOREST_COLOR.g * forestWeight +
        GRASSLAND_COLOR.g * grasslandWeight +
        MOUNTAIN_COLOR.g * mountainWeight +
        SNOW_COLOR.g * snowWeight +
        DESERT_COLOR.g * desertWeight +
        BARRENS_COLOR.g * barrensWeight,
      FOREST_COLOR.b * forestWeight +
        GRASSLAND_COLOR.b * grasslandWeight +
        MOUNTAIN_COLOR.b * mountainWeight +
        SNOW_COLOR.b * snowWeight +
        DESERT_COLOR.b * desertWeight +
        BARRENS_COLOR.b * barrensWeight,
    );
    outColor.lerp(TERRAIN_BASE_COLOR, 0.08 + cliffiness * 0.06);
    if (cliffiness > 0.45) {
      outColor.lerp(MOUNTAIN_COLOR, cliffiness * 0.2);
    }
    outColor.lerp(
      MID_MOUNTAIN_GRAY,
      midAltitudeFactor * (0.14 + mountainWeight * 0.18),
    );
    outColor.lerp(
      HIGH_MOUNTAIN_GRAY,
      altitudeFactor * (0.26 + mountainWeight * 0.42),
    );
    if (snowWeight > 0.34) {
      outColor.lerp(SNOW_COLOR, snowWeight * 0.72);
    }
    if (desertWeight > 0.42) {
      outColor.lerp(DESERT_COLOR, desertWeight * 0.12);
    }
    if (pondWeight > 0.08) {
      outColor.lerp(WATER_COLOR, pondWeight * 0.48);
    }

    return {
      height,
      dominantBiome: dominantBiome({
        forestWeight,
        grasslandWeight,
        mountainWeight,
        snowWeight,
        desertWeight,
        barrensWeight,
      }),
      forestWeight,
      grasslandWeight,
      mountainWeight,
      snowWeight,
      desertWeight,
      barrensWeight,
      basinWeight,
      cliffiness,
      treeCluster,
      grassCluster,
      rockCluster,
      clearingWeight,
      pondWeight,
      altitudeFactor,
      vegetationFactor,
      midAltitudeFactor,
      alpineFactor,
    };
  }
}
