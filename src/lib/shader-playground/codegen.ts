/**
 * Codegen v4 — TSL Node Composition
 *
 * Transforms RackModuleInstance[] → TSL colorNode + positionNode.
 * Linear chain: fragment modules compose colorNode, vertex modules compose positionNode.
 * Control modules inject uniforms. Modulation routes modulate param uniforms.
 */

import {
	float,
	normalLocal,
	positionLocal,
	time,
	uniform,
	uv,
	vec4,
} from "three/tsl";
import type { Node, UniformNode } from "three/webgpu";
import { MODULE_REGISTRY } from "./modules/registry";
import type {
	ModulationRoute,
	RackModuleInstance,
	SignalType,
} from "./modules/types";
import { getStage } from "./modules/types";

// ── Public API ──

export interface TslCodegenResult {
	colorNode: Node;
	positionNode: Node | null;
	/** Maps "moduleId:paramName" → live UniformNode for direct value updates */
	uniformRefs: Map<string, UniformNode<number>>;
	/** Maps moduleId → readable description of what the module does */
	moduleDescriptions: Map<string, string>;
}

export function composeTslNodes(
	modules: RackModuleInstance[],
	modulationRoutes: ModulationRoute[] = [],
): TslCodegenResult {
	const active = modules
		.filter((m) => m.enabled)
		.sort((a, b) => a.order - b.order);

	const vertexModules = active.filter((m) => getStage(m.type) === "vertex");
	const fragmentModules = active.filter((m) => getStage(m.type) === "fragment");

	const uniformRefs = new Map<string, UniformNode<number>>();
	const moduleDescriptions = new Map<string, string>();

	// ── Create uniform nodes for all module params ──
	const moduleUniforms = new Map<string, Record<string, UniformNode<number>>>();
	for (const mod of active) {
		const def = MODULE_REGISTRY.get(mod.type);
		if (!def) continue;
		const params: Record<string, UniformNode<number>> = {};
		for (const [key, value] of Object.entries(mod.params)) {
			const u = uniform(value);
			params[key] = u;
			uniformRefs.set(`${mod.id}:${key}`, u);
		}
		moduleUniforms.set(mod.id, params);
	}

	// ── Apply modulation: wrap base uniform with modulation offset ──
	const activeRoutes = modulationRoutes.filter(
		(r) =>
			active.some((m) => m.id === r.sourceModuleId) &&
			active.some((m) => m.id === r.targetModuleId),
	);

	const modulatedParams = new Map<string, Node>();
	const modulationDepthRefs = new Map<string, UniformNode<number>>();
	const sourceOutputRefs = new Map<string, UniformNode<number>>();

	for (const route of activeRoutes) {
		const targetDef = MODULE_REGISTRY.get(
			active.find((m) => m.id === route.targetModuleId)?.type ?? "slider",
		);
		const range = targetDef?.paramRanges?.[route.targetParam];
		const rangeSize = range ? range.max - range.min : 1;

		// Source output uniform (CPU-driven per tick)
		let sourceRef = sourceOutputRefs.get(route.sourceModuleId);
		if (!sourceRef) {
			sourceRef = uniform(0);
			sourceOutputRefs.set(route.sourceModuleId, sourceRef);
			uniformRefs.set(`${route.sourceModuleId}:__output`, sourceRef);
		}

		// Depth uniform
		const depthRef = uniform(route.depth);
		modulationDepthRefs.set(route.id, depthRef);
		uniformRefs.set(`__mod_depth:${route.id}`, depthRef);

		// Modulated = base + source * depth * range
		const baseRef = moduleUniforms.get(route.targetModuleId)?.[
			route.targetParam
		];
		if (baseRef) {
			const modulated = baseRef.add(sourceRef.mul(depthRef).mul(rangeSize));
			modulatedParams.set(
				`${route.targetModuleId}:${route.targetParam}`,
				modulated,
			);
		}
	}

	// ── Helper: get param node (modulated or base) ──
	function getParams(
		mod: RackModuleInstance,
	): Record<string, UniformNode<number>> {
		const base = moduleUniforms.get(mod.id) ?? {};
		const result: Record<string, UniformNode<number>> = {};
		for (const [key, u] of Object.entries(base)) {
			const modKey = `${mod.id}:${key}`;
			// Use modulated version if available, cast back to uniform-compatible node
			result[key] = (modulatedParams.get(modKey) ?? u) as UniformNode<number>;
		}
		return result;
	}

	// ── Fragment signal defaults ──
	function getFragmentDefault(type: SignalType): Node {
		switch (type) {
			case "color":
				return vec4(
					time.add(uv().x).cos().mul(0.5).add(0.5),
					time.add(uv().y).add(2).cos().mul(0.5).add(0.5),
					time.add(uv().x).add(4).cos().mul(0.5).add(0.5),
					1.0,
				);
			case "scalar":
				return float(0.5);
			case "uv":
				return uv();
			case "normal":
				return normalLocal;
			case "sdf":
				return float(0);
		}
	}

	// ── Compose fragment chain ──
	const lastOutput: Partial<Record<SignalType, Node>> = {};

	for (const mod of fragmentModules) {
		const def = MODULE_REGISTRY.get(mod.type);
		if (!def) continue;

		// Resolve inputs from signal chain
		const inputs: Record<string, Node> = {};
		for (const port of def.ports) {
			if (port.direction === "in") {
				inputs[port.name] =
					lastOutput[port.type] ?? getFragmentDefault(port.type);
			}
		}

		const result = def.tslNode({ params: getParams(mod), inputs });

		// Update signal chain with outputs
		for (const port of def.ports) {
			if (port.direction === "out" && result.outputs[port.name]) {
				lastOutput[port.type] = result.outputs[port.name];
			}
		}

		moduleDescriptions.set(mod.id, describeModule(mod, def.ports));
	}

	const colorNode = lastOutput.color ?? getFragmentDefault("color");

	// ── Compose vertex chain ──
	let currentPos: Node = positionLocal;

	for (const mod of vertexModules) {
		const def = MODULE_REGISTRY.get(mod.type);
		if (!def) continue;

		const inputs: Record<string, Node> = {
			position: currentPos,
			normal: normalLocal,
			uv: uv(),
		};

		const result = def.tslNode({ params: getParams(mod), inputs });

		if (result.outputs.position) {
			currentPos = result.outputs.position;
		}

		moduleDescriptions.set(mod.id, describeModule(mod, def.ports));
	}

	const positionNode = vertexModules.length > 0 ? currentPos : null;

	return { colorNode, positionNode, uniformRefs, moduleDescriptions };
}

// ── Description Helper ──

function describeModule(
	mod: RackModuleInstance,
	ports: { name: string; type: SignalType; direction: "in" | "out" }[],
): string {
	const ins = ports
		.filter((p) => p.direction === "in")
		.map((p) => `${p.name}:${p.type}`);
	const outs = ports
		.filter((p) => p.direction === "out")
		.map((p) => `${p.name}:${p.type}`);
	const params = Object.entries(mod.params)
		.map(([k, v]) => `${k}=${v.toFixed(2)}`)
		.join(", ");

	let desc = `${mod.label}`;
	if (ins.length > 0) desc += ` ← [${ins.join(", ")}]`;
	if (outs.length > 0) desc += ` → [${outs.join(", ")}]`;
	if (params) desc += `  (${params})`;
	return desc;
}
