import type { PresetDef } from "../types";

export const PRESET_IMPOSSIBLE_ARCH: PresetDef = {
	id: "impossible-arch",
	name: "Impossible Space",
	psychEffect: "Cognitive Dissonance",
	description: "Kaleidoscopic UV folding with impossible geometric patterns",
	scienceNote:
		"Non-Euclidean visual spaces create productive cognitive dissonance, increasing creativity scores (Ritter et al., 2012).",
	fragmentShader: /* glsl */ `uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;

uniform float uFolds;       // @endpoint min:1.0 max:12.0 default:4.0
uniform float uWarpAmount;  // @endpoint min:0.0 max:2.0 default:0.5
uniform float uPerspective; // @endpoint min:0.0 max:1.0 default:0.5
uniform float uRotateSpeed; // @endpoint min:0.0 max:3.0 default:0.5

mat2 rot(float a) {
  float s = sin(a);
  float c = cos(a);
  return mat2(c, -s, s, c);
}

void main() {
  vec2 uv = vUv - 0.5;
  uv.x *= uResolution.x / uResolution.y;

  // Rotation
  uv *= rot(uTime * uRotateSpeed * 0.3);

  // Polar coords
  float angle = atan(uv.y, uv.x);
  float radius = length(uv);

  // Kaleidoscope folding
  float segments = max(1.0, floor(uFolds));
  float segAngle = 6.28318 / segments;
  angle = mod(angle, segAngle);
  angle = abs(angle - segAngle * 0.5);

  // Back to cartesian
  uv = vec2(cos(angle), sin(angle)) * radius;

  // Warp space
  uv += sin(uv * 5.0 + uTime * 0.5) * uWarpAmount * 0.1;

  // Perspective fake (converging lines)
  float perspective = mix(1.0, 1.0 / (radius * 3.0 + 0.3), uPerspective);
  uv *= perspective;

  // Grid pattern
  vec2 grid = fract(uv * 8.0) - 0.5;
  float lines = min(abs(grid.x), abs(grid.y));
  float gridPattern = smoothstep(0.02, 0.04, lines);

  // Concentric rings
  float rings = abs(sin(radius * 20.0 - uTime * 2.0));
  rings = smoothstep(0.3, 0.35, rings);

  // Color
  float hue = angle / segAngle + radius * 2.0 + uTime * 0.1;
  vec3 color1 = 0.5 + 0.5 * cos(hue * 6.28 + vec3(0.0, 2.0, 4.0));
  vec3 color2 = 0.5 + 0.5 * cos((hue + 0.5) * 6.28 + vec3(1.0, 3.0, 5.0));

  vec3 color = mix(color1 * 0.8, color2, gridPattern);
  color *= mix(0.7, 1.0, rings);

  // Center glow
  float glow = 0.02 / (radius + 0.02);
  color += vec3(0.8, 0.6, 1.0) * glow * 0.3;

  // Vignette
  color *= 1.0 - radius * 0.5;

  gl_FragColor = vec4(color, 1.0);
}
`,
	vertexShader: null,
	uniforms: [
		{ name: "uFolds", type: "float", value: 4.0, min: 1.0, max: 12.0, endpoint: true },
		{ name: "uWarpAmount", type: "float", value: 0.5, min: 0.0, max: 2.0, endpoint: true },
		{ name: "uPerspective", type: "float", value: 0.5, min: 0.0, max: 1.0, endpoint: true },
		{ name: "uRotateSpeed", type: "float", value: 0.5, min: 0.0, max: 3.0, endpoint: true },
	],
	geometry: "plane",
	tutorial: {
		explore: [
			"uFolds=5 creates Penrose-like 5-fold symmetry. uFolds=6 creates snowflake patterns.",
			"Increase uWarpAmount for non-Euclidean warping of the grid lines.",
			"uPerspective at 1.0 creates a tunnel-like depth illusion.",
		],
		challenge:
			"Animate uFolds slowly between 3 and 7 to create a morphing symmetry effect.",
		psychTip:
			"5-fold and 7-fold symmetries are rare in nature, creating a sense of 'impossible' geometry.",
	},
	tags: ["kaleidoscope", "geometry", "impossible", "symmetry"],
	difficulty: 3,
};
