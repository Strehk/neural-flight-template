precision highp float;

// Particle Pulse — Point sprite with pulsing size based on phase offset
// Each particle has a unique aPhase attribute for staggered animation.
// @perf-tier: quest-safe
// @cost: minimal — 1 sin per vertex

uniform float uTime;
attribute float aPhase;
varying float vPulse;
varying float vPhase;

void main() {
  float pulse = 0.5 + 0.5 * sin(uTime * 2.5 + aPhase);
  vPulse = pulse;
  vPhase = aPhase;

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = min(pulse * 600.0 / -mvPosition.z, 80.0);
  gl_Position = projectionMatrix * mvPosition;
}
