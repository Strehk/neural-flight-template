/**
 * Height sampler — second stage of the new layered terrain pipeline.
 *
 * Refactor step 3: extracts height composition from
 * `BatWorld.sampleTerrainPoint` (world.ts:2538–2632) and the per-cell
 * pond field from `BatWorld.samplePondField` (world.ts:2396–2429) into
 * pure functions driven by a NoiseStack, the biome context, and the
 * derived-field config.
 *
 * Returns a `HeightContext` that extends `BiomeContext` with the
 * height-stage intermediates (ridge / cliff / mountainMass / rolling /
 * clearing / pond) plus the final `height`. These intermediates are
 * needed by `derived-field-sampler.ts` and by the acoustic estimators,
 * so we keep them on the struct rather than recomputing.
 *
 * Bit-identity with the pre-refactor world is preserved.
 */

import { fbm, type NoiseStack } from "$lib/three/world/NoiseStack";
import { remapNoise, ridge, saturate, smoothPeak, smoothRange } from "$lib/three/world/math";
import { seededRandom2D } from "$lib/three/random";
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
  /** Forest-clearing weight (used by pond modulation and decoration density). */
  clearingWeight: number;
  /** Pond weight at this point in [0,1]. */
  pondWeight: number;
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

  const ridgePrimary = Math.pow(
    ridge(
      fbm(noise.getNoise("ridges"), wx * scale * 1.35, wz * scale * 1.35, 5, 2.2, 0.56),
    ),
    3.8,
  );
  const ridgeSecondary = Math.pow(
    ridge(
      fbm(noise.getNoise("cliffs"), wx * scale * 3.25, wz * scale * 3.25, 4, 2.16, 0.48),
    ),
    5.4,
  );
  const cliffNoise = saturate(ridgeSecondary * 1.35 - 0.18);
  const mountainMass = Math.pow(
    saturate(mountainWeight * 1.15 + highlandSignal * 0.42),
    1.55,
  );

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

  const pondWeight =
    samplePondField(wx, wz, derivedConfig) *
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

  // Height contributors (world.ts:2605–2632 verbatim).
  const mountainLift =
    mountainMass *
    (22 +
      ridgePrimary * mountainHeight * 1.35 +
      cliffNoise * mountainHeight * 0.55);
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

  return {
    ...biome,
    rolling,
    ridgePrimary,
    cliffNoise,
    mountainMass,
    clearingWeight,
    pondWeight,
    height,
  };
}

/**
 * Per-cell pond field, lifted verbatim from world.ts:2396–2429. Pure
 * function so any sampler / debug tool can call it without a BatWorld
 * instance. Uses `seededRandom2D` for determinism (no internal RNG state).
 */
export function samplePondField(
  x: number,
  z: number,
  config: DerivedFieldConfig,
): number {
  const cellSize = config.pondCellSize;
  const gx = Math.floor(x / cellSize);
  const gz = Math.floor(z / cellSize);
  let weight = 0;

  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      const cellX = gx + dx;
      const cellZ = gz + dz;
      const seed = cellX * 92837111 + cellZ * 689287499;
      const presence = seededRandom2D(seed, 631);
      if (presence > 0.34) continue;

      const centerX =
        (cellX + 0.5 + (seededRandom2D(seed, 641) - 0.5) * 0.72) * cellSize;
      const centerZ =
        (cellZ + 0.5 + (seededRandom2D(seed, 643) - 0.5) * 0.72) * cellSize;
      const radius =
        config.pondRadiusMin +
        (config.pondRadiusMax - config.pondRadiusMin) *
          seededRandom2D(seed, 647);
      const dist = Math.hypot(x - centerX, z - centerZ);
      weight = Math.max(weight, smoothRange(radius - dist, 0, radius * 0.42));
    }
  }

  return weight;
}
