// Psychedelic Water — Color-shifting caustics with fresnel and sparkle
// Camera-relative caustic sampling decouples animation from flight speed.
// @perf-tier: quest-safe
// @category: landscape
//
// Required varyings from vertex shader:
//   varying vec2 vUv;
//   varying vec3 vNormal;
//   varying vec3 vPosition;

precision highp float;

uniform float uTime;
uniform float uBrightness;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

#pragma include <math>
#pragma include <noise>
#pragma include <color>

void main() {
  float fresnel = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 1.0, 0.0))), 2.5);

  // Camera-relative caustics — decoupled from flight speed
  vec2 relXZ = vPosition.xz - cameraPosition.xz;
  float c1 = snoise(vec3(relXZ * 0.06 + uTime * 0.35, 0.0));
  float c2 = snoise(vec3(relXZ * 0.09 - uTime * 0.28, 1.0));
  float caustic = abs(c1 + c2) * 0.6;

  float colorShift = sin(uTime * 0.15) * 0.5 + 0.5;
  vec3 shallow = mix(vec3(0.0, 1.0, 0.8), vec3(0.8, 0.2, 1.0), colorShift);
  vec3 deep = vec3(0.05, 0.0, 0.3);
  vec3 col = mix(deep, shallow, caustic);

  col += fresnel * mix(vec3(0.6, 0.1, 1.0), vec3(0.0, 0.8, 1.0), colorShift);

  float sparkle = smoothstep(0.7, 0.9, caustic);
  col += sparkle * vec3(1.0, 0.9, 0.8) * 0.6;

  col *= uBrightness;

  float dist = distance(vPosition, cameraPosition);
  float fog = smoothstep(uFogNear, uFogFar, dist);
  col = mix(col, uFogColor, fog);

  float alpha = 0.5 + fresnel * 0.4 + sparkle * 0.1;
  gl_FragColor = vec4(col, alpha);
}
