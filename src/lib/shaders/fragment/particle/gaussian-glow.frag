// Gaussian Glow — Soft point sprite with HSV color cycling
// Gaussian falloff creates smooth glowing particles without hard edges.
// @perf-tier: quest-safe
// @category: particle
//
// Required varyings from vertex shader:
//   varying float vPulse;
//   varying float vPhase;

precision highp float;

uniform float uTime;
varying float vPulse;
varying float vPhase;

#pragma include <color>

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float glow = exp(-d * d * 3.0);
  if (glow < 0.01) discard;

  float hue = fract(vPhase / 6.28 + uTime * 0.1);
  vec3 baseCol = hsv2rgb(vec3(hue, 0.6, 1.0));
  vec3 col = mix(baseCol, vec3(1.0), glow * glow * 0.7) * glow * (0.5 + vPulse * 0.5);

  gl_FragColor = vec4(col, glow * 0.9);
}
