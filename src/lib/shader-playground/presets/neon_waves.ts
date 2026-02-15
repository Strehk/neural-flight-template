import type { PresetDef } from "../types";

export const PRESET_NEON_WAVES: PresetDef = {
	id: "neon-waves",
	name: "Neon Waves",
	psychEffect: "Flow + Agency",
	description: "Flowing colorful wave pattern driven by noise and time",
	scienceNote:
		"Smooth, predictable visual motion activates the default mode network, supporting a flow-like mental state.",
	fragmentShader: /* glsl */ `uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;

uniform float uWaveScale;   // @endpoint min:1.0 max:20.0 default:5.0
uniform float uSpeed;       // @endpoint min:0.1 max:3.0 default:1.0
uniform float uColorShift;  // @endpoint min:0.0 max:6.28 default:0.0

void main() {
  vec2 uv = vUv;

  // Layered sine waves
  float wave1 = sin(uv.x * uWaveScale + uTime * uSpeed) * 0.5;
  float wave2 = sin(uv.y * uWaveScale * 0.7 + uTime * uSpeed * 1.3 + 1.0) * 0.3;
  float wave3 = sin((uv.x + uv.y) * uWaveScale * 0.5 + uTime * uSpeed * 0.8 + 2.0) * 0.2;

  float combined = wave1 + wave2 + wave3;

  // Color from wave value
  vec3 color;
  color.r = 0.5 + 0.5 * sin(combined * 3.0 + uColorShift);
  color.g = 0.5 + 0.5 * sin(combined * 3.0 + uColorShift + 2.094);
  color.b = 0.5 + 0.5 * sin(combined * 3.0 + uColorShift + 4.189);

  // Boost saturation
  color = pow(color, vec3(0.8));

  gl_FragColor = vec4(color, 1.0);
}
`,
	vertexShader: null,
	uniforms: [
		{ name: "uWaveScale", type: "float", value: 5.0, min: 1.0, max: 20.0, endpoint: true },
		{ name: "uSpeed", type: "float", value: 1.0, min: 0.1, max: 3.0, endpoint: true },
		{ name: "uColorShift", type: "float", value: 0.0, min: 0.0, max: 6.28, endpoint: true },
	],
	geometry: "plane",
	tutorial: {
		explore: [
			"Adjust uWaveScale to change wave density — higher = more detailed.",
			"uColorShift rotates the color palette through the rainbow.",
			"Try very low uSpeed (0.1) for a meditative effect.",
		],
		challenge:
			"Add a 4th wave layer using sin() with different frequency and phase. How does complexity change?",
		psychTip:
			"Smooth, layered sine waves create a sense of flow. 3-5 layers is the sweet spot between simplicity and richness.",
	},
	tags: ["waves", "color", "flow", "beginner"],
	difficulty: 1,
};
