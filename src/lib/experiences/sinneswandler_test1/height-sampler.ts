/**
 * Height sampler — second stage of the new layered terrain pipeline.
 *
 * Refactor step 3: extracts height composition from
 * `BatWorld.sampleTerrainPoint` (world.ts:2538–2632) and the per-cell
 * pure functions driven by a NoiseStack, the biome context, and the
 * derived-field config.
 *
 * Returns a `HeightContext` that extends `BiomeContext` with the
 * height-stage intermediates (ridge / cliff / mountainMass / rolling /
 * clearing) plus the final `height`. These intermediates are
 * needed by `derived-field-sampler.ts` and by the acoustic estimators,
 * so we keep them on the struct rather than recomputing.
 *
 * Bit-identity with the pre-refactor world is preserved.
 */

import { fbm, type NoiseStack } from "$lib/three/world/NoiseStack";
import { remapNoise, ridge, saturate, smoothPeak } from "$lib/three/world/math";
import type { BiomeContext } from "./biome-sampler";
import type { DerivedFieldConfig } from "./world-config";

export interface HeightContext extends BiomeContext {
  /** Smoothed rolling-hills factor (re-sampled continent noise with phase offset). */
  rolling: number;
  /** Primary mountain ridge factor (ridge-FBM, power-shaped). */
  ridgePrimary: number;
  /** Cliff factor (ridge-FBM on cliff noise, threshold-shifted). */
  cliffNoise: number;
  /** Compressed mountain mass — drives both height + acoustics + colour. */
  mountainMass: number;
  /** Forest-clearing weight (used by decoration density). */
  clearingWeight: number;
  /** Final composed surface height in world units. */
  height: number;
}

/**
 * Compose all height contributors and return a HeightContext.
 *
 * `mountainHeight` and the derived-field config (specifically
 * `clearingScale`) come from WorldConfig. The biome scale is the same
 * one used by BiomeSampler — passed in so HeightSampler stays
 * framework-agnostic and easy to test.
 */
export function sampleHeight(
  biome: BiomeContext,
  noise: NoiseStack,
  biomeScale: number,
  mountainHeight: number,
  derivedConfig: DerivedFieldConfig,
): HeightContext {
  const scale = biomeScale;
  const { wx, wz, forestWeight, grasslandWeight, mountainWeight, snowWeight, desertWeight, barrensWeight, basinWeight, chainNoise, highlandSignal, rugged, continent } = biome;

  // Rolling hills — re-uses the continent noise with a phase offset
  // (matches `noiseContinent` reuse at world.ts:2538).
  const rolling = fbm(
    noise.getNoise("continent"),
    wx * scale * 0.86 + 19.0,
    wz * scale * 0.86 - 11.0,
    4,
    2.05,
    0.52,
  );

  // Lower exponents → broader, rounded ridges instead of needle spikes.
  const ridgePrimary =
    ridge(
      fbm(noise.getNoise("ridges"), wx * scale * 1.35, wz * scale * 1.35, 5, 2.2, 0.56),
    ) ** 1.9;
  const ridgeSecondary =
    ridge(
      fbm(noise.getNoise("cliffs"), wx * scale * 3.25, wz * scale * 3.25, 4, 2.16, 0.48),
    ) ** 2.6;
  const cliffNoise = saturate(ridgeSecondary * 1.2 - 0.12);
  // Linear (exp = 1) keeps mountain mass smoothly graded instead of binary.
  const mountainMass = saturate(mountainWeight * 1.15 + highlandSignal * 0.42);

  // Clearing weight reuses the tree-cluster noise at an absolute frequency.
  const clearingWeight =
    smoothPeak(
      remapNoise(
        fbm(
          noise.getNoise("treeCluster"),
          wx * derivedConfig.clearingScale + 31.7,
          wz * derivedConfig.clearingScale - 18.4,
          3,
          2.02,
          0.52,
        ),
      ),
      0.54,
      0.12,
    ) *
    saturate(forestWeight * 1.2 - mountainWeight * 0.32 - snowWeight * 0.42);

  // Height contributors (world.ts:2605–2632 verbatim).
  // Softer mountain lift: lower ridge coefficient + reduced cliff bonus.
  const mountainLift =
    mountainMass *
    (22 +
      ridgePrimary * mountainHeight * 0.95 +
      cliffNoise * mountainHeight * 0.32);
  const barrenLift =
    barrensWeight * (6 + rugged * 12 + ridgePrimary * 10 + cliffNoise * 6);
  const forestRelief = forestWeight * (5 + rolling * 7);
  const grassRelief = grasslandWeight * (2 + rolling * 4);
  const snowRelief = snowWeight * (6 + ridgePrimary * 12 + rugged * 5);
  const desertRelief = desertWeight * (1.5 + rolling * 2.2 - basinWeight * 4);
  const canyonCut = basinWeight * (6 + (1 - chainNoise) * 6);
  const detail =
    fbm(noise.getNoise("detail"), wx * scale * 5.4, wz * scale * 5.4, 3, 2.45, 0.45) *
    (2.5 + rugged * 4.4 + mountainMass * 4.2);

  const height =
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

  return {
    ...biome,
    rolling,
    ridgePrimary,
    cliffNoise,
    mountainMass,
    clearingWeight,
    height,
  };
}
