/**
 * TerrainSampler — the canonical entry point for terrain queries.
 *
 * Refactor step 4: composes the three sampler stages (biome → height →
 * derived) behind a single `sample(x, z)` call backed by an LRU cache,
 * and folds in the slope / acoustic helpers so the echo system can
 * resolve a hit without going through BatWorld.
 *
 * Two access modes:
 *   - `sample(x, z)`         — cached, 2-unit quantisation. Use for
 *                              echo hits, chemosense, sense-switch,
 *                              chunk vertex generation. The shared
 *                              cache is the perf win.
 *   - `sampleExact(x, z)`    — uncached. Use for player altitude,
 *                              slope finite-differences, and any other
 *                              consumer that must not snap to the
 *                              quantisation grid.
 *
 * Determinism: TerrainSampler is the only owner of mutable cache state
 * the world holds outside GPU resources. `clearCache()` is idempotent
 * and the cached entries memoise pure functions, so eviction at any
 * time is safe (foundation of the GC-safety story in step 5).
 */

import { NoiseStack } from "$lib/three/world/NoiseStack";
import { SampleCache } from "$lib/three/world/SampleCache";
import {
  BAT_DERIVED_FIELD_DEFAULTS,
  type WorldConfig,
} from "./world-config";
import type { BatBiomeId } from "./config";
import { sampleBiome, type BiomeWeights } from "./biome-sampler";
import { sampleHeight } from "./height-sampler";
import {
  sampleDerivedFields,
  type DerivedContext,
} from "./derived-field-sampler";
import {
  estimateAcousticDensity,
  estimateAcousticRuggedness,
  estimateReflectivity,
  type AcousticReading,
  type EchoMaterial,
} from "./acoustics";
import type * as THREE from "three";
import type { WorldRuntime, WorldSample } from "$lib/worldgen";
import type { BiomeId } from "$lib/worldgen/types";

/** Public sample shape consumed by Sinneswandler renderers and systems. */
export interface TerrainSample extends DerivedContext {
	worldBiome: BiomeId | null;
	waterDepth: number;
	flow: number;
	riverWidth: number;
	channelDepth: number;
	isRiver: boolean;
	isLake: boolean;
	isWater: boolean;
}

export interface TerrainSamplerOptions {
	/** Override the default cache size (default 8192 entries). */
	cacheSize?: number;
	/** Override the cache quantisation in world units (default 2). */
	cacheQuantization?: number;
	/** Optional generated world runtime. When present, it owns terrain samples. */
	worldRuntime?: WorldRuntime;
}

export class TerrainSampler {
  readonly noiseStack: NoiseStack;
  readonly config: WorldConfig;
  readonly cache: SampleCache<TerrainSample>;
  /** Slope finite-difference half-step in world units (matches legacy 2.8 m). */
  readonly slopeStep = 2.8;
	/** Normalisation factor for slope (matches legacy 0.045). */
	readonly slopeScale = 0.045;

	private biomeOverride: BatBiomeId | null = null;
	private readonly worldRuntime: WorldRuntime | null;

	constructor(config: WorldConfig, options: TerrainSamplerOptions = {}) {
		this.config = config;
		this.noiseStack = new NoiseStack(config.noise, config.masterSeed);
		this.worldRuntime = options.worldRuntime ?? null;
		this.cache = new SampleCache<TerrainSample>({
			maxSize: options.cacheSize ?? 8192,
			quantization: options.cacheQuantization ?? 2,
    });
  }

  /** Force-rebuild path: drops cached samples after a settings/seed change. */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Patch the live WorldConfig and invalidate the cache. Used by
   * `BatWorld.setSettings` when biomeScale / mountainHeight change.
   *
   * Only the fields actually used by sampler stages need to be passed
   * in — additional partial keys are merged but won't have any effect
   * if no sampler reads them.
   */
  updateConfig(partial: Partial<WorldConfig>): void {
    Object.assign(this.config, partial);
    this.clearCache();
  }

  /** Set the biome override and invalidate the cache (samples depend on it). */
  setBiomeOverride(biome: BatBiomeId | null): void {
    if (this.biomeOverride === biome) return;
    this.biomeOverride = biome;
    this.cache.clear();
  }

  getBiomeOverride(): BatBiomeId | null {
    return this.biomeOverride;
  }

  /**
   * Cached terrain sample. Returns the canonical cell sample — do not
   * mutate the result; treat it as frozen. Cache hits cost one map
   * lookup; misses run the full three-stage pipeline.
   */
  sample(x: number, z: number): TerrainSample {
    const hit = this.cache.get(x, z);
    if (hit !== undefined) return hit;
    const fresh = this.computeSample(x, z);
    return this.cache.set(x, z, fresh);
  }

  /**
   * Uncached terrain sample. Use when the snap-to-cell behaviour of
   * `sample()` would be visible — primarily player altitude and the
   * slope finite-difference.
   */
  sampleExact(x: number, z: number): TerrainSample {
    return this.computeSample(x, z);
  }

  /**
   * Public height lookup. Goes through the cache — the 2-unit snap is
   * smaller than the terrain mesh's own ~2.8 m triangle resolution and
   * well within the player's altitude smoothing, but the cache makes
   * the per-cell chemosense scan (50+ calls / frame) effectively free.
   *
   * For exact / un-snapped height (e.g. the slope finite-difference)
   * use `sampleExact(x, z).height` directly.
   */
  sampleHeight(x: number, z: number): number {
    return this.sample(x, z).height;
  }

  /** Biome lookup. Goes through the cache — biome rarely needs sub-cell precision. */
  sampleBiomeId(x: number, z: number): BatBiomeId {
    return this.sample(x, z).dominantBiome;
  }

  /** Normalised biome blend weights at (x, z) — use for smooth atmospheric transitions. */
  sampleBiomeWeights(x: number, z: number): BiomeWeights {
    const s = this.sample(x, z);
    return {
      forestWeight: s.forestWeight,
      grasslandWeight: s.grasslandWeight,
      mountainWeight: s.mountainWeight,
      snowWeight: s.snowWeight,
      desertWeight: s.desertWeight,
      barrensWeight: s.barrensWeight,
    };
  }

  /**
   * Saturated finite-difference slope at (x, z). Uses uncached lookups
   * so the |Δheight| isn't quantised by the cell snap of the public
   * `sampleHeight` (cached). Slope feeds echo ruggedness, where the
   * exact gradient matters.
   */
  slope(x: number, z: number): number {
    const s = this.slopeStep;
    const dx = Math.abs(this.sampleExact(x + s, z).height - this.sampleExact(x - s, z).height);
    const dz = Math.abs(this.sampleExact(x, z + s).height - this.sampleExact(x, z - s).height);
    const value = (dx + dz) * this.slopeScale;
    return value > 1 ? 1 : value < 0 ? 0 : value;
  }

  /**
   * Composite acoustic reading for an echo hit. Bundles density,
   * ruggedness, and reflectivity so the echo probe can issue one call
   * per hit instead of three.
   */
  acoustics(
    sample: TerrainSample,
    material: EchoMaterial,
    origin: THREE.Vector3,
    hit: THREE.Vector3,
    range: number,
  ): AcousticReading {
    const slope = this.slope(hit.x, hit.z);
    return {
      density: estimateAcousticDensity(sample),
      ruggedness: estimateAcousticRuggedness(origin, hit, sample, range, slope),
      reflectivity: estimateReflectivity(material, sample),
    };
  }

  // -- private ----------------------------------------------------------

  /**
   * Single-pass sampler chain. Kept private so consumers can't bypass
   * the cache by accident. Used by both `sample()` and `sampleExact()`.
   *
   * Always runs the 3-stage NoiseStack pipeline (Voronoi biomes → height
   * → derived fields) to preserve the original Erasmus visual quality.
   * WorldRuntime is used only as a hydrology overlay (rivers, lakes,
   * water depth) on top of the NoiseStack terrain.
   */
  private computeSample(x: number, z: number): TerrainSample {
    const biome = sampleBiome(
      x,
      z,
      this.noiseStack,
      this.config.biomeScale,
      this.biomeOverride,
      this.config.biomeMultipliers,
    );
    const heightCtx = sampleHeight(
      biome,
      this.noiseStack,
      this.config.biomeScale,
      this.config.mountainHeight,
      BAT_DERIVED_FIELD_DEFAULTS,
    );
    const derived = sampleDerivedFields(
      heightCtx,
      this.noiseStack,
      this.config.biomeScale,
      BAT_DERIVED_FIELD_DEFAULTS,
    );

    if (this.worldRuntime) {
      const ws = this.worldRuntime.sample(x, z);
      const isWater = ws.waterDepth > 0.015 || ws.isRiver || ws.isLake;
      const scaledDepth = isWater
        ? Math.max(0.4, ws.waterDepth * this.config.mountainHeight * 0.35)
        : 0;
      return {
        ...derived,
        worldBiome: ws.biome,
        waterDepth: scaledDepth,
        flow: ws.flow,
        riverWidth: ws.riverWidth,
        channelDepth: ws.channelDepth,
        isRiver: ws.isRiver,
        isLake: ws.isLake,
        isWater,
      };
    }

    return withDefaultWorldSurface(derived);
  }
}

function withDefaultWorldSurface(sample: DerivedContext): TerrainSample {
  return {
    ...sample,
    worldBiome: null,
    waterDepth: 0,
    flow: 0,
    riverWidth: 0,
    channelDepth: 0,
    isRiver: false,
    isLake: false,
    isWater: false,
  };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function smoothRange(value: number, start: number, end: number): number {
  if (end <= start) return value >= end ? 1 : 0;
  const x = clamp01((value - start) / (end - start));
  return x * x * (3 - 2 * x);
}
