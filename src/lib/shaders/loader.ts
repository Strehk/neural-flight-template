import * as THREE from "three";
import { validateUniforms } from "./validation.js";
import standardVert from "./vertex/standard.vert?raw";

// ── System Uniforms ──

/**
 * Creates fresh system uniforms per material — avoids shared-reference bug
 * where all materials would point to the same `{ value }` objects.
 */
function createSystemUniforms() {
	return {
		uTime: { value: 0 },
		uResolution: { value: new THREE.Vector2(1, 1) },
		uMouse: { value: new THREE.Vector2(0, 0) },
	};
}

// ── Snippet Registry ──

const snippetCache = new Map<string, string>();

/**
 * Registers a reusable GLSL snippet that can be included in any shader
 * via `#pragma include <name>`.
 *
 * @param name - Snippet identifier used in `#pragma include <name>`
 * @param glsl - Raw GLSL source code (import with `?raw` suffix)
 *
 * @example
 * import noiseGlsl from '$lib/shaders/common/noise.glsl?raw';
 * registerSnippet('noise', noiseGlsl);
 */
export function registerSnippet(name: string, glsl: string): void {
	snippetCache.set(name, glsl);
}

/**
 * Resolves `#pragma include <name>` directives by replacing them
 * with the registered GLSL snippet source code.
 *
 * Auto-injects `math.glsl` when `noise` is included (noise depends on math).
 *
 * @param glsl - GLSL source with `#pragma include <...>` directives
 * @returns Fully resolved GLSL source ready for compilation
 * @throws Error if a referenced snippet has not been registered
 *
 * @example
 * // In your .frag file:
 * // #pragma include <noise>
 * // #pragma include <color>
 * const resolved = resolveIncludes(myFragSource);
 */
export function resolveIncludes(glsl: string): string {
	// Auto-dependency: noise requires math
	if (
		glsl.includes("#pragma") &&
		glsl.includes("<noise>") &&
		!glsl.includes("<math>")
	) {
		glsl = `#pragma include <math>\n${glsl}`;
	}
	return glsl.replace(
		/#pragma\s+include\s+<(\w+)>/g,
		(_match, name: string) => {
			const snippet = snippetCache.get(name);
			if (!snippet) throw new Error(`Unknown snippet: "${name}"`);
			return snippet;
		},
	);
}

// ── Material Factory ──

const FRAGMENT_UNIFORM_HEADER = `precision highp float;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
`;

interface ShaderMaterialConfig {
	fragmentShader: string;
	vertexShader?: string;
	uniforms?: Record<string, { value: unknown }>;
	transparent?: boolean;
	side?: THREE.Side;
	depthWrite?: boolean;
}

/**
 * Creates a Three.js ShaderMaterial with system uniforms (uTime, uResolution, uMouse)
 * automatically injected. Resolves all `#pragma include` directives.
 *
 * Uses the standard vertex shader as default if none is provided.
 * Prepends uniform declarations if the fragment shader doesn't already declare them.
 *
 * @param config - Shader configuration (fragment source, optional vertex, uniforms, etc.)
 * @returns Ready-to-use Three.js ShaderMaterial
 */
export function createShaderMaterial(
	config: ShaderMaterialConfig,
): THREE.ShaderMaterial {
	const uniforms = { ...createSystemUniforms(), ...config.uniforms };
	let fragmentShader = config.fragmentShader;

	validateUniforms(fragmentShader, uniforms);

	if (!fragmentShader.includes("uniform float uTime")) {
		fragmentShader = FRAGMENT_UNIFORM_HEADER + fragmentShader;
	}
	return new THREE.ShaderMaterial({
		vertexShader: resolveIncludes(config.vertexShader ?? standardVert),
		fragmentShader: resolveIncludes(fragmentShader),
		uniforms,
		transparent: config.transparent ?? false,
		side: config.side ?? THREE.FrontSide,
		depthWrite: config.depthWrite ?? true,
	});
}

// ── Uniform Helpers ──

/**
 * Updates the `uTime` uniform on a shader material.
 * Call this every frame from your animation loop.
 *
 * @param material - ShaderMaterial created by this module
 * @param elapsed - Time in seconds since animation start
 */
export function updateTime(
	material: THREE.ShaderMaterial,
	elapsed: number,
): void {
	material.uniforms.uTime.value = elapsed;
}
