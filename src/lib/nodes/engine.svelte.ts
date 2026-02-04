/**
 * Node Engine
 * Manages graph state and executes tick loop
 */

import { browser } from "$app/environment";
import type { Connection, NodeInstance } from "./types";
import { getNodeDef } from "./catalog/registry";
import { initBridge } from "./bridge";

interface EngineState {
	nodes: NodeInstance[];
	connections: Connection[];
	running: boolean;
}

/** Create a reactive node engine using Svelte 5 runes */
export function createNodeEngine() {
	let nodes = $state<NodeInstance[]>([]);
	let connections = $state<Connection[]>([]);
	let running = $state(false);

	let lastTime = 0;
	let animationId: number | null = null;

	/** Topologically sort nodes for correct evaluation order */
	function getSortedNodes(): NodeInstance[] {
		const nodeMap = new Map(nodes.map((n) => [n.id, n]));
		const incoming = new Map<string, Set<string>>();

		// Initialize incoming edges
		for (const node of nodes) {
			incoming.set(node.id, new Set());
		}

		// Build dependency graph
		for (const conn of connections) {
			incoming.get(conn.targetId)?.add(conn.sourceId);
		}

		// Kahn's algorithm
		const sorted: NodeInstance[] = [];
		const queue: string[] = [];

		// Find nodes with no dependencies
		for (const [id, deps] of incoming) {
			if (deps.size === 0) queue.push(id);
		}

		while (queue.length > 0) {
			const id = queue.shift()!;
			const node = nodeMap.get(id);
			if (node) sorted.push(node);

			// Remove this node from dependencies
			for (const [targetId, deps] of incoming) {
				if (deps.has(id)) {
					deps.delete(id);
					if (deps.size === 0) queue.push(targetId);
				}
			}
		}

		return sorted;
	}

	/** Gather input values for a node from connections */
	function gatherInputs(node: NodeInstance): Record<string, number | string> {
		const def = getNodeDef(node.type);
		if (!def) return {};

		// Start with defaults
		const inputs: Record<string, number | string> = {};
		for (const port of def.inputs) {
			inputs[port.id] = port.default;
		}

		// Override with connected values
		for (const conn of connections) {
			if (conn.targetId === node.id) {
				const sourceNode = nodes.find((n) => n.id === conn.sourceId);
				if (sourceNode) {
					inputs[conn.targetPort] = sourceNode.values[conn.sourcePort] ?? 0;
				}
			}
		}

		// Override with state (for configurable parameters like speed, min, max)
		for (const [key, value] of Object.entries(node.state)) {
			if (key in inputs) {
				inputs[key] = value;
			}
		}

		return inputs;
	}

	/** Execute one tick of the engine */
	function tick(dt: number): void {
		const sorted = getSortedNodes();

		for (const node of sorted) {
			const def = getNodeDef(node.type);
			if (!def) continue;

			const inputs = gatherInputs(node);
			const result = def.tick(inputs, node.state, dt);

			// Update node state and values
			node.state = result.state;
			node.values = result.outputs;
		}
	}

	/** Animation loop */
	function loop(time: number): void {
		if (!running) return;

		const dt = lastTime === 0 ? 0.016 : (time - lastTime) / 1000;
		lastTime = time;

		tick(dt);

		animationId = requestAnimationFrame(loop);
	}

	/** Start the engine */
	function start(): void {
		if (!browser || running) return;

		initBridge();
		running = true;
		lastTime = 0;
		animationId = requestAnimationFrame(loop);
	}

	/** Stop the engine */
	function stop(): void {
		running = false;
		if (animationId !== null) {
			cancelAnimationFrame(animationId);
			animationId = null;
		}
	}

	/** Add a node to the graph */
	function addNode(node: NodeInstance): void {
		nodes = [...nodes, node];
	}

	/** Remove a node and its connections */
	function removeNode(id: string): void {
		nodes = nodes.filter((n) => n.id !== id);
		connections = connections.filter(
			(c) => c.sourceId !== id && c.targetId !== id,
		);
	}

	/** Add a connection */
	function addConnection(conn: Connection): void {
		// Prevent duplicate connections to same target port
		connections = connections.filter(
			(c) => !(c.targetId === conn.targetId && c.targetPort === conn.targetPort),
		);
		connections = [...connections, conn];
	}

	/** Remove a connection */
	function removeConnection(id: string): void {
		connections = connections.filter((c) => c.id !== id);
	}

	/** Update node position */
	function updatePosition(id: string, x: number, y: number): void {
		const node = nodes.find((n) => n.id === id);
		if (node) {
			node.position = { x, y };
		}
	}

	/** Update node state (e.g., parameters) */
	function updateState(
		id: string,
		key: string,
		value: number | string,
	): void {
		const node = nodes.find((n) => n.id === id);
		if (node) {
			node.state = { ...node.state, [key]: value };
		}
	}

	/** Get computed input value for a node (useful for output nodes) */
	function getInputValue(nodeId: string, portId: string): number | string | undefined {
		const node = nodes.find((n) => n.id === nodeId);
		if (!node) return undefined;
		const inputs = gatherInputs(node);
		return inputs[portId];
	}

	/** Load a complete graph */
	function loadGraph(
		newNodes: NodeInstance[],
		newConnections: Connection[],
	): void {
		nodes = newNodes;
		connections = newConnections;
	}

	return {
		get nodes() {
			return nodes;
		},
		get connections() {
			return connections;
		},
		get running() {
			return running;
		},
		start,
		stop,
		addNode,
		removeNode,
		addConnection,
		removeConnection,
		updatePosition,
		updateState,
		loadGraph,
		getInputValue,
	};
}

export type NodeEngine = ReturnType<typeof createNodeEngine>;
