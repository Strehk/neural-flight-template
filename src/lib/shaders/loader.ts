import * as THREE from "three";
import type { ShaderDef, UniformDef } from "./types.js";
import standardVert from "./vertex/standard.vert?raw";

// ── System Uniforms ──

const SYSTEM_UNIFORMS = {
	uTime: { value: 0 },
	uResolution: { value: new THREE.Vector2(1, 1) },
	uMouse: { value: new THREE.Vector2(0, 0) },
};

// ── Snippet Registry ──

const snippetCache = new Map<string, string>();

export function registerSnippet(name: string, glsl: string): void {
	snippetCache.set(name, glsl);
}

export function resolveIncludes(glsl: string): string {
	return glsl.replace(/#pragma\s+include\s+<(\w+)>/g, (_match, name: string) => {
		const snippet = snippetCache.get(name);
		if (!snippet) throw new Error(`Unknown snippet: "${name}"`);
		return snippet;
	});
}

// ── Material Factory ──

interface ShaderMaterialConfig {
	fragmentShader: string;
	vertexShader?: string;
	uniforms?: Record<string, { value: unknown }>;
	transparent?: boolean;
	side?: THREE.Side;
	depthWrite?: boolean;
}

export function createShaderMaterial(config: ShaderMaterialConfig): THREE.ShaderMaterial {
	const uniforms = { ...SYSTEM_UNIFORMS, ...config.uniforms };
	return new THREE.ShaderMaterial({
		vertexShader: resolveIncludes(config.vertexShader ?? standardVert),
		fragmentShader: resolveIncludes(config.fragmentShader),
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

export function createMaterialFromDef(def: ShaderDef): THREE.ShaderMaterial {
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

export function updateTime(material: THREE.ShaderMaterial, elapsed: number): void {
	material.uniforms.uTime.value = elapsed;
}
