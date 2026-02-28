import * as THREE from "three";
import type { ShaderDef, UniformDef } from "./types.js";
import standardVert from "./vertex/standard.vert?raw";

// ── System Uniforms ──

/**
 * Uniforms automatically injected into every shader material.
 *
 * - `uTime` — elapsed time in seconds (updated via {@link updateTime})
 * - `uResolution` — viewport size in pixels (vec2)
 * - `uMouse` — normalized mouse position (vec2, [0..1])
 */
const SYSTEM_UNIFORMS = {
	uTime: { value: 0 },
	uResolution: { value: new THREE.Vector2(1, 1) },
	uMouse: { value: new THREE.Vector2(0, 0) },
};

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
	const uniforms = { ...SYSTEM_UNIFORMS, ...config.uniforms };
	let fragmentShader = config.fragmentShader;
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

// ── ShaderDef → Material ──

function uniformDefToThree(def: UniformDef): { value: unknown } {
	return { value: def.default };
}

/**
 * Converts a {@link ShaderDef} registry entry into a live Three.js ShaderMaterial.
 *
 * Maps each {@link UniformDef} to a Three.js uniform value and delegates
 * to {@link createShaderMaterial} for system uniform injection and include resolution.
 *
 * @param def - Shader definition from the registry (must have `fragmentShader` loaded)
 * @returns Ready-to-use Three.js ShaderMaterial
 */
export function createMaterialFromDef(def: ShaderDef): THREE.ShaderMaterial {
	if (!def.fragmentShader) {
		throw new Error(
			`ShaderDef "${def.id}" has empty fragmentShader. Load via ?raw import first.`,
		);
	}
	const uniforms: Record<string, { value: unknown }> = {};
	for (const u of def.uniforms) {
		uniforms[u.name] = uniformDefToThree(u);
	}
	return createShaderMaterial({
		fragmentShader: def.fragmentShader,
		vertexShader: def.vertexShader,
		uniforms,
	});
}

// ── Shadertoy Compatibility ──

const SHADERTOY_HEADER = `
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
`;

/**
 * Shadertoy compatibility layer — wraps a `mainImage()` function into a
 * full-screen Three.js ShaderMaterial.
 *
 * Automatically converts Shadertoy built-in names:
 * - `iTime` → `uTime`
 * - `iResolution` → `uResolution`
 * - `iMouse` → `uMouse`
 *
 * Generates a `void main()` that calls `mainImage(gl_FragColor, gl_FragCoord.xy)`.
 *
 * @param config.mainImageCode - Shadertoy GLSL containing a `mainImage()` function
 * @param config.extraUniforms - Additional uniforms beyond the system set
 * @returns Three.js ShaderMaterial compatible with Shadertoy code
 */
export function createShadertoyMaterial(config: {
	mainImageCode: string;
	extraUniforms?: Record<string, { value: unknown }>;
}): THREE.ShaderMaterial {
	const adapted = config.mainImageCode
		.replace(/iTime/g, "uTime")
		.replace(/iResolution/g, "uResolution")
		.replace(/iMouse/g, "uMouse");

	const fragmentShader = `${SHADERTOY_HEADER}
${adapted}

void main() {
  mainImage(gl_FragColor, gl_FragCoord.xy);
}`;

	return createShaderMaterial({
		fragmentShader,
		uniforms: config.extraUniforms,
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
