// @name Bioluminescence
// @description Deep-sea bioluminescent glow driven by noise and cosine palette coloring
// @perf-tier quest-safe
// @tags bioluminescence, noise, glow, quest-safe
// @credits ICAROS Lab

precision highp float;

// Bioluminescence Fragment Shader — Deep-sea pulsing glow
// Combines noise-driven emissive patterns with cosine palette coloring
// Creates organic, living light effects like deep-sea creatures
// @perf-tier: quest-safe
// @cost: low — 1 snoise + cosine palette per pixel

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;

uniform float uPulseSpeed;     // How fast the glow pulses (0.5 - 3.0)
uniform float uNoiseScale;     // Scale of luminous patterns (1.0 - 10.0)
uniform float uGlowIntensity;  // Overall brightness (0.5 - 3.0)

#pragma include <math>
#pragma include <noise>
#pragma include <color>

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  // Use UV + position for noise sampling — creates surface-following patterns
  vec3 noiseInput = vec3(vUv * uNoiseScale, uTime * uPulseSpeed * 0.3);
  float n = snoise(noiseInput);

  // Pulsing wave — creates rhythmic brightening
  float pulse = sin(uTime * uPulseSpeed + n * 3.0) * 0.5 + 0.5;

  // Deep-sea color palette: bioluminescent blues and greens
  vec3 glowColor = cosinePalette(
    n * 0.5 + 0.5 + uTime * 0.1,
    vec3(0.1, 0.2, 0.4),     // Dark blue base
    vec3(0.1, 0.4, 0.3),     // Green-blue amplitude
    vec3(1.0, 1.0, 1.0),     // Full cycle
    vec3(0.0, 0.1, 0.2)      // Phase offset
  );

  // Combine noise pattern with pulse
  float luminance = max(0.0, n * 0.5 + 0.3) * pulse * uGlowIntensity;

  // Fresnel for edge glow
  vec3 viewDir = normalize(cameraPosition - vPosition);
  float fresnel = pow(1.0 - abs(dot(viewDir, normalize(vNormal))), 2.0);

  vec3 color = glowColor * luminance + glowColor * fresnel * 0.3;

  gl_FragColor = vec4(color, 1.0);
}
