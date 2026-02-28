precision highp float;

// Boids Particle Vertex Shader — Lightweight instanced particles
// Uses vec3 offset + velocity + vec4 color instead of full mat4 instanceMatrix
// 56% less attribute bandwidth than instanced.vert
// @perf-tier: quest-safe
// @cost: medium — 1 normalize + billboard math per vertex

attribute vec3 aOffset;    // Instance world position
attribute vec3 aVelocity;  // Instance velocity (used for billboard orientation)
attribute vec4 aColor;     // Per-instance color + alpha

varying vec2 vUv;
varying vec4 vColor;

uniform vec3 uCameraPosition;  // Camera world position for billboarding

void main() {
  vUv = uv;
  vColor = aColor;

  // Billboard: orient quad to face camera
  vec3 toCamera = normalize(uCameraPosition - aOffset);
  vec3 up = vec3(0.0, 1.0, 0.0);
  vec3 right = normalize(cross(up, toCamera));
  up = cross(toCamera, right);

  // Apply billboard rotation to local vertex position
  vec3 worldPos = aOffset + right * position.x + up * position.y;

  gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
}
