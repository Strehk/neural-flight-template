import type { PresetDef } from "../../types";
import fragmentShader from "../../shaders/presets/cellular_drift.frag?raw";

export const PRESET_CELLULAR_DRIFT: PresetDef = {
	id: "cellular-drift",
	name: "Cellular World",
	psychEffect: "Awe + Small Self",
	description: "Voronoi cells with bioluminescent glow at variable scales",
	scienceNote:
		"The 'overview effect' — seeing oneself as tiny within vastness — reduces self-focus and increases prosocial behavior.",
	fragmentShader,
	vertexShader: null,
	uniforms: [
		{ name: "uScale", type: "float", value: 10.0, min: 0.1, max: 100.0, endpoint: true },
		{ name: "uGlowIntensity", type: "float", value: 1.5, min: 0.0, max: 3.0, endpoint: true },
		{ name: "uDriftSpeed", type: "float", value: 0.5, min: 0.0, max: 2.0, endpoint: true },
		{ name: "uBioColor", type: "vec3", value: [0.0, 1.0, 0.53], endpoint: true, color: true },
	],
	geometry: "sphere",
	tutorial: {
		explore: [
			"Zoom between micro (uScale<1) and macro (uScale>50) to feel the scale shift.",
			"uDriftSpeed controls cell movement — slow drift feels organic, fast feels chaotic.",
			"Try warm uBioColor (#ff6600) for a lava-like effect, cool (#0088ff) for deep sea.",
		],
		challenge:
			"Layer two voronoi calls at different scales (uScale and uScale*10) and blend them.",
		psychTip:
			"Scale-shift from micro to macro triggers the 'overview effect' — a sense of awe and smallness.",
	},
	tags: ["voronoi", "cellular", "bioluminescence", "awe"],
	difficulty: 3,
};
