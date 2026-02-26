// ═══════════════════════════════════════════════════════════════
// VERTEX + FRAGMENT — Vertex Part
// ═══════════════════════════════════════════════════════════════
//
// This vertex shader deforms the mesh surface with sine waves.
// Each vertex is pushed along its normal by a displacement value.
//
// Key concept: vertex displacement
//   1. Calculate a displacement value (here: product of two sine waves)
//   2. Move the vertex along its normal: newPos = pos + normal * displacement
//   3. Pass displacement to fragment shader via varying for coloring

uniform float uTime;
varying vec2 vUv;
varying float vDisplacement; // Output: displacement amount for fragment shader

void main() {
  // Pass UVs to fragment shader
  vUv = uv;

  // Sine wave displacement along normals
  // Two overlapping sine waves create an interference pattern
  // position.x and position.y create the 2D wave pattern
  // uTime creates animation (different speeds for visual interest)
  float displacement = sin(position.x * 4.0 + uTime * 2.0)
                      * sin(position.y * 4.0 + uTime * 1.5)
                      * 0.15; // amplitude — how far vertices move

  // Pass displacement to fragment shader for coloring
  vDisplacement = displacement;

  // Displace vertex along its surface normal
  vec3 newPosition = position + normal * displacement;

  // Standard transform: object space → clip space
  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
