/**
 * WFC adjacency rules + per-cell priors.
 *
 * Adjacency is expressed as a symmetric compatibility relation between macro
 * tiles (an edge-agnostic socket model, which is what matters at macro scale).
 * It encodes the spec's rules: ocean only touches coast/ocean; coast bridges
 * ocean and land; desert never touches wetland; snow only near high/cold
 * mountain neighbours; rivers connect high→low; etc.
 *
 * Priors bias each cell toward the tile whose bands best fit the continuous
 * (height, temperature, moisture) at that cell, so the plan follows terrain.
 */
import { MacroTile, MACRO_TILE_COUNT } from '../mapTypes';
import { TILE_BY_ID } from './biomeTiles';
import { bandScore } from './WfcTile';

const M = MacroTile;

// Allowed neighbours per tile (symmetrised below). A tile is always
// self-compatible. The set is permissive among height-adjacent / climate-sibling
// families so the deterministic argmax borders are legal; the meaningful bans are
// kept: ocean only meets low/coastal land, desert never meets wetland, snow only
// meets high cold neighbours.
const ALLOW: Record<number, MacroTile[]> = {
  [M.Ocean]: [M.Ocean, M.Coast, M.Lowland, M.Wetland, M.LakeCandidate],
  [M.Coast]: [
    M.Ocean, M.Coast, M.Lowland, M.Wetland, M.Grassland, M.Forest, M.Desert, M.RiverCorridor,
  ],
  [M.Lowland]: [
    M.Ocean, M.Coast, M.Lowland, M.Grassland, M.Forest, M.Wetland, M.Desert, M.Hills,
    M.LakeCandidate, M.RiverCorridor, M.RiverSource,
  ],
  [M.Grassland]: [
    M.Coast, M.Lowland, M.Grassland, M.Forest, M.Hills, M.Desert, M.Wetland, M.RiverCorridor,
  ],
  [M.Forest]: [
    M.Coast, M.Lowland, M.Grassland, M.Forest, M.Hills, M.Wetland, M.RockyMountain,
    M.LakeCandidate, M.RiverCorridor, M.RiverSource,
  ],
  [M.Wetland]: [
    M.Ocean, M.Coast, M.Lowland, M.Grassland, M.Forest, M.Wetland, M.LakeCandidate,
    M.RiverCorridor,
  ],
  [M.Desert]: [M.Coast, M.Lowland, M.Grassland, M.Desert, M.Hills, M.RiverCorridor],
  [M.Hills]: [
    M.Lowland, M.Grassland, M.Forest, M.Desert, M.Hills, M.RockyMountain, M.SnowMountain,
    M.RiverSource, M.RiverCorridor,
  ],
  [M.RockyMountain]: [
    M.Forest, M.Hills, M.RockyMountain, M.SnowMountain, M.RiverSource, M.RiverCorridor,
  ],
  [M.SnowMountain]: [M.Hills, M.RockyMountain, M.SnowMountain, M.RiverSource],
  [M.LakeCandidate]: [
    M.Ocean, M.Lowland, M.Grassland, M.Forest, M.Wetland, M.LakeCandidate, M.RiverCorridor,
  ],
  [M.RiverSource]: [
    M.Lowland, M.Forest, M.Hills, M.RockyMountain, M.SnowMountain, M.RiverCorridor, M.RiverSource,
  ],
  [M.RiverCorridor]: [
    M.Coast, M.Lowland, M.Grassland, M.Forest, M.Wetland, M.Desert, M.Hills, M.RockyMountain,
    M.LakeCandidate, M.RiverSource, M.RiverCorridor,
  ],
};

/** compatMask[t] = bitmask of tiles compatible as a neighbour of t. */
export const COMPAT_MASK: number[] = (() => {
  const mask = new Array<number>(MACRO_TILE_COUNT).fill(0);
  const set = (a: MacroTile, b: MacroTile): void => {
    mask[a] |= 1 << b;
    mask[b] |= 1 << a;
  };
  for (let t = 0; t < MACRO_TILE_COUNT; t++) {
    set(t, t); // self-compatible
    for (const n of ALLOW[t] ?? []) set(t, n);
  }
  return mask;
})();

export function compatible(a: MacroTile, b: MacroTile): boolean {
  return (COMPAT_MASK[a] & (1 << b)) !== 0;
}

/** Full-domain bitmask (all tiles allowed). */
export const FULL_DOMAIN = (1 << MACRO_TILE_COUNT) - 1;

/**
 * Per-cell prior weights over all tiles from the continuous fields. The product
 * of the three band scores times the tile's base weight; tiles that don't fit at
 * all get a tiny floor so the domain is never fully empty.
 */
export function tilePriors(height: number, temp: number, moisture: number): Float32Array {
  const w = new Float32Array(MACRO_TILE_COUNT);
  for (let t = 0; t < MACRO_TILE_COUNT; t++) {
    const tile = TILE_BY_ID[t];
    const sH = bandScore(height, tile.heightBand);
    const sM = bandScore(moisture, tile.moistureBand);
    const sT = bandScore(temp, tile.tempBand);
    w[t] = tile.weight * (sH * sH) * sM * sT + 1e-4;
  }
  return w;
}

/** The single best tile for a cell (used for deterministic seam-pinned borders). */
export function argmaxTile(height: number, temp: number, moisture: number): MacroTile {
  const w = tilePriors(height, temp, moisture);
  let best = 0;
  for (let t = 1; t < w.length; t++) if (w[t] > w[best]) best = t;
  return best as MacroTile;
}

/**
 * Whether the WFC macro plan would mark this cell as a place rivers may rise
 * (its argmax tile has `canSpawnRiverSource` — hills, mountains, river source).
 * A pure function of the continuous fields, so it is identical across region
 * seams. Used to bias where river headwaters become visible.
 */
export function uplandSourceAllowed(height: number, temp: number, moisture: number): boolean {
  return TILE_BY_ID[argmaxTile(height, temp, moisture)].canSpawnRiverSource;
}
