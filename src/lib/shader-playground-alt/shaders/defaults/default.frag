// ═══════════════════════════════════════════════════════════════
// DEFAULT FRAGMENT SHADER
// ═══════════════════════════════════════════════════════════════
//
// A fragment shader runs once PER PIXEL on your 3D mesh.
// Its job: decide the final color of each pixel → gl_FragColor.
//
// ═══ UNIFORMS ═══════════════════════════════════════════════════
// Uniforms are values sent from JavaScript (Three.js) every frame.
// They are the same for ALL pixels — "uniform" across the surface.

uniform float uTime;            // Elapsed seconds — drives animation
uniform vec2 uResolution;       // Viewport width/height in pixels
uniform vec3 uLightDir;         // Direction the light comes from (normalized)
uniform float uLightIntensity;  // How bright the directional light is (0-1)
uniform float uAmbient;         // Minimum light level everywhere (0-1)

// ═══ VARYINGS ═══════════════════════════════════════════════════
// Varyings are passed FROM the vertex shader TO the fragment shader.
// The GPU interpolates them smoothly across the triangle surface.

varying vec2 vUv;     // UV texture coordinates (0→1 across the mesh)
varying vec3 vNormal; // Surface normal (which direction the surface faces)

// ═══ MAIN ═══════════════════════════════════════════════════════
void main() {
  vec2 uv = vUv;

  // Animated rainbow color using cosine palette trick:
  // cos(time + uv + offset) creates smooth cycling hues
  vec3 color = 0.5 + 0.5 * cos(uTime + uv.xyx + vec3(0.0, 2.0, 4.0));

  // Simple diffuse lighting (Lambert model):
  // dot(normal, lightDir) = how directly the surface faces the light
  float diffuse = max(dot(vNormal, uLightDir), 0.0);

  // Combine ambient (always-on) + diffuse (directional) light
  float light = uAmbient + diffuse * uLightIntensity;

  // Final output: color * lighting, fully opaque (alpha = 1.0)
  gl_FragColor = vec4(color * light, 1.0);
}
