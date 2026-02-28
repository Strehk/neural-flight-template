// Psychedelic Terrain — Neon cosine palette with domain warp and contour lines
// Camera-relative domain warp decouples color animation from flight speed.
// Terrain height scrolling is inherent to infinite terrain (world-space FBM) — not a bug.
// @perf-tier: quest-safe
// @category: landscape
//
// Required varyings from vertex shader:
//   varying vec2 vUv;
//   varying vec3 vNormal;
//   varying vec3 vPosition;

precision highp float;

uniform float uTime;
uniform float uTerrainHeight;
uniform float uColorSpeed;
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
  float h = clamp(vPosition.y / uTerrainHeight + 0.5, 0.0, 1.0);

  // Camera-relative position for domain warp — decouples animation from flight speed
  // vPosition = world-space (scrolls with movement), relPos = camera-relative (stable)
  vec3 relPos = vPosition - cameraPosition;

  // Double domain warp — camera-relative so speed doesn't affect animation
  float warp1 = snoise(relPos * 0.012 + uTime * 0.15) * 0.4;
  float warp2 = snoise(relPos * 0.03 + vec3(warp1) + uTime * 0.08) * 0.25;
  h += warp1 + warp2;

  // Intense neon cosine palette
  float t = h * 3.0 + uTime * uColorSpeed;
  vec3 col = cosinePalette(t,
    vec3(0.5, 0.5, 0.5),
    vec3(0.6, 0.6, 0.6),
    vec3(1.0, 0.7, 0.4),
    vec3(0.0, 0.15, 0.20)
  );

  // Rim glow on ridges
  float rim = 1.0 - abs(dot(normalize(vNormal), vec3(0.0, 1.0, 0.0)));
  rim = pow(rim, 1.5);
  col += rim * 0.7 * vec3(1.0, 0.2, 0.8);

  // Emissive contour lines — softened edges for smoother look
  float edge = abs(fract(h * 8.0 + uTime * 0.1) - 0.5) * 2.0;
  edge = smoothstep(0.65, 1.0, edge);
  col += edge * vec3(0.3, 0.8, 1.0) * 0.5;

  col *= uBrightness;

  float dist = distance(vPosition, cameraPosition);
  float fog = smoothstep(uFogNear, uFogFar, dist);
  col = mix(col, uFogColor, fog);

  gl_FragColor = vec4(col, 1.0);
}
