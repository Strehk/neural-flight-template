/**
 * Signal-Based Module System — Type Definitions
 *
 * 5 signal types flow through typed ports between modules.
 * 3 module stages: vertex (geometry), fragment (pixel), control (parameters).
 * Codegen resolves the signal chain and assembles GLSL per stage.
 */

// ── Signal Types ──

/** GLSL type mapping: color=vec4, scalar=float, uv=vec2, normal=vec3, sdf=float */
export type SignalType = "color" | "scalar" | "uv" | "normal" | "sdf";

export const SIGNAL_GLSL_TYPE: Record<SignalType, string> = {
	color: "vec4",
	scalar: "float",
	uv: "vec2",
	normal: "vec3",
	sdf: "float",
};

export const SIGNAL_COLORS: Record<SignalType, string> = {
	color: "#a855f7",
	scalar: "#22c55e",
	uv: "#3b82f6",
	normal: "#f97316",
	sdf: "#ef4444",
};

// ── Ports ──

export interface ModulePort {
	name: string;
	type: SignalType;
	direction: "in" | "out";
}

// ── Module Stage ──

export type ModuleStage = "vertex" | "fragment" | "control";

// ── Module Types (all 24) ──

export type RackModuleType =
	// Controls (4)
	| "slider"
	| "xy"
	| "lfo"
	| "noise"
	// Vertex (10)
	| "v_passthrough"
	| "v_sine_displace"
	| "v_wave"
	| "v_twist"
	| "v_noise_displace"
	| "v_explode"
	| "v_wobble"
	| "v_flatten"
	| "v_spherize"
	| "v_taper"
	// Fragment (10)
	| "f_solid_color"
	| "f_uv_gradient"
	| "f_cosine_palette"
	| "f_pattern"
	| "f_noise"
	| "f_mix"
	| "f_uv_distort"
	| "f_sdf_circle"
	| "f_fresnel"
	| "f_post_process";

/** Derive stage from module type prefix */
export function getStage(type: RackModuleType): ModuleStage {
	if (type.startsWith("v_")) return "vertex";
	if (type.startsWith("f_")) return "fragment";
	return "control";
}

/** Grouped categories for the Add-Module dropdown */
export const MODULE_CATEGORIES: {
	label: string;
	stage: ModuleStage;
	types: RackModuleType[];
}[] = [
	{
		label: "Vertex",
		stage: "vertex",
		types: [
			"v_passthrough",
			"v_sine_displace",
			"v_wave",
			"v_twist",
			"v_noise_displace",
			"v_explode",
			"v_wobble",
			"v_flatten",
			"v_spherize",
			"v_taper",
		],
	},
	{
		label: "Fragment",
		stage: "fragment",
		types: [
			"f_solid_color",
			"f_uv_gradient",
			"f_cosine_palette",
			"f_pattern",
			"f_noise",
			"f_mix",
			"f_uv_distort",
			"f_sdf_circle",
			"f_fresnel",
			"f_post_process",
		],
	},
	{
		label: "Controls",
		stage: "control",
		types: ["slider", "xy", "lfo", "noise"],
	},
];

// ── Module Definition (static blueprint) ──

/** Codegen passes resolved GLSL variable names per port */
export type PortVarMap = Record<string, string>;

export interface ParamRange {
	min: number;
	max: number;
}

export interface ModuleDefinition {
	type: RackModuleType;
	stage: ModuleStage;
	label: string;
	ports: ModulePort[];
	defaultParams: Record<string, number>;
	/** Slider min/max per param — used for normalized modulation scaling. */
	paramRanges?: Record<string, ParamRange>;
	/** Returns GLSL code fragment. Params are inlined as uniform references. */
	glslSnippet: (params: Record<string, string>, vars: PortVarMap) => string;
	/** GLSL helper functions required by this module (e.g. "snoise") */
	requiredSnippets?: string[];
}

// ── Module Instance (runtime state) ──

export interface RackModuleInstance {
	id: string;
	type: RackModuleType;
	label: string;
	enabled: boolean;
	collapsed: boolean;
	codeExpanded: boolean;
	order: number;
	params: Record<string, number>;
}

// ── Modulation Routing (CV Layer) ──

export interface ModulationRoute {
	id: string;
	sourceModuleId: string;
	targetModuleId: string;
	targetParam: string;
	depth: number;
}

// ── Connections (v2 — prepared but unused in v1) ──

export interface Connection {
	fromModule: string;
	fromPort: string;
	toModule: string;
	toPort: string;
}
