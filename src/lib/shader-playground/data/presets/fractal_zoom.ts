import fragmentShader from "../../shaders/presets/fractal_zoom.frag?raw";
import type { PresetDef } from "../../types";

export const PRESET_FRACTAL_ZOOM: PresetDef = {
	id: "fractal-zoom",
	name: "Fractal Zoom",
	psychEffect: "Fractal Fluency",
	description: "Julia set fractal with animated color cycling and zoom",
	scienceNote:
		"Viewing fractal patterns reduces physiological stress markers by up to 60% (Taylor et al., 2011).",
	fragmentShader,
	vertexShader: null,
	uniforms: [
		{
			name: "uZoom",
			type: "float",
			value: 1.0,
			min: 0.5,
			max: 50.0,
			endpoint: true,
		},
		{
			name: "uCx",
			type: "float",
			value: -0.7,
			min: -2.0,
			max: 2.0,
			endpoint: true,
		},
		{
			name: "uCy",
			type: "float",
			value: 0.27015,
			min: -2.0,
			max: 2.0,
			endpoint: true,
		},
		{
			name: "uMaxIter",
			type: "float",
			value: 100.0,
			min: 10.0,
			max: 200.0,
			endpoint: true,
		},
		{
			name: "uColorSpeed",
			type: "float",
			value: 1.0,
			min: 0.0,
			max: 5.0,
			endpoint: true,
		},
	],
	geometry: "plane",
	tutorial: {
		explore: [
			"The c-parameter (uCx, uCy) defines the Julia set shape. Try (-0.8, 0.156) or (0.285, 0.01).",
			"Increase uZoom to zoom into fractal detail. Increase uMaxIter for sharp edges at high zoom.",
			"uColorSpeed animates the color palette over time.",
		],
		challenge:
			"Find a c-value that creates a connected Julia set (the set is connected iff c is in the Mandelbrot set).",
		psychTip:
			"Self-similar fractal patterns trigger 'fractal fluency' — the brain processes them efficiently, creating a relaxed alert state.",
	},
	tags: ["fractal", "julia", "math", "psychedelic"],
	difficulty: 2,
};
