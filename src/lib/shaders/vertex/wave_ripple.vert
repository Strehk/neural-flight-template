precision highp float;

// Wave Ripple Vertex Shader — Chladni pattern displacement
// Creates standing wave patterns like vibrating plates
// ICAROS Gyro X/Y can drive uFreqX/uFreqY for interactive control
// @perf-tier: quest-safe
// @cost: trivial — 2 sin() per vertex

uniform float uFreqX;      // Frequency along X axis (1.0 - 10.0)
uniform float uFreqY;      // Frequency along Y axis (1.0 - 10.0)
uniform float uPhase;      // Animation phase (typically uTime)
uniform float uAmplitude;  // Displacement strength

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vUv = uv;

  // Chladni pattern: product of two separable sine functions
  // Creates characteristic nodal line patterns
  float pattern = sin(uFreqX * position.x + uPhase) * sin(uFreqY * position.y + uPhase);
  vec3 displaced = position + normal * pattern * uAmplitude;

  vNormal = normalize(normalMatrix * normal);
  vPosition = (modelMatrix * vec4(displaced, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
