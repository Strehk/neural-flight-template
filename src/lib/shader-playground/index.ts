/**
 * Shader Playground — Barrel Export
 */

// Types
export type {
	GeometryType,
	UniformType,
	UniformDef,
	ShaderError,
	ShaderModule,
	PresetDef,
	SnippetCategory,
	ShaderSnippet,
	ShaderTemplate,
	PlaygroundRenderer,
} from "./types";

// Engine (Renderer + Compiler)
export {
	createPlaygroundRenderer,
	DEFAULT_FRAGMENT,
	DEFAULT_VERTEX,
	parseShaderErrors,
	testCompileShader,
} from "./engine/index";

// Uniforms
export { parseUniforms, parseEndpointAnnotation } from "./uniforms";

// Shadertoy Compat
export { isShadertoyFormat, wrapShadertoyCode } from "./shadertoy_compat";

// Templates
export { TEMPLATES, getTemplateById } from "./templates";

// Snippets
export { SNIPPETS, SNIPPET_CATEGORIES, getSnippetsByCategory } from "./snippets";

// Presets
export { PRESETS, getPresetById, getPresetsByDifficulty } from "./data/presets/index";

// Store
export {
	saveModule,
	loadModules,
	deleteModule,
	exportModuleJSON,
	importModuleJSON,
	generateId,
} from "./store";

// Modulation
export { createModulationBridge } from "./modulation";
export type { ModulationBridge } from "./modulation";
export { MOD_SOURCES } from "./modulation_nodes";
export type { ModSourceDef } from "./modulation_nodes";

// Playground State
export { createPlaygroundState } from "./playground_state.svelte";
export type { PlaygroundState, EditorTab } from "./playground_state.svelte";
