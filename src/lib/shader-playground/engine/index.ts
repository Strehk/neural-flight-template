/**
 * Shader Playground Engine — Barrel Export
 *
 * Headless 3D engine layer: renderer + compiler.
 * No UI dependencies.
 */

export {
	parseShaderErrors,
	testCompileFragment,
	testCompileShader,
	testCompileVertex,
} from "./compiler";
export {
	createPlaygroundRenderer,
	DEFAULT_FRAGMENT,
	DEFAULT_VERTEX,
} from "./renderer";
