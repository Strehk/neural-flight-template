/**
 * Shader Playground v3 — Barrel Export (TSL)
 *
 * TSL-based module system with typed ports and node composition.
 */

export type { TslCodegenResult } from "./codegen";
// Codegen
export { composeTslNodes } from "./codegen";
// Control Engine
export { computeControlOutput } from "./control-engine";
// Engine
export { createPlaygroundRenderer } from "./engine/index";
export { MODULE_REGISTRY } from "./modules/registry";
// Module types
export type {
	ModulationRoute,
	ModuleDefinition,
	ModulePort,
	ModuleStage,
	ParamRange,
	RackModuleInstance,
	RackModuleType,
	SignalType,
	TslNodeContext,
	TslNodeResult,
} from "./modules/types";
export {
	getStage,
	MODULE_CATEGORIES,
	SIGNAL_COLORS,
} from "./modules/types";
export type { ShaderRackState } from "./state.svelte";
// State
export { createShaderRackState } from "./state.svelte";

// Types
export type {
	GeometryType,
	PlaygroundRenderer,
	ShaderError,
} from "./types";
