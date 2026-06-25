/**
 * The single source of truth for coordinate conversions across the three tiers:
 *   world (continuous fine pixels) ↔ chunk index ↔ region index ↔ macro cell.
 *
 * Chunk (cx,cy) covers world x ∈ [cx*size, (cx+1)*size). A chunk's top-left
 * cell (lx=0,ly=0) is world (cx*size, cy*size). Because every field is a pure
 * function of world position, adjacent chunks sample a continuous function with
 * no duplicated or skipped pixel → seamless.
 */

export interface ChunkIndex {
  cx: number;
  cy: number;
}

export function worldToChunk(wx: number, wy: number, chunkSize: number): ChunkIndex {
  return { cx: Math.floor(wx / chunkSize), cy: Math.floor(wy / chunkSize) };
}

/** World coordinate of a chunk's top-left (min) cell. */
export function chunkOrigin(cx: number, cy: number, chunkSize: number): { x: number; y: number } {
  return { x: cx * chunkSize, y: cy * chunkSize };
}

/** World coordinate of a chunk's centre (for placing its quad). */
export function chunkCenter(cx: number, cy: number, chunkSize: number): { x: number; y: number } {
  return { x: cx * chunkSize + chunkSize / 2, y: cy * chunkSize + chunkSize / 2 };
}

export function chunkKey(cx: number, cy: number): string {
  return `${cx},${cy}`;
}

/** Region index that contains a given chunk (region = regionChunks × regionChunks chunks). */
export function chunkToRegion(cx: number, cy: number, regionChunks: number): ChunkIndex {
  return { cx: Math.floor(cx / regionChunks), cy: Math.floor(cy / regionChunks) };
}

export function regionKey(rx: number, ry: number): string {
  return `r${rx},${ry}`;
}
