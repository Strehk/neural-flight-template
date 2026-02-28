/**
 * Shader Library — Modular GLSL shader system for Three.js
 *
 * Provides a registry of fragment shaders, common GLSL snippets,
 * and factory functions to create Three.js ShaderMaterials.
 *
 * @example
 * import { createShaderMaterial, registerSnippet } from '$lib/shaders';
 * import noiseGlsl from '$lib/shaders/common/noise.glsl?raw';
 *
 * registerSnippet('noise', noiseGlsl);
 * const material = createShaderMaterial({ fragmentShader: myFrag });
 */

export {
	createMaterialFromDef,
	createShaderMaterial,
	createShadertoyMaterial,
	registerSnippet,
	resolveIncludes,
	updateTime,
} from "./loader.js";
export type { ShaderCategory, ShaderDef, UniformDef } from "./types.js";
