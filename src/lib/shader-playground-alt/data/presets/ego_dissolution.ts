import fragmentShader from "../../shaders/presets/ego_dissolution.frag?raw";
import type { PresetDef } from "../../types";

export const PRESET_EGO_DISSOLUTION: PresetDef = {
	id: "ego-dissolution",
	name: "Ego Dissolve",
	psychEffect: "Ego Dissolution",
	description: "Noise-based dissolve with glowing edges — form melts into void",
	scienceNote:
		"Dissolving body boundaries in VR correlates with oceanic boundlessness on the 5D-ASC scale.",
	fragmentShader,
	vertexShader: null,
	uniforms: [
		{
			name: "uDissolve",
			type: "float",
			value: 0.0,
			min: 0.0,
			max: 1.0,
			endpoint: true,
		},
		{
			name: "uMorphSpeed",
			type: "float",
			value: 1.0,
			min: 0.0,
			max: 3.0,
			endpoint: true,
		},
		{
			name: "uEdgeGlow",
			type: "float",
			value: 0.5,
			min: 0.0,
			max: 2.0,
			endpoint: true,
		},
		{
			name: "uEdgeColor",
			type: "vec3",
			value: [1.0, 0.4, 0.0],
			endpoint: true,
			color: true,
		},
	],
	geometry: "sphere",
	tutorial: {
		explore: [
			"Slowly increase uDissolve from 0 to 1 and watch the form melt away.",
			"uEdgeGlow controls the intensity of the glowing dissolve edge.",
			"Try connecting an LFO to uDissolve for a breathing dissolve cycle.",
		],
		challenge:
			"Modify the shader to dissolve from the edges inward instead of using noise (hint: use distance from center).",
		psychTip:
			"The dissolve effect is most impactful when slow (2-5 seconds). Rapid dissolve can cause discomfort.",
	},
	tags: ["dissolve", "ego", "psychedelic", "noise"],
	difficulty: 2,
};
