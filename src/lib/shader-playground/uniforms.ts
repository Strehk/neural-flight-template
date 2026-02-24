/**
 * Uniform Auto-Detection — Parse GLSL source for uniform declarations
 * and @endpoint annotations.
 */

import type { UniformDef, UniformType } from "./types";

/** System uniforms that should not appear in the UI */
export const SYSTEM_UNIFORMS = new Set([
	"projectionMatrix",
	"modelViewMatrix",
	"viewMatrix",
	"normalMatrix",
	"cameraPosition",
	"uTime",
	"uResolution",
	"uMouse",
	"iTime",
	"iResolution",
	"iMouse",
	"uLightDir",
	"uLightIntensity",
	"uAmbient",
]);

/** Supported GLSL uniform types */
const VALID_TYPES = new Set([
	"float",
	"vec2",
	"vec3",
	"vec4",
	"int",
	"bool",
	"sampler2D",
]);

/** Default values per uniform type */
function defaultValue(
	type: UniformType,
): number | number[] | boolean {
	switch (type) {
		case "float":
			return 0.5;
		case "vec2":
			return [0.5, 0.5];
		case "vec3":
			return [0.5, 0.5, 0.5];
		case "vec4":
			return [0.5, 0.5, 0.5, 1.0];
		case "int":
			return 1;
		case "bool":
			return false;
		case "sampler2D":
			return 0;
	}
}

/** Parse @endpoint annotations from a GLSL comment */
export function parseEndpointAnnotation(
	comment: string,
): Partial<UniformDef> {
	const result: Partial<UniformDef> = { endpoint: true };

	// min:NUMBER
	const minMatch = comment.match(/min:\s*(-?[\d.]+)/);
	if (minMatch) result.min = Number.parseFloat(minMatch[1]);

	// max:NUMBER
	const maxMatch = comment.match(/max:\s*(-?[\d.]+)/);
	if (maxMatch) result.max = Number.parseFloat(maxMatch[1]);

	// step:NUMBER
	const stepMatch = comment.match(/step:\s*([\d.]+)/);
	if (stepMatch) result.step = Number.parseFloat(stepMatch[1]);

	// default:NUMBER or default:#hex
	const defMatch = comment.match(/default:\s*(-?[\d.]+|#[0-9a-fA-F]{6})/);
	if (defMatch) {
		const v = defMatch[1];
		if (v.startsWith("#")) {
			result.value = hexToVec3(v);
			result.color = true;
		} else {
			result.value = Number.parseFloat(v);
		}
	}

	// label:"text"
	const labelMatch = comment.match(/label:\s*"([^"]+)"/);
	if (labelMatch) result.label = labelMatch[1];

	// color flag (standalone)
	if (/\bcolor\b/.test(comment) && !comment.includes("label:")) {
		result.color = true;
	}
	// Also catch color after label
	if (/\bcolor\b/.test(comment.replace(/label:"[^"]*"/, ""))) {
		result.color = true;
	}

	return result;
}

/** Parse all uniform declarations from GLSL source */
export function parseUniforms(source: string): UniformDef[] {
	const uniforms: UniformDef[] = [];
	const lines = source.split("\n");

	for (const line of lines) {
		const trimmed = line.trim();

		// Match: uniform TYPE NAME;  (optionally with // comment)
		const match = trimmed.match(
			/^uniform\s+(\w+)\s+(\w+)\s*;(.*)$/,
		);
		if (!match) continue;

		const [, typeStr, name, rest] = match;

		if (!VALID_TYPES.has(typeStr)) continue;
		if (SYSTEM_UNIFORMS.has(name)) continue;

		const type = typeStr as UniformType;
		const def: UniformDef = {
			name,
			type,
			value: defaultValue(type),
			min: 0,
			max: 1,
			step: 0.01,
		};

		// Check for @endpoint annotation
		if (rest.includes("@endpoint")) {
			const annotation = parseEndpointAnnotation(rest);
			Object.assign(def, annotation);
		}

		// If color vec3, set color-appropriate defaults
		if (def.color && def.type === "vec3" && !Array.isArray(def.value)) {
			def.value = [0.5, 0.5, 0.5];
		}

		// Apply default from annotation
		if (def.value === undefined) {
			def.value = defaultValue(type);
		}

		uniforms.push(def);
	}

	return uniforms;
}

/** Convert hex color string to vec3 [r, g, b] in 0-1 range */
function hexToVec3(hex: string): number[] {
	const h = hex.replace("#", "");
	return [
		Number.parseInt(h.substring(0, 2), 16) / 255,
		Number.parseInt(h.substring(2, 4), 16) / 255,
		Number.parseInt(h.substring(4, 6), 16) / 255,
	];
}
