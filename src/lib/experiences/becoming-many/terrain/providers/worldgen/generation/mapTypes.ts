/**
 * Core data model for the world generator.
 *
 * All maps are typed arrays (the authoritative source of truth, read back from
 * GPU compute where applicable). Everything is keyed off integer chunk indices
 * so the world can grow forever as the camera pans.
 */

export enum Biome {
  Ocean = 0,
  Coast = 1, // shallow water / shoreline water
  Beach = 2,
  Grassland = 3,
  Forest = 4,
  Wetland = 5,
  Desert = 6,
  Hills = 7,
  RockyMountain = 8,
  SnowMountain = 9,
  Lake = 10,
  River = 11,
  Tundra = 12,
  Taiga = 13,
}

export const BIOME_COUNT = 14;

/** Macro WFC tile families that plan the large-scale structure. */
export enum MacroTile {
  Ocean = 0,
  Coast = 1,
  Lowland = 2,
  Grassland = 3,
  Forest = 4,
  Wetland = 5,
  Desert = 6,
  Hills = 7,
  RockyMountain = 8,
  SnowMountain = 9,
  LakeCandidate = 10,
  RiverSource = 11,
  RiverCorridor = 12,
}

export const MACRO_TILE_COUNT = 13;

/** All user-tunable generation parameters (bound to lil-gui). */
export interface GenParams {
  seed: number;
  chunkSize: number; // fine pixels per chunk edge: 256 | 512 | 1024
  macroResolution: number; // macro cells per region edge (WFC grid size): 16 | 32 | 64
  macroCellSize: number; // fine pixels per macro cell

  // height
  waterLevel: number; // 0..1 sea level on the height map
  continentScale: number; // world px period of continents (larger = bigger landmasses)
  heightScale: number; // overall elevation contrast
  noiseScale: number; // base/detail feature size in world px
  domainWarpStrength: number;
  mountainStrength: number;
  ridgeStrength: number;

  // climate
  temperatureGradient: number; // north-south gradient strength
  moistureScale: number;
  biomeScale: number;

  // rivers
  riverSourceCount: number; // sources per region
  riverDensity: number; // accumulation threshold scaling
  riverMeanderStrength: number;
  riverCarvingStrength: number;
  riverWidthMultiplier: number;
  riverSourceBias: number; // 0 = pure hydrology, 1 = sources only in WFC upland (hills/mountains)
  riverMaxHeight: number; // normalised height above which rivers are not drawn (keeps them out of steep mountain terrain)

  // lakes
  lakeFrequency: number;
  lakeSpillTolerance: number;
  lakeMaxHeight: number; // normalised surface height above which basins are not made lakes (no perched mountain lakes)

  // surface
  shoreWidth: number;
  vegetationDensity: number;

  // 3D view (stage 2)
  terrainHeightScale: number; // world units for a height of 1.0
  meshResolution: number; // grid segments per chunk edge in 3D
  streamRadius: number; // chunk-loading radius around the fly camera
  sunAzimuth: number; // degrees
  sunElevation: number; // degrees above horizon
  sunIntensity: number;
  fogDistance: number; // fog far distance (world units)
  flySpeed: number; // camera movement speed

  // 3D detail layer (stage 2) — these shape the local terrain ON TOP of the
  // macro 2D maps. They drive TerrainDetailGenerator, never the macro maps.
  reliefExponent: number; // land-height curve power: >1 flattens plains & makes peaks tower
  detailStrength: number; // overall local-detail amplitude multiplier
  mountainRidgeStrength: number; // ridged-noise amplitude in mountain biomes
  cliffStrength: number; // extra shaping on steep slopes / rocky biomes
  riverValleyStrength: number; // how strongly rivers carve a visible 3D valley
  riverWaterOffset: number; // world units the river surface sits above its bed
  lakeWaterOffset: number; // world units the lake surface is nudged by
  shoreSmoothing: number; // how strongly detail flattens toward water
  snowHeight: number; // normalised height where snow begins
  snowSoftness: number; // snow blend width in normalised height
  rockSlopeThreshold: number; // slope (0..1) above which rock shows through
  treeDensity: number; // vegetation instance density multiplier
  rockDensity: number; // rock instance density multiplier
}

export type ViewMode = '2d' | '3d';

/** Anything that can hold loaded chunks (MapPreview for 2D, Terrain3D for 3D). */
export interface ChunkView {
  has(cx: number, cy: number): boolean;
  addChunk(data: ChunkData): void;
  removeChunk(cx: number, cy: number): void;
  loadedKeys(): string[];
}

export const DEFAULT_PARAMS: GenParams = {
  seed: 1337,
  chunkSize: 256,
  macroResolution: 32,
  macroCellSize: 32,

  waterLevel: 0.42,
  continentScale: 2200,
  heightScale: 1.0,
  noiseScale: 200,
  domainWarpStrength: 0.35,
  mountainStrength: 1.0,
  ridgeStrength: 0.55,

  temperatureGradient: 0.5,
  moistureScale: 900,
  biomeScale: 1.0,

  riverSourceCount: 10,
  riverDensity: 1.0,
  riverMeanderStrength: 0.5,
  riverCarvingStrength: 0.5,
  riverWidthMultiplier: 1.0,
  riverSourceBias: 0.5,
  riverMaxHeight: 0.72,

  lakeFrequency: 0.4,
  lakeSpillTolerance: 0.02,
  lakeMaxHeight: 0.74,

  shoreWidth: 0.5,
  vegetationDensity: 1.0,

  terrainHeightScale: 340,
  meshResolution: 96,
  streamRadius: 4,
  sunAzimuth: 135,
  sunElevation: 45,
  sunIntensity: 2.4,
  fogDistance: 2600,
  flySpeed: 220,

  reliefExponent: 2.0,
  detailStrength: 1.0,
  mountainRidgeStrength: 1.0,
  cliffStrength: 1.0,
  riverValleyStrength: 1.0,
  riverWaterOffset: 0.8,
  lakeWaterOffset: 0.0,
  shoreSmoothing: 1.0,
  snowHeight: 0.8,
  snowSoftness: 0.12,
  rockSlopeThreshold: 0.42,
  treeDensity: 1.0,
  rockDensity: 1.0,
};

/** All per-cell maps for one chunk (apron already trimmed). */
export interface ChunkData {
  cx: number;
  cy: number;
  size: number;
  heightMap: Float32Array;
  moistureMap: Float32Array;
  temperatureMap: Float32Array;
  slopeMap: Float32Array;
  biomeMap: Uint8Array;
  riverMap: Float32Array;
  flowAccumulationMap: Float32Array;
  lakeMap: Float32Array;
  waterDistanceMap: Float32Array;
  shoreMap: Float32Array;
  vegetationDensityMap: Float32Array;
  /** Per-pixel macro tile id, for the macro debug layer. */
  macroMap: Uint8Array;
  /**
   * Water surface height (normalised 0..1, same scale as heightMap) where water
   * exists — sea level for ocean, flat lake level for lakes, channel level for
   * rivers; 0 where there is no water. Used by the 3D water mesh.
   */
  waterSurfaceMap: Float32Array;
  /** 1 where a water surface should render, else 0. */
  waterMask: Uint8Array;
  /**
   * Height map with a 1-pixel border of real neighbour data ((size+2)²), used by
   * the 3D terrain so adjacent chunk meshes meet exactly (crack-free + matching
   * normals at chunk seams).
   */
  heightMapBordered: Float32Array;
  /**
   * River polylines (world coordinates, from the Stage 1 RiverNetwork) that pass
   * through this chunk's footprint, clipped with a small margin. Exposed so the
   * 3D RiverMeshBuilder can build ribbon meshes that follow the real macro paths
   * instead of guessing them back out of the river pixel mask.
   */
  riverPaths: RiverPoint[][];
}

/** One sample along a river polyline (world coordinates). */
export interface RiverPoint {
  x: number;
  y: number;
  flow: number; // accumulated upstream area at this point
  width: number; // channel width in world px
  depth: number; // carve depth in height units
}

export interface RiverPath {
  points: RiverPoint[];
  terminus: 'ocean' | 'lake' | 'boundary' | 'merge';
}

export interface RiverNetwork {
  paths: RiverPath[];
  sources: { x: number; y: number }[];
}

/** Per-region macro plan + drainage substrate (cached by RegionManager). */
export interface RegionData {
  rx: number;
  ry: number;
  macroW: number; // = macroResolution
  macroH: number;
  macroCellSize: number;
  macroTiles: Uint8Array;
  macroHeight: Float32Array; // band-limited base height per macro cell
  macroTemp: Float32Array;
  macroMoisture: Float32Array;
  // Drainage substrate (interior RM×RM), filled in step 5.
  macroFilled?: Float32Array; // depression-filled height
  macroAccum?: Float32Array; // normalised flow accumulation 0..1
  lakeDepth?: Float32Array; // 0 = no lake, else lake depth in height units
  lakeSurface?: Float32Array; // flat water level where lakeDepth>0
  rivers?: RiverNetwork; // river polylines passing through this region
  spillPoints?: { x: number; y: number }[]; // world-space lake outlets
}

/** The debug layers selectable in the UI. */
export const DEBUG_LAYERS = [
  'final',
  'height',
  'biome',
  'moisture',
  'temperature',
  'slope',
  'rivers',
  'flow',
  'lakes',
  'waterDistance',
  'shore',
  'vegetation',
  'macro',
] as const;

export type DebugLayer = (typeof DEBUG_LAYERS)[number];
