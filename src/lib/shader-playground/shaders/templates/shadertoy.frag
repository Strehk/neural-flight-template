// ═══════════════════════════════════════════════════════════════
// SHADERTOY COMPATIBLE TEMPLATE
// ═══════════════════════════════════════════════════════════════
//
// Shadertoy (shadertoy.com) uses different conventions than Three.js:
//   iTime       → elapsed time (Three.js: uTime)
//   iResolution → viewport size (Three.js: uResolution)
//   iMouse      → mouse position (Three.js: not available by default)
//   fragCoord   → pixel position in screen coordinates
//   mainImage() → the main function (instead of main())
//
// This template wraps mainImage() so you can paste Shadertoy code
// directly. The playground auto-detects Shadertoy format.

uniform float iTime;
uniform vec2 iResolution;
uniform vec2 iMouse;

// ═══ @ENDPOINT EXAMPLE ══════════════════════════════════════════
// Mark uniforms with @endpoint to control them from the Node Editor.
// Drag an LFO or Noise source onto the parameter to modulate it!
uniform float spiralSpeed; // @endpoint min:0.5 max:5.0 label:"Spiral Speed"
uniform float spiralArms;  // @endpoint min:2.0 max:12.0 label:"Spiral Arms"

// ═══ MAIN IMAGE ═════════════════════════════════════════════════
// Shadertoy convention: fragCoord is pixel position (0→resolution)
// We convert to UV (0→1) by dividing by resolution.
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  // Normalize coordinates to 0→1
  vec2 uv = fragCoord / iResolution.xy;

  // Center the coordinate system at (0,0)
  vec2 p = uv - 0.5;

  // Convert to polar coordinates (angle + distance from center)
  float angle = atan(p.y, p.x);
  float radius = length(p);

  // Animated spiral: combine angle, radius, and time
  float spiral = sin(angle * spiralArms - radius * 20.0 + iTime * spiralSpeed);

  // Cosine palette for smooth rainbow coloring
  vec3 color = 0.5 + 0.5 * cos(iTime + vec3(0, 2, 4) + spiral * 2.0);

  // Vignette: fade to black at edges
  color *= smoothstep(0.5, 0.2, radius);

  fragColor = vec4(color, 1.0);
}

// ═══ WRAPPER ════════════════════════════════════════════════════
// This bridges Shadertoy's mainImage() to GLSL's required main()
void main() {
  mainImage(gl_FragColor, gl_FragCoord.xy);
}
