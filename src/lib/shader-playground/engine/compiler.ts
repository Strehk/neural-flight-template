/**
 * Shader Compiler — Compile GLSL shaders and parse WebGL error logs.
 *
 * Three.js ShaderMaterial auto-prepends built-in declarations that aren't
 * present in user code. For test-compilation we must replicate this prefix
 * so that `position`, `normal`, `uv`, matrix uniforms etc. resolve correctly.
 */

import type { ShaderError } from "../types";

// ── Three.js Built-in Prefixes ──

const PRECISION_PREFIX = "precision highp float;\nprecision highp int;\n";

/**
 * Three.js vertex shader built-in declarations.
 * ShaderMaterial injects these automatically — we must match them for test-compile.
 */
const THREEJS_VERTEX_PREFIX = `
// Three.js built-in uniforms
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat3 normalMatrix;
uniform vec3 cameraPosition;

// Three.js built-in attributes
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
`;

/** Line count of PRECISION_PREFIX */
const PRECISION_LINE_COUNT = 2;

/** Line count of PRECISION_PREFIX + THREEJS_VERTEX_PREFIX */
const VERTEX_PREFIX_LINE_COUNT =
	PRECISION_LINE_COUNT + THREEJS_VERTEX_PREFIX.split("\n").length - 1;

// ── Error Parser ──

/**
 * Parse WebGL shader compilation error log into structured errors.
 * WebGL format: "ERROR: 0:LINE: message"
 */
export function parseShaderErrors(
	log: string,
	lineOffset = 0,
	source?: "fragment" | "vertex",
): ShaderError[] {
	if (!log) return [];

	const errors: ShaderError[] = [];
	const lines = log.split("\n");

	for (const raw of lines) {
		const trimmed = raw.trim();
		if (!trimmed) continue;

		// Match "ERROR: COLUMN:LINE: message" or "WARNING: COLUMN:LINE: message"
		const match = trimmed.match(/(?:ERROR|WARNING):\s*\d+:(\d+):\s*(.*)/);
		if (match) {
			const line = Math.max(1, Number.parseInt(match[1], 10) - lineOffset);
			errors.push({ line, message: match[2], raw: trimmed, source });
		} else if (trimmed.toLowerCase().includes("error")) {
			// Fallback: unstructured error
			errors.push({ line: 0, message: trimmed, raw: trimmed, source });
		}
	}

	return errors;
}

// ── Test Compile ──

/**
 * Test-compile a fragment shader using raw WebGL.
 * Prepends precision prefix to match Three.js ShaderMaterial behavior.
 */
export function testCompileFragment(
	gl: WebGLRenderingContext | WebGL2RenderingContext,
	source: string,
): ShaderError[] {
	const prefixed = `${PRECISION_PREFIX}${source}`;
	return compileAndParse(
		gl,
		prefixed,
		gl.FRAGMENT_SHADER,
		PRECISION_LINE_COUNT,
		"fragment",
	);
}

/**
 * Test-compile a vertex shader using raw WebGL.
 * Prepends precision + Three.js built-in declarations (attributes, uniforms, matrices).
 */
export function testCompileVertex(
	gl: WebGLRenderingContext | WebGL2RenderingContext,
	source: string,
): ShaderError[] {
	const prefixed = `${PRECISION_PREFIX}${THREEJS_VERTEX_PREFIX}${source}`;
	return compileAndParse(
		gl,
		prefixed,
		gl.VERTEX_SHADER,
		VERTEX_PREFIX_LINE_COUNT,
		"vertex",
	);
}

// ── Internal ──

function compileAndParse(
	gl: WebGLRenderingContext | WebGL2RenderingContext,
	source: string,
	glType: number,
	lineOffset: number,
	shaderSource: "fragment" | "vertex",
): ShaderError[] {
	const shader = gl.createShader(glType);
	if (!shader)
		return [
			{
				line: 0,
				message: "Failed to create shader",
				raw: "",
				source: shaderSource,
			},
		];

	gl.shaderSource(shader, source);
	gl.compileShader(shader);

	const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS) as boolean;
	if (success) {
		gl.deleteShader(shader);
		return [];
	}

	const log = gl.getShaderInfoLog(shader) ?? "";
	gl.deleteShader(shader);
	return parseShaderErrors(log, lineOffset, shaderSource);
}
