precision highp float;

// Dissolve Vertex Shader — Noise-driven vertex explosion
// Vertices scatter outward along normals as uDissolve goes 0→1
// @perf-tier: quest-safe
// @cost: low — 1 snoise() per vertex

uniform float uDissolve;  // 0.0 = intact, 1.0 = fully dissolved
uniform float uTime;

#pragma include <math>
#pragma include <noise>

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vDissolve;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);

  // Noise-based dissolve: each vertex gets unique displacement
  float noiseVal = snoise(position * 2.0 + uTime * 0.5);
  float dissolveAmount = smoothstep(0.0, 1.0, uDissolve) * (noiseVal * 0.5 + 0.5);

  // Explode outward along normal
  vec3 displaced = position + normal * dissolveAmount * 3.0;

  vDissolve = dissolveAmount;
  vPosition = (modelMatrix * vec4(displaced, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
