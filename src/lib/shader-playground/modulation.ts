/**
 * Modulation Bridge — Connects SignalGraph engine to shader uniforms.
 *
 * Reuses existing node-editor components (LFO, Envelope, Noise, etc.)
 * to modulate @endpoint shader uniforms in real-time.
 *
 * Signal flow:
 *   [Source Node] → 0-1 signal → [Endpoint Node] → remap(min, max) → material.uniform
 */

import {
	SignalGraph,
	registerNodeType,
	getNodeType,
} from "$lib/node-editor/graph/engine";
import { remap } from "$lib/node-editor/graph/types";
import type {
	SignalDef,
	SignalValue,
	ComputeResult,
} from "$lib/node-editor/graph/types";
import { COMPONENT_LFO } from "$lib/node-editor/components/lfo";
import { COMPONENT_ENVELOPE } from "$lib/node-editor/components/envelope";
import { COMPONENT_NOISE } from "$lib/node-editor/components/noise";
import { COMPONENT_SPRING } from "$lib/node-editor/components/spring";
import { COMPONENT_MULTIPLY } from "$lib/node-editor/components/multiply";
import type { UniformDef } from "./types";
import type * as THREE from "three";

// ── Endpoint Signal Definition ──

const ENDPOINT_SIGNAL: SignalDef = {
	type: "shader_endpoint",
	label: "Endpoint",
	inputs: [{ id: "signal", label: "Signal", default: 0.5 }],
	outputs: [{ id: "out", label: "Out", default: 0.5 }],
	createState: () => null,
	compute: (
		inputs: Record<string, SignalValue>,
		_state: unknown,
		_dt: number,
	): ComputeResult => ({
		outputs: { out: inputs.signal ?? 0.5 },
		state: null,
	}),
};

// ── Available source types for the palette ──

export interface ModulationSourceType {
	type: string;
	label: string;
	signal: SignalDef;
}

export const SOURCE_TYPES: ModulationSourceType[] = [
	{ type: "lfo", label: "LFO", signal: COMPONENT_LFO },
	{ type: "envelope", label: "Envelope", signal: COMPONENT_ENVELOPE },
	{ type: "noise", label: "Noise", signal: COMPONENT_NOISE },
	{ type: "spring", label: "Spring", signal: COMPONENT_SPRING },
	{ type: "multiply", label: "Multiply", signal: COMPONENT_MULTIPLY },
];

// ── Registration ──

let registered = false;

function ensureRegistered(): void {
	if (registered) return;
	registered = true;

	// Register endpoint type
	if (!getNodeType("shader_endpoint")) {
		registerNodeType(ENDPOINT_SIGNAL);
	}

	// Register source component types (idempotent check)
	for (const src of SOURCE_TYPES) {
		if (!getNodeType(src.type)) {
			registerNodeType(src.signal);
		}
	}
}

// ── Modulation Bridge ──

export interface ModulationBridge {
	/** The underlying signal graph */
	graph: SignalGraph;
	/** Evaluate graph and push values to material uniforms */
	update(dt: number): void;
	/** Update material reference (after shader recompile) */
	updateMaterial(material: THREE.ShaderMaterial): void;
	/** Register a @endpoint uniform as an endpoint node */
	registerEndpoint(def: UniformDef): string;
	/** Remove an endpoint by uniform name */
	removeEndpoint(name: string): void;
	/** Clear all endpoints */
	clearEndpoints(): void;
	/** Get endpoint node ID for a uniform name */
	getEndpointNodeId(uniformName: string): string | undefined;
	/** Add a source node (LFO, Noise, etc.) */
	addSource(type: string): string;
	/** Remove a source node */
	removeSource(nodeId: string): void;
	/** Connect source output → endpoint input */
	connect(sourceId: string, sourcePort: string, endpointId: string): void;
	/** Disconnect an edge */
	disconnect(edgeId: string): void;
	/** Clean up */
	dispose(): void;
}

export function createModulationBridge(
	initialMaterial: THREE.ShaderMaterial,
): ModulationBridge {
	ensureRegistered();

	const graph = new SignalGraph();
	const endpoints = new Map<string, { nodeId: string; def: UniformDef }>();
	let material = initialMaterial;
	let sourceCounter = 0;
	let edgeCounter = 0;

	function updateMaterial(newMaterial: THREE.ShaderMaterial): void {
		material = newMaterial;
	}

	function registerEndpoint(def: UniformDef): string {
		const nodeId = `endpoint_${def.name}`;
		graph.addNode(nodeId, "shader_endpoint");
		endpoints.set(def.name, { nodeId, def });
		return nodeId;
	}

	function removeEndpoint(name: string): void {
		const ep = endpoints.get(name);
		if (ep) {
			graph.removeNode(ep.nodeId);
			endpoints.delete(name);
		}
	}

	function clearEndpoints(): void {
		for (const [name] of endpoints) {
			removeEndpoint(name);
		}
	}

	function getEndpointNodeId(uniformName: string): string | undefined {
		return endpoints.get(uniformName)?.nodeId;
	}

	function addSource(type: string): string {
		sourceCounter++;
		const nodeId = `source_${type}_${sourceCounter}`;
		graph.addNode(nodeId, type);
		return nodeId;
	}

	function removeSource(nodeId: string): void {
		graph.removeNode(nodeId);
	}

	function connect(
		sourceId: string,
		sourcePort: string,
		endpointId: string,
	): void {
		edgeCounter++;
		graph.addEdge({
			id: `edge_${edgeCounter}`,
			sourceId,
			sourcePort,
			targetId: endpointId,
			targetPort: "signal",
		});
	}

	function disconnect(edgeId: string): void {
		graph.removeEdge(edgeId);
	}

	function update(dt: number): void {
		graph.evaluate(dt);

		// Push endpoint outputs to material uniforms
		for (const [name, ep] of endpoints) {
			const signal = graph.getOutput(ep.nodeId, "out");
			const def = ep.def;

			// Remap 0-1 → min/max
			const min = def.min ?? 0;
			const max = def.max ?? 1;
			const value = remap(signal, min, max);

			// Only update float uniforms for now (vec3 color etc. needs more work)
			if (material.uniforms[name]) {
				if (def.type === "float" || def.type === "int") {
					material.uniforms[name].value = value;
				}
			}
		}
	}

	function dispose(): void {
		graph.clear();
		endpoints.clear();
	}

	return {
		graph,
		update,
		updateMaterial,
		registerEndpoint,
		removeEndpoint,
		clearEndpoints,
		getEndpointNodeId,
		addSource,
		removeSource,
		connect,
		disconnect,
		dispose,
	};
}
