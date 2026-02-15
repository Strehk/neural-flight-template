/**
 * Shader Compiler — Compile GLSL shaders and parse WebGL error logs.
 */

import type { ShaderError } from "./types";

/**
 * Parse WebGL shader compilation error log into structured errors.
 * WebGL format: "ERROR: 0:LINE: message"
 */
export function parseShaderErrors(
	log: string,
	lineOffset = 0,
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
			errors.push({ line, message: match[2], raw: trimmed });
		} else if (trimmed.toLowerCase().includes("error")) {
			// Fallback: unstructured error
			errors.push({ line: 0, message: trimmed, raw: trimmed });
		}
	}

	return errors;
}

/**
 * Test-compile a shader using the WebGL context from the renderer.
 * Returns errors if compilation fails, empty array on success.
 */
export function testCompileShader(
	gl: WebGLRenderingContext | WebGL2RenderingContext,
	source: string,
	type: "vertex" | "fragment",
	lineOffset = 0,
): ShaderError[] {
	const glType =
		type === "vertex" ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER;
	const shader = gl.createShader(glType);
	if (!shader) return [{ line: 0, message: "Failed to create shader", raw: "" }];

	gl.shaderSource(shader, source);
	gl.compileShader(shader);

	const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS) as boolean;
	if (success) {
		gl.deleteShader(shader);
		return [];
	}

	const log = gl.getShaderInfoLog(shader) ?? "";
	gl.deleteShader(shader);
	return parseShaderErrors(log, lineOffset);
}
