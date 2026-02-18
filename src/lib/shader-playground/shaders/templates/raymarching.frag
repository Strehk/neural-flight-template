// ═══════════════════════════════════════════════════════════════
// RAYMARCHING — Signed Distance Field Rendering
// ═══════════════════════════════════════════════════════════════
//
// Raymarching is an alternative to triangle rendering.
// Instead of meshes, shapes are defined as math functions (SDFs).
//
// How it works:
//   1. Shoot a ray from the camera through each pixel
//   2. March along the ray in steps
//   3. At each step, ask "how far am I from any surface?" (SDF)
//   4. If distance < threshold → we hit something → shade it
//   5. If too far → background color
//
// SDF = Signed Distance Function:
//   positive = outside the shape
//   zero     = on the surface
//   negative = inside the shape

uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;

// ═══ @ENDPOINT PARAMETERS ═══════════════════════════════════════
// These uniforms can be modulated from the Node Editor!
// Connect an LFO to sphereRadius for pulsing, or Noise for organic motion.
uniform float sphereRadius; // @endpoint min:0.2 max:1.5 label:"Sphere Size"
uniform float fogDensity;   // @endpoint min:0.01 max:0.5 label:"Fog Density"

// ═══ SDF PRIMITIVES ═════════════════════════════════════════════
// Each function returns the distance from point p to the shape surface.

// Sphere: distance = length(point) - radius
float sdSphere(vec3 p, float r) {
  return length(p) - r;
}

// Floor plane: distance = y-coordinate + offset
float sdFloor(vec3 p) {
  return p.y + 1.0;
}

// ═══ SCENE COMPOSITION ══════════════════════════════════════════
// Combine multiple SDFs using min() (union = closest surface wins)
float scene(vec3 p) {
  // Use endpoint parameter (or default 0.8 if not connected)
  float r = sphereRadius > 0.0 ? sphereRadius : 0.8;
  float sphere = sdSphere(p - vec3(0.0, sin(uTime) * 0.3, 0.0), r);
  float floor = sdFloor(p);
  return min(sphere, floor); // Union: render whichever is closer
}

// ═══ NORMAL ESTIMATION ══════════════════════════════════════════
// Calculate surface normal by sampling the SDF at nearby points.
// The gradient of the distance field = surface normal direction.
vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.001, 0.0); // Small offset for finite differences
  return normalize(vec3(
    scene(p + e.xyy) - scene(p - e.xyy), // dSDF/dx
    scene(p + e.yxy) - scene(p - e.yxy), // dSDF/dy
    scene(p + e.yyx) - scene(p - e.yyx)  // dSDF/dz
  ));
}

// ═══ MAIN ═══════════════════════════════════════════════════════
void main() {
  // Map UV (0→1) to centered coordinates (-1→1)
  vec2 uv = vUv * 2.0 - 1.0;
  uv.x *= uResolution.x / uResolution.y; // Correct aspect ratio

  // Camera setup: position and ray direction
  vec3 ro = vec3(0.0, 1.0, 3.0);              // Ray origin (camera position)
  vec3 rd = normalize(vec3(uv, -1.5));         // Ray direction (through pixel)

  // ── RAYMARCHING LOOP ──
  // March along the ray, stepping by the SDF distance each time
  float t = 0.0; // Total distance traveled
  for (int i = 0; i < 80; i++) {
    vec3 p = ro + rd * t;       // Current position on the ray
    float d = scene(p);         // Distance to nearest surface
    if (d < 0.001) break;       // Close enough → hit!
    t += d;                     // Step forward by the safe distance
    if (t > 20.0) break;        // Too far → give up (background)
  }

  // ── SHADING ──
  vec3 color = vec3(0.05); // Background: near-black
  if (t < 20.0) {
    vec3 p = ro + rd * t;
    vec3 n = calcNormal(p);

    // Directional light from upper-right
    vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
    float diff = max(dot(n, lightDir), 0.0); // Diffuse lighting
    float amb = 0.15;                         // Ambient minimum
    color = vec3(0.4, 0.6, 0.9) * (diff + amb);

    // Distance fog: objects fade into background with distance
    float fd = fogDensity > 0.0 ? fogDensity : 0.1;
    float fog = 1.0 - exp(-t * fd);
    color = mix(color, vec3(0.05), fog);
  }

  gl_FragColor = vec4(color, 1.0);
}
