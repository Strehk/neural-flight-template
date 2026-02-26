import fragmentShader from "../../shaders/presets/breathe.frag?raw";
import type { PresetDef } from "../../types";

export const PRESET_BREATHE: PresetDef = {
	id: "breathe",
	name: "Breath Pulse",
	psychEffect: "Biofeedback Sync",
	description: "Pulsing radial glow synchronized to breathing rate",
	scienceNote:
		"Rhythmic visual stimuli at 0.1-0.3 Hz can entrain breathing patterns, activating the parasympathetic nervous system.",
	fragmentShader,
	vertexShader: null,
	uniforms: [
		{
			name: "uBreathRate",
			type: "float",
			value: 0.3,
			min: 0.1,
			max: 2.0,
			endpoint: true,
		},
		{
			name: "uPulseDepth",
			type: "float",
			value: 0.5,
			min: 0,
			max: 1,
			endpoint: true,
		},
		{
			name: "uBaseColor",
			type: "vec3",
			value: [0.2, 0.53, 1.0],
			endpoint: true,
			color: true,
		},
	],
	geometry: "sphere",
	tutorial: {
		explore: [
			"Change uBreathRate to match your own breathing rhythm (try 0.2-0.4 Hz).",
			"Increase uPulseDepth to make the pulse more dramatic.",
			"Try different colors — warm colors feel energizing, cool colors calming.",
		],
		challenge:
			"Connect an LFO to uBreathRate and slowly increase it. At what speed does it feel uncomfortable?",
		psychTip:
			"Visual-respiratory entrainment works best at the natural breathing frequency (~0.25 Hz / 15 breaths per minute).",
	},
	tags: ["biofeedback", "breathing", "relaxation", "beginner"],
	difficulty: 1,
};
