// Noise Terrain — 3D noise displacement for soft blob hills
// @perf-tier: quest-safe
// @cost: 1 FBM call (6 octaves simplex) per vertex
//
// Requires: noise.glsl (snoise, fbm) via registerSnippet

precision highp float;

uniform float uTime;
uniform float uNoiseScale;
uniform float uNoiseAmplitude;
uniform float uNoiseSpeed;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vHeight;

// Inline simplex for vertex shader (can't use pragma include in .vert)
// Simplified 2D version for performance
float hash2D(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise2D(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float a = hash2D(i);
  float b = hash2D(i + vec2(1.0, 0.0));
  float c = hash2D(i + vec2(0.0, 1.0));
  float d = hash2D(i + vec2(1.0, 1.0));

  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbmVert(vec2 p) {
  float value = 0.0;
  float amp = 0.5;
  float freq = 1.0;
  for (int i = 0; i < 5; i++) {
    value += amp * noise2D(p * freq);
    freq *= 2.0;
    amp *= 0.5;
  }
  return value;
}

void main() {
  vUv = uv;

  // Sample FBM at world XZ position for seamless terrain
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vec2 noiseCoord = worldPos.xz * uNoiseScale + uTime * uNoiseSpeed;
  float height = fbmVert(noiseCoord) * uNoiseAmplitude;

  // Displace along Y (up)
  vec3 displaced = position;
  displaced.y += height;

  // Approximate normal from neighbouring samples
  float eps = 0.1;
  float hL = fbmVert((worldPos.xz + vec2(-eps, 0.0)) * uNoiseScale + uTime * uNoiseSpeed) * uNoiseAmplitude;
  float hR = fbmVert((worldPos.xz + vec2(eps, 0.0)) * uNoiseScale + uTime * uNoiseSpeed) * uNoiseAmplitude;
  float hD = fbmVert((worldPos.xz + vec2(0.0, -eps)) * uNoiseScale + uTime * uNoiseSpeed) * uNoiseAmplitude;
  float hU = fbmVert((worldPos.xz + vec2(0.0, eps)) * uNoiseScale + uTime * uNoiseSpeed) * uNoiseAmplitude;
  vec3 computedNormal = normalize(vec3(hL - hR, 2.0 * eps, hD - hU));
  vNormal = normalize(normalMatrix * computedNormal);

  vPosition = (modelMatrix * vec4(displaced, 1.0)).xyz;
  vHeight = height / uNoiseAmplitude; // normalized [0..1] for fragment shader

  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
