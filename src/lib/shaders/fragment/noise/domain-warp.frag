// @name Domain Warp
// @description IQ-style domain warping — feeds noise output back as coordinates for organic patterns
// @perf-tier quest-safe
// @tags domain-warp, noise, organic, quest-safe, teaching
// @credits ICAROS Lab — technique by Inigo Quilez

precision highp float;

// Domain Warp Fragment Shader — IQ-style warped noise patterns
// Feeds noise output back as input coordinates, creating organic flowing shapes
// Great teaching example: shows how simple noise becomes complex through iteration
// Reference: https://iquilezles.org/articles/warp/
// @perf-tier: quest-safe
// @cost: low — 3 snoise calls per pixel

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;

uniform float uWarpStrength;  // How much warping (0.5 - 3.0)
uniform float uNoiseScale;    // Base noise frequency (1.0 - 5.0)
uniform float uSpeed;         // Animation speed (0.1 - 1.0)

#pragma include <math>
#pragma include <noise>
#pragma include <color>

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  // Start with UV coordinates as base
  vec2 p = vUv * uNoiseScale;
  float t = uTime * uSpeed;

  // Step 1: First noise layer — creates the warp displacement
  vec2 q = vec2(
    snoise(vec3(p, t)),
    snoise(vec3(p + vec2(5.2, 1.3), t))
  );

  // Step 2: Warp the coordinates — this is where the magic happens!
  // We offset our sampling position by the noise, creating organic distortion
  vec2 r = vec2(
    snoise(vec3(p + uWarpStrength * q + vec2(1.7, 9.2), t * 0.7)),
    snoise(vec3(p + uWarpStrength * q + vec2(8.3, 2.8), t * 0.7))
  );

  // Step 3: Final noise with double-warped coordinates
  float f = snoise(vec3(p + uWarpStrength * r, t * 0.5));

  // Map to color — the warp creates beautiful organic patterns
  float colorT = f * 0.5 + 0.5;
  vec3 col = cosinePalette(
    colorT,
    vec3(0.5, 0.5, 0.5),
    vec3(0.5, 0.5, 0.5),
    vec3(1.0, 1.0, 0.5),
    vec3(0.8, 0.9, 0.3)
  );

  // Add subtle variation from the intermediate warp layers
  col = mix(col, col * 1.3, dot(q, q) * 0.5);

  gl_FragColor = vec4(col, 1.0);
}
