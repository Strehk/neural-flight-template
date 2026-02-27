// ═══ Cosine Palette ═══
// Attempt by IQ (Inigo Quilez) — four vec3 parameters (a, b, c, d)
// produce infinite smooth color ramps: color(t) = a + b * cos(2π(c*t + d))

vec3 cosinePalette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(6.2831853 * (c * t + d));
}
