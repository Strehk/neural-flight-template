// ═══ Color Utilities ═══
// Palette generation, color space conversion, and post-processing.
// Pure functions only — no uniforms, no main().

// --- Cosine Palette (Inigo Quilez) ---
// https://iquilezles.org/articles/palettes/
// color(t) = a + b * cos(2pi * (c*t + d))
//
// Example values:
// Rainbow:  a=vec3(0.5), b=vec3(0.5), c=vec3(1.0), d=vec3(0.0, 0.33, 0.67)
// Sunset:   a=vec3(0.5,0.5,0.5), b=vec3(0.5,0.5,0.5), c=vec3(1.0,0.7,0.4), d=vec3(0.0,0.15,0.2)
// Fire:     a=vec3(0.5,0.5,0.5), b=vec3(0.5,0.5,0.5), c=vec3(1.0,1.0,1.0), d=vec3(0.0,0.10,0.20)

vec3 cosinePalette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(6.2831853 * (c * t + d));
}

// --- HSV <-> RGB ---
// Standard conversion, based on Sam Hocevar's implementation.
// H in [0,1] (wraps), S in [0,1], V in [0,1].
// H=0 red, H=0.33 green, H=0.67 blue.

vec3 hsv2rgb(vec3 hsv) {
  vec3 p = abs(fract(hsv.xxx + vec3(1.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0);
  return hsv.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), hsv.y);
}

vec3 rgb2hsv(vec3 rgb) {
  vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
  vec4 p = mix(vec4(rgb.bg, K.wz), vec4(rgb.gb, K.xy), step(rgb.b, rgb.g));
  vec4 q = mix(vec4(p.xyw, rgb.r), vec4(rgb.r, p.yzx), step(p.x, rgb.r));

  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

// --- Post-Processing ---

// Reduces color to N discrete steps — retro/pixel art effect.
// v = input value [0,1], steps = number of discrete levels.
float posterize(float v, float steps) {
  return floor(v * steps + 0.5) / steps;
}

// Adjusts contrast around mid-gray (0.5).
// amount > 1.0 increases contrast, < 1.0 decreases. 1.0 = no change.
vec3 contrast(vec3 col, float amount) {
  return 0.5 + (col - 0.5) * amount;
}
