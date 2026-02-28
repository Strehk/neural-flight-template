precision highp float;

// Ocean Surface Fragment Shader — Procedural water rendering
// Combines caustic patterns with fresnel reflection for realistic water
// Pair with ocean.vert for complete ocean effect
// @perf-tier: quest-safe
// @cost: low — 2 sin patterns + fresnel, no loops

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;

uniform vec3 uWaterColor;      // Deep water color
uniform vec3 uFoamColor;       // Foam/highlight color
uniform float uCausticScale;   // Caustic pattern size

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

// Simple procedural caustics — sum of rotated sine grids
float caustics(vec2 uv, float time) {
  float c = 0.0;
  // Layer 1
  c += sin(uv.x * 12.0 + time) * sin(uv.y * 10.0 + time * 0.7) * 0.5 + 0.5;
  // Layer 2 (rotated 45°)
  vec2 uv2 = uv * mat2(0.707, -0.707, 0.707, 0.707);
  c += sin(uv2.x * 8.0 - time * 0.8) * sin(uv2.y * 14.0 + time * 0.5) * 0.5 + 0.5;
  return c * 0.5;
}

void main() {
  vec3 viewDir = normalize(cameraPosition - vPosition);
  vec3 normal = normalize(vNormal);

  // Fresnel reflection — water is more reflective at grazing angles
  float fresnel = pow(1.0 - max(0.0, dot(viewDir, normal)), 3.0);

  // Procedural caustics using UV
  float caustic = caustics(vUv * uCausticScale, uTime);

  // Deep color + caustic brightening
  vec3 color = uWaterColor + uFoamColor * caustic * 0.3;

  // Fresnel blend: deep water color → sky reflection at edges
  vec3 skyColor = vec3(0.4, 0.6, 0.9);
  color = mix(color, skyColor, fresnel * 0.6);

  // Specular highlight
  vec3 lightDir = normalize(vec3(0.5, 0.8, 0.3));
  float spec = pow(max(0.0, dot(reflect(-lightDir, normal), viewDir)), 32.0);
  color += vec3(1.0, 0.95, 0.8) * spec * 0.5;

  gl_FragColor = vec4(color, 0.9);
}
