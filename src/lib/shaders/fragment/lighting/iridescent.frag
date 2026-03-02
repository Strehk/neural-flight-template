// Iridescent — Thin-film interference holographic effect
// @perf-tier: quest-safe
// @cost: 1 dot product + 1 cos, no loops
//
// View-angle dependent color shift simulating thin-film interference
// (soap bubbles, oil slick, holographic foil)

uniform vec3 uBaseColor;
uniform float uFrequency;
uniform float uIntensity;
uniform float uSaturation;

varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(cameraPosition - vPosition);

  // Fresnel-like angle factor
  float NdotV = dot(normal, viewDir);
  float fresnel = 1.0 - abs(NdotV);

  // Thin-film interference: phase shift based on viewing angle
  float phase = fresnel * uFrequency;
  vec3 iridescence = vec3(
    0.5 + 0.5 * cos(phase),
    0.5 + 0.5 * cos(phase + 2.094), // +2pi/3
    0.5 + 0.5 * cos(phase + 4.189)  // +4pi/3
  );

  // Boost saturation
  float lum = dot(iridescence, vec3(0.299, 0.587, 0.114));
  iridescence = mix(vec3(lum), iridescence, uSaturation);

  // Blend with base color, stronger at glancing angles
  vec3 col = mix(uBaseColor, iridescence, fresnel * uIntensity);

  // Subtle rim glow
  col += iridescence * fresnel * fresnel * 0.5;

  gl_FragColor = vec4(col, 1.0);
}
