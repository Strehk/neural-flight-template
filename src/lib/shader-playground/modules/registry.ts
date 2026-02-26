/**
 * Module Registry — Static definitions of all available rack modules.
 *
 * Each module defines typed ports, default params, and a GLSL snippet.
 * glslSnippet receives uniform references (strings like "u_mod_0_freq")
 * and port variable names (strings like "sig_color_0").
 */

import type { ModuleDefinition, RackModuleType } from "./types";

// ── Module Definitions ──

const SLIDER_MODULE: ModuleDefinition = {
	type: "slider",
	label: "Slider",
	ports: [{ name: "scalar_out", type: "scalar", direction: "out" }],
	defaultParams: { value: 0.5, min: 0.0, max: 1.0 },
	glslSnippet: (_params, vars) => `${vars.scalar_out} = ${_params.value};`,
};

const XY_MODULE: ModuleDefinition = {
	type: "xy",
	label: "XY Pad",
	ports: [{ name: "uv_out", type: "uv", direction: "out" }],
	defaultParams: { x: 0.5, y: 0.5 },
	glslSnippet: (params, vars) =>
		`${vars.uv_out} = vec2(${params.x}, ${params.y});`,
};

const LFO_MODULE: ModuleDefinition = {
	type: "lfo",
	label: "LFO",
	ports: [{ name: "scalar_out", type: "scalar", direction: "out" }],
	defaultParams: { rate: 1.0, min: 0.0, max: 1.0 },
	glslSnippet: (params, vars) =>
		`${vars.scalar_out} = mix(${params.min}, ${params.max}, 0.5 + 0.5 * sin(uTime * ${params.rate} * 6.2831853));`,
};

const NOISE_MODULE: ModuleDefinition = {
	type: "noise",
	label: "Noise",
	ports: [
		{ name: "color_in", type: "color", direction: "in" },
		{ name: "color_out", type: "color", direction: "out" },
	],
	defaultParams: { frequency: 4.0, amplitude: 0.3, speed: 1.0 },
	requiredSnippets: ["snoise"],
	glslSnippet: (params, vars) => `
    float n_${vars.color_out} = snoise(${vars.color_in}.xy * ${params.frequency} + uTime * ${params.speed});
    ${vars.color_out} = ${vars.color_in} + vec4(vec3(n_${vars.color_out} * ${params.amplitude}), 0.0);`,
};

// ── Registry ──

export const MODULE_REGISTRY: ReadonlyMap<RackModuleType, ModuleDefinition> =
	new Map<RackModuleType, ModuleDefinition>([
		["slider", SLIDER_MODULE],
		["xy", XY_MODULE],
		["lfo", LFO_MODULE],
		["noise", NOISE_MODULE],
	]);

/** All available module types for the "Add Module" dropdown */
export const MODULE_TYPES: readonly RackModuleType[] = [
	"slider",
	"xy",
	"lfo",
	"noise",
];
