/**
 * Module Registry — Static definitions of all available rack modules.
 *
 * Each module defines stage, typed ports, default params, and a GLSL snippet.
 * glslSnippet receives uniform references (strings like "u_mod_0_freq")
 * and port variable names (strings like "sig_color_0").
 *
 * paramRanges mirrors UI slider min/max — used by codegen for normalized modulation.
 */

import type { ModuleDefinition, RackModuleType } from "./types";

// ── Control Modules ──

const SLIDER_MODULE: ModuleDefinition = {
	type: "slider",
	stage: "control",
	label: "Slider",
	ports: [{ name: "scalar_out", type: "scalar", direction: "out" }],
	defaultParams: { value: 0.5, min: 0.0, max: 1.0 },
	paramRanges: { value: { min: 0, max: 1 } },
	glslSnippet: (_params, vars) => `  ${vars.scalar_out} = ${_params.value};`,
};

const XY_MODULE: ModuleDefinition = {
	type: "xy",
	stage: "control",
	label: "XY Pad",
	ports: [{ name: "uv_out", type: "uv", direction: "out" }],
	defaultParams: { x: 0.5, y: 0.5 },
	paramRanges: { x: { min: 0, max: 1 }, y: { min: 0, max: 1 } },
	glslSnippet: (params, vars) =>
		`  ${vars.uv_out} = vec2(${params.x}, ${params.y});`,
};

const LFO_MODULE: ModuleDefinition = {
	type: "lfo",
	stage: "control",
	label: "LFO",
	ports: [{ name: "scalar_out", type: "scalar", direction: "out" }],
	defaultParams: { rate: 1.0, shape: 0.0 },
	paramRanges: { rate: { min: 0.1, max: 10 }, shape: { min: 0, max: 3 } },
	glslSnippet: (params, vars) => `  {
    float lfo_ph = fract(uTime * ${params.rate});
    float lfo_sin = 0.5 + 0.5 * sin(uTime * ${params.rate} * 6.2831853);
    float lfo_tri = 1.0 - abs(2.0 * lfo_ph - 1.0);
    float lfo_sq = step(0.5, lfo_ph);
    float lfo_rnd = fract(sin(floor(uTime * ${params.rate}) * 12.9898) * 43758.5453);
    float lfo_s = ${params.shape};
    float lfo_v = mix(lfo_sin, lfo_tri, clamp(lfo_s, 0.0, 1.0));
    lfo_v = mix(lfo_v, lfo_sq, clamp(lfo_s - 1.0, 0.0, 1.0));
    lfo_v = mix(lfo_v, lfo_rnd, clamp(lfo_s - 2.0, 0.0, 1.0));
    ${vars.scalar_out} = lfo_v;
  }`,
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
	paramRanges: { frequency: { min: 0.1, max: 20 }, amplitude: { min: 0, max: 1 }, speed: { min: 0, max: 5 } },
	requiredSnippets: ["snoise"],
	glslSnippet: (params, vars) => `
    float n_${vars.color_out} = snoise(${vars.color_in}.xy * ${params.frequency} + uTime * ${params.speed});
    ${vars.color_out} = ${vars.color_in} + vec4(vec3(n_${vars.color_out} * ${params.amplitude}), 0.0);`,
};

// ── Vertex Modules ──

const V_PASSTHROUGH: ModuleDefinition = {
	type: "v_passthrough",
	stage: "vertex",
	label: "Passthrough",
	ports: [],
	defaultParams: {},
	glslSnippet: () => "  // Identity — no modification",
};

const V_SINE_DISPLACE: ModuleDefinition = {
	type: "v_sine_displace",
	stage: "vertex",
	label: "Sine Displace",
	ports: [],
	defaultParams: { amplitude: 0.1, frequency: 3.0 },
	paramRanges: { amplitude: { min: 0, max: 1 }, frequency: { min: 0.1, max: 20 } },
	glslSnippet: (params, vars) =>
		`  pos += norm * sin(pos.x * ${params.frequency} + uTime) * ${params.amplitude};`,
};

const V_WAVE: ModuleDefinition = {
	type: "v_wave",
	stage: "vertex",
	label: "Wave",
	ports: [],
	defaultParams: { height: 0.2, freq_x: 4.0, freq_y: 3.0 },
	paramRanges: { height: { min: 0, max: 1 }, freq_x: { min: 0.1, max: 20 }, freq_y: { min: 0.1, max: 20 } },
	glslSnippet: (params, vars) =>
		`  pos.z += sin(uvCoord.x * ${params.freq_x} + uTime) * cos(uvCoord.y * ${params.freq_y}) * ${params.height};`,
};

const V_TWIST: ModuleDefinition = {
	type: "v_twist",
	stage: "vertex",
	label: "Twist",
	ports: [],
	defaultParams: { amount: 2.0 },
	paramRanges: { amount: { min: 0, max: 10 } },
	glslSnippet: (params) => `  {
    float tw_angle = pos.y * ${params.amount};
    float tw_c = cos(tw_angle);
    float tw_s = sin(tw_angle);
    vec3 tw_pos = pos;
    pos.x = tw_pos.x * tw_c - tw_pos.z * tw_s;
    pos.z = tw_pos.x * tw_s + tw_pos.z * tw_c;
  }`,
};

const V_NOISE_DISPLACE: ModuleDefinition = {
	type: "v_noise_displace",
	stage: "vertex",
	label: "Noise Displace",
	ports: [],
	defaultParams: { scale: 2.0, strength: 0.3 },
	paramRanges: { scale: { min: 0.1, max: 10 }, strength: { min: 0, max: 1 } },
	requiredSnippets: ["snoise"],
	glslSnippet: (params) =>
		`  pos += norm * snoise(pos * ${params.scale} + uTime) * ${params.strength};`,
};

const V_EXPLODE: ModuleDefinition = {
	type: "v_explode",
	stage: "vertex",
	label: "Explode",
	ports: [],
	defaultParams: { amount: 0.0 },
	paramRanges: { amount: { min: 0, max: 2 } },
	glslSnippet: (params) =>
		`  pos += norm * ${params.amount};`,
};

const V_WOBBLE: ModuleDefinition = {
	type: "v_wobble",
	stage: "vertex",
	label: "Wobble",
	ports: [],
	defaultParams: { speed: 2.0, amount: 0.1 },
	paramRanges: { speed: { min: 0.1, max: 10 }, amount: { min: 0, max: 0.5 } },
	glslSnippet: (params) =>
		`  pos += norm * sin(uTime * ${params.speed} + dot(pos, pos)) * ${params.amount};`,
};

const V_FLATTEN: ModuleDefinition = {
	type: "v_flatten",
	stage: "vertex",
	label: "Flatten",
	ports: [],
	defaultParams: { amount: 0.0 },
	paramRanges: { amount: { min: 0, max: 1 } },
	glslSnippet: (params) =>
		`  pos.y *= (1.0 - ${params.amount});`,
};

const V_SPHERIZE: ModuleDefinition = {
	type: "v_spherize",
	stage: "vertex",
	label: "Spherize",
	ports: [],
	defaultParams: { amount: 0.0 },
	paramRanges: { amount: { min: 0, max: 1 } },
	glslSnippet: (params) =>
		`  pos = mix(pos, normalize(pos) * length(pos), ${params.amount});`,
};

const V_TAPER: ModuleDefinition = {
	type: "v_taper",
	stage: "vertex",
	label: "Taper",
	ports: [],
	defaultParams: { amount: 0.5 },
	paramRanges: { amount: { min: -1, max: 2 } },
	glslSnippet: (params) =>
		`  pos.xz *= 1.0 + pos.y * ${params.amount};`,
};

// ── Fragment Modules ──

const F_SOLID_COLOR: ModuleDefinition = {
	type: "f_solid_color",
	stage: "fragment",
	label: "Solid Color",
	ports: [{ name: "color_out", type: "color", direction: "out" }],
	defaultParams: { r: 0.5, g: 0.3, b: 0.8 },
	paramRanges: { r: { min: 0, max: 1 }, g: { min: 0, max: 1 }, b: { min: 0, max: 1 } },
	glslSnippet: (params, vars) =>
		`  ${vars.color_out} = vec4(${params.r}, ${params.g}, ${params.b}, 1.0);`,
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
	glslSnippet: (params, vars) =>
		`  ${vars.color_out} = vec4(${vars.uv_in} * ${params.intensity}, 0.5, 1.0);`,
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
		a_r: 0.5, a_g: 0.5, a_b: 0.5,
		b_r: 0.5, b_g: 0.5, b_b: 0.5,
		c_r: 1.0, c_g: 1.0, c_b: 1.0,
		d_r: 0.0, d_g: 0.33, d_b: 0.67,
	},
	paramRanges: {
		a_r: { min: 0, max: 1 }, a_g: { min: 0, max: 1 }, a_b: { min: 0, max: 1 },
		b_r: { min: 0, max: 1 }, b_g: { min: 0, max: 1 }, b_b: { min: 0, max: 1 },
		c_r: { min: 0, max: 3 }, c_g: { min: 0, max: 3 }, c_b: { min: 0, max: 3 },
		d_r: { min: 0, max: 1 }, d_g: { min: 0, max: 1 }, d_b: { min: 0, max: 1 },
	},
	requiredSnippets: ["cosinePalette"],
	glslSnippet: (params, vars) => `  {
    vec3 cp_a = vec3(${params.a_r}, ${params.a_g}, ${params.a_b});
    vec3 cp_b = vec3(${params.b_r}, ${params.b_g}, ${params.b_b});
    vec3 cp_c = vec3(${params.c_r}, ${params.c_g}, ${params.c_b});
    vec3 cp_d = vec3(${params.d_r}, ${params.d_g}, ${params.d_b});
    ${vars.color_out} = vec4(cosinePalette(${vars.scalar_in}, cp_a, cp_b, cp_c, cp_d), 1.0);
  }`,
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
	glslSnippet: (params, vars) => `  {
    vec2 fp = ${vars.uv_in} * ${params.frequency};
    float pat = step(0.5, fract(fp.x)) * step(0.5, fract(fp.y));
    pat = mix(pat, step(0.5, fract(fp.x + fp.y)), clamp(${params.mode}, 0.0, 1.0));
    ${vars.scalar_out} = pat;
    ${vars.color_out} = vec4(vec3(pat), 1.0);
  }`,
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
	paramRanges: { frequency: { min: 0.1, max: 20 }, amplitude: { min: 0, max: 1 }, speed: { min: 0, max: 5 } },
	requiredSnippets: ["snoise"],
	glslSnippet: (params, vars) => `  {
    float fn = snoise(vec3(${vars.color_in}.xy * ${params.frequency}, uTime * ${params.speed}));
    ${vars.color_out} = ${vars.color_in} + vec4(vec3(fn * ${params.amplitude}), 0.0);
  }`,
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
	paramRanges: { r2: { min: 0, max: 1 }, g2: { min: 0, max: 1 }, b2: { min: 0, max: 1 } },
	glslSnippet: (params, vars) =>
		`  ${vars.color_out} = mix(${vars.color_in}, vec4(${params.r2}, ${params.g2}, ${params.b2}, 1.0), ${vars.scalar_in});`,
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
	paramRanges: { strength: { min: 0, max: 0.5 }, frequency: { min: 0.1, max: 20 }, speed: { min: 0, max: 5 } },
	glslSnippet: (params, vars) => `  ${vars.uv_out} = ${vars.uv_in} + vec2(
    sin(${vars.uv_in}.y * ${params.frequency} + uTime * ${params.speed}) * ${params.strength},
    cos(${vars.uv_in}.x * ${params.frequency} + uTime * ${params.speed}) * ${params.strength}
  );`,
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
	paramRanges: { radius: { min: 0.01, max: 0.8 }, smoothness: { min: 0.001, max: 0.2 } },
	glslSnippet: (params, vars) => `  {
    vec2 sdf_p = ${vars.uv_in} - 0.5;
    float sdf_d = length(sdf_p) - ${params.radius};
    ${vars.sdf_out} = sdf_d;
    ${vars.scalar_out} = 1.0 - smoothstep(0.0, ${params.smoothness}, sdf_d);
  }`,
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
	paramRanges: { power: { min: 0.1, max: 8 }, intensity: { min: 0, max: 3 } },
	glslSnippet: (params, vars) => `  {
    float fr = pow(1.0 - abs(dot(${vars.normal_in}, vec3(0.0, 0.0, 1.0))), ${params.power}) * ${params.intensity};
    ${vars.color_out} = ${vars.color_in} + vec4(vec3(fr), 0.0);
  }`,
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
	glslSnippet: (params, vars) => `  {
    vec2 pp_uv = ${vars.uv_in} - 0.5;
    float vig = 1.0 - dot(pp_uv, pp_uv) * ${params.vignette} * 2.0;
    vec3 pp_col = ${vars.color_in}.rgb * vig;
    pp_col = pow(pp_col, vec3(1.0 / max(${params.gamma}, 0.01)));
    ${vars.color_out} = vec4(pp_col, ${vars.color_in}.a);
  }`,
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
