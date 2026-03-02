// @name Rim Light
// @description Configurable rim/backlight effect — classic edge lighting for any geometry
// @perf-tier quest-safe
// @tags rim-light, lighting, quest-safe
// @credits ICAROS Lab

precision highp float;

// Rim Light Fragment Shader — Configurable edge lighting
// Classic rim/backlight effect used in games and film
// Works with any geometry — the effect depends on surface normals
// @perf-tier: quest-safe
// @cost: trivial — 1 dot product, no loops

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;

uniform vec3 uRimColor;       // Rim light color
uniform float uRimPower;      // Controls rim width (1.0 wide - 8.0 narrow)
uniform float uRimIntensity;  // Brightness multiplier

uniform vec3 uBaseColor;      // Base surface color
uniform float uAmbient;       // Ambient light level (0.0 - 1.0)

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vec3 viewDir = normalize(cameraPosition - vPosition);
  vec3 normal = normalize(vNormal);

  // Rim factor: stronger at edges (where normal perpendicular to view)
  float rim = 1.0 - max(0.0, dot(viewDir, normal));
  rim = pow(rim, uRimPower) * uRimIntensity;

  // Simple diffuse lighting from above
  float diffuse = max(0.0, dot(normal, vec3(0.0, 1.0, 0.0))) * 0.5 + 0.5;

  // UV-based color variation
  vec3 baseWithUv = uBaseColor * (0.9 + 0.1 * sin(vUv.x * 6.28));

  vec3 color = baseWithUv * (diffuse * (1.0 - uAmbient) + uAmbient);
  color += uRimColor * rim;

  gl_FragColor = vec4(color, 1.0);
}
