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
import type { TerrainBiomeId } from "./biome-types";

export interface BiomeWeights {
  forestWeight: number;
  grasslandWeight: number;
  mountainWeight: number;
  snowWeight: number;
  desertWeight: number;
  barrensWeight: number;
}

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
  dominantBiome: TerrainBiomeId;
}

// ── Voronoi biome placement ───────────────────────────────────────────────
// Divides the world into jittered cells, each assigned one of the six biomes
// via a deterministic hash of (cell, masterSeed). This guarantees that every
// biome appears within a predictable distance from any point.
//
// Cell size 280 wu → ~25 s at cruise speed 11 m/s before reaching a new cell.
// BLEND_WIDTH 55 wu → smooth 55-unit crossfade at every biome boundary.
const VORONOI_CELL   = 280;
const VORONOI_BLEND  = 120; // wider blend → softer biome edges, no sharp mountain walls
const VORONOI_WEIGHT = 0.92; // how strongly Voronoi overrides the noise scores

const BIOME_LIST: TerrainBiomeId[] = [
  "forest", "grassland", "mountains", "desert", "snow", "barrens",
];

function vHash(a: number, b: number, seed: number): number {
  let h = (seed ^ 0x811c9dc5) >>> 0;
  h = (Math.imul(h ^ (a & 0xffff),     0x01000193)) >>> 0;
  h = (Math.imul(h ^ ((a >>> 16)),      0x01000193)) >>> 0;
  h = (Math.imul(h ^ (b & 0xffff),     0x01000193)) >>> 0;
  h = (Math.imul(h ^ ((b >>> 16)),      0x01000193)) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

function vCellBiome(cx: number, cz: number, seed: number, multipliers?: Partial<Record<TerrainBiomeId, number>>): TerrainBiomeId {
  const h = vHash(cx, cz, seed);
  if (!multipliers) return BIOME_LIST[h % 6];
  const weights = BIOME_LIST.map(b => Math.max(0, multipliers[b] ?? 1));
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return BIOME_LIST[h % 6];
  const rand = (h / 0xffffffff) * total;
  let cum = 0;
  for (let i = 0; i < BIOME_LIST.length; i++) {
    cum += weights[i];
    if (rand < cum) return BIOME_LIST[i];
  }
  return BIOME_LIST[BIOME_LIST.length - 1];
}

function vCellCenter(cx: number, cz: number, seed: number): [number, number] {
  const jx = (vHash(cx, cz, seed ^ 0xaaaa) % 1000) / 1000 - 0.5;
  const jz = (vHash(cx, cz, seed ^ 0xbbbb) % 1000) / 1000 - 0.5;
  return [
    (cx + 0.5 + jx * 0.6) * VORONOI_CELL,
    (cz + 0.5 + jz * 0.6) * VORONOI_CELL,
  ];
}

function sampleVoronoi(
  x: number,
  z: number,
  seed: number,
  multipliers?: Partial<Record<TerrainBiomeId, number>>,
): { w: Partial<Record<TerrainBiomeId, number>>; dominant: TerrainBiomeId } {
  const cx0 = Math.floor(x / VORONOI_CELL);
  const cz0 = Math.floor(z / VORONOI_CELL);

  let d1 = Infinity, d2 = Infinity;
  let b1: TerrainBiomeId = "grassland", b2: TerrainBiomeId = "grassland";

  for (let dcx = -2; dcx <= 2; dcx++) {
    for (let dcz = -2; dcz <= 2; dcz++) {
      const cx = cx0 + dcx, cz = cz0 + dcz;
      const [px, pz] = vCellCenter(cx, cz, seed);
      const d = Math.hypot(x - px, z - pz);
      if (d < d1) { d2 = d1; b2 = b1; d1 = d; b1 = vCellBiome(cx, cz, seed, multipliers); }
      else if (d < d2) { d2 = d; b2 = vCellBiome(cx, cz, seed, multipliers); }
    }
  }

  const gap = d2 - d1;
  const t = Math.min(1, gap / VORONOI_BLEND);
  const smooth = t * t * (3 - 2 * t);

  const w: Partial<Record<TerrainBiomeId, number>> = {};
  w[b1] = smooth;
  w[b2] = (w[b2] ?? 0) + (1 - smooth);
  return { w, dominant: b1 };
}

// Noise still provides local height variation within cells — keep scale at 1×.
const BIOME_DISTRIBUTION_SCALE = 1;

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
  biomeOverride: TerrainBiomeId | null = null,
  biomeMultipliers?: Partial<Record<TerrainBiomeId, number>>,
): BiomeContext {
  const scale = biomeScale * BIOME_DISTRIBUTION_SCALE;
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
  const forestWeightNoise = forestScore / total;
  const grasslandWeightNoise = grasslandScore / total;
  const mountainWeightNoise = mountainScore / total;
  const snowWeightNoise = snowScore / total;
  const desertWeightNoise = desertScore / total;
  const barrensWeightNoise = barrensScore / total;

  // Voronoi override — blend Voronoi cell weights (92%) with noise weights (8%)
  // so every biome appears within predictable distance from any point.
  // biomeMultipliers bias which biomes are assigned to Voronoi cells.
  const voronoi = sampleVoronoi(x, z, noise.masterSeed, biomeMultipliers);
  const vs = VORONOI_WEIGHT;
  let forestWeight    = (voronoi.w.forest    ?? 0) * vs + forestWeightNoise    * (1 - vs);
  let grasslandWeight = (voronoi.w.grassland ?? 0) * vs + grasslandWeightNoise * (1 - vs);
  let mountainWeight  = (voronoi.w.mountains ?? 0) * vs + mountainWeightNoise  * (1 - vs);
  let snowWeight      = (voronoi.w.snow      ?? 0) * vs + snowWeightNoise      * (1 - vs);
  let desertWeight    = (voronoi.w.desert    ?? 0) * vs + desertWeightNoise    * (1 - vs);
  let barrensWeight   = (voronoi.w.barrens   ?? 0) * vs + barrensWeightNoise   * (1 - vs);

  // Secondary pass: scale by multipliers and re-normalise so the blend
  // weights also reflect the preset when the Voronoi cell boundary falls
  // between two differently-weighted biomes.
  if (biomeMultipliers) {
    forestWeight    *= (biomeMultipliers.forest    ?? 1);
    grasslandWeight *= (biomeMultipliers.grassland ?? 1);
    mountainWeight  *= (biomeMultipliers.mountains ?? 1);
    snowWeight      *= (biomeMultipliers.snow      ?? 1);
    desertWeight    *= (biomeMultipliers.desert    ?? 1);
    barrensWeight   *= (biomeMultipliers.barrens   ?? 1);
    const mTotal = forestWeight + grasslandWeight + mountainWeight + snowWeight + desertWeight + barrensWeight + 1e-5;
    forestWeight    /= mTotal;
    grasslandWeight /= mTotal;
    mountainWeight  /= mTotal;
    snowWeight      /= mTotal;
    desertWeight    /= mTotal;
    barrensWeight   /= mTotal;
  }

  const dominant = dominantBiome({ forestWeight, grasslandWeight, mountainWeight, snowWeight, desertWeight, barrensWeight });

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
    dominantBiome: dominant,
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
}): TerrainBiomeId {
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
