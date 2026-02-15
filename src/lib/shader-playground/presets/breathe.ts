import type { PresetDef } from "../types";

export const PRESET_BREATHE: PresetDef = {
	id: "breathe",
	name: "Breath Pulse",
	psychEffect: "Biofeedback Sync",
	description: "Pulsing radial glow synchronized to breathing rate",
	scienceNote:
		"Rhythmic visual stimuli at 0.1-0.3 Hz can entrain breathing patterns, activating the parasympathetic nervous system.",
	fragmentShader: /* glsl */ `uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;

uniform float uBreathRate;  // @endpoint min:0.1 max:2.0 default:0.3
uniform float uPulseDepth;  // @endpoint min:0.0 max:1.0 default:0.5
uniform vec3 uBaseColor;    // @endpoint color default:#3388ff

void main() {
  vec2 centered = vUv - 0.5;
  float dist = length(centered);

  // Breathing cycle
  float breath = sin(uTime * uBreathRate * 6.28318) * 0.5 + 0.5;
  float pulse = 1.0 - uPulseDepth + uPulseDepth * breath;

  // Radial glow
  float glow = smoothstep(0.5 * pulse, 0.0, dist);
  float rim = smoothstep(0.35, 0.45 * pulse, dist) * (1.0 - smoothstep(0.45 * pulse, 0.5 * pulse, dist));

  vec3 color = uBaseColor * glow * pulse;
  color += vec3(1.0, 0.8, 0.9) * rim * 0.5;

  // Soft background
  color += vec3(0.02, 0.02, 0.05) * (1.0 - glow);

  gl_FragColor = vec4(color, 1.0);
}
`,
	vertexShader: null,
	uniforms: [
		{ name: "uBreathRate", type: "float", value: 0.3, min: 0.1, max: 2.0, endpoint: true },
		{ name: "uPulseDepth", type: "float", value: 0.5, min: 0, max: 1, endpoint: true },
		{ name: "uBaseColor", type: "vec3", value: [0.2, 0.53, 1.0], endpoint: true, color: true },
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
