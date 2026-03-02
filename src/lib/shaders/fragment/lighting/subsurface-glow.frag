// @name Subsurface Glow
// @description Subsurface scattering approximation — translucent warm glow for organic meshes
// @perf-tier quest-safe
// @tags subsurface, glow, organic, translucent, quest-safe
// @credits ICAROS Lab
//
//
// Subsurface Glow — Translucent warm glow for organic blob meshes
// Fresnel-based rim + view-dependent subsurface transmission + animated color shift
// Reusable for glowing organic objects (jellyfish, crystals, lava blobs)
//
// Required varyings from vertex shader:
//   varying vec3 vNormal;
//   varying vec3 vWorldPos;
//   varying float vRim;

uniform vec3 uGlowColor;              // core glow color, default [1.0, 0.3, 0.1]
uniform vec3 uRimColor;               // rim highlight, default [1.0, 0.1, 0.6]
uniform float uSubsurfaceIntensity;   // 0.5-3.0, default 1.5
uniform float uOpacity;               // 0.2-0.9, default 0.5

varying vec3 vNormal;
varying vec3 vWorldPos;
varying float vRim;

void main() {
  float subsurface = pow(vRim, 2.0) * uSubsurfaceIntensity;

  // Animated color shift based on height + time
  float t = vWorldPos.y * 0.04 + uTime * 0.4;
  float shift = sin(t) * 0.5 + 0.5;
  vec3 warmCol = mix(uGlowColor, uRimColor, shift);

  // Hot center — bright yellow-white core
  vec3 hotCenter = vec3(1.0, 0.95, 0.4);
  vec3 col = mix(hotCenter, warmCol, subsurface);

  // Subsurface contribution
  col += subsurface * uGlowColor * 0.8;

  // View-dependent transmission — light passing through thin edges
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float transmission = pow(max(1.0 - abs(dot(normalize(vNormal), viewDir)), 0.0), 3.0);
  col += transmission * uRimColor * 0.4;

  // Translucent with bright rim
  float alpha = uOpacity + subsurface * 0.3 + transmission * 0.2;
  alpha = clamp(alpha, 0.0, 1.0);

  gl_FragColor = vec4(col, alpha);
}
