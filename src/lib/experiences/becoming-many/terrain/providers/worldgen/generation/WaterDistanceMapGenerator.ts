/**
 * Distance-to-water (chamfer transform) and the fields derived from it: the
 * shoreline band and the moisture boost near water.
 *
 * Water sources are ocean (height < sea level), rivers and lakes. A two-pass
 * chamfer gives an approximate Euclidean distance in pixels; from it we build a
 * normalised water-distance layer, a soft shore band on land, and raise moisture
 * near water (so wetlands/forests cluster around rivers and coasts).
 *
 * Computed on the chunk alone for now; a small seam can appear at chunk borders
 * far from water, which the apron pass would remove later.
 */
import type { ChunkData, GenParams } from './mapTypes';

const SQRT2 = Math.SQRT2;

export function computeWaterDistanceAndDerived(chunk: ChunkData, params: GenParams): void {
  const size = chunk.size;
  const N = size * size;
  const { heightMap, riverMap, lakeMap, moistureMap } = chunk;
  const wl = params.waterLevel;

  const dist = new Float32Array(N);
  const INF = 1e9;
  for (let i = 0; i < N; i++) {
    const water = heightMap[i] < wl || riverMap[i] > 0.15 || lakeMap[i] > 0;
    dist[i] = water ? 0 : INF;
  }

  // Forward pass.
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      let d = dist[i];
      if (x > 0) d = Math.min(d, dist[i - 1] + 1);
      if (y > 0) d = Math.min(d, dist[i - size] + 1);
      if (x > 0 && y > 0) d = Math.min(d, dist[i - size - 1] + SQRT2);
      if (x < size - 1 && y > 0) d = Math.min(d, dist[i - size + 1] + SQRT2);
      dist[i] = d;
    }
  }
  // Backward pass.
  for (let y = size - 1; y >= 0; y--) {
    for (let x = size - 1; x >= 0; x--) {
      const i = y * size + x;
      let d = dist[i];
      if (x < size - 1) d = Math.min(d, dist[i + 1] + 1);
      if (y < size - 1) d = Math.min(d, dist[i + size] + 1);
      if (x < size - 1 && y < size - 1) d = Math.min(d, dist[i + size + 1] + SQRT2);
      if (x > 0 && y < size - 1) d = Math.min(d, dist[i + size - 1] + SQRT2);
      dist[i] = d;
    }
  }

  const shoreWidthPx = 4 + params.shoreWidth * 16;
  // Short-range boost: must fully decay within the chunk apron so two adjacent
  // chunks agree on it at their shared border (no per-chunk moisture step).
  const moistScale = 8;
  const normMax = 64;

  for (let i = 0; i < N; i++) {
    const dpx = dist[i];
    chunk.waterDistanceMap[i] = Math.min(1, dpx / normMax);

    const onLand = heightMap[i] >= wl && riverMap[i] <= 0.15 && lakeMap[i] === 0;
    // Shore: soft band just inland of water.
    chunk.shoreMap[i] = onLand ? Math.max(0, 1 - dpx / shoreWidthPx) : 0;
    // Moisture boost: decays with distance from water (riverbanks/shores).
    if (onLand) {
      const boost = 0.5 * Math.exp(-dpx / moistScale);
      moistureMap[i] = Math.min(1, moistureMap[i] + boost);
    }
  }
}
