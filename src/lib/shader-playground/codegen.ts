/**
 * Codegen v3 — Dual-Stage GLSL Assembly with Human-Readable Names
 *
 * Transforms RackModuleInstance[] → vertex + fragment shaders.
 * Linear chain: ports connect automatically by SignalType in rack order.
 * Control modules inject uniforms into both stages.
 * Modulation routes allow controls to modulate vertex/fragment params.
 *
 * v3: Human-readable variable names, structured block comments,
 *     per-module snippet map, modulation routing support.
 */

import NOISE_GLSL from "./modules/snippets/noise.glsl?raw";
import PALETTE_GLSL from "./modules/snippets/palette.glsl?raw";
import { MODULE_REGISTRY } from "./modules/registry";
import type {
	ModuleDefinition,
	ModulePort,
	ModulationRoute,
	PortVarMap,
	RackModuleInstance,
	SignalType,
} from "./modules/types";
import { SIGNAL_GLSL_TYPE, getStage } from "./modules/types";

// ── Snippet Library ──

const SNIPPET_LIBRARY: Record<string, string> = {
	snoise: NOISE_GLSL,
	cosinePalette: PALETTE_GLSL,
};

// ── Human-Readable Name Map ──

/** Maps moduleId → slug like "twist", "palette_1", "noise_2" */
type NameMap = Map<string, string>;

function buildNameMap(modules: RackModuleInstance[]): NameMap {
	const nameMap: NameMap = new Map();
	const slugCounts = new Map<string, number>();

	for (const mod of modules) {
		const base = mod.label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
		const count = (slugCounts.get(base) ?? 0) + 1;
		slugCounts.set(base, count);
		const slug = count > 1 ? `${base}_${count}` : base;
		nameMap.set(mod.id, slug);
	}

	// Second pass: add _1 suffix to first occurrence if duplicates exist
	for (const [id, slug] of nameMap) {
		const base = slug.replace(/_\d+$/, "");
		if ((slugCounts.get(base) ?? 0) > 1 && slug === base) {
			nameMap.set(id, `${base}_1`);
		}
	}

	return nameMap;
}

// ── Naming Helpers ──

function humanName(nameMap: NameMap, moduleId: string): string {
	return nameMap.get(moduleId) ?? moduleId;
}

function uniformName(nameMap: NameMap, moduleId: string, param: string): string {
	return `u_${humanName(nameMap, moduleId)}_${param}`;
}

function portVarName(nameMap: NameMap, moduleId: string, portName: string): string {
	return `${humanName(nameMap, moduleId)}_${portName}`;
}

// ── Public API ──

export interface CodegenResult {
	fragmentGlsl: string;
	vertexGlsl: string | null;
	uniforms: { name: string; value: number }[];
	/** Maps "moduleId:paramName" → GLSL uniform name for real-time updates */
	uniformMap: Map<string, string>;
	/** Maps moduleId → GLSL snippet (body code only, no boilerplate) */
	moduleSnippets: Map<string, string>;
}

export function assembleShaders(
	modules: RackModuleInstance[],
	modulationRoutes: ModulationRoute[] = [],
): CodegenResult {
	const active = modules
		.filter((m) => m.enabled)
		.sort((a, b) => a.order - b.order);

	const nameMap = buildNameMap(active);

	const vertexModules = active.filter((m) => getStage(m.type) === "vertex");
	const fragmentModules = active.filter(
		(m) => getStage(m.type) === "fragment",
	);
	const controlModules = active.filter(
		(m) => getStage(m.type) === "control",
	);

	const uniformMap = new Map<string, string>();
	const moduleSnippets = new Map<string, string>();

	// Build uniform map for all modules
	for (const mod of active) {
		for (const key of Object.keys(mod.params)) {
			const uName = uniformName(nameMap, mod.id, key);
			uniformMap.set(`${mod.id}:${key}`, uName);
		}
	}

	// Register output uniforms for control modules used as modulation sources
	const sourceModuleIds = new Set(modulationRoutes.map((r) => r.sourceModuleId));
	for (const sourceId of sourceModuleIds) {
		const mod = active.find((m) => m.id === sourceId);
		if (mod && getStage(mod.type) === "control") {
			const outputName = `u_${humanName(nameMap, mod.id)}_output`;
			uniformMap.set(`${mod.id}:__output`, outputName);
		}
	}

	const controlResult = resolveControlUniforms(controlModules, nameMap);

	// Resolve modulation: which params are modulated by which control?
	const activeRoutes = modulationRoutes.filter(
		(r) => active.some((m) => m.id === r.sourceModuleId) &&
			active.some((m) => m.id === r.targetModuleId),
	);

	// Add output uniform declarations for modulation source controls
	const sourceOutputUniforms = resolveSourceOutputUniforms(
		activeRoutes,
		controlModules,
		nameMap,
	);

	const vertexGlsl =
		vertexModules.length > 0
			? assembleVertexShader(vertexModules, controlResult, sourceOutputUniforms, nameMap, moduleSnippets, activeRoutes)
			: null;
	const fragmentGlsl = assembleFragmentShader(
		fragmentModules,
		controlResult,
		sourceOutputUniforms,
		nameMap,
		moduleSnippets,
		activeRoutes,
	);

	// Add modulation depth uniforms to map + values
	const modulationUniforms = resolveModulationUniforms(activeRoutes, nameMap);

	return {
		fragmentGlsl,
		vertexGlsl,
		uniforms: [
			...controlResult.values,
			...sourceOutputUniforms.values,
			...collectModuleUniforms(active, nameMap),
			...modulationUniforms.values,
		],
		uniformMap,
		moduleSnippets,
	};
}

// ── Control Uniform Resolution ──

interface UniformBlock {
	declarations: string[];
	values: { name: string; value: number }[];
}

function resolveControlUniforms(
	controlModules: RackModuleInstance[],
	nameMap: NameMap,
): UniformBlock {
	const declarations: string[] = [];
	const values: { name: string; value: number }[] = [];

	for (const mod of controlModules) {
		const hName = humanName(nameMap, mod.id);
		for (const [key, value] of Object.entries(mod.params)) {
			const uName = uniformName(nameMap, mod.id, key);
			declarations.push(`uniform float ${uName};  // ${mod.label} → ${key}`);
			values.push({ name: uName, value });
		}
	}

	return { declarations, values };
}

// ── Source Output Uniforms (CPU-computed per tick) ──

function resolveSourceOutputUniforms(
	routes: ModulationRoute[],
	controlModules: RackModuleInstance[],
	nameMap: NameMap,
): UniformBlock {
	const declarations: string[] = [];
	const values: { name: string; value: number }[] = [];
	const seen = new Set<string>();

	for (const route of routes) {
		if (seen.has(route.sourceModuleId)) continue;
		seen.add(route.sourceModuleId);

		const mod = controlModules.find((m) => m.id === route.sourceModuleId);
		if (!mod) continue;

		const outputName = `u_${humanName(nameMap, mod.id)}_output`;
		declarations.push(`uniform float ${outputName};  // ${mod.label} → CPU output`);
		values.push({ name: outputName, value: 0.0 });
	}

	return { declarations, values };
}

// ── Collect non-control module uniforms ──

function collectModuleUniforms(
	modules: RackModuleInstance[],
	nameMap: NameMap,
): { name: string; value: number }[] {
	const uniforms: { name: string; value: number }[] = [];

	for (const mod of modules) {
		if (getStage(mod.type) === "control") continue;
		for (const [key, value] of Object.entries(mod.params)) {
			uniforms.push({ name: uniformName(nameMap, mod.id, key), value });
		}
	}

	return uniforms;
}

// ── Modulation Resolution ──

interface ModulationBlock {
	/** Uniform declarations for depth values */
	declarations: string[];
	/** Pre-computation lines (e.g. float mod_twist_amount = ...) */
	preCompute: string[];
	/** Maps targetModuleId:paramName → modulated variable name */
	paramOverrides: Map<string, string>;
	/** Uniform values for depth */
	values: { name: string; value: number }[];
}

function resolveModulationUniforms(
	routes: ModulationRoute[],
	nameMap: NameMap,
): { declarations: string[]; values: { name: string; value: number }[] } {
	const declarations: string[] = [];
	const values: { name: string; value: number }[] = [];

	for (const route of routes) {
		const targetHuman = humanName(nameMap, route.targetModuleId);
		const depthName = `u_mod_${targetHuman}_${route.targetParam}_depth`;
		declarations.push(`uniform float ${depthName};  // Mod depth: ${route.targetParam}`);
		values.push({ name: depthName, value: route.depth });
	}

	return { declarations, values };
}

function resolveModulationBlock(
	routes: ModulationRoute[],
	modules: RackModuleInstance[],
	nameMap: NameMap,
): ModulationBlock {
	const declarations: string[] = [];
	const preCompute: string[] = [];
	const paramOverrides = new Map<string, string>();
	const values: { name: string; value: number }[] = [];

	for (const route of routes) {
		const sourceHuman = humanName(nameMap, route.sourceModuleId);
		const targetHuman = humanName(nameMap, route.targetModuleId);
		const depthName = `u_mod_${targetHuman}_${route.targetParam}_depth`;
		const sourceUniform = `u_${sourceHuman}_output`;
		const baseUniform = `u_${targetHuman}_${route.targetParam}`;
		const modVar = `mod_${targetHuman}_${route.targetParam}`;

		// Look up target param range for normalized scaling
		const targetMod = modules.find((m) => m.id === route.targetModuleId);
		const targetDef = targetMod ? MODULE_REGISTRY.get(targetMod.type) : undefined;
		const range = targetDef?.paramRanges?.[route.targetParam];
		const rangeSize = range ? range.max - range.min : 1;

		preCompute.push(
			`  float ${modVar} = ${baseUniform} + ${sourceUniform} * ${depthName} * ${rangeSize.toFixed(1)};`,
		);
		paramOverrides.set(`${route.targetModuleId}:${route.targetParam}`, modVar);
	}

	return { declarations, preCompute, paramOverrides, values };
}

/** Emit pre-compute lines from modBlock that target a specific module. */
function emitModulationPreCompute(
	bodyLines: string[],
	modBlock: ModulationBlock,
	nameMap: NameMap,
	targetModuleId: string,
): void {
	const targetHuman = humanName(nameMap, targetModuleId);
	const prefix = `  float mod_${targetHuman}_`;
	for (const line of modBlock.preCompute) {
		if (line.startsWith(prefix)) {
			bodyLines.push(line);
		}
	}
}

// ── Fragment Assembly ──

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

function assembleFragmentShader(
	fragmentModules: RackModuleInstance[],
	controlUniforms: UniformBlock,
	sourceOutputUniforms: UniformBlock,
	nameMap: NameMap,
	moduleSnippets: Map<string, string>,
	modulationRoutes: ModulationRoute[],
): string {
	if (fragmentModules.length === 0 && controlUniforms.declarations.length === 0) {
		return FALLBACK_FRAGMENT;
	}

	const uniformDecls: string[] = [];
	const bodyLines: string[] = [];
	const requiredSnippets = new Set<string>();
	const lastOutput: Partial<Record<SignalType, string>> = {};

	// Resolve modulation for fragment stage
	const fragRoutes = modulationRoutes.filter((r) => {
		const mod = fragmentModules.find((m) => m.id === r.targetModuleId);
		return mod !== undefined;
	});
	const modBlock = resolveModulationBlock(fragRoutes, fragmentModules, nameMap);

	// Process fragment modules through signal chain
	for (let idx = 0; idx < fragmentModules.length; idx++) {
		const mod = fragmentModules[idx];
		const def = MODULE_REGISTRY.get(mod.type);
		if (!def) continue;

		if (def.requiredSnippets) {
			for (const s of def.requiredSnippets) requiredSnippets.add(s);
		}

		const hName = humanName(nameMap, mod.id);
		const paramUniforms: Record<string, string> = {};
		for (const [key] of Object.entries(mod.params)) {
			const uName = uniformName(nameMap, mod.id, key);
			uniformDecls.push(`uniform float ${uName};  // ${mod.label} → ${key}`);
			// Check if this param is modulated
			const override = modBlock.paramOverrides.get(`${mod.id}:${key}`);
			paramUniforms[key] = override ?? uName;
		}

		const { vars, inPorts, outPorts } = resolvePortVars(mod, def, nameMap);
		emitPortDeclarations(bodyLines, inPorts, outPorts, vars, lastOutput, getFragmentDefault);

		// Emit modulation pre-computation (from modBlock, already range-scaled)
		emitModulationPreCompute(bodyLines, modBlock, nameMap, mod.id);

		// Block comment: [index+1] Label (STAGE)
		const blockIdx = idx + 1;
		bodyLines.push(`  // ─── [${blockIdx}] ${mod.label} (FRAG) ─────────────────`);

		const snippetCode = def.glslSnippet(paramUniforms, vars);
		bodyLines.push(snippetCode);
		moduleSnippets.set(mod.id, snippetCode);

		updateLastOutput(outPorts, vars, lastOutput);
	}

	const finalColor =
		lastOutput.color ??
		"vec4(0.5 + 0.5 * cos(uTime + vUv.xyx + vec3(0.0, 2.0, 4.0)), 1.0)";

	// Add modulation depth uniforms
	const modulationDecls = resolveModulationUniforms(fragRoutes, nameMap).declarations;

	return buildFragmentSource(
		uniformDecls,
		controlUniforms.declarations,
		sourceOutputUniforms.declarations,
		modulationDecls,
		requiredSnippets,
		bodyLines,
		finalColor,
	);
}

function buildFragmentSource(
	moduleUniforms: string[],
	controlUniforms: string[],
	sourceOutputUniforms: string[],
	modulationUniforms: string[],
	requiredSnippets: Set<string>,
	bodyLines: string[],
	finalColor: string,
): string {
	const parts: string[] = [];

	parts.push("// ═══ System Uniforms ═══");
	parts.push("uniform float uTime;");
	parts.push("uniform vec2 uResolution;");
	parts.push("uniform vec3 uLightDir;");
	parts.push("uniform float uLightIntensity;");
	parts.push("uniform float uAmbient;");
	parts.push("");

	parts.push("// ═══ Varyings ═══");
	parts.push("varying vec2 vUv;");
	parts.push("varying vec3 vNormal;");
	parts.push("");

	if (controlUniforms.length > 0) {
		parts.push("// ═══ Control Uniforms ═══");
		parts.push(...controlUniforms);
		parts.push("");
	}

	if (sourceOutputUniforms.length > 0) {
		parts.push("// ═══ Modulation Source Outputs ═══");
		parts.push(...sourceOutputUniforms);
		parts.push("");
	}

	if (moduleUniforms.length > 0) {
		parts.push("// ═══ Module Uniforms ═══");
		parts.push(...moduleUniforms);
		parts.push("");
	}

	if (modulationUniforms.length > 0) {
		parts.push("// ═══ Modulation Uniforms ═══");
		parts.push(...modulationUniforms);
		parts.push("");
	}

	if (requiredSnippets.size > 0) {
		parts.push("// ═══ Helper Functions ═══");
		for (const name of requiredSnippets) {
			const code = SNIPPET_LIBRARY[name];
			if (code) parts.push(code);
		}
		parts.push("");
	}

	parts.push("// ═══ Signal Chain ═══");
	parts.push("void main() {");
	parts.push(...bodyLines);
	parts.push("");
	parts.push("  // ═══ Lighting ═══");
	parts.push("  float diffuse = max(dot(vNormal, uLightDir), 0.0);");
	parts.push("  float light = uAmbient + diffuse * uLightIntensity;");
	parts.push(
		`  gl_FragColor = vec4(${finalColor}.rgb * light, ${finalColor}.a);`,
	);
	parts.push("}");

	return parts.join("\n");
}

// ── Vertex Assembly ──

function assembleVertexShader(
	vertexModules: RackModuleInstance[],
	controlUniforms: UniformBlock,
	sourceOutputUniforms: UniformBlock,
	nameMap: NameMap,
	moduleSnippets: Map<string, string>,
	modulationRoutes: ModulationRoute[],
): string {
	const uniformDecls: string[] = [];
	const bodyLines: string[] = [];
	const requiredSnippets = new Set<string>();

	// Resolve modulation for vertex stage
	const vertRoutes = modulationRoutes.filter((r) => {
		const mod = vertexModules.find((m) => m.id === r.targetModuleId);
		return mod !== undefined;
	});
	const modBlock = resolveModulationBlock(vertRoutes, vertexModules, nameMap);

	for (let idx = 0; idx < vertexModules.length; idx++) {
		const mod = vertexModules[idx];
		const def = MODULE_REGISTRY.get(mod.type);
		if (!def) continue;

		if (def.requiredSnippets) {
			for (const s of def.requiredSnippets) requiredSnippets.add(s);
		}

		const paramUniforms: Record<string, string> = {};
		for (const [key] of Object.entries(mod.params)) {
			const uName = uniformName(nameMap, mod.id, key);
			uniformDecls.push(`uniform float ${uName};  // ${mod.label} → ${key}`);
			const override = modBlock.paramOverrides.get(`${mod.id}:${key}`);
			paramUniforms[key] = override ?? uName;
		}

		// Vertex modules get special vars: pos, norm, uvCoord
		const vars: PortVarMap = { pos: "pos", norm: "norm", uvCoord: "uvCoord" };
		for (const port of def.ports) {
			vars[port.name] = portVarName(nameMap, mod.id, port.name);
		}

		// Emit modulation pre-computation (from modBlock, already range-scaled)
		emitModulationPreCompute(bodyLines, modBlock, nameMap, mod.id);

		const blockIdx = idx + 1;
		bodyLines.push(`  // ─── [${blockIdx}] ${mod.label} (VERT) ─────────────────`);

		const snippetCode = def.glslSnippet(paramUniforms, vars);
		bodyLines.push(snippetCode);
		moduleSnippets.set(mod.id, snippetCode);
	}

	// Add modulation depth uniforms
	const modulationDecls = resolveModulationUniforms(vertRoutes, nameMap).declarations;

	return buildVertexSource(
		uniformDecls,
		controlUniforms.declarations,
		sourceOutputUniforms.declarations,
		modulationDecls,
		requiredSnippets,
		bodyLines,
	);
}

function buildVertexSource(
	moduleUniforms: string[],
	controlUniforms: string[],
	sourceOutputUniforms: string[],
	modulationUniforms: string[],
	requiredSnippets: Set<string>,
	bodyLines: string[],
): string {
	const parts: string[] = [];

	parts.push("// ═══ Varyings ═══");
	parts.push("varying vec2 vUv;");
	parts.push("varying vec3 vNormal;");
	parts.push("");

	parts.push("// ═══ System Uniforms ═══");
	parts.push("uniform float uTime;");
	parts.push("");

	if (controlUniforms.length > 0) {
		parts.push("// ═══ Control Uniforms ═══");
		parts.push(...controlUniforms);
		parts.push("");
	}

	if (sourceOutputUniforms.length > 0) {
		parts.push("// ═══ Modulation Source Outputs ═══");
		parts.push(...sourceOutputUniforms);
		parts.push("");
	}

	if (moduleUniforms.length > 0) {
		parts.push("// ═══ Module Uniforms ═══");
		parts.push(...moduleUniforms);
		parts.push("");
	}

	if (modulationUniforms.length > 0) {
		parts.push("// ═══ Modulation Uniforms ═══");
		parts.push(...modulationUniforms);
		parts.push("");
	}

	if (requiredSnippets.size > 0) {
		parts.push("// ═══ Helper Functions ═══");
		for (const name of requiredSnippets) {
			const code = SNIPPET_LIBRARY[name];
			if (code) parts.push(code);
		}
		parts.push("");
	}

	parts.push("// ═══ Signal Chain ═══");
	parts.push("void main() {");
	parts.push("  vec3 pos = position;");
	parts.push("  vec3 norm = normal;");
	parts.push("  vec2 uvCoord = uv;");
	parts.push("");
	parts.push(...bodyLines);
	parts.push("");
	parts.push("  vUv = uvCoord;");
	parts.push("  vNormal = normalize(normalMatrix * norm);");
	parts.push(
		"  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);",
	);
	parts.push("}");

	return parts.join("\n");
}

// ── Shared Helpers ──

function resolvePortVars(
	mod: RackModuleInstance,
	def: ModuleDefinition,
	nameMap: NameMap,
): { vars: PortVarMap; inPorts: ModulePort[]; outPorts: ModulePort[] } {
	const vars: PortVarMap = {};
	const inPorts: ModulePort[] = [];
	const outPorts: ModulePort[] = [];

	for (const port of def.ports) {
		vars[port.name] = portVarName(nameMap, mod.id, port.name);
		if (port.direction === "in") inPorts.push(port);
		else outPorts.push(port);
	}

	return { vars, inPorts, outPorts };
}

function emitPortDeclarations(
	bodyLines: string[],
	inPorts: ModulePort[],
	outPorts: ModulePort[],
	vars: PortVarMap,
	lastOutput: Partial<Record<SignalType, string>>,
	getDefault: (type: SignalType) => string,
): void {
	for (const port of inPorts) {
		const glslType = SIGNAL_GLSL_TYPE[port.type];
		const prev = lastOutput[port.type];
		const initVal = prev ?? getDefault(port.type);
		bodyLines.push(`  ${glslType} ${vars[port.name]} = ${initVal};`);
	}

	for (const port of outPorts) {
		const glslType = SIGNAL_GLSL_TYPE[port.type];
		bodyLines.push(`  ${glslType} ${vars[port.name]};`);
	}
}

function updateLastOutput(
	outPorts: ModulePort[],
	vars: PortVarMap,
	lastOutput: Partial<Record<SignalType, string>>,
): void {
	for (const port of outPorts) {
		lastOutput[port.type] = vars[port.name];
	}
}

function getFragmentDefault(type: SignalType): string {
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
