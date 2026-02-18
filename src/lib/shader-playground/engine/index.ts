/**
 * Shader Playground Engine — Barrel Export
 *
 * Headless 3D engine layer: renderer + compiler.
 * No UI dependencies.
 */

export {
	createPlaygroundRenderer,
	DEFAULT_FRAGMENT,
	DEFAULT_VERTEX,
} from "./renderer";

export {
	parseShaderErrors,
	testCompileShader,
	testCompileFragment,
	testCompileVertex,
} from "./compiler";
