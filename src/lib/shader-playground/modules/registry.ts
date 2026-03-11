/**
 * Module Registry — Static definitions of all available rack modules (TSL).
 *
 * Each module defines stage, typed ports, default params, and a tslNode function.
 * tslNode receives uniform refs (live UniformNode<number>) and input signal nodes,
 * returns output signal nodes for the codegen chain.
 *
 * paramRanges mirrors UI slider min/max — used by codegen for normalized modulation.
 */

import { float, time, vec2, vec3, vec4 } from "three/tsl";
import { cosinePalette, triNoise3D } from "../tsl/helpers";
import type { ModuleDefinition, RackModuleType } from "./types";

// ── Control Modules ──

const SLIDER_MODULE: ModuleDefinition = {
	type: "slider",
	stage: "control",
	label: "Slider",
	ports: [{ name: "scalar_out", type: "scalar", direction: "out" }],
	defaultParams: { value: 0.5, min: 0.0, max: 1.0 },
	paramRanges: { value: { min: 0, max: 1 } },
	tslNode: ({ params }) => ({
		outputs: { scalar_out: params.value },
	}),
};

const XY_MODULE: ModuleDefinition = {
	type: "xy",
	stage: "control",
	label: "XY Pad",
	ports: [{ name: "uv_out", type: "uv", direction: "out" }],
	defaultParams: { x: 0.5, y: 0.5 },
	paramRanges: { x: { min: 0, max: 1 }, y: { min: 0, max: 1 } },
	tslNode: ({ params }) => ({
		outputs: { uv_out: vec2(params.x, params.y) },
	}),
};

const LFO_MODULE: ModuleDefinition = {
	type: "lfo",
	stage: "control",
	label: "LFO",
	ports: [{ name: "scalar_out", type: "scalar", direction: "out" }],
	defaultParams: { rate: 1.0, shape: 0.0 },
	paramRanges: { rate: { min: 0.1, max: 10 }, shape: { min: 0, max: 3 } },
	tslNode: ({ params }) => {
		const phase = time.mul(params.rate).fract();
		const sine = time
			.mul(params.rate)
			.mul(Math.PI * 2)
			.sin()
			.mul(0.5)
			.add(0.5);
		const tri = phase.mul(2).sub(1).abs().oneMinus();
		const sq = phase.step(0.5);
		const rnd = time
			.mul(params.rate)
			.floor()
			.mul(12.9898)
			.sin()
			.mul(43758.5453)
			.fract();
		const s = params.shape;
		let v = sine.mix(tri, s.clamp(0, 1));
		v = v.mix(sq, s.sub(1).clamp(0, 1));
		v = v.mix(rnd, s.sub(2).clamp(0, 1));
		return { outputs: { scalar_out: v } };
	},
};

const NOISE_CONTROL_MODULE: ModuleDefinition = {
	type: "noise",
	stage: "control",
	label: "Noise",
	ports: [
		{ name: "color_in", type: "color", direction: "in" },
		{ name: "color_out", type: "color", direction: "out" },
	],
	defaultParams: { frequency: 4.0, amplitude: 0.3, speed: 1.0 },
	paramRanges: {
		frequency: { min: 0.1, max: 20 },
		amplitude: { min: 0, max: 1 },
		speed: { min: 0, max: 5 },
	},
	tslNode: ({ params, inputs }) => {
		const colorIn = inputs.color_in;
		const noisePos = vec3(
			colorIn.xy.mul(params.frequency),
			time.mul(params.speed),
		);
		const n = triNoise3D(noisePos, float(1), float(0));
		const colorOut = colorIn.add(vec4(vec3(n.mul(params.amplitude)), 0));
		return { outputs: { color_out: colorOut } };
	},
};

// ── Vertex Modules ──

const V_PASSTHROUGH: ModuleDefinition = {
	type: "v_passthrough",
	stage: "vertex",
	label: "Passthrough",
	ports: [],
	defaultParams: {},
	tslNode: ({ inputs }) => ({
		outputs: { position: inputs.position },
	}),
};

const V_SINE_DISPLACE: ModuleDefinition = {
	type: "v_sine_displace",
	stage: "vertex",
	label: "Sine Displace",
	ports: [],
	defaultParams: { amplitude: 0.1, frequency: 3.0 },
	paramRanges: {
		amplitude: { min: 0, max: 1 },
		frequency: { min: 0.1, max: 20 },
	},
	tslNode: ({ params, inputs }) => {
		const pos = inputs.position;
		const norm = inputs.normal;
		const displacement = pos.x
			.mul(params.frequency)
			.add(time)
			.sin()
			.mul(params.amplitude);
		return { outputs: { position: pos.add(norm.mul(displacement)) } };
	},
};

const V_WAVE: ModuleDefinition = {
	type: "v_wave",
	stage: "vertex",
	label: "Wave",
	ports: [],
	defaultParams: { height: 0.2, freq_x: 4.0, freq_y: 3.0 },
	paramRanges: {
		height: { min: 0, max: 1 },
		freq_x: { min: 0.1, max: 20 },
		freq_y: { min: 0.1, max: 20 },
	},
	tslNode: ({ params, inputs }) => {
		const pos = inputs.position;
		const uvNode = inputs.uv;
		const wave = uvNode.x
			.mul(params.freq_x)
			.add(time)
			.sin()
			.mul(uvNode.y.mul(params.freq_y).cos())
			.mul(params.height);
		return { outputs: { position: vec3(pos.x, pos.y, pos.z.add(wave)) } };
	},
};

const V_TWIST: ModuleDefinition = {
	type: "v_twist",
	stage: "vertex",
	label: "Twist",
	ports: [],
	defaultParams: { amount: 2.0 },
	paramRanges: { amount: { min: 0, max: 10 } },
	tslNode: ({ params, inputs }) => {
		const pos = inputs.position;
		const angle = pos.y.mul(params.amount);
		const c = angle.cos();
		const s = angle.sin();
		const newX = pos.x.mul(c).sub(pos.z.mul(s));
		const newZ = pos.x.mul(s).add(pos.z.mul(c));
		return { outputs: { position: vec3(newX, pos.y, newZ) } };
	},
};

const V_NOISE_DISPLACE: ModuleDefinition = {
	type: "v_noise_displace",
	stage: "vertex",
	label: "Noise Displace",
	ports: [],
	defaultParams: { scale: 2.0, strength: 0.3 },
	paramRanges: {
		scale: { min: 0.1, max: 10 },
		strength: { min: 0, max: 1 },
	},
	tslNode: ({ params, inputs }) => {
		const pos = inputs.position;
		const norm = inputs.normal;
		const n = triNoise3D(pos.mul(params.scale), float(1), time);
		return { outputs: { position: pos.add(norm.mul(n.mul(params.strength))) } };
	},
};

const V_EXPLODE: ModuleDefinition = {
	type: "v_explode",
	stage: "vertex",
	label: "Explode",
	ports: [],
	defaultParams: { amount: 0.0 },
	paramRanges: { amount: { min: 0, max: 2 } },
	tslNode: ({ params, inputs }) => ({
		outputs: {
			position: inputs.position.add(inputs.normal.mul(params.amount)),
		},
	}),
};

const V_WOBBLE: ModuleDefinition = {
	type: "v_wobble",
	stage: "vertex",
	label: "Wobble",
	ports: [],
	defaultParams: { speed: 2.0, amount: 0.1 },
	paramRanges: {
		speed: { min: 0.1, max: 10 },
		amount: { min: 0, max: 0.5 },
	},
	tslNode: ({ params, inputs }) => {
		const pos = inputs.position;
		const norm = inputs.normal;
		const wobble = time
			.mul(params.speed)
			.add(pos.dot(pos))
			.sin()
			.mul(params.amount);
		return { outputs: { position: pos.add(norm.mul(wobble)) } };
	},
};

const V_FLATTEN: ModuleDefinition = {
	type: "v_flatten",
	stage: "vertex",
	label: "Flatten",
	ports: [],
	defaultParams: { amount: 0.0 },
	paramRanges: { amount: { min: 0, max: 1 } },
	tslNode: ({ params, inputs }) => {
		const pos = inputs.position;
		return {
			outputs: {
				position: vec3(pos.x, pos.y.mul(float(1).sub(params.amount)), pos.z),
			},
		};
	},
};

const V_SPHERIZE: ModuleDefinition = {
	type: "v_spherize",
	stage: "vertex",
	label: "Spherize",
	ports: [],
	defaultParams: { amount: 0.0 },
	paramRanges: { amount: { min: 0, max: 1 } },
	tslNode: ({ params, inputs }) => {
		const pos = inputs.position;
		const spherePos = pos.normalize().mul(pos.length());
		return { outputs: { position: pos.mix(spherePos, params.amount) } };
	},
};

const V_TAPER: ModuleDefinition = {
	type: "v_taper",
	stage: "vertex",
	label: "Taper",
	ports: [],
	defaultParams: { amount: 0.5 },
	paramRanges: { amount: { min: -1, max: 2 } },
	tslNode: ({ params, inputs }) => {
		const pos = inputs.position;
		const scale = float(1).add(pos.y.mul(params.amount));
		return {
			outputs: { position: vec3(pos.x.mul(scale), pos.y, pos.z.mul(scale)) },
		};
	},
};

// ── Fragment Modules ──

const F_SOLID_COLOR: ModuleDefinition = {
	type: "f_solid_color",
	stage: "fragment",
	label: "Solid Color",
	ports: [{ name: "color_out", type: "color", direction: "out" }],
	defaultParams: { r: 0.5, g: 0.3, b: 0.8 },
	paramRanges: {
		r: { min: 0, max: 1 },
		g: { min: 0, max: 1 },
		b: { min: 0, max: 1 },
	},
	tslNode: ({ params }) => ({
		outputs: { color_out: vec4(params.r, params.g, params.b, 1.0) },
	}),
};

const F_UV_GRADIENT: ModuleDefinition = {
	type: "f_uv_gradient",
	stage: "fragment",
	label: "UV Gradient",
	ports: [
		{ name: "uv_in", type: "uv", direction: "in" },
		{ name: "color_out", type: "color", direction: "out" },
	],
	defaultParams: { intensity: 1.0 },
	paramRanges: { intensity: { min: 0, max: 3 } },
	tslNode: ({ params, inputs }) => ({
		outputs: {
			color_out: vec4(inputs.uv_in.mul(params.intensity), 0.5, 1.0),
		},
	}),
};

const F_COSINE_PALETTE: ModuleDefinition = {
	type: "f_cosine_palette",
	stage: "fragment",
	label: "Cosine Palette",
	ports: [
		{ name: "scalar_in", type: "scalar", direction: "in" },
		{ name: "color_out", type: "color", direction: "out" },
	],
	defaultParams: {
		a_r: 0.5,
		a_g: 0.5,
		a_b: 0.5,
		b_r: 0.5,
		b_g: 0.5,
		b_b: 0.5,
		c_r: 1.0,
		c_g: 1.0,
		c_b: 1.0,
		d_r: 0.0,
		d_g: 0.33,
		d_b: 0.67,
	},
	paramRanges: {
		a_r: { min: 0, max: 1 },
		a_g: { min: 0, max: 1 },
		a_b: { min: 0, max: 1 },
		b_r: { min: 0, max: 1 },
		b_g: { min: 0, max: 1 },
		b_b: { min: 0, max: 1 },
		c_r: { min: 0, max: 3 },
		c_g: { min: 0, max: 3 },
		c_b: { min: 0, max: 3 },
		d_r: { min: 0, max: 1 },
		d_g: { min: 0, max: 1 },
		d_b: { min: 0, max: 1 },
	},
	tslNode: ({ params, inputs }) => {
		const a = vec3(params.a_r, params.a_g, params.a_b);
		const b = vec3(params.b_r, params.b_g, params.b_b);
		const c = vec3(params.c_r, params.c_g, params.c_b);
		const d = vec3(params.d_r, params.d_g, params.d_b);
		const rgb = cosinePalette(inputs.scalar_in, a, b, c, d);
		return { outputs: { color_out: vec4(rgb, 1.0) } };
	},
};

const F_PATTERN: ModuleDefinition = {
	type: "f_pattern",
	stage: "fragment",
	label: "Pattern",
	ports: [
		{ name: "uv_in", type: "uv", direction: "in" },
		{ name: "color_out", type: "color", direction: "out" },
		{ name: "scalar_out", type: "scalar", direction: "out" },
	],
	defaultParams: { frequency: 8.0, mode: 0.0 },
	paramRanges: { frequency: { min: 1, max: 32 }, mode: { min: 0, max: 1 } },
	tslNode: ({ params, inputs }) => {
		const fp = inputs.uv_in.mul(params.frequency);
		const checker = fp.x.fract().step(0.5).mul(fp.y.fract().step(0.5));
		const diagonal = fp.x.add(fp.y).fract().step(0.5);
		const pat = checker.mix(diagonal, params.mode.clamp(0, 1));
		return {
			outputs: {
				scalar_out: pat,
				color_out: vec4(vec3(pat), 1.0),
			},
		};
	},
};

const F_NOISE: ModuleDefinition = {
	type: "f_noise",
	stage: "fragment",
	label: "Noise",
	ports: [
		{ name: "color_in", type: "color", direction: "in" },
		{ name: "color_out", type: "color", direction: "out" },
	],
	defaultParams: { frequency: 4.0, amplitude: 0.3, speed: 1.0 },
	paramRanges: {
		frequency: { min: 0.1, max: 20 },
		amplitude: { min: 0, max: 1 },
		speed: { min: 0, max: 5 },
	},
	tslNode: ({ params, inputs }) => {
		const colorIn = inputs.color_in;
		const noisePos = vec3(
			colorIn.xy.mul(params.frequency),
			time.mul(params.speed),
		);
		const n = triNoise3D(noisePos, float(1), float(0));
		const colorOut = colorIn.add(vec4(vec3(n.mul(params.amplitude)), 0));
		return { outputs: { color_out: colorOut } };
	},
};

const F_MIX: ModuleDefinition = {
	type: "f_mix",
	stage: "fragment",
	label: "Mix / Blend",
	ports: [
		{ name: "color_in", type: "color", direction: "in" },
		{ name: "scalar_in", type: "scalar", direction: "in" },
		{ name: "color_out", type: "color", direction: "out" },
	],
	defaultParams: { r2: 1.0, g2: 0.0, b2: 0.5 },
	paramRanges: {
		r2: { min: 0, max: 1 },
		g2: { min: 0, max: 1 },
		b2: { min: 0, max: 1 },
	},
	tslNode: ({ params, inputs }) => ({
		outputs: {
			color_out: inputs.color_in.mix(
				vec4(params.r2, params.g2, params.b2, 1.0),
				inputs.scalar_in,
			),
		},
	}),
};

const F_UV_DISTORT: ModuleDefinition = {
	type: "f_uv_distort",
	stage: "fragment",
	label: "UV Distortion",
	ports: [
		{ name: "uv_in", type: "uv", direction: "in" },
		{ name: "uv_out", type: "uv", direction: "out" },
	],
	defaultParams: { strength: 0.1, frequency: 4.0, speed: 1.0 },
	paramRanges: {
		strength: { min: 0, max: 0.5 },
		frequency: { min: 0.1, max: 20 },
		speed: { min: 0, max: 5 },
	},
	tslNode: ({ params, inputs }) => {
		const uvIn = inputs.uv_in;
		const t = time.mul(params.speed);
		const offset = vec2(
			uvIn.y.mul(params.frequency).add(t).sin().mul(params.strength),
			uvIn.x.mul(params.frequency).add(t).cos().mul(params.strength),
		);
		return { outputs: { uv_out: uvIn.add(offset) } };
	},
};

const F_SDF_CIRCLE: ModuleDefinition = {
	type: "f_sdf_circle",
	stage: "fragment",
	label: "SDF Circle",
	ports: [
		{ name: "uv_in", type: "uv", direction: "in" },
		{ name: "sdf_out", type: "sdf", direction: "out" },
		{ name: "scalar_out", type: "scalar", direction: "out" },
	],
	defaultParams: { radius: 0.3, smoothness: 0.02 },
	paramRanges: {
		radius: { min: 0.01, max: 0.8 },
		smoothness: { min: 0.001, max: 0.2 },
	},
	tslNode: ({ params, inputs }) => {
		const p = inputs.uv_in.sub(0.5);
		const d = p.length().sub(params.radius);
		const mask = float(1).sub(d.smoothstep(0, params.smoothness));
		return { outputs: { sdf_out: d, scalar_out: mask } };
	},
};

const F_FRESNEL: ModuleDefinition = {
	type: "f_fresnel",
	stage: "fragment",
	label: "Fresnel",
	ports: [
		{ name: "color_in", type: "color", direction: "in" },
		{ name: "normal_in", type: "normal", direction: "in" },
		{ name: "color_out", type: "color", direction: "out" },
	],
	defaultParams: { power: 2.0, intensity: 1.0 },
	paramRanges: {
		power: { min: 0.1, max: 8 },
		intensity: { min: 0, max: 3 },
	},
	tslNode: ({ params, inputs }) => {
		const viewDir = vec3(0, 0, 1);
		const fr = float(1)
			.sub(inputs.normal_in.dot(viewDir).abs())
			.pow(params.power)
			.mul(params.intensity);
		return {
			outputs: {
				color_out: inputs.color_in.add(vec4(vec3(fr), 0)),
			},
		};
	},
};

const F_POST_PROCESS: ModuleDefinition = {
	type: "f_post_process",
	stage: "fragment",
	label: "Post-Process",
	ports: [
		{ name: "color_in", type: "color", direction: "in" },
		{ name: "uv_in", type: "uv", direction: "in" },
		{ name: "color_out", type: "color", direction: "out" },
	],
	defaultParams: { vignette: 0.5, gamma: 1.0 },
	paramRanges: { vignette: { min: 0, max: 2 }, gamma: { min: 0.1, max: 3 } },
	tslNode: ({ params, inputs }) => {
		const uvCentered = inputs.uv_in.sub(0.5);
		const vig = float(1).sub(
			uvCentered.dot(uvCentered).mul(params.vignette).mul(2),
		);
		const col = inputs.color_in.xyz.mul(vig);
		const gammaInv = float(1).div(params.gamma.max(0.01));
		const corrected = col.pow(vec3(gammaInv));
		return {
			outputs: {
				color_out: vec4(corrected, inputs.color_in.w),
			},
		};
	},
};

// ── Registry ──

export const MODULE_REGISTRY: ReadonlyMap<RackModuleType, ModuleDefinition> =
	new Map<RackModuleType, ModuleDefinition>([
		// Controls
		["slider", SLIDER_MODULE],
		["xy", XY_MODULE],
		["lfo", LFO_MODULE],
		["noise", NOISE_CONTROL_MODULE],
		// Vertex
		["v_passthrough", V_PASSTHROUGH],
		["v_sine_displace", V_SINE_DISPLACE],
		["v_wave", V_WAVE],
		["v_twist", V_TWIST],
		["v_noise_displace", V_NOISE_DISPLACE],
		["v_explode", V_EXPLODE],
		["v_wobble", V_WOBBLE],
		["v_flatten", V_FLATTEN],
		["v_spherize", V_SPHERIZE],
		["v_taper", V_TAPER],
		// Fragment
		["f_solid_color", F_SOLID_COLOR],
		["f_uv_gradient", F_UV_GRADIENT],
		["f_cosine_palette", F_COSINE_PALETTE],
		["f_pattern", F_PATTERN],
		["f_noise", F_NOISE],
		["f_mix", F_MIX],
		["f_uv_distort", F_UV_DISTORT],
		["f_sdf_circle", F_SDF_CIRCLE],
		["f_fresnel", F_FRESNEL],
		["f_post_process", F_POST_PROCESS],
	]);
