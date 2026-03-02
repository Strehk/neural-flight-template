// @name Erosion Striation
// @description Geological layering texture with noise-based erosion — canyon and rock wall aesthetics
// @perf-tier quest-safe
// @tags erosion, geology, striation, rock, canyon
// @credits ICAROS Lab
// @cost ~3 noise calls, no raymarching
//
// Erosion Striation — Geological layering texture

#pragma include <noise>

uniform float uLayerScale;
uniform float uLayerCount;
uniform float uErosionStrength;
uniform vec3 uRockColor;
uniform vec3 uLayerColor;
uniform float uAnimSpeed;

varying vec2 vUv;
varying vec3 vPosition;
varying float vHeight;

void main() {
  // Use world Y (or vHeight if from noise-terrain.vert) for layer position
  float h = vPosition.y * uLayerScale;

  // Noise-based layer distortion (simulates erosion)
  float erosionNoise = fbm(vec2(vPosition.xz * 0.05 + uTime * uAnimSpeed));
  h += erosionNoise * uErosionStrength;

  // Sharp striation bands
  float layers = fract(h * uLayerCount);
  float band = smoothstep(0.0, 0.15, layers) * (1.0 - smoothstep(0.85, 1.0, layers));

  // Secondary noise for color variation within layers
  float colorNoise = snoise(vec3(vPosition.xz * 0.1, vPosition.y * 0.3));
  vec3 rockVariation = uRockColor * (0.8 + colorNoise * 0.2);

  // Mix rock base with layer color
  vec3 col = mix(rockVariation, uLayerColor, band * 0.6);

  // Subtle AO from noise
  float ao = 0.7 + 0.3 * fbm(vec2(vPosition.xz * 0.02));
  col *= ao;

  gl_FragColor = vec4(col, 1.0);
}
