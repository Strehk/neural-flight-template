import fragmentShader from "../../shaders/presets/neural_noise.frag?raw";
import type { PresetDef } from "../../types";

export const PRESET_NEURAL_NOISE: PresetDef = {
	id: "neural-noise",
	name: "Neural Noise",
	psychEffect: "Sense of Agency",
	description: "Multi-octave fractal noise with modulated parameters",
	scienceNote:
		"Fractals with dimension D≈1.3 correlate with reduced stress and increased aesthetic preference (Taylor et al., 2011).",
	fragmentShader,
	vertexShader: null,
	uniforms: [
		{
			name: "uOctaves",
			type: "float",
			value: 4.0,
			min: 2.0,
			max: 8.0,
			endpoint: true,
		},
		{
			name: "uNoiseSpeed",
			type: "float",
			value: 1.0,
			min: 0.1,
			max: 5.0,
			endpoint: true,
		},
		{
			name: "uDistortion",
			type: "float",
			value: 0.5,
			min: 0.0,
			max: 2.0,
			endpoint: true,
		},
		{
			name: "uBaseColor",
			type: "vec3",
			value: [0.1, 0.3, 0.8],
			endpoint: true,
			color: true,
		},
	],
	geometry: "sphere",
	tutorial: {
		explore: [
			"Increase uOctaves to add more fine detail (but costs more GPU).",
			"uDistortion creates domain warping — higher values = more organic shapes.",
			"Try uNoiseSpeed at 0.1 for slow, meditative evolution.",
		],
		challenge:
			"Add a 3rd FBM pass to warp the UV coords even further. What happens to the visual complexity?",
		psychTip:
			"Fractal dimension D≈1.3 is the 'stress-reducing sweet spot'. 4-5 octaves at moderate distortion approaches this.",
	},
	tags: ["noise", "fbm", "fractal", "generative"],
	difficulty: 2,
};
