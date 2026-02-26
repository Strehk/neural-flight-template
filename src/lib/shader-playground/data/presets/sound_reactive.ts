import fragmentShader from "../../shaders/presets/sound_reactive.frag?raw";
import type { PresetDef } from "../../types";

export const PRESET_SOUND_REACTIVE: PresetDef = {
	id: "sound-reactive",
	name: "Sound Reactive",
	psychEffect: "Artificial Synesthesia",
	description: "Simulated frequency bands drive surface deformation and color",
	scienceNote:
		"Cross-modal stimulation (sound→visual) can create temporary synesthetic experiences in non-synesthetes.",
	fragmentShader,
	vertexShader: null,
	uniforms: [
		{
			name: "uBass",
			type: "float",
			value: 0.5,
			min: 0.0,
			max: 1.0,
			endpoint: true,
		},
		{
			name: "uMid",
			type: "float",
			value: 0.3,
			min: 0.0,
			max: 1.0,
			endpoint: true,
		},
		{
			name: "uTreble",
			type: "float",
			value: 0.7,
			min: 0.0,
			max: 1.0,
			endpoint: true,
		},
		{
			name: "uReactivity",
			type: "float",
			value: 1.0,
			min: 0.0,
			max: 2.0,
			endpoint: true,
		},
	],
	geometry: "sphere",
	tutorial: {
		explore: [
			"Connect LFOs to uBass, uMid, uTreble to simulate music input.",
			"uBass drives the radial pulse, uMid the angular waves, uTreble the shimmer.",
			"Try different LFO speeds for each band to simulate a rhythm.",
		],
		challenge:
			"Create a 'beat drop' by connecting an Envelope to uBass with fast attack and slow release.",
		psychTip:
			"Sound-visual mapping is most compelling when bass→large/slow, treble→small/fast. This matches physical intuition.",
	},
	tags: ["audio", "synesthesia", "reactive", "frequency"],
	difficulty: 2,
};
