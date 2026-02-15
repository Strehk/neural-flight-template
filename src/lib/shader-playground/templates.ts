/**
 * Shader Templates — Starter templates for different shader styles.
 */

import type { ShaderTemplate } from "./types";

export const TEMPLATES: ShaderTemplate[] = [
	{
		id: "empty",
		name: "Empty",
		description: "Minimal fragment shader — just a color output",
		fragmentShader: /* glsl */ `uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;

void main() {
  gl_FragColor = vec4(vUv, 0.5 + 0.5 * sin(uTime), 1.0);
}
`,
		vertexShader: null,
	},
	{
		id: "uv-gradient",
		name: "UV Gradient",
		description: "Colorful UV visualization with animated hue rotation",
		fragmentShader: /* glsl */ `uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  float hue = vUv.x + uTime * 0.1;
  float sat = 0.8;
  float val = 0.5 + 0.3 * sin(vUv.y * 6.28 + uTime);
  vec3 color = hsv2rgb(vec3(hue, sat, val));
  gl_FragColor = vec4(color, 1.0);
}
`,
		vertexShader: null,
	},
	{
		id: "shadertoy",
		name: "Shadertoy Compatible",
		description: "Template using Shadertoy conventions (iTime, iResolution, mainImage)",
		fragmentShader: /* glsl */ `// Shadertoy-compatible template
// Paste Shadertoy code here — mainImage will be wrapped automatically

uniform float iTime;
uniform vec2 iResolution;
uniform vec2 iMouse;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;

  // Animated spiral
  vec2 p = uv - 0.5;
  float angle = atan(p.y, p.x);
  float radius = length(p);

  float spiral = sin(angle * 5.0 - radius * 20.0 + iTime * 2.0);
  vec3 color = 0.5 + 0.5 * cos(iTime + vec3(0, 2, 4) + spiral * 2.0);
  color *= smoothstep(0.5, 0.2, radius);

  fragColor = vec4(color, 1.0);
}

void main() {
  mainImage(gl_FragColor, gl_FragCoord.xy);
}
`,
		vertexShader: null,
	},
	{
		id: "vertex-fragment",
		name: "Vertex + Fragment",
		description: "Custom vertex shader with sine displacement",
		fragmentShader: /* glsl */ `uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;
varying float vDisplacement;

void main() {
  vec3 cool = vec3(0.1, 0.3, 0.8);
  vec3 warm = vec3(0.9, 0.4, 0.1);
  vec3 color = mix(cool, warm, vDisplacement * 0.5 + 0.5);

  // Rim-like glow based on UV
  float rim = 1.0 - smoothstep(0.0, 0.5, abs(vUv.y - 0.5));
  color += vec3(0.2, 0.1, 0.4) * rim;

  gl_FragColor = vec4(color, 1.0);
}
`,
		vertexShader: /* glsl */ `uniform float uTime;
varying vec2 vUv;
varying float vDisplacement;

void main() {
  vUv = uv;

  // Sine wave displacement along normals
  float displacement = sin(position.x * 4.0 + uTime * 2.0)
                      * sin(position.y * 4.0 + uTime * 1.5)
                      * 0.15;
  vDisplacement = displacement;

  vec3 newPosition = position + normal * displacement;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
`,
	},
	{
		id: "raymarching",
		name: "Raymarching",
		description: "Basic SDF raymarching setup with a sphere and floor",
		fragmentShader: /* glsl */ `uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;

// SDF: Sphere
float sdSphere(vec3 p, float r) {
  return length(p) - r;
}

// SDF: Floor plane
float sdFloor(vec3 p) {
  return p.y + 1.0;
}

// Scene: combine shapes
float scene(vec3 p) {
  float sphere = sdSphere(p - vec3(0.0, sin(uTime) * 0.3, 0.0), 0.8);
  float floor = sdFloor(p);
  return min(sphere, floor);
}

// Normal estimation
vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.001, 0.0);
  return normalize(vec3(
    scene(p + e.xyy) - scene(p - e.xyy),
    scene(p + e.yxy) - scene(p - e.yxy),
    scene(p + e.yyx) - scene(p - e.yyx)
  ));
}

void main() {
  vec2 uv = vUv * 2.0 - 1.0;
  uv.x *= uResolution.x / uResolution.y;

  // Camera
  vec3 ro = vec3(0.0, 1.0, 3.0);
  vec3 rd = normalize(vec3(uv, -1.5));

  // Raymarching
  float t = 0.0;
  for (int i = 0; i < 80; i++) {
    vec3 p = ro + rd * t;
    float d = scene(p);
    if (d < 0.001) break;
    t += d;
    if (t > 20.0) break;
  }

  // Shading
  vec3 color = vec3(0.05);
  if (t < 20.0) {
    vec3 p = ro + rd * t;
    vec3 n = calcNormal(p);
    vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
    float diff = max(dot(n, lightDir), 0.0);
    float amb = 0.15;
    color = vec3(0.4, 0.6, 0.9) * (diff + amb);

    // Simple fog
    float fog = 1.0 - exp(-t * 0.1);
    color = mix(color, vec3(0.05), fog);
  }

  gl_FragColor = vec4(color, 1.0);
}
`,
		vertexShader: null,
	},
];

export function getTemplateById(
	id: string,
): ShaderTemplate | undefined {
	return TEMPLATES.find((t) => t.id === id);
}
