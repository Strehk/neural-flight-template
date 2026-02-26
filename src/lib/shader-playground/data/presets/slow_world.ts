import fragmentShader from "../../shaders/presets/slow_world.frag?raw";
import type { PresetDef } from "../../types";

export const PRESET_SLOW_WORLD: PresetDef = {
	id: "slow-world",
	name: "Slow Motion",
	psychEffect: "Time Dilation",
	description: "Particle-like field with time scaling and trail effects",
	scienceNote:
		"Altered time perception in VR correlates with increased mindfulness and present-moment awareness.",
	fragmentShader,
	vertexShader: null,
	uniforms: [
		{
			name: "uTimeScale",
			type: "float",
			value: 1.0,
			min: 0.01,
			max: 2.0,
			endpoint: true,
		},
		{
			name: "uTrailLength",
			type: "float",
			value: 0.5,
			min: 0.0,
			max: 1.0,
			endpoint: true,
		},
		{
			name: "uDensity",
			type: "float",
			value: 8.0,
			min: 1.0,
			max: 20.0,
			endpoint: true,
		},
	],
	geometry: "plane",
	tutorial: {
		explore: [
			"Reduce uTimeScale below 0.1 for extreme slow-motion. Notice how detail perception increases.",
			"uTrailLength creates motion trails — longer trails emphasize the time-stretching effect.",
			"Try uDensity at 2-3 for a minimal, zen-like experience.",
		],
		challenge:
			"Connect an LFO to uTimeScale to create alternating fast/slow time perception.",
		psychTip:
			"Extremely slow motion (<0.1x) creates a meditative state. The brain shifts to detail-oriented processing.",
	},
	tags: ["time", "particles", "slow-motion", "meditation"],
	difficulty: 2,
};
