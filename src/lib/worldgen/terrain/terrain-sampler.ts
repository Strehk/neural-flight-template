/**
 * TerrainSampler — the canonical entry point for terrain queries.
 *
 * Two access modes:
 *   - `sample(x, z)`         — cached, 2-unit quantisation. Use for
 *                              echo hits, chemosense, sense-switch,
 *                              chunk vertex generation.
 *   - `sampleExact(x, z)`    — uncached. Use for player altitude,
 *                              slope finite-differences, and any other
 *                              consumer that must not snap to the
 *                              quantisation grid.
 */

import { NoiseStack } from "$lib/three/world/NoiseStack";
import { SampleCache } from "$lib/three/world/SampleCache";
import {
  BAT_DERIVED_FIELD_DEFAULTS,
  type WorldConfig,
} from "./world-config";
import type { TerrainBiomeId } from "./biome-types";
import { sampleBiome, type BiomeWeights } from "./biome-sampler";
import { sampleHeight } from "./height-sampler";
import { RiverRegionCache } from "./river/RiverRegionCache";
import { applyRiverCarve } from "./river/carve";
import { saturate } from "$lib/three/world/math";
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

/** Public sample shape consumed by terrain renderers and systems. */
export interface TerrainSample extends DerivedContext {
	waterDepth: number;
	waterSurfaceHeight: number;
	isWater: boolean;
}

export interface TerrainSamplerOptions {
	/** Override the default cache size (default 8192 entries). */
	cacheSize?: number;
	/** Override the cache quantisation in world units (default 2). */
	cacheQuantization?: number;
}

export class TerrainSampler {
  readonly noiseStack: NoiseStack;
  readonly config: WorldConfig;
  readonly cache: SampleCache<TerrainSample>;
  /** Slope finite-difference half-step in world units (matches legacy 2.8 m). */
  readonly slopeStep = 2.8;
	/** Normalisation factor for slope (matches legacy 0.045). */
	readonly slopeScale = 0.045;

	private biomeOverride: TerrainBiomeId | null = null;
	private riverCache: RiverRegionCache;

	constructor(config: WorldConfig, options: TerrainSamplerOptions = {}) {
		this.config = config;
		this.noiseStack = new NoiseStack(config.noise, config.masterSeed);
		this.cache = new SampleCache<TerrainSample>({
			maxSize: options.cacheSize ?? 8192,
			quantization: options.cacheQuantization ?? 2,
    });
		this.riverCache = this.buildRiverCache();
  }

  /** (Re)build the river region cache from the current config values. */
  private buildRiverCache(): RiverRegionCache {
    return new RiverRegionCache({
      noise: this.noiseStack,
      config: this.config.river,
      biomeScale: this.config.biomeScale,
      mountainHeight: this.config.mountainHeight,
      seed: this.config.masterSeed,
      biomeMultipliers: this.config.biomeMultipliers,
    });
  }

  /** Force-rebuild path: drops cached samples after a settings/seed change. */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Patch the live WorldConfig and invalidate the cache. Used by
   * `BatWorld.setSettings` when biomeScale / mountainHeight change.
   */
  updateConfig(partial: Partial<WorldConfig>): void {
    Object.assign(this.config, partial);
    // River geometry depends on biomeScale / mountainHeight / river config —
    // rebuild the network cache so patched values take effect.
    this.riverCache = this.buildRiverCache();
    this.clearCache();
  }

  /** Set the biome override and invalidate the cache (samples depend on it). */
  setBiomeOverride(biome: TerrainBiomeId | null): void {
    if (this.biomeOverride === biome) return;
    this.biomeOverride = biome;
    this.cache.clear();
  }

  getBiomeOverride(): TerrainBiomeId | null {
    return this.biomeOverride;
  }

  /**
   * Cached terrain sample. Returns the canonical cell sample — do not
   * mutate the result; treat it as frozen.
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

  sampleHeight(x: number, z: number): number {
    return this.sample(x, z).height;
  }

  /** Biome lookup. Goes through the cache. */
  sampleBiomeId(x: number, z: number): TerrainBiomeId {
    return this.sample(x, z).dominantBiome;
  }

  /** Normalised biome blend weights at (x, z). */
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

  slope(x: number, z: number): number {
    const s = this.slopeStep;
    const dx = Math.abs(this.sampleExact(x + s, z).height - this.sampleExact(x - s, z).height);
    const dz = Math.abs(this.sampleExact(x, z + s).height - this.sampleExact(x, z - s).height);
    const value = (dx + dz) * this.slopeScale;
    return value > 1 ? 1 : value < 0 ? 0 : value;
  }

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

    // River carve — water shaping the land. Runs between height composition
    // and the derived fields so colour/altitude bands see the carved valley.
    // Steep, rugged terrain pinches the banks into a gorge; flat terrain keeps
    // the wide floodplain (Rule 14).
    const river = this.riverCache.sample(x, z);
    const gorge = saturate(heightCtx.rugged * 0.6 + heightCtx.mountainMass * 0.8);
    const carve = applyRiverCarve(heightCtx.height, river, gorge);
    heightCtx.height = carve.height;

    const derived = sampleDerivedFields(
      heightCtx,
      this.noiseStack,
      this.config.biomeScale,
      BAT_DERIVED_FIELD_DEFAULTS,
    );
    return {
      ...derived,
      waterDepth: carve.waterDepth,
      waterSurfaceHeight: carve.waterSurfaceHeight,
      isWater: carve.isWater,
    };
  }
}
