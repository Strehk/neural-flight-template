// Atmosphere Fog — Multi-color gradient fog (replaces single-tone Three.js Fog)
// @perf-tier: quest-safe
// @cost: 2 mix operations, no loops
//
// Usage: Apply in fragment shader after scene color computation.
// Blends scene color toward fog gradient based on fragment depth.

uniform vec3 uFogNear;
uniform vec3 uFogMid;
uniform vec3 uFogFar;
uniform float uFogStart;
uniform float uFogEnd;
uniform float uFogMidPoint;
uniform float uFogDensity;

varying vec3 vPosition;

// Call this in your main() after computing scene color:
// vec3 finalColor = applyAtmosphereFog(sceneColor, vPosition);

vec3 applyAtmosphereFog(vec3 sceneColor, vec3 worldPos) {
  float dist = length(worldPos - cameraPosition);

  // Exponential fog factor
  float fogFactor = 1.0 - exp(-uFogDensity * max(dist - uFogStart, 0.0) / (uFogEnd - uFogStart));
  fogFactor = clamp(fogFactor, 0.0, 1.0);

  // Multi-color gradient based on depth
  vec3 fogColor;
  float normalized = clamp((dist - uFogStart) / (uFogEnd - uFogStart), 0.0, 1.0);
  if (normalized < uFogMidPoint) {
    fogColor = mix(uFogNear, uFogMid, normalized / uFogMidPoint);
  } else {
    fogColor = mix(uFogMid, uFogFar, (normalized - uFogMidPoint) / (1.0 - uFogMidPoint));
  }

  return mix(sceneColor, fogColor, fogFactor);
}

void main() {
  // Standalone mode: renders pure fog color based on depth
  float dist = length(vPosition - cameraPosition);
  float normalized = clamp((dist - uFogStart) / (uFogEnd - uFogStart), 0.0, 1.0);

  vec3 fogColor;
  if (normalized < uFogMidPoint) {
    fogColor = mix(uFogNear, uFogMid, normalized / uFogMidPoint);
  } else {
    fogColor = mix(uFogMid, uFogFar, (normalized - uFogMidPoint) / (1.0 - uFogMidPoint));
  }

  float alpha = 1.0 - exp(-uFogDensity * max(dist - uFogStart, 0.0) / (uFogEnd - uFogStart));
  gl_FragColor = vec4(fogColor, clamp(alpha, 0.0, 1.0));
}
