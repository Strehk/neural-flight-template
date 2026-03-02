// @name Toon Stepped
// @description Cel-shading with configurable step count, shadow color, and Fresnel outline
// @perf-tier quest-safe
// @tags toon, cel-shading, stepped, outline, quest-safe
// @credits ICAROS Lab
// @cost 1 dot product + floor, no loops
//
//
// Toon / Cel-Shading — Configurable stepped lighting

uniform vec3 uBaseColor;
uniform vec3 uShadowColor;
uniform float uSteps;
uniform float uOutlineWidth;
uniform vec3 uLightDir;

varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 lightDir = normalize(uLightDir);

  // Lambert diffuse, quantized to N steps
  float NdotL = dot(normal, lightDir);
  float diffuse = max(NdotL, 0.0);
  float stepped = floor(diffuse * uSteps + 0.5) / uSteps;

  vec3 col = mix(uShadowColor, uBaseColor, stepped);

  // Optional outline via normal-to-view dot product (Fresnel-based edge detection)
  vec3 viewDir = normalize(cameraPosition - vPosition);
  float edge = dot(normal, viewDir);
  float outline = smoothstep(0.0, uOutlineWidth, edge);
  col *= outline;

  gl_FragColor = vec4(col, 1.0);
}
