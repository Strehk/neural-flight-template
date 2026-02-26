import fragmentShader from "../../shaders/presets/neon_waves.frag?raw";
import type { PresetDef } from "../../types";

export const PRESET_NEON_WAVES: PresetDef = {
	id: "neon-waves",
	name: "Neon Waves",
	psychEffect: "Flow + Agency",
	description: "Flowing colorful wave pattern driven by noise and time",
	scienceNote:
		"Smooth, predictable visual motion activates the default mode network, supporting a flow-like mental state.",
	fragmentShader,
	vertexShader: null,
	uniforms: [
		{
			name: "uWaveScale",
			type: "float",
			value: 5.0,
			min: 1.0,
			max: 20.0,
			endpoint: true,
		},
		{
			name: "uSpeed",
			type: "float",
			value: 1.0,
			min: 0.1,
			max: 3.0,
			endpoint: true,
		},
		{
			name: "uColorShift",
			type: "float",
			value: 0.0,
			min: 0.0,
			max: 6.28,
			endpoint: true,
		},
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
