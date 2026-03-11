/**
 * Shader Library — Modular GLSL shader system for Three.js
 *
 * Provides common GLSL snippets and factory functions to create
 * Three.js ShaderMaterials with automatic system uniform injection.
 *
 * @example
 * import { createShaderMaterial, registerAllSnippets } from '$lib/shaders';
 *
 * registerAllSnippets();
 * const material = createShaderMaterial({ fragmentShader: myFrag });
 */

export type { ShaderFrontmatter } from "./frontmatter.js";
export {
	fileNameToDisplayName,
	parseFrontmatter,
	pathToCategory,
	pathToId,
} from "./frontmatter.js";
export {
	createShaderMaterial,
	registerSnippet,
	resolveIncludes,
	updateTime,
} from "./loader.js";
export { registerAllSnippets } from "./snippets.js";
export type { PerfTier, ShaderCategory } from "./types.js";
