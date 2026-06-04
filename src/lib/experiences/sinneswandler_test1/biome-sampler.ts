/**
 * Biome sampler — first stage of the new layered terrain pipeline.
 *
 * Refactor step 3 (see plans/please-look-at-the-parsed-pixel.md): this
 * extracts the noise-sampling + biome-scoring half of the legacy
 * `BatWorld.sampleTerrainPoint` (world.ts:2401–2536) into a pure function
 * driven by a NoiseStack and the world's biome scale + override.
 *
 * The output `BiomeContext` carries everything HeightSampler and
 * DerivedFieldSampler need downstream — the raw noise samples, the
 * derived `highlandSignal` / `basinWeight`, and the normalised six-biome
 * weights. Returning the intermediates as fields (rather than
 * recomputing them) is the basis for the LRU sample cache in step 4.
 *
 * Bit-identity with the pre-refactor world is preserved: every FBM call,
 * every constant, and the `biomeOverride` short-circuit all match
 * world.ts line-for-line. Validated by step 5's determinism script.
 */

import { fbm, type NoiseStack } from "$lib/three/world/NoiseStack";
import { remapNoise, saturate } from "$lib/three/world/math";
import type { BatBiomeId } from "./config";

export interface BiomeContext {
  /** Warped coordinates (warp applied to the input x/z). */
  wx: number;
  wz: number;

  /** Raw noise samples retained for downstream stages. */
  temperature: number;
  moisture: number;
  rugged: number;
  /** Signed continent noise (NOT remapped). */
  continent: number;
  basinNoise: number;
  chainNoise: number;

  /** Combined indicators used by both height + biome scoring. */
  highlandSignal: number;
  basinWeight: number;

  /** Normalised biome weights (sum ≈ 1). */
  forestWeight: number;
  grasslandWeight: number;
  mountainWeight: number;
  snowWeight: number;
  desertWeight: number;
  barrensWeight: number;

  /** Winner of `dominantBiome(weights)`. */
  dominantBiome: BatBiomeId;
}

/**
 * Apply the biome scoring formulas verbatim from world.ts:2461–2521,
 * including the `biomeOverride` short-circuit that forces all scores to
 * 0/1 of the chosen biome.
 */
export function sampleBiome(
  x: number,
  z: number,
  noise: NoiseStack,
  biomeScale: number,
  biomeOverride: BatBiomeId | null = null,
): BiomeContext {
  const scale = biomeScale;
  const warp = noise.warpAmount;

  // Coordinate warp (single-octave samples on the warp noises).
  const warpInputScale = scale * 1.7; // matches the `scale * 1.7` literal in world.ts:2408.
  const wx = x + noise.getNoise("warpX")(x * warpInputScale, z * warpInputScale) * warp;
  const wz = z + noise.getNoise("warpZ")(x * warpInputScale, z * warpInputScale) * warp;

  // Raw FBM samples on warped coordinates.
  const temperature = remapNoise(
    fbm(noise.getNoise("temperature"), wx * scale * 0.8, wz * scale * 0.8, 3, 2.1, 0.55),
  );
  const moisture = remapNoise(
    fbm(noise.getNoise("moisture"), wx * scale * 0.9, wz * scale * 0.9, 4, 2.0, 0.52),
  );
  const rugged = Math.pow(
    remapNoise(
      fbm(noise.getNoise("rugged"), wx * scale * 1.3, wz * scale * 1.3, 4, 2.24, 0.58),
    ),
    1.5,
  );
  const continent = fbm(
    noise.getNoise("continent"), wx * scale * 0.34, wz * scale * 0.34, 5, 2.0, 0.54,
  );
  const basinNoise = remapNoise(
    fbm(noise.getNoise("basins"), wx * scale * 0.52, wz * scale * 0.52, 4, 2.05, 0.52),
  );
  const chainNoise = remapNoise(
    fbm(noise.getNoise("chains"), wx * scale * 0.4, wz * scale * 0.4, 4, 2.06, 0.54),
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

  // Biome scores — formulas verbatim from world.ts:2461–2512.
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

  if (biomeOverride) {
    forestScore = biomeOverride === "forest" ? 1 : 0;
    grasslandScore = biomeOverride === "grassland" ? 1 : 0;
    mountainScore = biomeOverride === "mountains" ? 1 : 0;
    snowScore = biomeOverride === "snow" ? 1 : 0;
    desertScore = biomeOverride === "desert" ? 1 : 0;
    barrensScore = biomeOverride === "barrens" ? 1 : 0;
  }

  // Normalise — same epsilon as the legacy code so identical floats fall out.
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

  return {
    wx,
    wz,
    temperature,
    moisture,
    rugged,
    continent,
    basinNoise,
    chainNoise,
    highlandSignal,
    basinWeight,
    forestWeight,
    grasslandWeight,
    mountainWeight,
    snowWeight,
    desertWeight,
    barrensWeight,
    dominantBiome: dominantBiome({
      forestWeight,
      grasslandWeight,
      mountainWeight,
      snowWeight,
      desertWeight,
      barrensWeight,
    }),
  };
}

/**
 * Resolve the biome whose normalised weight wins. Tie-breaker order
 * matches the legacy `dominantBiome` (world.ts:256–302): snow first,
 * then mountains, forest, desert, finally barrens vs. grassland.
 */
export function dominantBiome(point: {
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
