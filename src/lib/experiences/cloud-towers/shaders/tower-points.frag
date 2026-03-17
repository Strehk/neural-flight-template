uniform vec3 uFogColor;
uniform float uBrightness;

varying float vFogFactor;
varying float vBrightness;

void main() {
  // Soft circular point
  float dist = length(gl_PointCoord - vec2(0.5));
  float alpha = 1.0 - smoothstep(0.3, 0.5, dist);

  // Discard fully transparent fragments
  if (alpha < 0.01) discard;

  // Point color — white with brightness control
  vec3 color = vec3(uBrightness) * vBrightness;

  // Blend with fog
  color = mix(color, uFogColor, vFogFactor);
  alpha *= (1.0 - vFogFactor);

  gl_FragColor = vec4(color, alpha);
}
