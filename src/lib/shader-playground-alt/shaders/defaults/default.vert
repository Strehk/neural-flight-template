// ═══════════════════════════════════════════════════════════════
// DEFAULT VERTEX SHADER
// ═══════════════════════════════════════════════════════════════
//
// A vertex shader runs once PER VERTEX of your 3D mesh.
// Its job: transform 3D positions → 2D screen coordinates.
//
// Three.js automatically provides these built-in attributes:
//   position      — vec3: vertex position in object space
//   normal        — vec3: surface normal direction
//   uv            — vec2: texture coordinates (0→1)
//
// And these built-in uniforms (matrices):
//   projectionMatrix  — camera lens (perspective/ortho)
//   modelViewMatrix   — object position × camera position
//   normalMatrix      — transforms normals correctly (handles scaling)

// ═══ VARYINGS ═══════════════════════════════════════════════════
// We declare varyings to pass data to the fragment shader.
// The GPU will interpolate these across each triangle.

varying vec2 vUv;
varying vec3 vNormal;

// ═══ MAIN ═══════════════════════════════════════════════════════
void main() {
  // Pass UV coords through to fragment shader
  vUv = uv;

  // Transform normal from object space → view space
  // normalMatrix handles non-uniform scaling correctly
  vNormal = normalize(normalMatrix * normal);

  // The essential vertex shader output:
  // Transform vertex from 3D object space → 2D screen clip space
  // Pipeline: object → world → camera → clip (projection)
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
