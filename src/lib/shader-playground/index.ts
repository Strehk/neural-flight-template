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

// Renderer
export {
	createPlaygroundRenderer,
	DEFAULT_FRAGMENT,
	DEFAULT_VERTEX,
} from "./renderer";

// Compiler
export { parseShaderErrors, testCompileShader } from "./compiler";

// Uniforms
export { parseUniforms, parseEndpointAnnotation } from "./uniforms";

// Shadertoy Compat
export { isShadertoyFormat, wrapShadertoyCode } from "./shadertoy_compat";

// Templates
export { TEMPLATES, getTemplateById } from "./templates";

// Snippets
export { SNIPPETS, SNIPPET_CATEGORIES, getSnippetsByCategory } from "./snippets";

// Presets
export { PRESETS, getPresetById, getPresetsByDifficulty } from "./presets/index";

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
export {
	createModulationBridge,
	SOURCE_TYPES,
} from "./modulation";
export type { ModulationBridge, ModulationSourceType } from "./modulation";
