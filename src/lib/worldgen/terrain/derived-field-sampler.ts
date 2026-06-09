/**
 * Derived-field sampler — third stage of the new layered terrain
 * pipeline.
 *
 * Refactor step 3: extracts the altitude/vegetation/cliffiness factors
 * and the cluster-noise samples from `BatWorld.sampleTerrainPoint`
 * (world.ts:2634–2681) plus the echo-mode colour blend
 * (world.ts:2683–2749) into a pure function + a colour-blending helper.
 *
 * Output `DerivedContext` is a strict superset of `HeightContext`. The
 * existing `TerrainPointData` interface in world.ts is satisfied by it,
 * so call sites that destructure those fields keep working without
 * change.
 *
 * Bit-identity with the pre-refactor world is preserved. The day-time
 * vertex colour is still produced inline by `createTerrainGeometry` in
 * world.ts (line ~1227); that path is untouched in step 3 and is part
 * of step 8 when TerrainMeshBuilder gets extracted.
 */

import { fbm, type NoiseStack } from "$lib/three/world/NoiseStack";
import { remapNoise, saturate, smoothRange } from "$lib/three/world/math";
import type { HeightContext } from "./height-sampler";
import type { DerivedFieldConfig } from "./world-config";

export interface DerivedContext extends HeightContext {
  /** 0→1 across `mountainGrayHeightStart … End` — drives gray-tint blend. */
  altitudeFactor: number;
  /** 1→0 across `vegetationHeightStart … End` — suppresses flora at altitude. */
  vegetationFactor: number;
  /** Bell-curve over `midAltitudeStart … alpineHeightEnd`. */
  midAltitudeFactor: number;
  /** 0→1 across `alpineHeightStart … End`. */
  alpineFactor: number;
  /** Saturated cliff mask blending mountain mass + cliff noise + ruggedness. */
  cliffiness: number;
  /** Cluster densities used by decoration placement. */
  treeCluster: number;
  grassCluster: number;
  rockCluster: number;
}

/**
 * Compute the height-dependent factors + cluster samples. Pure function;
 * no THREE state involved.
 */
export function sampleDerivedFields(
  height: HeightContext,
  noise: NoiseStack,
  biomeScale: number,
  derivedConfig: DerivedFieldConfig,
): DerivedContext {
  const { wx, wz, mountainMass, cliffNoise, rugged } = height;
  const scale = biomeScale;
  const h = height.height;

  const altitudeFactor = smoothRange(
    h,
    derivedConfig.mountainGrayHeightStart,
    derivedConfig.mountainGrayHeightEnd,
  );
  const vegetationFactor =
    1 - smoothRange(h, derivedConfig.vegetationHeightStart, derivedConfig.vegetationHeightEnd);
  const midAltitudeFactor =
    smoothRange(h, derivedConfig.midAltitudeStart, derivedConfig.midAltitudePeak) *
    (1 - smoothRange(h, derivedConfig.midAltitudePeak, derivedConfig.alpineHeightEnd));
  const alpineFactor = smoothRange(
    h,
    derivedConfig.alpineHeightStart,
    derivedConfig.alpineHeightEnd,
  );
  const cliffiness = saturate(
    mountainMass * 0.35 + cliffNoise * 0.95 + rugged * 0.24,
  );

  const treeCluster = remapNoise(
    fbm(noise.getNoise("treeCluster"), wx * scale * 2.1, wz * scale * 2.1, 3, 2.08, 0.52),
  );
  const grassCluster = remapNoise(
    fbm(noise.getNoise("grassCluster"), wx * scale * 2.5, wz * scale * 2.5, 3, 2.16, 0.5),
  );
  const rockCluster = remapNoise(
    fbm(noise.getNoise("rockScatter"), wx * scale * 2.35, wz * scale * 2.35, 3, 2.14, 0.52),
  );

  return {
    ...height,
    altitudeFactor,
    vegetationFactor,
    midAltitudeFactor,
    alpineFactor,
    cliffiness,
    treeCluster,
    grassCluster,
    rockCluster,
  };
}

/** Minimal mutable RGB. Both THREE.Color and a plain object satisfy this. */
export interface RGBLike {
  r: number;
  g: number;
  b: number;
}

/**
 * Palette injected by `world.ts` to keep the colour-blending helper
 * decoupled from experience-specific colour instances. Structural type —
 * THREE.Color satisfies it, and so does a plain `{r,g,b}` object used in the
 * worldgen worker.
 */
export interface TerrainEchoPalette {
  base: RGBLike;
  forest: RGBLike;
  grassland: RGBLike;
  mountain: RGBLike;
  snow: RGBLike;
  desert: RGBLike;
  barrens: RGBLike;
  midMountainGray: RGBLike;
  highMountainGray: RGBLike;
}

/**
 * Day-mode terrain palette — naturalistic biome ground colours used by
 * the daylight blend in `createTerrainGeometry`. Same shape as
 * `TerrainEchoPalette` but with day-cycle colours; the shader picks
 * between `color` and `dayColor` vertex attributes via `uDaylightFactor`.
 */
export interface TerrainDayPalette {
  base: RGBLike;
  forest: RGBLike;
  grassland: RGBLike;
  mountain: RGBLike;
  snow: RGBLike;
  desert: RGBLike;
  barrens: RGBLike;
  midMountainGray: RGBLike;
  highMountainGray: RGBLike;
}

/** In-place RGB lerp toward `target` by `t`. Equivalent to THREE.Color.lerp. */
function lerpRGB(out: RGBLike, target: RGBLike, t: number): void {
  out.r += (target.r - out.r) * t;
  out.g += (target.g - out.g) * t;
  out.b += (target.b - out.b) * t;
}

/**
 * Apply the day-mode terrain blend (legacy inline body in
 * `BatWorld.createTerrainGeometry`, world.ts:975–1006) onto
 * `outColor`. Same mutating contract as `applyTerrainEchoColor`.
 *
 * Note: this blend uses slightly *different* weights from the echo
 * blend — stronger snow/cliff/altitude tinting — matching the legacy
 * formulas verbatim.
 */
export function applyTerrainDayColor(
  outColor: RGBLike,
  ctx: DerivedContext,
  palette: TerrainDayPalette,
): void {
  const {
    forestWeight,
    grasslandWeight,
    mountainWeight,
    snowWeight,
    desertWeight,
    barrensWeight,
    cliffiness,
    altitudeFactor,
    midAltitudeFactor,
  } = ctx;

  outColor.r =
    palette.forest.r * forestWeight +
    palette.grassland.r * grasslandWeight +
    palette.mountain.r * mountainWeight +
    palette.snow.r * snowWeight +
    palette.desert.r * desertWeight +
    palette.barrens.r * barrensWeight;
  outColor.g =
    palette.forest.g * forestWeight +
    palette.grassland.g * grasslandWeight +
    palette.mountain.g * mountainWeight +
    palette.snow.g * snowWeight +
    palette.desert.g * desertWeight +
    palette.barrens.g * barrensWeight;
  outColor.b =
    palette.forest.b * forestWeight +
    palette.grassland.b * grasslandWeight +
    palette.mountain.b * mountainWeight +
    palette.snow.b * snowWeight +
    palette.desert.b * desertWeight +
    palette.barrens.b * barrensWeight;
  lerpRGB(outColor, palette.base, 0.06 + cliffiness * 0.06);
  if (cliffiness > 0.45) {
    lerpRGB(outColor, palette.mountain, cliffiness * 0.22);
  }
  lerpRGB(
    outColor,
    palette.midMountainGray,
    midAltitudeFactor * (0.18 + mountainWeight * 0.2),
  );
  lerpRGB(
    outColor,
    palette.highMountainGray,
    altitudeFactor * (0.3 + mountainWeight * 0.46),
  );
  if (snowWeight > 0.34) {
    lerpRGB(outColor, palette.snow, snowWeight * 0.82);
  }
  if (desertWeight > 0.42) {
    lerpRGB(outColor, palette.desert, desertWeight * 0.12);
  }
}

/**
 * Apply the echo-mode colour blend (world.ts:2683–2749) onto `outColor`.
 * Mutating to match the legacy in/out-parameter contract — keeps a hot
 * inner loop allocation-free.
 */
export function applyTerrainEchoColor(
  outColor: RGBLike,
  ctx: DerivedContext,
  palette: TerrainEchoPalette,
): void {
  const {
    forestWeight,
    grasslandWeight,
    mountainWeight,
    snowWeight,
    desertWeight,
    barrensWeight,
    cliffiness,
    altitudeFactor,
    midAltitudeFactor,
  } = ctx;

  outColor.r =
    palette.forest.r * forestWeight +
    palette.grassland.r * grasslandWeight +
    palette.mountain.r * mountainWeight +
    palette.snow.r * snowWeight +
    palette.desert.r * desertWeight +
    palette.barrens.r * barrensWeight;
  outColor.g =
    palette.forest.g * forestWeight +
    palette.grassland.g * grasslandWeight +
    palette.mountain.g * mountainWeight +
    palette.snow.g * snowWeight +
    palette.desert.g * desertWeight +
    palette.barrens.g * barrensWeight;
  outColor.b =
    palette.forest.b * forestWeight +
    palette.grassland.b * grasslandWeight +
    palette.mountain.b * mountainWeight +
    palette.snow.b * snowWeight +
    palette.desert.b * desertWeight +
    palette.barrens.b * barrensWeight;
  lerpRGB(outColor, palette.base, 0.08 + cliffiness * 0.06);
  if (cliffiness > 0.45) {
    lerpRGB(outColor, palette.mountain, cliffiness * 0.2);
  }
  lerpRGB(
    outColor,
    palette.midMountainGray,
    midAltitudeFactor * (0.14 + mountainWeight * 0.18),
  );
  lerpRGB(
    outColor,
    palette.highMountainGray,
    altitudeFactor * (0.26 + mountainWeight * 0.42),
  );
  if (snowWeight > 0.34) {
    lerpRGB(outColor, palette.snow, snowWeight * 0.72);
  }
  if (desertWeight > 0.42) {
    lerpRGB(outColor, palette.desert, desertWeight * 0.12);
  }
}
