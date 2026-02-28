// ═══ Math Utilities ═══
// Building blocks for noise algorithms: modular arithmetic, pseudo-random
// permutation, and hash functions. Used by noise.glsl and other snippets.
// Pure functions only — no uniforms, no main().

// --- Modular Arithmetic (Ashima Arts) ---

// Keeps values in range [0, 289) to prevent float precision loss in noise permutation.
// Without this, large floats lose fractional bits and noise breaks down.
float mod289(float x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }

// Pseudo-random permutation — shuffles input deterministically.
// The formula (x * 34 + 10) * x creates a wide value spread from sequential inputs.
float permute(float x) { return mod289(((x * 34.0) + 10.0) * x); }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 10.0) * x); }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }

// Fast approximate 1/sqrt(x) — used in gradient normalization.
// Taylor series expansion, cheaper than inversesqrt() on some GPUs.
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

// --- Hash Functions ---
// Based on Dave Hoskins' hash functions (https://www.shadertoy.com/view/4djSRW)
// Maps N-dimensional input to pseudo-random value in [0, 1].

// hash11: float → float
float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

// hash21: vec2 → float
float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// hash31: vec3 → float
float hash31(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}

// --- Simple Random ---
// Classic GLSL pseudo-random, adequate for non-tiling use.
// Warning: creates visible patterns at large scales — prefer hash functions for production.

float random(vec2 st) {
  return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453123);
}
