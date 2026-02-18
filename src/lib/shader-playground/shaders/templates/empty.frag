// ═══════════════════════════════════════════════════════════════
// EMPTY TEMPLATE — Minimal Fragment Shader
// ═══════════════════════════════════════════════════════════════
//
// The simplest possible fragment shader.
// It outputs one color for every pixel.
//
// Try changing the vec4 values to see different colors!
// Format: vec4(red, green, blue, alpha) — each 0.0 to 1.0

uniform float uTime;       // Seconds elapsed — use for animation
uniform vec2 uResolution;  // Screen size in pixels
varying vec2 vUv;          // UV coordinates (0→1 across the surface)

void main() {
  // gl_FragColor is the final pixel color output
  // Here: R=uv.x, G=uv.y, B=animated sine wave, A=fully opaque
  gl_FragColor = vec4(vUv, 0.5 + 0.5 * sin(uTime), 1.0);
}
