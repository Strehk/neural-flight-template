// ═══ Transform Utilities ═══
// Rotation matrices, coordinate transforms, and interpolation helpers.
// Pure functions only — no uniforms, no main().

// --- 2D Rotation ---
// Returns 2x2 rotation matrix. Multiply vec2 by result: uv *= rotate2D(angle)
// angle = rotation in radians (positive = counter-clockwise).

mat2 rotate2D(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}

// --- 3D Axis-Angle Rotation (Rodrigues Formula) ---
// axis = rotation axis (must be normalized), angle = rotation in radians.
// Returns 3x3 rotation matrix: vec3 rotated = rotate3D(axis, angle) * point;

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
// Converts Cartesian UV to polar: returns vec2(radius, angle).
// radius = distance from origin, angle in [-pi, pi] (0 = right, pi/2 = up).

vec2 polarCoords(vec2 uv) {
  return vec2(length(uv), atan(uv.y, uv.x));
}

// --- Remap ---
// Linear interpolation between ranges.
// Maps v from [inMin, inMax] to [outMin, outMax].
// Example: remap(0.5, 0.0, 1.0, -1.0, 1.0) = 0.0

float remap(float v, float inMin, float inMax, float outMin, float outMax) {
  return outMin + (v - inMin) * (outMax - outMin) / (inMax - inMin);
}

// --- Smooth Minimum (IQ) ---
// Polynomial smooth min, k controls blend radius.
// NOTE: Identical to opSmooth() in sdf.glsl — kept for backward compatibility

float smoothMin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}
