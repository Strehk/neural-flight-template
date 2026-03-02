// Concentric Rings — Animated ring patterns with palette coloring
// @perf-tier: quest-safe
// @cost: 1 length + 1 sin + 1 cosinePalette per pixel, no loops
#pragma include <color>

uniform float uRingScale;
uniform float uRingSpeed;
uniform float uRingWidth;
uniform vec3 uPaletteA;
uniform vec3 uPaletteB;
uniform vec3 uPaletteC;
uniform vec3 uPaletteD;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = (2.0 * fragCoord - uResolution.xy) / min(uResolution.x, uResolution.y);

  // Distance from center
  float dist = length(uv);

  // Animated concentric rings
  float rings = sin((dist * uRingScale - uTime * uRingSpeed) * 6.2831853);
  rings = smoothstep(-uRingWidth, uRingWidth, rings);

  // Color via cosine palette (driven by distance + time)
  float palT = dist * 0.5 + uTime * 0.1;
  vec3 col = cosinePalette(palT, uPaletteA, uPaletteB, uPaletteC, uPaletteD);

  // Modulate brightness by ring pattern
  col *= 0.3 + rings * 0.7;

  // Soft vignette
  float vignette = 1.0 - dist * 0.4;
  col *= vignette;

  fragColor = vec4(col, 1.0);
}
