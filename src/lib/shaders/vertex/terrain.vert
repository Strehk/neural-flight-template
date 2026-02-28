precision highp float;

// Terrain Vertex Shader — FBM height displacement
// Displaces PlaneGeometry vertices on Y-axis using fractal noise
// Use with PlaneGeometry lying in XZ plane
// @perf-tier: quest-safe
// @cost: medium — 3 snoise() calls per vertex (3 octaves)

uniform float uTerrainScale;   // Noise frequency multiplier
uniform float uTerrainHeight;  // Max displacement height
uniform float uTime;

#pragma include <math>
#pragma include <noise>

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

// Simplified FBM with only 3 octaves (Quest-safe)
float terrainFbm(vec3 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (int i = 0; i < 3; i++) {
    value += amplitude * snoise(p * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vUv = uv;

  // Sample height from noise at vertex XZ position
  vec3 noisePos = vec3(position.x * uTerrainScale, uTime * 0.1, position.z * uTerrainScale);
  float height = terrainFbm(noisePos) * uTerrainHeight;

  vec3 displaced = vec3(position.x, position.y + height, position.z);

  // Approximate normal via finite differences
  float eps = 0.1;
  float hL = terrainFbm(noisePos + vec3(-eps, 0.0, 0.0)) * uTerrainHeight;
  float hR = terrainFbm(noisePos + vec3(eps, 0.0, 0.0)) * uTerrainHeight;
  float hD = terrainFbm(noisePos + vec3(0.0, 0.0, -eps)) * uTerrainHeight;
  float hU = terrainFbm(noisePos + vec3(0.0, 0.0, eps)) * uTerrainHeight;
  vNormal = normalize(vec3(hL - hR, 2.0 * eps, hD - hU));

  vPosition = (modelMatrix * vec4(displaced, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
