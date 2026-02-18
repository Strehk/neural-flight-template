import type { PresetDef } from "../../types";
import fragmentShader from "../../shaders/presets/swarm_field.frag?raw";

export const PRESET_SWARM_FIELD: PresetDef = {
	id: "swarm-field",
	name: "Swarm Field",
	psychEffect: "Ego Dissolution via Collective",
	description: "Curl noise velocity field with particle-like visualization",
	scienceNote:
		"Observing emergent swarm behavior activates mirror neuron systems and reduces ego-centric processing.",
	fragmentShader,
	vertexShader: null,
	uniforms: [
		{ name: "uSwarmSpeed", type: "float", value: 1.0, min: 0.0, max: 5.0, endpoint: true },
		{ name: "uCoherence", type: "float", value: 0.5, min: 0.0, max: 1.0, endpoint: true },
		{ name: "uParticleSize", type: "float", value: 0.02, min: 0.001, max: 0.1, endpoint: true },
		{ name: "uFieldColor", type: "vec3", value: [0.53, 0.0, 1.0], endpoint: true, color: true },
	],
	geometry: "plane",
	tutorial: {
		explore: [
			"High uCoherence (>0.8) = aligned swarm. Low (<0.2) = chaotic dissolution.",
			"The boundary between order and chaos (~0.5) is the most visually interesting.",
			"uSwarmSpeed at 0.1 creates a serene, slow drift. At 5.0 it's frenetic.",
		],
		challenge:
			"Animate uCoherence from 1.0 to 0.0 slowly — watch the swarm dissolve from order to chaos.",
		psychTip:
			"Swarm behavior at the edge of chaos mirrors the 'ego dissolution' experience — individual identity merging into collective flow.",
	},
	tags: ["swarm", "velocity-field", "particles", "ego-dissolution"],
	difficulty: 3,
};
