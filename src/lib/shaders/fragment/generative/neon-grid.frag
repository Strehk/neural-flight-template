// @name Neon Grid
// @description Emissive perspective grid lines for ground planes with distance fade
// @perf-tier quest-safe
// @tags grid, neon, emissive, synthwave, quest-safe
// @credits ICAROS Lab
// @cost fract + smoothstep per axis, no loops
//
//
// Neon Grid — Emissive perspective grid lines for ground planes

uniform vec3 uGridColor;
uniform float uLineWidth;
uniform float uFadeDistance;
uniform float uGridScale;

varying vec2 vUv;
varying vec3 vPosition;

void main() {
  // World-space grid (scales with geometry, not UV)
  vec2 grid = vPosition.xz * uGridScale;

  // Anti-aliased grid lines using fwidth
  vec2 fw = fwidth(grid);
  vec2 lines = smoothstep(fw * (1.0 + uLineWidth), fw * 0.5, abs(fract(grid - 0.5) - 0.5));
  float gridLine = max(lines.x, lines.y);

  // Distance-based fade (from camera / origin)
  float dist = length(vPosition.xz);
  float fade = 1.0 - smoothstep(0.0, uFadeDistance, dist);

  // Emissive glow: brighter at intersections
  float intersection = lines.x * lines.y;
  vec3 col = uGridColor * (gridLine + intersection * 0.5);
  float alpha = gridLine * fade;

  gl_FragColor = vec4(col, alpha);
}
