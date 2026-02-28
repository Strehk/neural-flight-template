precision highp float;

// Lava Bump Vertex Shader — FBM terrain + localized Gaussian bumps
// Terrain with standard FBM height displacement plus up to 8 localized
// bumps that grow, stretch, and pinch off over their lifecycle.
// Reusable for any experience that wants "growing terrain features."
// @perf-tier: quest-safe
// @cost: medium — 3 snoise() + 8 Gaussian bumps per vertex

uniform float uTerrainScale;
uniform float uTerrainHeight;
uniform float uTime;
uniform vec4 uBumpData[8]; // xy = world XZ center, z = phase (0→1), w = radius

#pragma include <math>
#pragma include <noise>

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vHeight; // normalized height for fragment shader

// 3-octave FBM (Quest-safe)
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

  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  // Slow time evolution — terrain height scrolling is inherent to infinite terrain,
  // this controls only how fast the FBM pattern itself morphs over time
  vec3 noisePos = vec3(worldPos.x * uTerrainScale, uTime * 0.01, worldPos.z * uTerrainScale);
  float height = terrainFbm(noisePos) * uTerrainHeight;

  // Additive Gaussian bumps with stretch/pinch lifecycle
  for (int i = 0; i < 8; i++) {
    vec2 center = uBumpData[i].xy;
    float phase = uBumpData[i].z;     // 0=flat, 0.5=peak, 1.0=pinch-off
    float radius = uBumpData[i].w;

    if (phase <= 0.0 || radius <= 0.0) continue;

    float dist = distance(worldPos.xz, center);
    float gaussian = exp(-dist * dist / (radius * radius));

    // Height grows with phase, radius shrinks near end (pinch-off)
    float stretchH = phase * 2.0;
    float pinch = 1.0 - smoothstep(0.7, 1.0, phase);

    height += gaussian * pinch * stretchH * uTerrainHeight * 0.5;
  }

  vec3 displaced = vec3(position.x, position.y + height, position.z);

  // Approximate normal via finite differences
  float eps = 0.5;
  float hL = terrainFbm(noisePos + vec3(-eps * uTerrainScale, 0.0, 0.0)) * uTerrainHeight;
  float hR = terrainFbm(noisePos + vec3(eps * uTerrainScale, 0.0, 0.0)) * uTerrainHeight;
  float hD = terrainFbm(noisePos + vec3(0.0, 0.0, -eps * uTerrainScale)) * uTerrainHeight;
  float hU = terrainFbm(noisePos + vec3(0.0, 0.0, eps * uTerrainScale)) * uTerrainHeight;
  vNormal = normalize(vec3(hL - hR, 2.0 * eps, hD - hU));

  vHeight = clamp(height / uTerrainHeight, -1.0, 1.0);
  vPosition = (modelMatrix * vec4(displaced, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
