import type { PresetDef } from "../../types";
import fragmentShader from "../../shaders/presets/impossible_arch.frag?raw";

export const PRESET_IMPOSSIBLE_ARCH: PresetDef = {
	id: "impossible-arch",
	name: "Impossible Space",
	psychEffect: "Cognitive Dissonance",
	description: "Kaleidoscopic UV folding with impossible geometric patterns",
	scienceNote:
		"Non-Euclidean visual spaces create productive cognitive dissonance, increasing creativity scores (Ritter et al., 2012).",
	fragmentShader,
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
