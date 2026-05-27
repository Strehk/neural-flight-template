/**
 * Tiny pure-math helpers used by the world-generation samplers. Lifted from
 * sinneswandler's `world.ts` (the original `saturate`, `smoothRange`,
 * `smoothPeak`, `remapNoise` free functions) so the new samplers and any
 * future experience can share one definition.
 *
 * Kept in `lib/three/world/` rather than `lib/three/` because they're
 * specifically the helpers the world layer reaches for; THREE.MathUtils
 * remains the canonical home for general-purpose math.
 */

export function saturate(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** Smoothstep over [start, end]; returns 0 below start, 1 above end. */
export function smoothRange(value: number, start: number, end: number): number {
  const denom = Math.max(end - start, 1e-4);
  const t = saturate((value - start) / denom);
  return t * t * (3 - 2 * t);
}

/** Smooth triangular peak centred on `center` with the given half-width. */
export function smoothPeak(value: number, center: number, halfWidth: number): number {
  const t = saturate(1 - Math.abs(value - center) / Math.max(halfWidth, 1e-4));
  return t * t * (3 - 2 * t);
}

/** Remap a signed Simplex sample from [-1,1] to [0,1]. */
export function remapNoise(value: number): number {
  return value * 0.5 + 0.5;
}

/** Ridge transform `1 - |v|`. Re-exported here for caller convenience. */
export function ridge(value: number): number {
  return 1 - Math.abs(value);
}
