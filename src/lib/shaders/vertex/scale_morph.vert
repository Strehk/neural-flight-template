precision highp float;

// Scale Morph Vertex Shader — Exponential scaling from reference point
// Smoothly scales geometry between microscopic (0.001) and macroscopic (1000)
// Useful for "zoom into cell" or "zoom out to universe" transitions
// @perf-tier: quest-safe
// @cost: low — 1 mix per vertex

uniform float uScaleFactor;   // Scale: 0.001 → 1000
uniform vec3 uScaleOrigin;    // Reference point for scaling

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);

  // Scale from reference point
  vec3 scaled = uScaleOrigin + (position - uScaleOrigin) * uScaleFactor;

  vPosition = (modelMatrix * vec4(scaled, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(scaled, 1.0);
}
