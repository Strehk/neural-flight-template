/**
 * Generic terrain world config — the pure-data tree that drives the layered
 * terrain generation pipeline.
 *
 * Determinism contract: every value here, combined with the masterSeed, must
 * fully determine world generation. Nothing in the terrain module may read
 * mutable state outside of this config and the caches it builds from it.
 */

import type { TerrainBiomeId } from "./biome-types";
import { BAT_RIVER_DEFAULTS, type RiverConfig } from "./river/river-config";
import {
  BAT_DERIVED_FIELD_DEFAULTS,
  BAT_MASTER_SEED,
  BAT_NOISE_DEFAULTS,
  BAT_STREAMING_DEFAULTS,
  streamSeed,
  type DerivedFieldConfig,
  type NoiseLayerConfig,
  type NoiseStackConfig,
  type StreamingConfig,
} from "$lib/worldgen/noise-config";

export {
  BAT_DERIVED_FIELD_DEFAULTS,
  BAT_MASTER_SEED,
  BAT_NOISE_DEFAULTS,
  BAT_RIVER_DEFAULTS,
  BAT_STREAMING_DEFAULTS,
  streamSeed,
  type DerivedFieldConfig,
  type NoiseLayerConfig,
  type NoiseStackConfig,
  type RiverConfig,
  type StreamingConfig,
};

export const TERRAIN_WORLD_DEFAULTS = {
  chunkSize: 112,
  viewRadius: 2,
  terrainSegments: 40,
  biomeScale: 0.00115,
  mountainHeight: 68,
  treeDensity: 24,
  grassDensity: 44,
  baseVisibility: 0.0195,
  fogIntensity: 0.66,
} as const;

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
    biomeMod: Partial<Record<TerrainBiomeId, number>>;
  }>;
  /** Density mix weights (over treeCluster / grassCluster / rockCluster / basin). */
  density: {
    treeCluster: number;
    grassCluster: number;
    rockCluster: number;
    basin: number;
    /** Biome multipliers applied to each cluster term. */
    biomeBoost: Partial<Record<AcousticMaterial, Partial<Record<TerrainBiomeId, number>>>>;
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
  recipes: Record<TerrainBiomeId, BiomeScoreRecipe | null>;
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
  biomeWeights: Partial<Record<TerrainBiomeId, number>>;
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
 * This richer config is the internal authority that future tuning UIs /
 * node-editor parameters write to.
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
  /** River system tuning (graph-first hydrology — see river/river-config.ts). */
  river: RiverConfig;

  biomeScore: BiomeScoreConfig;
  heightSynth: HeightSynthConfig;
  decorations: DecorationConfig;

  /** Echo-pulse render tuning (unchanged from today's shader uniforms). */
  baseVisibility: number;
  fogIntensity: number;
  revealIntensity: number;
  wireThickness: number;
  /**
   * Per-biome frequency multipliers. Controls how often each terrain biome
   * appears in Voronoi cell assignment and post-blend weight scaling. Usually
   * derived from WorldPreset.biomes by `worldPresetToTerrainBiomeMultipliers`.
   * Undefined = uniform distribution (equal probability for all 6 biomes).
   */
  biomeMultipliers?: Partial<Record<TerrainBiomeId, number>>;
}

export const BAT_WORLD_CONFIG_DEFAULTS: WorldConfig = {
  masterSeed: BAT_MASTER_SEED,
  biomeScale: TERRAIN_WORLD_DEFAULTS.biomeScale,
  mountainHeight: TERRAIN_WORLD_DEFAULTS.mountainHeight,
  treeDensity: TERRAIN_WORLD_DEFAULTS.treeDensity,
  grassDensity: TERRAIN_WORLD_DEFAULTS.grassDensity,

  noise: BAT_NOISE_DEFAULTS,
  derivedField: BAT_DERIVED_FIELD_DEFAULTS,
  streaming: BAT_STREAMING_DEFAULTS,
  echo: BAT_ECHO_PROBE_DEFAULTS,
  acoustics: BAT_ACOUSTIC_DEFAULTS,
  river: BAT_RIVER_DEFAULTS,

  biomeScore: BAT_BIOME_SCORE_PLACEHOLDER,
  heightSynth: BAT_HEIGHT_SYNTH_PLACEHOLDER,
  decorations: BAT_DECORATION_PLACEHOLDER,

  baseVisibility: TERRAIN_WORLD_DEFAULTS.baseVisibility,
  fogIntensity: TERRAIN_WORLD_DEFAULTS.fogIntensity,
  revealIntensity: 1.5,
  wireThickness: 1.3,
};

export const TERRAIN_WORLD_CONFIG_DEFAULTS = BAT_WORLD_CONFIG_DEFAULTS;
