/**
 * Shader Playground v3 — Barrel Export (TSL)
 *
 * TSL-based module system with typed ports and node composition.
 */

// Engine
export { createPlaygroundRenderer } from "./engine/index";

// State
export { createShaderRackState } from "./state.svelte";
export type { ShaderRackState } from "./state.svelte";

// Codegen
export { composeTslNodes } from "./codegen";
export type { TslCodegenResult } from "./codegen";

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
	TslNodeContext,
	TslNodeResult,
} from "./modules/types";
export { MODULE_REGISTRY } from "./modules/registry";
export {
	MODULE_CATEGORIES,
	SIGNAL_COLORS,
	getStage,
} from "./modules/types";

// Types
export type {
	GeometryType,
	PlaygroundRenderer,
	ShaderError,
} from "./types";
