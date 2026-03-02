// @name Gradient Material
// @description Multi-stop UV-based gradient on any geometry with configurable colors and angle
// @perf-tier quest-safe
// @tags gradient, material, uv, configurable, quest-safe
// @credits ICAROS Lab
// @cost no loops, pure UV math
//
//
// Gradient Material — Multi-stop UV-based gradient on any geometry
// Configurable uniforms:
// uGradientStart  vec3  — bottom/left color
// uGradientMid    vec3  — middle color
// uGradientEnd    vec3  — top/right color
// uMidPoint       float — position of mid color [0..1]
// uAngle          float — gradient rotation in radians
// uSoftness       float — blend softness between stops

uniform vec3 uGradientStart;
uniform vec3 uGradientMid;
uniform vec3 uGradientEnd;
uniform float uMidPoint;
uniform float uAngle;
uniform float uSoftness;

varying vec2 vUv;

void main() {
  // Rotate UV around center by uAngle
  vec2 center = vec2(0.5);
  vec2 uv = vUv - center;
  float ca = cos(uAngle);
  float sa = sin(uAngle);
  uv = vec2(uv.x * ca - uv.y * sa, uv.x * sa + uv.y * ca);
  float t = uv.y + 0.5; // back to [0..1]
  t = clamp(t, 0.0, 1.0);

  // Two-segment gradient with configurable midpoint
  vec3 col;
  float soft = max(uSoftness, 0.001);
  if (t < uMidPoint) {
    float f = smoothstep(0.0, uMidPoint + soft, t);
    col = mix(uGradientStart, uGradientMid, f);
  } else {
    float f = smoothstep(uMidPoint - soft, 1.0, t);
    col = mix(uGradientMid, uGradientEnd, f);
  }

  gl_FragColor = vec4(col, 1.0);
}
