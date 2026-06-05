/**
 * Sinneswandler world config — the pure-data tree that drives the layered
 * world generation. Step 1 of the refactor plan
 * (see plans/please-look-at-the-parsed-pixel.md): this file establishes the
 * *shape* of the config and reproduces today's behaviour as the default
 * values. No call site uses it yet — steps 2–10 progressively route the
 * existing world.ts through these defaults.
 *
 * Determinism contract: every value here, combined with the masterSeed, must
 * fully determine world generation. Nothing in the World may read mutable
 * state outside of this config (and the GPU caches it builds from it).
 */

import {
  BAT_MOTH_DEFAULTS,
  BAT_WORLD_DEFAULTS,
  type BatBiomeId,
} from "./config";

// ---------------------------------------------------------------------------
// Master seed
// ---------------------------------------------------------------------------

/**
 * Default master seed for sinneswandler. All noise-layer seeds, per-chunk
 * RNGs, and any other deterministic generator derive from this via the
 * named-stream hash below.
 *
 * The value is arbitrary but stable; changing it reshapes the world
 * end-to-end. Tests in scripts/check-world-determinism.ts pin against the
 * defaults so accidental drift trips immediately.
 */
export const BAT_MASTER_SEED = 0xba75ee_d;

/**
 * Derive a 32-bit unsigned stream seed from the master seed and a stream
 * name. Used for both noise-layer seeding and per-chunk RNG streams (e.g.
 * `streamSeed(master, "pineTree")`, `streamSeed(master, "mothNatural")`).
 *
 * Uses FNV-1a over the UTF-16 code units of the name, mixed with the master
 * seed via xorshift. Pure, deterministic, fast.
 */
export function streamSeed(master: number, name: string): number {
  let h = (master ^ 0x811c9dc5) >>> 0;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  // final xorshift mix so adjacent names diverge fully
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

// ---------------------------------------------------------------------------
// Noise stack
// ---------------------------------------------------------------------------

/**
 * Recipe for one named noise layer or one FBM/ridge sample.
 *
 * In sinneswandler today most layers map 1:1 to a SimplexNoise instance, but
 * a couple of recipes (`rolling`, `clearing`) reuse another layer's noise
 * with different parameters. `sourceLayer` captures that aliasing so the
 * NoiseStack only allocates one SimplexNoise per *seeded* layer.
 *
 * Sample formula:
 *   wx = x * (absolute ? scale : biomeScale * scale) + phaseX
 *   wz = z * (absolute ? scale : biomeScale * scale) + phaseZ
 *   v  = fbm(noise(sourceLayer ?? name), wx, wz, octaves, lacunarity, gain)
 *   v  = ridge ? (1 - |v|) : v
 *   v  = signed ? v : (v * 0.5 + 0.5)        // remap to [0,1]
 *   v  = exponent != null ? v^exponent : v
 */
export interface NoiseLayerConfig {
  /** Recipe / layer name. Also used to derive the seed if `sourceLayer` is unset. */
  name: string;
  /** Reuse the noise instance of another layer instead of creating a new seed. */
  sourceLayer?: string;
  /**
   * Explicit seed override. When set, NoiseStack uses this instead of
   * `streamSeed(masterSeed, name)`. Used during the refactor migration to
   * preserve bit-identical noise outputs against the pre-refactor world;
   * remove once the determinism baseline is re-pinned in step 5.
   */
  seed?: number;
  /** Frequency factor. Multiplied by `WorldConfig.biomeScale` unless `absolute`. */
  scale: number;
  /** Treat `scale` as an absolute frequency (skip biomeScale multiplication). */
  absolute?: boolean;
  /** Optional phase offset applied *after* scaling (in noise-space, not world-space). */
  phaseX?: number;
  phaseZ?: number;
  /** FBM octaves. 1 = single raw `noise(x,z)` sample. */
  octaves: number;
  lacunarity: number;
  gain: number;
  /** Apply ridge transform `1 - |v|` after the FBM accumulation. */
  ridge?: boolean;
  /** Power exponent applied at the very end. */
  exponent?: number;
  /** Keep signed [-1,1] output; default remaps to [0,1]. */
  signed?: boolean;
}

export interface NoiseStackConfig {
  /** Coordinate-warp amplitude in world units. */
  warpAmount: number;
  /**
   * Named noise recipes. Keys must match `name` field. Order is irrelevant —
   * lookup is always by key.
   */
  layers: Record<string, NoiseLayerConfig>;
}

/**
 * Default noise stack — exact reproduction of the layers in `world.ts`
 * lines 337–350 (instances) and 2401–2681 (call sites). Verified against
 * the current `sampleTerrainPoint` so a NoiseStack driven by this config
 * produces identical FBM outputs.
 */
/**
 * Legacy hardcoded seeds from `world.ts:337–350` (pre-refactor). Pinned
 * here so step 2's NoiseStack reproduces today's terrain bit-identically.
 * Step 5 (`scripts/check-world-determinism.ts`) re-pins the baseline; from
 * then on we can drop these and rely solely on `streamSeed(masterSeed, name)`.
 */
export const BAT_NOISE_DEFAULTS: NoiseStackConfig = {
  warpAmount: 52,
  layers: {
    warpX:        { name: "warpX",        seed: 11,  scale: 1.7,    octaves: 1, lacunarity: 2,    gain: 0.5,  signed: true },
    warpZ:        { name: "warpZ",        seed: 23,  scale: 1.7,    octaves: 1, lacunarity: 2,    gain: 0.5,  signed: true },
    temperature:  { name: "temperature",  seed: 41,  scale: 0.8,    octaves: 3, lacunarity: 2.1,  gain: 0.55 },
    moisture:     { name: "moisture",     seed: 59,  scale: 0.9,    octaves: 4, lacunarity: 2.0,  gain: 0.52 },
    rugged:       { name: "rugged",       seed: 71,  scale: 1.3,    octaves: 4, lacunarity: 2.24, gain: 0.58, exponent: 1.5 },
    continent:    { name: "continent",    seed: 83,  scale: 0.34,   octaves: 5, lacunarity: 2.0,  gain: 0.54, signed: true },
    basins:       { name: "basins",       seed: 97,  scale: 0.52,   octaves: 4, lacunarity: 2.05, gain: 0.52 },
    chains:       { name: "chains",       seed: 113, scale: 0.4,    octaves: 4, lacunarity: 2.06, gain: 0.54 },
    /** Reuses the continent noise instance with different octaves + a phase offset. */
    rolling:      { name: "rolling", sourceLayer: "continent", scale: 0.86, phaseX: 19.0, phaseZ: -11.0, octaves: 4, lacunarity: 2.05, gain: 0.52, signed: true },
    ridges:       { name: "ridges",       seed: 131, scale: 1.35,   octaves: 5, lacunarity: 2.2,  gain: 0.56, ridge: true, exponent: 3.8, signed: true },
    cliffs:       { name: "cliffs",       seed: 149, scale: 3.25,   octaves: 4, lacunarity: 2.16, gain: 0.48, ridge: true, exponent: 5.4, signed: true },
    detail:       { name: "detail",       seed: 167, scale: 5.4,    octaves: 3, lacunarity: 2.45, gain: 0.45, signed: true },
    treeCluster:  { name: "treeCluster",  seed: 181, scale: 2.1,    octaves: 3, lacunarity: 2.08, gain: 0.52 },
    grassCluster: { name: "grassCluster", seed: 197, scale: 2.5,    octaves: 3, lacunarity: 2.16, gain: 0.5  },
    rockScatter:  { name: "rockScatter",  seed: 211, scale: 2.35,   octaves: 3, lacunarity: 2.14, gain: 0.52 },
    /**
     * Forest-clearing noise: reuses treeCluster's seed (matching today's
     * `noiseTreeCluster` reuse) but at an absolute frequency (CLEARING_SCALE
     * in world.ts:156) with a phase offset.
     */
    clearing:     { name: "clearing", sourceLayer: "treeCluster", scale: 0.0105, absolute: true, phaseX: 31.7, phaseZ: -18.4, octaves: 3, lacunarity: 2.02, gain: 0.52 },
  },
};

// ---------------------------------------------------------------------------
// Terrain — fixed elevation bands
// ---------------------------------------------------------------------------

/**
 * Constants that today live as module-level numbers at world.ts:148–159.
 * Pulling them here makes alternate biome stylings (or per-experience tunes)
 * trivial without touching code.
 */
export interface DerivedFieldConfig {
  mountainGrayHeightStart: number;
  mountainGrayHeightEnd: number;
  vegetationHeightStart: number;
  vegetationHeightEnd: number;
  midAltitudeStart: number;
  midAltitudePeak: number;
  alpineHeightStart: number;
  alpineHeightEnd: number;
  /** Absolute frequency of the clearing noise (used as `clearing.scale`). */
  clearingScale: number;
}

export const BAT_DERIVED_FIELD_DEFAULTS: DerivedFieldConfig = {
  mountainGrayHeightStart: 14,
  mountainGrayHeightEnd: 86,
  vegetationHeightStart: 8,
  vegetationHeightEnd: 58,
  midAltitudeStart: 22,
  midAltitudePeak: 54,
  alpineHeightStart: 48,
  alpineHeightEnd: 88,
  clearingScale: 0.0105,
};

// ---------------------------------------------------------------------------
// Streaming — anchor + dual-radius hysteresis
// ---------------------------------------------------------------------------

/**
 * Chunk streaming configuration. See plan §"Layer 2 — Chunk streaming".
 *
 * The current code uses a single `viewRadius` and rebuilds on every player
 * frame. `buildRadius` matches today's behaviour; `keepRadius` adds the
 * hysteresis band that lets chunks survive small back-and-forth movements
 * without being rebuilt. Set them equal to fall back to today's behaviour.
 */
export interface StreamingConfig {
  /** Side length of one chunk in world units. */
  chunkSize: number;
  /** Resolution of the terrain mesh per chunk (segments per side). */
  terrainSegments: number;
  /** How many chunk cells the player must cross before the anchor advances. */
  anchorStepCells: number;
  /** Radius (in chunks) of the build set. Chunks inside are built & uploaded. */
  buildRadius: number;
  /** Radius (in chunks) of the keep set. Chunks outside are disposed. Must be ≥ buildRadius. */
  keepRadius: number;
  /** Cap on chunk builds per frame to spread cost. */
  maxBuildsPerFrame: number;
  /**
   * If true, every chunk bakes an `AcousticField` (per-cell pre-sampled
   * TerrainSample) at build time and the EchoProbe resolves hits via
   * nearest-cell lookup instead of running the noise stack per hit.
   * Step 11 perf optimisation; on by default.
   */
  acousticFieldEnabled: boolean;
  /** Side length of one AcousticField cell in world units. Default 4. */
  acousticFieldGridStep: number;
}

export const BAT_STREAMING_DEFAULTS: StreamingConfig = {
  chunkSize: BAT_WORLD_DEFAULTS.chunkSize,
  terrainSegments: BAT_WORLD_DEFAULTS.terrainSegments,
  anchorStepCells: 1,
  buildRadius: BAT_WORLD_DEFAULTS.viewRadius,
  // Default keepRadius = buildRadius + 1 gives a one-chunk hysteresis ring.
  keepRadius: BAT_WORLD_DEFAULTS.viewRadius + 1,
  maxBuildsPerFrame: 3,
  acousticFieldEnabled: true,
  acousticFieldGridStep: 4,
};

// ---------------------------------------------------------------------------
// Echo probe
// ---------------------------------------------------------------------------

/**
 * Echolocation raycast configuration. Mirrors world.ts:160–163 and the
 * direction-set construction at world.ts:165–187.
 */
export interface EchoProbeConfig {
  /** Vertical fan angles (radians, relative to player forward). */
  elevationBands: readonly number[];
  /** Azimuth divisions per band. */
  azimuthSteps: number;
  /** Cap on total recorded hits per pulse. */
  maxHits: number;
  /** Cap on moth-bonus hits within `maxHits`. */
  mothBudget: number;
  /** Minimum hit distance — drops zero-range noise. */
  minHitDistance: number;
  /** Skip per-ray duplicate-material hits within this distance. */
  materialDedupeDistance: number;
  /** Maximum recorded hits per individual ray. */
  hitsPerRay: number;
}

export const BAT_ECHO_PROBE_DEFAULTS: EchoProbeConfig = {
  elevationBands: [-0.48, -0.28, -0.12, 0.02, 0.18],
  azimuthSteps: 18,
  maxHits: 72,
  mothBudget: 12,
  minHitDistance: 1.4,
  materialDedupeDistance: 3.4,
  hitsPerRay: 2,
};

// ---------------------------------------------------------------------------
// Acoustic surface model
// ---------------------------------------------------------------------------

export type AcousticMaterial = "terrain" | "tree" | "rock" | "grass" | "moth";

/**
 * Surface acoustics — per-material reflectivity bases and biome modifiers,
 * plus the density/ruggedness coefficient table. Today's estimators live at
 * world.ts:2287–2363; this captures the exact constants for step 3/step 4
 * extraction.
 */
export interface AcousticConfig {
  /** Reflectivity per material as `base + biomeMod[dominantBiome] * weight`. */
  reflectivity: Record<AcousticMaterial, {
    base: number;
    biomeMod: Partial<Record<BatBiomeId, number>>;
  }>;
  /** Density mix weights (over treeCluster / grassCluster / rockCluster / basin). */
  density: {
    treeCluster: number;
    grassCluster: number;
    rockCluster: number;
    basin: number;
    /** Biome multipliers applied to each cluster term. */
    biomeBoost: Partial<Record<AcousticMaterial, Partial<Record<BatBiomeId, number>>>>;
  };
  /** Ruggedness mix weights. */
  ruggedness: {
    slope: number;
    cliffiness: number;
    mountain: number;
    /** Vertical-offset-over-range coefficient. */
    verticalOffset: number;
  };
  /** Slope sample offset in world units for the ±dx / ±dz height comparison. */
  slopeSampleOffset: number;
  /** Slope normalisation factor (scales raw |dh|). */
  slopeScale: number;
}

export const BAT_ACOUSTIC_DEFAULTS: AcousticConfig = {
  reflectivity: {
    terrain: { base: 0.6,  biomeMod: { mountains: 0.12 } },
    tree:    { base: 0.42, biomeMod: { forest: 0.18 } },
    rock:    { base: 0.84, biomeMod: { mountains: 0.16 } },
    grass:   { base: 0.28, biomeMod: { grassland: 0.1 } },
    moth:    { base: 1.0,  biomeMod: {} },
  },
  density: {
    treeCluster: 0.3,
    grassCluster: 0.3,
    rockCluster: 0.3,
    basin: 0.08,
    biomeBoost: {
      tree:  { forest: 0.55 },
      grass: { grassland: 0.4 },
      rock:  { mountains: 0.35 },
    },
  },
  ruggedness: {
    slope: 0.52,
    cliffiness: 0.7,
    mountain: 0.24,
    verticalOffset: 0.44,
  },
  slopeSampleOffset: 2.8,
  slopeScale: 0.045,
};

// ---------------------------------------------------------------------------
// Biome scoring + height synthesis + decoration placement
// ---------------------------------------------------------------------------

/**
 * Schemas for the three big config branches that get populated in later
 * refactor steps. Step 1 only declares the shape — defaults stay implicit
 * inside `sampleTerrainPoint` / `createDecorations` until step 3 (biome,
 * height) and step 8 (decorations) extract them.
 *
 * Reserving the slots now keeps the `WorldConfig` interface stable so
 * step 2's NoiseStack extraction and step 4's TerrainSampler can compile
 * against the full config object without churn.
 */
export interface BiomeScoreConfig {
  /** Per-biome score recipe — left as `null` placeholder until step 3. */
  recipes: Record<BatBiomeId, BiomeScoreRecipe | null>;
}

export interface BiomeScoreRecipe {
  /** Power exponent applied after the weighted sum. */
  exponent: number;
  /** Weighted-sum terms; resolved at sample time against the noise stack and other biome scores. */
  terms: BiomeScoreTerm[];
  /** Optional bell-curve multiplier (used by `forest` for temperature centring). */
  bell?: { source: string; center: number; width: number };
}

export interface BiomeScoreTerm {
  /** Either a noise-layer name, a derived field name, or another biome score. */
  source: string;
  weight: number;
  /** If true, the term contributes `(1 - source)`. */
  invert?: boolean;
  /** Optional inner absolute-distance from `center` (used in grassland moisture term). */
  absDistance?: { center: number };
}

export const BAT_BIOME_SCORE_PLACEHOLDER: BiomeScoreConfig = {
  recipes: {
    forest: null,
    grassland: null,
    mountains: null,
    snow: null,
    desert: null,
    barrens: null,
  },
};

export interface HeightSynthConfig {
  /** Ordered contributors; left as placeholder until step 3. */
  contributors: HeightContributor[] | null;
}

export interface HeightContributor {
  name: string;
  /** Source expression — interpreted by HeightSampler. */
  expression: string;
}

export const BAT_HEIGHT_SYNTH_PLACEHOLDER: HeightSynthConfig = {
  contributors: null,
};

export interface DecorationConfig {
  /** Per-type placement recipes; left as placeholder until step 8. */
  types: Record<string, DecorationTypeRecipe> | null;
}

export interface DecorationTypeRecipe {
  /** Acoustic material tag (sets `mesh.userData.echoSurface`). */
  echoSurface: AcousticMaterial;
  /** Capacity per chunk: `max(min, density * factor)`. */
  capacity: { min: number; densityKey: "treeDensity" | "grassDensity"; factor: number };
  /** Biome weights used for placement probability. */
  biomeWeights: Partial<Record<BatBiomeId, number>>;
  /** Layer-mask channel for the Multi-Perception-Rendering system. */
  layerMask: number;
}

export const BAT_DECORATION_PLACEHOLDER: DecorationConfig = {
  types: null,
};

// ---------------------------------------------------------------------------
// Top-level WorldConfig
// ---------------------------------------------------------------------------

/**
 * The complete world configuration tree. Combined with `masterSeed` this is
 * the *only* input to world generation — every output is a pure function of
 * these values.
 *
 * `BAT_WORLD_DEFAULTS` (in config.ts) and `BatWorldSettings` remain the
 * user-facing tuning surface for now; this richer config is the internal
 * authority that future tuning UIs / node-editor parameters will write to.
 */
export interface WorldConfig {
  /** Master seed. All randomness derives from this via `streamSeed(...)`. */
  masterSeed: number;
  /** Base frequency multiplier for the noise stack. */
  biomeScale: number;
  /** Vertical scale for the mountain-mass contribution. */
  mountainHeight: number;
  /** Per-chunk decoration capacity inputs. */
  treeDensity: number;
  grassDensity: number;

  noise: NoiseStackConfig;
  derivedField: DerivedFieldConfig;
  streaming: StreamingConfig;
  echo: EchoProbeConfig;
  acoustics: AcousticConfig;

  biomeScore: BiomeScoreConfig;
  heightSynth: HeightSynthConfig;
  decorations: DecorationConfig;

  /** Echo-pulse render tuning (unchanged from today's shader uniforms). */
  baseVisibility: number;
  fogIntensity: number;
  revealIntensity: number;
  wireThickness: number;
}

export const BAT_WORLD_CONFIG_DEFAULTS: WorldConfig = {
  masterSeed: BAT_MASTER_SEED,
  biomeScale: BAT_WORLD_DEFAULTS.biomeScale,
  mountainHeight: BAT_WORLD_DEFAULTS.mountainHeight,
  treeDensity: BAT_WORLD_DEFAULTS.treeDensity,
  grassDensity: BAT_WORLD_DEFAULTS.grassDensity,

  noise: BAT_NOISE_DEFAULTS,
  derivedField: BAT_DERIVED_FIELD_DEFAULTS,
  streaming: BAT_STREAMING_DEFAULTS,
  echo: BAT_ECHO_PROBE_DEFAULTS,
  acoustics: BAT_ACOUSTIC_DEFAULTS,

  biomeScore: BAT_BIOME_SCORE_PLACEHOLDER,
  heightSynth: BAT_HEIGHT_SYNTH_PLACEHOLDER,
  decorations: BAT_DECORATION_PLACEHOLDER,

  baseVisibility: BAT_WORLD_DEFAULTS.baseVisibility,
  fogIntensity: BAT_WORLD_DEFAULTS.fogIntensity,
  revealIntensity: 1.5,
  wireThickness: 1.3,
};

/** Stable export of moth defaults, re-exposed so consumers can stay on world-config. */
export { BAT_MOTH_DEFAULTS };
