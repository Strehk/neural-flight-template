/**
 * TerrainDataBuilder — pure-data terrain chunk computation. Produces the
 * typed arrays (`heights`, `echoColors`, `dayColors`) that the main
 * thread later wraps in a `THREE.BufferGeometry` via
 * `assembleTerrainGeometry`. Lives in `lib/three/world` but has *no*
 * THREE.js imports — the same module is the worker's entry point for
 * terrain sampling.
 *
 * The vertex layout matches `THREE.PlaneGeometry(chunkSize, chunkSize,
 * segments, segments).rotateX(-π/2).toNonIndexed()` so the resulting
 * arrays can be written verbatim into the assembled geometry.
 */
import type { RGBLike } from "$lib/worldgen/terrain/derived-field-sampler";

/** Pre-computed per-vertex local (x, z) offsets for a chunk plane. */
export interface TerrainPlaneLayout {
  /** segments^2 * 6 — one entry per non-indexed vertex. */
  count: number;
  /** Vertex local X (in [-chunkSize/2, +chunkSize/2]). */
  localX: Float32Array;
  /** Vertex local Z (in [-chunkSize/2, +chunkSize/2]). */
  localZ: Float32Array;
}

export interface TerrainData {
  /** segments^2 * 6 floats — Y displacement per non-indexed vertex. */
  heights: Float32Array;
  /** segments^2 * 6 * 3 floats — RGB per vertex (echo mode). */
  echoColors: Float32Array;
  /** segments^2 * 6 * 3 floats — RGB per vertex (day mode). */
  dayColors: Float32Array;
}

/**
 * Replicate `PlaneGeometry(size, size, segments, segments).rotateX(-π/2)`
 * + `toNonIndexed()` vertex order without THREE. Cache the result per
 * (size, segments) — it's identical for every chunk on the same grid.
 */
export function computeTerrainPlaneLayout(
  chunkSize: number,
  segments: number,
): TerrainPlaneLayout {
  const seg = chunkSize / segments;
  const half = chunkSize / 2;
  const count = segments * segments * 6;
  const localX = new Float32Array(count);
  const localZ = new Float32Array(count);
  let i = 0;
  // Per cell (ix, iy): triangles (a, b, d) and (b, c, d), with
  //   a = (ix,     iy),     b = (ix,     iy + 1),
  //   c = (ix + 1, iy + 1), d = (ix + 1, iy).
  // Local position for (ix, iy): (ix*seg - half, iy*seg - half) after
  // the -π/2 X rotation and the `vertices.push(x, -y, 0)` sign flip in
  // PlaneGeometry's constructor cancel out.
  for (let iy = 0; iy < segments; iy++) {
    const az = iy * seg - half;
    const cz = (iy + 1) * seg - half;
    for (let ix = 0; ix < segments; ix++) {
      const ax = ix * seg - half;
      const dx = (ix + 1) * seg - half;
      // tri1: a, b, d
      localX[i] = ax; localZ[i] = az; i++;
      localX[i] = ax; localZ[i] = cz; i++;
      localX[i] = dx; localZ[i] = az; i++;
      // tri2: b, c, d
      localX[i] = ax; localZ[i] = cz; i++;
      localX[i] = dx; localZ[i] = cz; i++;
      localX[i] = dx; localZ[i] = az; i++;
    }
  }
  return { count, localX, localZ };
}

/** Apply-style callback that fills `out` from a terrain sample + palette. */
export interface TerrainColorShader<TSample, TPalette> {
  apply: (out: RGBLike, sample: TSample, palette: TPalette) => void;
  palette: TPalette;
}

export interface ComputeTerrainDataOptions<TSample, TEchoPalette, TDayPalette> {
  chunkSize: number;
  layout: TerrainPlaneLayout;
  /** World-space sampler. Caller binds `gridX * chunkSize + lx` etc. */
  sample: (x: number, z: number) => TSample;
  echo: TerrainColorShader<TSample, TEchoPalette>;
  day: TerrainColorShader<TSample, TDayPalette>;
}

/**
 * Pure-data terrain build. No THREE imports. Iterates the layout,
 * samples each vertex, writes heights + both colour modes into
 * fresh Float32Arrays. The buffers are caller-ownable (no aliasing
 * with the layout) so they can be transferred via postMessage.
 */
export function computeTerrainData<
  TSample extends { height: number },
  TEchoPalette,
  TDayPalette,
>(
  gridX: number,
  gridZ: number,
  opts: ComputeTerrainDataOptions<TSample, TEchoPalette, TDayPalette>,
): TerrainData {
  const { chunkSize, layout, sample, echo, day } = opts;
  const { count, localX, localZ } = layout;
  const heights = new Float32Array(count);
  const echoColors = new Float32Array(count * 3);
  const dayColors = new Float32Array(count * 3);
  const tmpEcho: RGBLike = { r: 0, g: 0, b: 0 };
  const tmpDay: RGBLike = { r: 0, g: 0, b: 0 };
  const offX = gridX * chunkSize;
  const offZ = gridZ * chunkSize;
  for (let i = 0; i < count; i++) {
    const wx = localX[i] + offX;
    const wz = localZ[i] + offZ;
    const point = sample(wx, wz);
    heights[i] = point.height;

    echo.apply(tmpEcho, point, echo.palette);
    const e = i * 3;
    echoColors[e]     = tmpEcho.r;
    echoColors[e + 1] = tmpEcho.g;
    echoColors[e + 2] = tmpEcho.b;

    day.apply(tmpDay, point, day.palette);
    dayColors[e]     = tmpDay.r;
    dayColors[e + 1] = tmpDay.g;
    dayColors[e + 2] = tmpDay.b;
  }
  return { heights, echoColors, dayColors };
}
