// @name Wireframe Glow
// @description fwidth-based wireframe edges with configurable bloom glow and fill color
// @perf-tier quest-safe
// @tags wireframe, glow, fwidth, edges, quest-safe
// @credits ICAROS Lab
// @cost fwidth + smoothstep per fragment, no loops
//
//
// Wireframe Glow — fwidth-based wireframe with bloom-ready emission
//
// Requires: barycentric coordinates passed as vBarycentric from vertex shader,
// OR use with Three.js WireframeGeometry for simpler setup.

uniform vec3 uWireColor;
uniform float uWireWidth;
uniform float uGlowIntensity;
uniform float uGlowFalloff;
uniform vec3 uFillColor;
uniform float uFillOpacity;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;

void main() {
  // UV-based wireframe approximation (works without barycentric)
  // Creates grid pattern from UV derivatives
  vec2 grid = abs(fract(vUv * 10.0 - 0.5) - 0.5);
  vec2 fw = fwidth(vUv * 10.0);
  vec2 lines = smoothstep(fw * uWireWidth, vec2(0.0), grid);
  float wire = max(lines.x, lines.y);

  // Glow: exponential falloff from wire edges
  float glow = wire * uGlowIntensity;
  float glowFade = exp(-uGlowFalloff * (1.0 - wire));
  glow += glowFade * uGlowIntensity * 0.3;

  // Composite: wire emission + subtle fill
  vec3 col = uWireColor * glow + uFillColor * uFillOpacity * (1.0 - wire);
  float alpha = max(wire, uFillOpacity);

  gl_FragColor = vec4(col, alpha);
}
