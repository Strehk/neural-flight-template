precision highp float;

// Fresnel Glow Fragment Shader — Edge-based glow effect
// Uses Fresnel equation: brighter at edges where view direction is perpendicular to surface
// Great for energy shields, holographic effects, or ethereal bodies
// @perf-tier: quest-safe
// @cost: trivial — 1 dot product, no loops

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;

uniform vec3 uGlowColor;       // Glow color (default: cyan)
uniform float uGlowIntensity;  // Glow strength (0.5 - 5.0)
uniform float uGlowPower;      // Fresnel exponent — higher = thinner edge (1.0 - 8.0)
uniform float uOpacity;        // Base opacity (0.0 - 1.0)

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  // View direction: from fragment to camera (camera is at origin in view space)
  vec3 viewDir = normalize(cameraPosition - vPosition);

  // Fresnel: dot(view, normal) = 1 when facing camera, 0 at edges
  float fresnel = 1.0 - abs(dot(viewDir, normalize(vNormal)));

  // Apply power curve to control edge sharpness
  fresnel = pow(fresnel, uGlowPower);

  // UV-based pattern overlay — subtle grid for visual interest
  float uvPattern = 0.95 + 0.05 * sin(vUv.x * 20.0) * sin(vUv.y * 20.0);

  vec3 color = uGlowColor * fresnel * uGlowIntensity * uvPattern;
  float alpha = mix(uOpacity, 1.0, fresnel);

  gl_FragColor = vec4(color, alpha);
}
