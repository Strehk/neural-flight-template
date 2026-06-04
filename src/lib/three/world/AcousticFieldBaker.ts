/**
 * AcousticFieldBaker — per-chunk pre-baked grid of terrain samples for
 * the echo probe (refactor step 11, optional perf optimisation).
 *
 * When a chunk loads, we sample a coarse grid (default 4×4 m cells)
 * of `TerrainSample`s and stash them on the chunk. The echo probe
 * then resolves a hit position to its nearest cell via O(1) array
 * lookup instead of running the noise stack on every hit.
 *
 * Memory: at the defaults (chunkSize=112, gridStep=4) each chunk
 * stores 29×29 = 841 sample references; with 30 active chunks that's
 * ~25k objects. The `TerrainSample` objects are the *same instances*
 * the TerrainSampler returns from its cache, so we're holding extra
 * references rather than duplicating data.
 *
 * Determinism: the baker calls `sample(x, z)` for each cell at chunk
 * build time, which goes through the deterministic sampler. Identical
 * `(masterSeed, WorldConfig)` → identical fields.
 */

import type { TerrainSample } from "$lib/experiences/sinneswandler_test1/terrain-sampler";

export interface AcousticField {
  readonly chunkSize: number;
  readonly gridStep: number;
  readonly cellsPerSide: number;
  /** Lower-left corner of the chunk in world coords (the cell-0 sample's position). */
  readonly originX: number;
  readonly originZ: number;
  /**
   * Per-cell samples. `samples[cz * cellsPerSide + cx]` is the sample
   * at world coordinate `(originX + cx*gridStep, originZ + cz*gridStep)`.
   * The reference is the canonical sample returned by the sampler;
   * never mutate it.
   */
  readonly samples: readonly TerrainSample[];
}

export interface BakeAcousticFieldOptions {
  /** Chunk grid coordinates (matches the WorldChunk's gridX/gridZ). */
  gridX: number;
  gridZ: number;
  /** Side length of the chunk in world units. */
  chunkSize: number;
  /** Side length of one acoustic cell in world units (default 4). */
  gridStep: number;
  /** TerrainSampler.sample (or any pure `(x, z) → TerrainSample`). */
  sample: (x: number, z: number) => TerrainSample;
}

/**
 * Bake the (cellsPerSide × cellsPerSide) field for one chunk. The
 * field origin is the chunk's lower-left corner in world space, so
 * `samples[0]` is the corner sample and `samples[cellsPerSide² - 1]`
 * is the opposite corner. Chunk meshes are centred at
 * `(gridX*chunkSize, 0, gridZ*chunkSize)` so we offset by
 * `−chunkSize/2` on each axis to align.
 */
export function bakeAcousticField(opts: BakeAcousticFieldOptions): AcousticField {
  const { gridX, gridZ, chunkSize, gridStep, sample } = opts;
  // +1 so the field covers BOTH chunk edges; nearest-cell lookups
  // never have to fall back across a chunk seam.
  const cellsPerSide = Math.floor(chunkSize / gridStep) + 1;
  const originX = gridX * chunkSize - chunkSize / 2;
  const originZ = gridZ * chunkSize - chunkSize / 2;

  const samples = new Array<TerrainSample>(cellsPerSide * cellsPerSide);
  for (let cz = 0; cz < cellsPerSide; cz++) {
    for (let cx = 0; cx < cellsPerSide; cx++) {
      const wx = originX + cx * gridStep;
      const wz = originZ + cz * gridStep;
      samples[cz * cellsPerSide + cx] = sample(wx, wz);
    }
  }

  return {
    chunkSize,
    gridStep,
    cellsPerSide,
    originX,
    originZ,
    samples,
  };
}

/**
 * Nearest-cell lookup. Returns `null` if (x, z) falls outside the
 * field's coverage — the caller should fall back to the sampler.
 *
 * The 4-meter snap is intentional: it's finer than the echo's
 * azimuth resolution at typical hit distances (~14 m at 50 m range,
 * 18 azimuth steps) so multiple rays in the same neighbourhood
 * converge to a single acoustic reading — a feature, not a bug, for
 * consistent audio.
 */
export function readAcousticField(
  field: AcousticField,
  x: number,
  z: number,
): TerrainSample | null {
  const cx = Math.round((x - field.originX) / field.gridStep);
  const cz = Math.round((z - field.originZ) / field.gridStep);
  if (cx < 0 || cx >= field.cellsPerSide) return null;
  if (cz < 0 || cz >= field.cellsPerSide) return null;
  return field.samples[cz * field.cellsPerSide + cx] ?? null;
}
