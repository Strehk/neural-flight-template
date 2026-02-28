precision highp float;

// Morph Target Vertex Shader — Blend between two mesh shapes
// Uses custom attributes for morph targets (not Three.js built-in morphing)
// uMorphWeight: 0.0 = target1, 1.0 = target2
// @perf-tier: quest-safe
// @cost: medium — 2 mix() + 1 normalize per vertex

attribute vec3 morphTarget1;  // First shape vertex positions
attribute vec3 morphTarget2;  // Second shape vertex positions

uniform float uMorphWeight;   // Blend weight [0, 1]

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vUv = uv;

  // Linear blend between two morph targets
  vec3 morphed = mix(morphTarget1, morphTarget2, uMorphWeight);

  // Blend normals too (approximate — would need per-target normals for accuracy)
  vNormal = normalize(normalMatrix * normal);

  vPosition = (modelMatrix * vec4(morphed, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(morphed, 1.0);
}
