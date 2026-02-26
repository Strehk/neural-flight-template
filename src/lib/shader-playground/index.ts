/**
 * Shader Playground — Barrel Export
 */

// Presets
export {
	getPresetById,
	getPresetsByDifficulty,
	PRESETS,
} from "./data/presets/index";

// Engine (Renderer + Compiler)
export {
	createPlaygroundRenderer,
	DEFAULT_FRAGMENT,
	DEFAULT_VERTEX,
	parseShaderErrors,
	testCompileShader,
} from "./engine/index";
export type { EditorTab, PlaygroundState } from "./playground_state.svelte";
// Playground State
export { createPlaygroundState } from "./playground_state.svelte";
// Shadertoy Compat
export { isShadertoyFormat, wrapShadertoyCode } from "./shadertoy_compat";

// Snippets
export {
	getSnippetsByCategory,
	SNIPPET_CATEGORIES,
	SNIPPETS,
} from "./snippets";
// Store
export {
	deleteModule,
	exportModuleJSON,
	generateId,
	importModuleJSON,
	loadModules,
	saveModule,
} from "./store";
// Templates
export { getTemplateById, TEMPLATES } from "./templates";
// Types
export type {
	GeometryType,
	PlaygroundRenderer,
	PresetDef,
	ShaderError,
	ShaderModule,
	ShaderSnippet,
	ShaderTemplate,
	SnippetCategory,
	UniformDef,
	UniformType,
} from "./types";
// Uniforms
export { parseEndpointAnnotation, parseUniforms } from "./uniforms";
