/**
 * Codegen — Signal-Chain Resolution + GLSL Assembly
 *
 * Transforms RackModuleInstance[] → complete GLSL fragment shader.
 * Linear chain: ports connect automatically by SignalType in rack order.
 */

import NOISE_GLSL from "./modules/snippets/noise.glsl?raw";
import { MODULE_REGISTRY } from "./modules/registry";
import type {
	ModulePort,
	PortVarMap,
	RackModuleInstance,
	SignalType,
} from "./modules/types";
import { SIGNAL_GLSL_TYPE } from "./modules/types";

// ── Snippet Library ──

const SNIPPET_LIBRARY: Record<string, string> = {
	snoise: NOISE_GLSL,
};

// ── Default Fragment (no modules) ──

const FALLBACK_FRAGMENT = `
uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;
varying vec3 vNormal;

uniform vec3 uLightDir;
uniform float uLightIntensity;
uniform float uAmbient;

void main() {
  vec3 color = 0.5 + 0.5 * cos(uTime + vUv.xyx + vec3(0.0, 2.0, 4.0));
  float diffuse = max(dot(vNormal, uLightDir), 0.0);
  float light = uAmbient + diffuse * uLightIntensity;
  gl_FragColor = vec4(color * light, 1.0);
}
`;

// ── Public API ──

export interface CodegenResult {
	glsl: string;
	uniforms: { name: string; value: number }[];
}

export function assembleGlsl(modules: RackModuleInstance[]): CodegenResult {
	const active = modules
		.filter((m) => m.enabled)
		.sort((a, b) => a.order - b.order);

	if (active.length === 0) {
		return { glsl: FALLBACK_FRAGMENT, uniforms: [] };
	}

	const uniformDecls: string[] = [];
	const uniformValues: { name: string; value: number }[] = [];
	const bodyLines: string[] = [];
	const requiredSnippets = new Set<string>();

	// Track last output variable per signal type for linear chaining
	const lastOutput: Partial<Record<SignalType, string>> = {};

	for (const mod of active) {
		const def = MODULE_REGISTRY.get(mod.type);
		if (!def) continue;

		// Collect required snippets
		if (def.requiredSnippets) {
			for (const s of def.requiredSnippets) requiredSnippets.add(s);
		}

		// Generate uniform names for params
		const paramUniforms: Record<string, string> = {};
		for (const [key, value] of Object.entries(mod.params)) {
			const uName = `u_${mod.id}_${key}`;
			uniformDecls.push(`uniform float ${uName};`);
			uniformValues.push({ name: uName, value });
			paramUniforms[key] = uName;
		}

		// Generate unique variable names per port
		const vars: PortVarMap = {};
		const inPorts: ModulePort[] = [];
		const outPorts: ModulePort[] = [];

		for (const port of def.ports) {
			const varName = `sig_${mod.id}_${port.name}`;
			vars[port.name] = varName;
			if (port.direction === "in") inPorts.push(port);
			else outPorts.push(port);
		}

		// Declare input variables — connect from previous output or system default
		for (const port of inPorts) {
			const glslType = SIGNAL_GLSL_TYPE[port.type];
			const prev = lastOutput[port.type];
			const defaultVal = getSystemDefault(port.type);
			const initVal = prev ?? defaultVal;
			bodyLines.push(`  ${glslType} ${vars[port.name]} = ${initVal};`);
		}

		// Declare output variables
		for (const port of outPorts) {
			const glslType = SIGNAL_GLSL_TYPE[port.type];
			bodyLines.push(`  ${glslType} ${vars[port.name]};`);
		}

		// Insert module GLSL snippet
		const snippet = def.glslSnippet(paramUniforms, vars);
		bodyLines.push(`  // ── ${mod.label} (${mod.id}) ──`);
		bodyLines.push(snippet);

		// Update last output per signal type
		for (const port of outPorts) {
			lastOutput[port.type] = vars[port.name];
		}
	}

	// Determine final color output
	const finalColor = lastOutput.color ?? "vec4(0.5 + 0.5 * cos(uTime + vUv.xyx + vec3(0.0, 2.0, 4.0)), 1.0)";

	// Assemble complete fragment shader
	const parts: string[] = [];

	// System uniforms
	parts.push("// ── System Uniforms ──");
	parts.push("uniform float uTime;");
	parts.push("uniform vec2 uResolution;");
	parts.push("uniform vec3 uLightDir;");
	parts.push("uniform float uLightIntensity;");
	parts.push("uniform float uAmbient;");
	parts.push("");

	// Varyings
	parts.push("// ── Varyings ──");
	parts.push("varying vec2 vUv;");
	parts.push("varying vec3 vNormal;");
	parts.push("");

	// Module uniforms
	if (uniformDecls.length > 0) {
		parts.push("// ── Module Uniforms ──");
		parts.push(...uniformDecls);
		parts.push("");
	}

	// Helper functions (snippets)
	if (requiredSnippets.size > 0) {
		parts.push("// ── Helper Functions ──");
		for (const name of requiredSnippets) {
			const code = SNIPPET_LIBRARY[name];
			if (code) parts.push(code);
		}
		parts.push("");
	}

	// Main function
	parts.push("void main() {");
	parts.push(...bodyLines);
	parts.push("");
	parts.push("  // ── Lighting ──");
	parts.push(`  float diffuse = max(dot(vNormal, uLightDir), 0.0);`);
	parts.push(`  float light = uAmbient + diffuse * uLightIntensity;`);
	parts.push(`  gl_FragColor = vec4(${finalColor}.rgb * light, ${finalColor}.a);`);
	parts.push("}");

	return { glsl: parts.join("\n"), uniforms: uniformValues };
}

// ── Helpers ──

function getSystemDefault(type: SignalType): string {
	switch (type) {
		case "color":
			return "vec4(0.5 + 0.5 * cos(uTime + vUv.xyx + vec3(0.0, 2.0, 4.0)), 1.0)";
		case "scalar":
			return "0.5";
		case "uv":
			return "vUv";
		case "normal":
			return "vNormal";
		case "sdf":
			return "0.0";
	}
}
