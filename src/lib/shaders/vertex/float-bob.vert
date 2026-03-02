// Float Bob — Gentle hovering animation for floating objects
// @perf-tier: quest-safe
// @cost: 2 sin calls per vertex (trivial)
//
// Supports InstancedMesh: uses instanceMatrix + gl_InstanceID for phase offset

precision highp float;

uniform float uTime;
uniform float uBobAmplitude;
uniform float uBobFrequency;
uniform float uPhaseOffset;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vUv = uv;

  // Per-instance phase offset for variety in InstancedMesh groups
  float instancePhase = uPhaseOffset + float(gl_InstanceID) * 1.618; // golden ratio spread
  float bobY = sin(uTime * uBobFrequency + instancePhase) * uBobAmplitude;
  float bobX = sin(uTime * uBobFrequency * 0.7 + instancePhase * 1.3) * uBobAmplitude * 0.3;

  vec3 displaced = position;
  displaced.y += bobY;
  displaced.x += bobX;

  // Apply instance transform if present
  #ifdef USE_INSTANCING
    vec4 worldPos = modelMatrix * instanceMatrix * vec4(displaced, 1.0);
    vNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
  #else
    vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
    vNormal = normalize(normalMatrix * normal);
  #endif

  vPosition = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
