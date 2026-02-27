/**
 * Shader Playground v2 — Barrel Export
 *
 * Dual-stage signal-based module system with typed ports and codegen.
 */

// Engine
export { createPlaygroundRenderer, DEFAULT_VERTEX } from "./engine/index";

// State
export { createShaderRackState } from "./state.svelte";
export type { ShaderRackState } from "./state.svelte";

// Codegen
export { assembleShaders } from "./codegen";
export type { CodegenResult } from "./codegen";

// Control Engine
export { computeControlOutput } from "./control-engine";

// Module types
export type {
	ModuleDefinition,
	ModulePort,
	ModuleStage,
	ModulationRoute,
	ParamRange,
	RackModuleInstance,
	RackModuleType,
	SignalType,
} from "./modules/types";
export { MODULE_REGISTRY } from "./modules/registry";
export {
	MODULE_CATEGORIES,
	SIGNAL_COLORS,
	SIGNAL_GLSL_TYPE,
	getStage,
} from "./modules/types";

// Types
export type {
	GeometryType,
	PlaygroundRenderer,
	ShaderError,
	UniformDef,
} from "./types";
