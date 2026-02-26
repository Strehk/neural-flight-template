/**
 * Shader Playground v2 — Barrel Export
 *
 * Signal-based module system with typed ports and codegen.
 */

// Engine
export { createPlaygroundRenderer, DEFAULT_VERTEX } from "./engine/index";

// State
export { createShaderRackState } from "./state.svelte";
export type { ShaderRackState } from "./state.svelte";

// Codegen
export { assembleGlsl } from "./codegen";

// Module types
export type {
	ModuleDefinition,
	ModulePort,
	RackModuleInstance,
	RackModuleType,
	SignalType,
} from "./modules/types";
export { MODULE_REGISTRY, MODULE_TYPES } from "./modules/registry";
export { SIGNAL_COLORS, SIGNAL_GLSL_TYPE } from "./modules/types";

// Types
export type {
	GeometryType,
	PlaygroundRenderer,
	ShaderError,
	UniformDef,
} from "./types";
