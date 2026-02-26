/**
 * Signal-Based Module System — Type Definitions
 *
 * 5 signal types flow through typed ports between modules.
 * Codegen resolves the signal chain and assembles GLSL.
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
	color: "#a855f7",   // purple
	scalar: "#22c55e",  // green
	uv: "#3b82f6",      // blue
	normal: "#f97316",  // orange
	sdf: "#ef4444",     // red
};

// ── Ports ──

export interface ModulePort {
	name: string;
	type: SignalType;
	direction: "in" | "out";
}

// ── Module Definition (static blueprint) ──

export type RackModuleType = "slider" | "xy" | "lfo" | "noise";

/** Codegen passes resolved GLSL variable names per port */
export type PortVarMap = Record<string, string>;

export interface ModuleDefinition {
	type: RackModuleType;
	label: string;
	ports: ModulePort[];
	defaultParams: Record<string, number>;
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
	order: number;
	params: Record<string, number>;
}

// ── Connections (v2 — prepared but unused in v1) ──

export interface Connection {
	fromModule: string;
	fromPort: string;
	toModule: string;
	toPort: string;
}
