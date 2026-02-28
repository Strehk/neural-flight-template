export type { UniformDef, ShaderDef, ShaderCategory } from "./types.js";
export {
	registerSnippet,
	resolveIncludes,
	createShaderMaterial,
	createMaterialFromDef,
	createShadertoyMaterial,
	updateTime,
} from "./loader.js";
