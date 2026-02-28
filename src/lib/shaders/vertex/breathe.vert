precision highp float;

// Breathe Vertex Shader — Global mesh pulsation
// Expands/contracts mesh along normals using sine wave
// @perf-tier: quest-safe
// @cost: trivial — 1 sin() per vertex

uniform float uBreathPhase;
uniform float uBreathAmplitude;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);

  // Displace along normal by breath amount
  float breath = sin(uBreathPhase) * uBreathAmplitude;
  vec3 displaced = position + normal * breath;

  vPosition = (modelMatrix * vec4(displaced, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
