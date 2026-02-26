// ═══════════════════════════════════════════════════════════════
// VERTEX + FRAGMENT — Fragment Part
// ═══════════════════════════════════════════════════════════════
//
// This fragment shader works together with vertex-fragment.vert.
// The vertex shader displaces vertices using sine waves,
// then passes the displacement amount to this shader via "varying".
//
// The rendering pipeline flows: Vertex → Varying → Fragment
//   1. Vertex shader moves each vertex and calculates displacement
//   2. GPU interpolates varyings across each triangle
//   3. Fragment shader uses displacement to choose color

uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;
varying float vDisplacement; // Passed from vertex shader (sine wave value)

void main() {
  // Color gradient: cool (blue) for valleys, warm (orange) for peaks
  vec3 cool = vec3(0.1, 0.3, 0.8);
  vec3 warm = vec3(0.9, 0.4, 0.1);

  // Mix between cool and warm based on displacement
  // displacement range ~(-0.15→0.15), remap to (0→1) with * 0.5 + 0.5
  vec3 color = mix(cool, warm, vDisplacement * 0.5 + 0.5);

  // Rim-like glow effect: brighten edges at UV boundary
  float rim = 1.0 - smoothstep(0.0, 0.5, abs(vUv.y - 0.5));
  color += vec3(0.2, 0.1, 0.4) * rim;

  gl_FragColor = vec4(color, 1.0);
}
