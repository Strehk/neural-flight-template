import * as THREE from "three";
import {
  BAT_BIOME_COLORS,
  BAT_BIOME_ORDER,
  type BatBiomeId,
  type BatWorldSettings,
} from "./config";
import { BAT_ECHO_PROBE_DEFAULTS, BAT_STREAMING_DEFAULTS, BAT_WORLD_CONFIG_DEFAULTS } from "./world-config";
import { ChunkScheduler } from "$lib/three/world/ChunkScheduler";
import type { AcousticField } from "$lib/three/world/AcousticFieldBaker";
import {
  type TerrainDayPalette,
  type TerrainEchoPalette,
} from "./derived-field-sampler";
import { TerrainSampler, type TerrainSample } from "./terrain-sampler";
import { addBarycentricAttribute } from "$lib/three/world/geometry-helpers";
import { assembleTerrainGeometry } from "$lib/three/world/TerrainMeshBuilder";
import { DecorationPlacer } from "./decoration-placer";
import { WorldgenWorkerPool } from "$lib/three/world/worker/WorldgenWorkerPool";
import type { WorkerBuiltMessage } from "$lib/three/world/worker/protocol";
import { MothSwarm } from "./moth-swarm";
import { Renderers } from "./renderers";
import {
  EchoProbe,
  type EchoMothTarget,
  type EchoProbeHit as _EchoProbeHit,
  type EchoProbeProfile as _EchoProbeProfile,
  type EchoSurfaceType as _EchoSurfaceType,
} from "$lib/three/world/echo/EchoProbe";
import type { EchoPulseRenderState, SharedEchoUniforms } from "./shaders";

// Re-export the echo types so `audio.ts` (and any other consumer) keeps
// importing them from "./world". The probe + its types live in the
// shared world layer now, but the public surface of this experience
// stays stable.
export type EchoProbeHit = _EchoProbeHit;
export type EchoProbeProfile = _EchoProbeProfile;
export type EchoSurfaceType = _EchoSurfaceType;

export interface BatWorldFrameEvents {
  collectedMoths: THREE.Vector3[];
  activeMoths: number;
  nearestMothDistance: number | null;
}

interface WorldChunk {
  key: string;
  gridX: number;
  gridZ: number;
  terrain: THREE.Mesh;
  decorations: THREE.Group;
  /** Pre-baked echo-acoustic field; null when disabled. (Step 11.) */
  acousticField: AcousticField | null;
  dispose(): void;
}

// Terrain palette colours — sourced from BAT_BIOME_COLORS (config.ts) and the
// in-file day-mode hex constants. Consumed by the two palettes below.
const TERRAIN_BASE_COLOR = new THREE.Color("#9eb0cb");
const FOREST_COLOR = new THREE.Color(BAT_BIOME_COLORS.forest);
const GRASSLAND_COLOR = new THREE.Color(BAT_BIOME_COLORS.grassland);
const MOUNTAIN_COLOR = new THREE.Color(BAT_BIOME_COLORS.mountains);
const SNOW_COLOR = new THREE.Color(BAT_BIOME_COLORS.snow);
const DESERT_COLOR = new THREE.Color(BAT_BIOME_COLORS.desert);
const BARRENS_COLOR = new THREE.Color(BAT_BIOME_COLORS.barrens);
const TERRAIN_DAY_BASE = new THREE.Color("#8a9a80"); // neutral sage between biomes
const FOREST_DAY       = new THREE.Color("#553322"); // dark brown forest floor
const GRASSLAND_DAY    = new THREE.Color("#a6d978"); // soft meadow green
const MOUNTAIN_DAY     = new THREE.Color("#9aabba"); // rocky alpine gray-blue
const SNOW_DAY         = new THREE.Color("#f3f7fb"); // snow pack
const DESERT_DAY       = new THREE.Color("#d8b66f"); // warm sand
const BARRENS_DAY      = new THREE.Color("#c0a055"); // warm sandy
const HIGH_MOUNTAIN_GRAY = new THREE.Color("#8a8f92");
const MID_MOUNTAIN_GRAY  = new THREE.Color("#70777a");
const WATER_COLOR        = new THREE.Color("#4f8fa7");

/**
 * Echo-mode terrain colour palette — wires sinneswandler's THREE.Color
 * constants into the structural palette interface in
 * derived-field-sampler.ts.
 */
const TERRAIN_ECHO_PALETTE: TerrainEchoPalette = {
  base: TERRAIN_BASE_COLOR,
  forest: FOREST_COLOR,
  grassland: GRASSLAND_COLOR,
  mountain: MOUNTAIN_COLOR,
  snow: SNOW_COLOR,
  desert: DESERT_COLOR,
  barrens: BARRENS_COLOR,
  midMountainGray: MID_MOUNTAIN_GRAY,
  highMountainGray: HIGH_MOUNTAIN_GRAY,
  water: WATER_COLOR,
};

/**
 * Day-mode terrain colour palette. Same shape as the echo palette but
 * with the naturalistic day colours. Consumed by TerrainMeshBuilder
 * to bake the `dayColor` vertex attribute the shader cross-fades to
 * via `uDaylightFactor`.
 */
const TERRAIN_DAY_PALETTE: TerrainDayPalette = {
  base: TERRAIN_DAY_BASE,
  forest: FOREST_DAY,
  grassland: GRASSLAND_DAY,
  mountain: MOUNTAIN_DAY,
  snow: SNOW_DAY,
  desert: DESERT_DAY,
  barrens: BARRENS_DAY,
  midMountainGray: MID_MOUNTAIN_GRAY,
  highMountainGray: HIGH_MOUNTAIN_GRAY,
  water: WATER_COLOR,
};

export class BatWorld {
  readonly group = new THREE.Group();
  /**
   * Materials + shared echo uniforms + per-frame env / pulse plumbing.
   * Owned by Renderers (refactor step 9b). `sharedUniforms` is exposed
   * via getter below so consumers that previously read
   * `world.sharedUniforms` keep working unchanged.
   */
  private readonly renderers: Renderers;
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
  /** MothSwarm owns moth simulation + the InstancedMesh now (step 9a). */
  private readonly mothSwarm: MothSwarm;

  settings: BatWorldSettings;

  /**
   * Anchor + dual-radius chunk loader. Replaces the legacy
   * `private active = new Map<string, WorldChunk>()` + `ensureChunks`
   * pair (refactor step 7). Scheduler owns the active set, builds via
   * the `createChunk` factory wired in the constructor, and disposes
   * via the WorldChunk's own `dispose()` method.
   */
  private readonly chunkScheduler: ChunkScheduler<WorldChunk>;

  /**
   * Per-chunk decoration placer (refactor step 8b). Owns the 17
   * InstancedMesh population loops + the per-biome scatter weights;
   * `createChunk` just calls `decorationPlacer.place(gridX, gridZ)`.
   */
  private readonly decorationPlacer: DecorationPlacer;
  /**
   * Off-main-thread worldgen. Each `createChunk` request is dispatched to
   * a worker; on resolve the typed-array payload is wrapped into THREE
   * objects via `assembleChunkFromWorker`. Config changes (settings /
   * biomeOverride / rebuild) forward through `pool.updateConfig`, which
   * bumps a generation counter so in-flight stale results are dropped.
   */
  private readonly workerPool: WorldgenWorkerPool;
  /**
   * Cached terrain sampler — the canonical entry point for height /
   * biome / acoustic queries (refactor step 4). Owns the NoiseStack
   * and the LRU SampleCache. The individual `noiseXxx` fields below
   * remain as thin accessors so legacy `fbm()` callers in decoration
   * code keep working; step 8 will retire those when DecorationPlacer
   * is extracted.
   */
  private readonly terrainSampler: TerrainSampler;
  // The 14 noise field accessors + 3 scratch colours that used to live
  // here are gone — TerrainSampler / DecorationPlacer / MothSwarm hold
  // their own references through the sampler (refactor step 9b).
  /**
   * Echo raycast probe — owns the raycaster, the 90-direction fan, and
   * the per-hit acoustics + biome lookups via `terrainSampler`. Built
   * in the constructor once the chunk `group` exists.
   */
  private readonly echoProbe: EchoProbe;
  // Moth state (mothDummy, collectedMothKeys, collectedMothCount,
  // activeMothTargets, mothScaleFactor) moved into MothSwarm in step 9a.

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

    // Build the TerrainSampler with a WorldConfig snapshot that mirrors
    // BatWorldSettings' tunables. Sampler owns the NoiseStack + SampleCache;
    // the legacy `noiseXxx` accessors below alias the sampler's instances.
    this.terrainSampler = new TerrainSampler({
      ...BAT_WORLD_CONFIG_DEFAULTS,
      biomeScale: settings.biomeScale,
      mountainHeight: settings.mountainHeight,
      treeDensity: settings.treeDensity,
      grassDensity: settings.grassDensity,
      baseVisibility: settings.baseVisibility,
      fogIntensity: settings.fogIntensity,
      revealIntensity: settings.revealIntensity,
      wireThickness: settings.wireThickness,
    });
    // Renderers owns the 7 shader materials + sharedUniforms + the
    // applyEnvironment / renderEcho plumbing.
    this.renderers = new Renderers();

    // EchoProbe wraps the raycaster + direction fan + acoustic lookup.
    // Moth targets come back through the callback so step 9's MothSwarm
    // extraction is a one-line swap (`() => mothSwarm.activeTargets`).
    this.echoProbe = new EchoProbe({
      config: BAT_ECHO_PROBE_DEFAULTS,
      terrainSampler: this.terrainSampler,
      target: this.group,
      getMothTargets: (): readonly EchoMothTarget[] => this.mothSwarm.activeTargets,
      // Resolve hits via the chunk-baked acoustic field when available
      // (step 11). The arrow captures `this` so chunkScheduler being
      // assigned later in the constructor is fine.
      getAcousticField: (x, z) =>
        this.chunkScheduler.chunkAt(x, z)?.acousticField ?? null,
    });

    // Anchor + dual-radius chunk loader. chunkSize / terrainSegments /
    // viewRadius are snapshotted from BatWorldSettings so chunk geometry
    // stays consistent; keepRadius adds a one-cell hysteresis ring so
    // back-and-forth motion near a boundary doesn't rebuild.
    this.chunkScheduler = new ChunkScheduler<WorldChunk>({
      config: {
        ...BAT_STREAMING_DEFAULTS,
        chunkSize: settings.chunkSize,
        terrainSegments: settings.terrainSegments,
        buildRadius: settings.viewRadius,
        keepRadius: settings.viewRadius + 1,
      },
      buildChunk: async (gridX, gridZ) => {
        const payload = await this.workerPool.build(gridX, gridZ);
        const chunk = this.assembleChunkFromWorker(payload);
        this.group.add(chunk.terrain);
        this.group.add(chunk.decorations);
        return chunk;
      },
      onChunkDisposed: (chunk) => {
        this.group.remove(chunk.terrain);
        this.group.remove(chunk.decorations);
      },
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

    // MothSwarm owns the moth InstancedMesh + per-frame simulation
    // (refactor step 9a). BatWorld only attaches the mesh to the
    // scene group and forwards `prepare()` to `swarm.update`.
    this.mothSwarm = new MothSwarm({
      chunkSize: settings.chunkSize,
      terrainSampler: this.terrainSampler,
      geometry: this.mothGeometry,
      material: this.renderers.mothMaterial,
    });
    this.group.add(this.mothSwarm.mothMesh);

    // DecorationPlacer owns all 17 instanced-mesh population loops + the
    // per-biome scatter weights (refactor step 8b). Construct last —
    // every geometry + material it needs has been assigned above.
    this.decorationPlacer = new DecorationPlacer({
      settings: {
        chunkSize: this.settings.chunkSize,
        treeDensity: this.settings.treeDensity,
        grassDensity: this.settings.grassDensity,
        mountainHeight: this.settings.mountainHeight,
      },
      geometries: {
        pineTree:   this.pineTreeGeometry,
        commonTree: this.commonTreeGeometry,
        birchTree:  this.birchTreeGeometry,
        willowTree: this.willowTreeGeometry,
        deadTree:   this.deadTreeGeometry,
        snowTree:   this.snowTreeGeometry,
        palmTree:   this.palmTreeGeometry,
        cactus:     this.cactusGeometry,
        rock:       this.rockGeometry,
        mossRock:   this.mossRockGeometry,
        snowRock:   this.snowRockGeometry,
        grass:      this.grassGeometry,
        bush:       this.bushGeometry,
        flower:     this.flowerGeometry,
        forestProp: this.forestPropGeometry,
        snowPlant:  this.snowPlantGeometry,
        pond:       this.pondGeometry,
      },
      materials: {
        crown: this.renderers.crownMaterial,
        trunk: this.renderers.trunkMaterial,
        rock:  this.renderers.rockMaterial,
        grass: this.renderers.grassMaterial,
        pond:  this.renderers.pondMaterial,
      },
      terrainSampler: this.terrainSampler,
      noiseStack: this.terrainSampler.noiseStack,
      echoPalette: TERRAIN_ECHO_PALETTE,
    });

    this.renderers.applyEnvironment(this.settings);

    // Spin up the worldgen worker pool. Workers own their own
    // TerrainSampler so the noise stack runs off-main; each chunk's
    // typed-array payload is wrapped into BufferGeometry +
    // InstancedMesh by `assembleChunkFromWorker`.
    this.workerPool = new WorldgenWorkerPool({
      worldConfig: this.buildWorldConfigSnapshot(),
      biomeOverride: this.terrainSampler.getBiomeOverride(),
      chunkSize: this.settings.chunkSize,
      segments: this.settings.terrainSegments,
      acousticFieldEnabled: BAT_STREAMING_DEFAULTS.acousticFieldEnabled,
      acousticFieldGridStep: BAT_STREAMING_DEFAULTS.acousticFieldGridStep,
      decorationSettings: {
        chunkSize: this.settings.chunkSize,
        treeDensity: this.settings.treeDensity,
        grassDensity: this.settings.grassDensity,
        mountainHeight: this.settings.mountainHeight,
      },
      echoPalette: TERRAIN_ECHO_PALETTE,
      dayPalette:  TERRAIN_DAY_PALETTE,
    });
  }

  private buildWorldConfigSnapshot() {
    return {
      ...BAT_WORLD_CONFIG_DEFAULTS,
      biomeScale: this.settings.biomeScale,
      mountainHeight: this.settings.mountainHeight,
      treeDensity: this.settings.treeDensity,
      grassDensity: this.settings.grassDensity,
      baseVisibility: this.settings.baseVisibility,
      fogIntensity: this.settings.fogIntensity,
      revealIntensity: this.settings.revealIntensity,
      wireThickness: this.settings.wireThickness,
    };
  }

  prepare(playerPosition: THREE.Vector3): BatWorldFrameEvents {
    this.chunkScheduler.update(playerPosition.x, playerPosition.z);
    return this.mothSwarm.update(playerPosition, this.chunkScheduler.chunks());
  }

  renderEcho(pulses: EchoPulseRenderState[], elapsed: number): void {
    this.renderers.renderEcho(pulses, elapsed);
  }

  setMothScale(factor: number): void {
    this.mothSwarm.setScale(factor);
  }

  sampleHeight(x: number, z: number): number {
    // Player-altitude path → uncached so altitude is smooth across cell seams.
    return this.terrainSampler.sampleHeight(x, z);
  }

  sampleBiome(x: number, z: number): BatBiomeId {
    return this.terrainSampler.sampleBiomeId(x, z);
  }

  /**
   * Echolocation pulse. Delegates to the shared `EchoProbe`; the
   * profile shape is unchanged so `audio.ts` is untouched.
   */
  sampleEchoProfile(
    origin: THREE.Vector3,
    orientation: THREE.Quaternion,
    range: number,
    speed: number,
  ): EchoProbeProfile {
    return this.echoProbe.probe(origin, orientation, range, speed);
  }

  setSettings(nextSettings: Partial<BatWorldSettings>): void {
    this.settings = { ...this.settings, ...nextSettings };
    // Push the noise-relevant slice into the sampler; updateConfig
    // also clears the LRU cache so stale samples don't survive a
    // biomeScale / mountainHeight change.
    const samplerPatch = {
      biomeScale: this.settings.biomeScale,
      mountainHeight: this.settings.mountainHeight,
      treeDensity: this.settings.treeDensity,
      grassDensity: this.settings.grassDensity,
      baseVisibility: this.settings.baseVisibility,
      fogIntensity: this.settings.fogIntensity,
      revealIntensity: this.settings.revealIntensity,
      wireThickness: this.settings.wireThickness,
    };
    this.terrainSampler.updateConfig(samplerPatch);
    this.workerPool.updateConfig({
      worldConfigPatch: samplerPatch,
      decorationSettings: {
        chunkSize: this.settings.chunkSize,
        treeDensity: this.settings.treeDensity,
        grassDensity: this.settings.grassDensity,
        mountainHeight: this.settings.mountainHeight,
      },
    });
    this.renderers.applyEnvironment(this.settings);
  }

  rebuild(): void {
    // Drop cached terrain samples so freshly-built chunks see the
    // current config / biomeOverride state, then ask the scheduler to
    // dispose every active chunk. Its onChunkDisposed callback detaches
    // from the group; the next `prepare()` refills from scratch.
    this.terrainSampler.clearCache();
    this.chunkScheduler.clearAll();
  }

  dispose(): void {
    this.rebuild();
    this.workerPool.dispose();
    this.renderers.dispose();
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
    return this.mothSwarm.collected;
  }

  getBiomeOverride(): BatBiomeId | null {
    return this.terrainSampler.getBiomeOverride();
  }

  setBiomeOverride(biome: BatBiomeId | null): void {
    if (biome !== null && !BAT_BIOME_ORDER.includes(biome)) return;
    if (this.terrainSampler.getBiomeOverride() === biome) return;
    this.terrainSampler.setBiomeOverride(biome);
    this.workerPool.updateConfig({ biomeOverride: biome });
    this.rebuild();
  }

  // applyEnvironment moved into `Renderers.applyEnvironment(settings)`
  // (refactor step 9b). BatWorld calls it once at construction and
  // again from `setSettings`.

  /**
   * Echo-pulse shader uniforms. Exposed as a getter so consumers that
   * previously read `world.sharedUniforms` keep working — Renderers
   * owns the underlying state now.
   */
  get sharedUniforms(): SharedEchoUniforms {
    return this.renderers.sharedUniforms;
  }

  // ensureChunks(...) moved into `ChunkScheduler.update(x, z)` (step 7).
  // The scheduler owns the active map, anchor, build/keep set logic, and
  // the per-frame build budget. `prepare()` calls it directly.

  /**
   * Wrap a worker's typed-array payload into a `WorldChunk`. All THREE
   * object allocation happens here: BufferGeometry from the terrain
   * heights/colours, 17 InstancedMeshes from the decoration data, and a
   * reconstructed `AcousticField` whose `samples` are plain objects
   * (the worker drops its own cache between builds).
   */
  private assembleChunkFromWorker(payload: WorkerBuiltMessage): WorldChunk {
    const { gridX, gridZ } = payload;
    const terrainGeometry = assembleTerrainGeometry(
      this.settings.chunkSize,
      this.settings.terrainSegments,
      payload.terrain,
    );
    const terrain = new THREE.Mesh(terrainGeometry, this.renderers.terrainMaterial);
    terrain.userData.echoSurface = "terrain";
    terrain.position.set(
      gridX * this.settings.chunkSize,
      0,
      gridZ * this.settings.chunkSize,
    );

    const decorations = this.decorationPlacer.applyData(payload.decorations);
    decorations.position.copy(terrain.position);

    const acousticField = payload.acoustic
      ? {
          chunkSize: payload.acoustic.chunkSize,
          gridStep: payload.acoustic.gridStep,
          cellsPerSide: payload.acoustic.cellsPerSide,
          originX: payload.acoustic.originX,
          originZ: payload.acoustic.originZ,
          samples: payload.acoustic.samples as readonly TerrainSample[],
        }
      : null;

    return {
      key: `${gridX},${gridZ}`,
      gridX,
      gridZ,
      terrain,
      decorations,
      acousticField,
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


  // getEchoSurface(object) was inlined into EchoProbe.readEchoSurface()
  // (refactor step 6); decoration code reads/writes `userData.echoSurface`
  // directly and the probe reads it back.

  /**
   * Thin wrapper around `TerrainSampler.sample` that also writes the
   * echo-mode colour into the caller-supplied `outColor`. Decoration
   * callsites still use this; the chunk vertex generator will switch
   * to the sampler directly once step 8 extracts TerrainMeshBuilder.
   *
   * The legacy `sampleTerrainPoint` wrapper, the acoustic estimators,
   * the slope helper, and `sampleHeightOnly` are all gone —
   * DecorationPlacer + MothSwarm + EchoProbe call `terrainSampler`
   * directly now (refactor steps 4 / 6 / 8b / 9a).
   */
}

