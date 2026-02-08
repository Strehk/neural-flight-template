/**
 * Signal Graph — Evaluation engine for modular signal system
 *
 * Handles topological sorting and propagation of 0-1 normalized signals.
 * Completely decoupled from UI (SvelteFlow) — pure computation library.
 */

import type {
	SignalDef,
	SignalEdge,
	SignalNodeInstance,
	SignalValue,
} from "./types";

/** Registry of node type definitions */
const nodeRegistry = new Map<string, SignalDef>();

/** Register a node type definition */
export function registerNodeType(def: SignalDef): void {
	nodeRegistry.set(def.type, def);
}

/** Get a node type definition */
export function getNodeType(type: string): SignalDef | undefined {
	return nodeRegistry.get(type);
}

/** Get all registered node types */
export function getAllNodeTypes(): SignalDef[] {
	return Array.from(nodeRegistry.values());
}

/**
 * Signal Graph — manages nodes, edges, and evaluation
 */
export class SignalGraph {
	private nodes = new Map<string, SignalNodeInstance>();
	private edges: SignalEdge[] = [];
	private sortedIds: string[] = [];
	private dirty = true;

	/** Add a node instance to the graph */
	addNode(id: string, type: string): SignalNodeInstance | null {
		const def = nodeRegistry.get(type);
		if (!def) {
			console.warn(`Unknown node type: ${type}`);
			return null;
		}

		// Create initial outputs with default values
		const outputs: Record<string, SignalValue> = {};
		for (const port of def.outputs) {
			outputs[port.id] = port.default;
		}

		const instance: SignalNodeInstance = {
			id,
			type,
			state: def.createState(),
			outputs,
		};

		this.nodes.set(id, instance);
		this.dirty = true;
		return instance;
	}

	/** Remove a node from the graph */
	removeNode(id: string): void {
		this.nodes.delete(id);
		this.edges = this.edges.filter(
			(e) => e.sourceId !== id && e.targetId !== id,
		);
		this.dirty = true;
	}

	/** Get a node instance by id */
	getNode(id: string): SignalNodeInstance | undefined {
		return this.nodes.get(id);
	}

	/** Get all node instances */
	getAllNodes(): SignalNodeInstance[] {
		return Array.from(this.nodes.values());
	}

	/** Add an edge between two ports (allows multiple inputs for signal mixing) */
	addEdge(edge: SignalEdge): void {
		const duplicate = this.edges.some(
			(e) =>
				e.sourceId === edge.sourceId &&
				e.sourcePort === edge.sourcePort &&
				e.targetId === edge.targetId &&
				e.targetPort === edge.targetPort,
		);
		if (duplicate) return;
		this.edges.push(edge);
		this.dirty = true;
	}

	/** Remove an edge by id */
	removeEdge(id: string): void {
		this.edges = this.edges.filter((e) => e.id !== id);
		this.dirty = true;
	}

	/** Set a UI-driven input override (used when no cable is connected) */
	setInput(nodeId: string, portId: string, value: SignalValue): void {
		const instance = this.nodes.get(nodeId);
		if (!instance) return;
		if (!instance.inputOverrides) instance.inputOverrides = {};
		instance.inputOverrides[portId] = value;
	}

	/** Get all edges */
	getAllEdges(): SignalEdge[] {
		return [...this.edges];
	}

	/**
	 * Evaluate all nodes in topological order
	 * @param dt Delta time in seconds
	 */
	evaluate(dt: number): void {
		if (this.dirty) {
			this.sortedIds = this.topologicalSort();
			this.dirty = false;
		}

		for (const nodeId of this.sortedIds) {
			const instance = this.nodes.get(nodeId);
			if (!instance) continue;

			const def = nodeRegistry.get(instance.type);
			if (!def) continue;

			// Collect inputs from connected edges (average multiple connections)
			const inputs: Record<string, SignalValue> = {};

			// Start with default values, then apply UI overrides
			for (const port of def.inputs) {
				inputs[port.id] = instance.inputOverrides?.[port.id] ?? port.default;
			}

			// Collect all connected values per port and average them
			const portSums: Record<string, number> = {};
			const portCounts: Record<string, number> = {};

			for (const edge of this.edges) {
				if (edge.targetId !== nodeId) continue;
				const sourceNode = this.nodes.get(edge.sourceId);
				if (!sourceNode) continue;
				const value = sourceNode.outputs[edge.sourcePort] ?? 0;
				portSums[edge.targetPort] = (portSums[edge.targetPort] ?? 0) + value;
				portCounts[edge.targetPort] = (portCounts[edge.targetPort] ?? 0) + 1;
			}

			for (const port in portCounts) {
				inputs[port] = portSums[port] / portCounts[port];
			}

			// Compute new outputs
			const result = def.compute(inputs, instance.state, dt);
			instance.outputs = result.outputs;
			instance.state = result.state;
		}
	}

	/** Get output value from a specific node port */
	getOutput(nodeId: string, portId: string): SignalValue {
		const node = this.nodes.get(nodeId);
		return node?.outputs[portId] ?? 0;
	}

	/** Topological sort using Kahn's algorithm */
	private topologicalSort(): string[] {
		// Build adjacency list and in-degree count
		const inDegree = new Map<string, number>();
		const adjacency = new Map<string, string[]>();

		for (const id of this.nodes.keys()) {
			inDegree.set(id, 0);
			adjacency.set(id, []);
		}

		for (const edge of this.edges) {
			const current = inDegree.get(edge.targetId) ?? 0;
			inDegree.set(edge.targetId, current + 1);
			adjacency.get(edge.sourceId)?.push(edge.targetId);
		}

		// Start with nodes that have no incoming edges
		const queue: string[] = [];
		for (const [id, degree] of inDegree) {
			if (degree === 0) queue.push(id);
		}

		const sorted: string[] = [];

		while (queue.length > 0) {
			const current = queue.shift()!;
			sorted.push(current);

			for (const neighbor of adjacency.get(current) ?? []) {
				const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
				inDegree.set(neighbor, newDegree);
				if (newDegree === 0) queue.push(neighbor);
			}
		}

		// Check for cycles (not all nodes processed)
		if (sorted.length !== this.nodes.size) {
			console.warn("Cycle detected in signal graph!");
		}

		return sorted;
	}

	/** Clear all nodes and edges */
	clear(): void {
		this.nodes.clear();
		this.edges = [];
		this.sortedIds = [];
		this.dirty = true;
	}
}

/** Singleton graph instance for the application */
export const signalGraph = new SignalGraph();
