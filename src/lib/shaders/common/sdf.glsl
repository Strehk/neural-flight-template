// ═══ Signed Distance Functions ═══
// 2D and 3D SDF primitives + boolean operations.
// Pure functions only — no uniforms, no main().
//
// Based on Inigo Quilez's SDF reference:
// https://iquilezles.org/articles/distfunctions/
// https://iquilezles.org/articles/distfunctions2d/

// --- 2D Primitives ---

// Distance = length - radius. Negative inside, positive outside.
// p = sample point, r = circle radius.
float sdCircle(vec2 p, float r) {
  return length(p) - r;
}

// Axis-aligned box SDF.
// max(d, 0.0) handles outside distance, min(max(d.x, d.y), 0.0) handles inside corners.
// p = sample point, b = box half-extents (width/2, height/2).
float sdBox(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

// --- 3D Primitives ---

// Distance = length - radius. Negative inside, positive outside.
// p = sample point, r = sphere radius.
float sdSphere(vec3 p, float r) {
  return length(p) - r;
}

// Torus SDF.
// p = sample point, t = vec2(major radius, minor radius).
float sdTorus(vec3 p, vec2 t) {
  vec2 q = vec2(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}

// --- Boolean Operations ---

// Hard union — keeps the closest surface.
float opUnion(float d1, float d2) {
  return min(d1, d2);
}

// Smooth union (IQ) — k = blend radius in world-space units.
// k=0.5 means half a unit of smooth blending between shapes.
float opSmooth(float d1, float d2, float k) {
  float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
  return mix(d2, d1, h) - k * h * (1.0 - h);
}

// --- Domain Operations ---

// Infinite repetition — returns local coordinates within cell.
// spacing = cell size. Usage example:
// vec2 q = opRepeat(p, vec2(2.0)); float d = sdCircle(q, 0.3);
vec2 opRepeat(vec2 p, vec2 spacing) {
  return mod(p + 0.5 * spacing, spacing) - 0.5 * spacing;
}
