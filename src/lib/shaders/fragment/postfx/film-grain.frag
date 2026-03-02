// @name Film Grain
// @description Analog film grain noise overlay — time-animated, configurable intensity
// @perf-tier quest-safe
// @tags film, grain, noise, postfx, overlay
// @credits ICAROS Lab
// @cost 2 hash calls per pixel, no loops
//
//
// Film Grain — Analog noise overlay for post-processing
//
// Usage: Render scene to texture, then draw fullscreen quad with this shader.
// Blend with scene via uIntensity.

uniform float uIntensity;
uniform float uGrainScale;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord.xy / uResolution.xy;

  // Time-varying seed so grain animates each frame
  float seed = dot(uv, vec2(12.9898, 78.233)) + uTime * 0.5;
  float noise = fract(sin(seed) * 43758.5453);

  // Second pass for less patterned grain
  float seed2 = dot(uv * uGrainScale, vec2(39.346, 11.135)) + uTime * 0.37;
  float noise2 = fract(sin(seed2) * 22578.1459);

  // Mix both noise sources, center around 0 (-0.5..0.5)
  float grain = (noise + noise2) * 0.5 - 0.5;
  grain *= uIntensity;

  // Output as additive grayscale overlay
  fragColor = vec4(vec3(grain), 1.0);
}
