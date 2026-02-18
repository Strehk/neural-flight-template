/**
 * Shader Templates — Starter templates for different shader styles.
 */

import type { ShaderTemplate } from "./types";
import emptyFrag from "./shaders/templates/empty.frag?raw";
import uvGradientFrag from "./shaders/templates/uv-gradient.frag?raw";
import shadertoyFrag from "./shaders/templates/shadertoy.frag?raw";
import vertexFragmentFrag from "./shaders/templates/vertex-fragment.frag?raw";
import vertexFragmentVert from "./shaders/templates/vertex-fragment.vert?raw";
import raymarchingFrag from "./shaders/templates/raymarching.frag?raw";

export const TEMPLATES: ShaderTemplate[] = [
	{
		id: "empty",
		name: "Empty",
		description: "Minimal fragment shader — just a color output",
		fragmentShader: emptyFrag,
		vertexShader: null,
	},
	{
		id: "uv-gradient",
		name: "UV Gradient",
		description: "Colorful UV visualization with animated hue rotation",
		fragmentShader: uvGradientFrag,
		vertexShader: null,
	},
	{
		id: "shadertoy",
		name: "Shadertoy Compatible",
		description: "Template using Shadertoy conventions (iTime, iResolution, mainImage)",
		fragmentShader: shadertoyFrag,
		vertexShader: null,
	},
	{
		id: "vertex-fragment",
		name: "Vertex + Fragment",
		description: "Custom vertex shader with sine displacement",
		fragmentShader: vertexFragmentFrag,
		vertexShader: vertexFragmentVert,
	},
	{
		id: "raymarching",
		name: "Raymarching",
		description: "Basic SDF raymarching setup with a sphere and floor",
		fragmentShader: raymarchingFrag,
		vertexShader: null,
	},
];

export function getTemplateById(
	id: string,
): ShaderTemplate | undefined {
	return TEMPLATES.find((t) => t.id === id);
}
