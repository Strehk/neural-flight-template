/**
 * CPU-side noise utilities.
 *
 * The heavy field generation runs on the GPU (see gpu/tslNoise.ts). This module
 * only provides lightweight, deterministic value noise for CPU-side jitter that
 * does not need to match the GPU bit-for-bit — e.g. river meander offsets, which
 * just need to be a stable function of world position so chunk borders line up.
 */
import { hashCombine } from './rng';

function valueAt(ix: number, iy: number, seed: number): number {
  return hashCombine(ix, iy, seed) / 4294967296;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Bilinearly-interpolated value noise in [0,1], pure function of (x,y,seed). */
export function valueNoise2D(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = smooth(x - x0);
  const fy = smooth(y - y0);
  const v00 = valueAt(x0, y0, seed);
  const v10 = valueAt(x0 + 1, y0, seed);
  const v01 = valueAt(x0, y0 + 1, seed);
  const v11 = valueAt(x0 + 1, y0 + 1, seed);
  const a = v00 + (v10 - v00) * fx;
  const b = v01 + (v11 - v01) * fx;
  return a + (b - a) * fy;
}

/** Fractal value noise in roughly [0,1]. */
export function fbm2D(x: number, y: number, seed: number, octaves = 4): number {
  let sum = 0;
  let amp = 1;
  let freq = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += valueNoise2D(x * freq, y * freq, seed + o * 1013) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

/** Signed fractal noise in roughly [-1,1]. */
export function signedFbm2D(x: number, y: number, seed: number, octaves = 4): number {
  return fbm2D(x, y, seed, octaves) * 2 - 1;
}
