// @name Voronoi Cells
// @description Cellular voronoi pattern with glowing edges — organic cell aesthetics
// @perf-tier quest-safe
// @tags voronoi, cells, generative, quest-safe
// @credits ICAROS Lab

precision highp float;

// Voronoi Cells Fragment Shader — Cellular pattern with edge glow
// Creates organic cell-like patterns perfect for biological/cellular aesthetics
// Uses voronoi noise to find cell boundaries and applies glow at edges
// @perf-tier: quest-safe
// @cost: low — 1 voronoi (9 hash calls) per pixel

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;

uniform float uCellScale;     // Number of cells (3.0 - 15.0)
uniform float uEdgeWidth;     // Edge glow width (0.01 - 0.3)
uniform vec3 uCellColor;      // Cell interior color
uniform vec3 uEdgeColor;      // Edge glow color

#pragma include <math>
#pragma include <noise>
#pragma include <color>

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  // Use UV as cell coordinates
  vec2 p = vUv * uCellScale;

  // Animate cell centers slowly
  // Note: voronoi() returns vec2(nearestDist, secondNearestDist)
  vec2 v = voronoi(p + uTime * 0.2);

  // Edge detection: difference between nearest and second-nearest cell
  float edge = smoothstep(0.0, uEdgeWidth, v.y - v.x);

  // Cell coloring — use nearest distance for variation
  float cellPattern = v.x * 2.0;
  vec3 cellCol = cosinePalette(
    cellPattern + uTime * 0.1,
    vec3(0.2, 0.1, 0.3),
    vec3(0.3, 0.2, 0.2),
    vec3(1.0, 1.0, 1.0),
    vec3(0.0, 0.33, 0.67)
  );
  cellCol = mix(cellCol, uCellColor, 0.5);

  // Combine: glowing edges + colored cells
  vec3 color = mix(uEdgeColor * 2.0, cellCol, edge);

  // Subtle pulse at edges
  float pulse = sin(uTime * 2.0 + v.x * 10.0) * 0.5 + 0.5;
  color += uEdgeColor * (1.0 - edge) * pulse * 0.3;

  gl_FragColor = vec4(color, 1.0);
}
