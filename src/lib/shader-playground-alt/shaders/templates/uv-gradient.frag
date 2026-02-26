// ═══════════════════════════════════════════════════════════════
// UV GRADIENT — Hue Rotation with HSV Color Space
// ═══════════════════════════════════════════════════════════════
//
// UV coordinates go from 0→1 across the mesh surface.
// We use them to create a smooth rainbow gradient.
//
// HSV (Hue, Saturation, Value) is intuitive for color:
//   Hue = 0→1 cycles through the entire rainbow
//   Saturation = 0 (gray) → 1 (vivid color)
//   Value = 0 (black) → 1 (full brightness)

uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;

// ═══ HSV → RGB CONVERSION ═══════════════════════════════════════
// This compact formula converts HSV to RGB using a clever trick:
// It evaluates 3 phase-shifted cosines simultaneously.
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// ═══ MAIN ═══════════════════════════════════════════════════════
void main() {
  // Hue shifts with UV.x position + slowly rotates over time
  float hue = vUv.x + uTime * 0.1;

  // Fixed saturation for vivid colors
  float sat = 0.8;

  // Value (brightness) pulses with a sine wave along Y axis
  // sin() returns -1→1, we remap to 0.2→0.8 range
  float val = 0.5 + 0.3 * sin(vUv.y * 6.28 + uTime);

  vec3 color = hsv2rgb(vec3(hue, sat, val));
  gl_FragColor = vec4(color, 1.0);
}
