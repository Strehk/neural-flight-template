// ═══ Transform Utilities ═══
// Rotation matrices, coordinate transforms, and interpolation helpers.
// Pure functions only — no uniforms, no main().

// --- 2D Rotation ---

mat2 rotate2D(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}

// --- 3D Axis-Angle Rotation (Rodrigues) ---

mat3 rotate3D(vec3 axis, float angle) {
  vec3 a = normalize(axis);
  float s = sin(angle);
  float c = cos(angle);
  float oc = 1.0 - c;
  return mat3(
    oc * a.x * a.x + c,       oc * a.x * a.y - a.z * s, oc * a.z * a.x + a.y * s,
    oc * a.x * a.y + a.z * s, oc * a.y * a.y + c,       oc * a.y * a.z - a.x * s,
    oc * a.z * a.x - a.y * s, oc * a.y * a.z + a.x * s, oc * a.z * a.z + c
  );
}

// --- Polar Coordinates ---
// Returns vec2(radius, angle) from Cartesian UV.

vec2 polarCoords(vec2 uv) {
  return vec2(length(uv), atan(uv.y, uv.x));
}

// --- Remap ---
// Linearly maps v from [inMin, inMax] to [outMin, outMax].

float remap(float v, float inMin, float inMax, float outMin, float outMax) {
  return outMin + (v - inMin) * (outMax - outMin) / (inMax - inMin);
}

// --- Smooth Minimum (IQ) ---
// Polynomial smooth min, k controls blend sharpness.

float smoothMin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}
