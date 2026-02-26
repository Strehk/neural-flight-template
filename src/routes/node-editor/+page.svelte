<script lang="ts">
/**
 * Node Editor — SvelteFlow Canvas + Signal Engine
 *
 * Orchestrates the loop: Drop → Engine Registration → Edge Sync → Evaluate → Output Sync
 * Uses $state.raw for nodes/edges — only reassignment triggers SvelteFlow updates.
 *
 * Key mapping: 1 SvelteFlow node = N engine components (via nodeEngineMap).
 * ExposedPort edges are resolved to engine component ports via inputWires/outputWires.
 */

import {
	type Connection,
	type Edge,
	type Node,
	type NodeTypes,
	SvelteFlowProvider,
} from "@xyflow/svelte";
import { onDestroy, onMount } from "svelte";
import "@xyflow/svelte/dist/style.css";
import { Play, Plus, Square, Workflow } from "lucide-svelte";
import PageHeader from "$lib/components/PageHeader.svelte";
import { FLOW_EDITOR_PROPS } from "$lib/flow/config";

import {
	EditorCanvas,
	getBridgeStatus,
	initBridge,
	ModuleRenderer,
	NodeCatalog,
	registerNodeType,
	sendSettings,
	signalGraph,
} from "$lib/node-editor";
import { remap } from "$lib/node-editor/graph/types";
import { getNodeDef } from "$lib/node-editor/nodes/registry";
import { getPreset } from "$lib/node-editor/parameters/registry";

const nodeTypes: NodeTypes = { module: ModuleRenderer };

let nodes = $state.raw<Node[]>([]);
let edges = $state.raw<Edge[]>([]);

let running = $state(false);
let animationId: number | null = null;
let lastTime = 0;

let sidebarOpen = $state(false);
let status = $state<"connected" | "disconnected" | "connecting" | "error">(
	"disconnected",
);
let statusInterval: ReturnType<typeof setInterval>;

/** SvelteFlow node ID → engine node IDs (1 SF node = N engine components) */
const nodeEngineMap = new Map<string, string[]>();
let nodeCounter = 0;

// ── Port Resolution ──────────────────────────────────────────────

/**
 * Resolve ExposedPort → engine component + port.
 * Scans NodeDef inputWires/outputWires to find which component owns the port.
 */
function resolveExposedPort(
	sfNodeId: string,
	exposedPortId: string,
	side: "output" | "input",
): { engineNodeId: string; portId: string } | null {
	const sfNode = nodes.find((n) => n.id === sfNodeId);
	if (!sfNode) return null;

	const def = getNodeDef(sfNode.data.nodeType as string);
	if (!def) return null;

	const wireKey = side === "output" ? "outputWires" : "inputWires";
	for (const slot of def.components) {
		const wires = slot[wireKey] as Record<string, string | null>;
		for (const [port, signal] of Object.entries(wires)) {
			if (signal === exposedPortId) {
				return {
					engineNodeId: `${sfNodeId}_${slot.id}`,
					portId: port,
				};
			}
		}
	}
	return null;
}

// ── Node Drop ────────────────────────────────────────────────────

function handleNodeDrop(
	nodeType: string,
	position: { x: number; y: number },
): void {
	const def = getNodeDef(nodeType);
	if (!def) return;

	const sfId = `node-${++nodeCounter}`;

	// Init flat data with output port defaults
	const data: Record<string, unknown> = { nodeType };
	for (const slot of def.components) {
		for (const port of slot.signal.outputs) {
			data[port.id] = port.default;
		}
	}

	// Dynamic channel count for mixer nodes
	if (def.type === "mixer") {
		data._channelCount = 2;
	}

	// Create SvelteFlow node
	nodes = [...nodes, { id: sfId, type: "module", position, data }];

	// Skip engine registration for nodes without components (output sinks)
	if (def.components.length === 0) return;

	// Register + create engine component instances
	const engineIds: string[] = [];
	for (const slot of def.components) {
		registerNodeType(slot.signal);
		const engineId = `${sfId}_${slot.id}`;
		signalGraph.addNode(engineId, slot.signal.type);
		engineIds.push(engineId);
	}
	nodeEngineMap.set(sfId, engineIds);

	// Set initial channelCount for mixer (raw integer, not 0-1)
	if (def.type === "mixer") {
		signalGraph.setInput(`${sfId}_mixer`, "channelCount", 2);
	}

	// Internal wires — build signal→source map, then connect
	const sources = new Map<string, { engineId: string; port: string }>();
	for (const slot of def.components) {
		const eid = `${sfId}_${slot.id}`;
		for (const [port, signal] of Object.entries(slot.outputWires)) {
			sources.set(signal, { engineId: eid, port });
		}
	}
	for (const slot of def.components) {
		const eid = `${sfId}_${slot.id}`;
		for (const [port, signal] of Object.entries(slot.inputWires)) {
			if (signal === null) continue;
			const src = sources.get(signal);
			if (!src) continue; // exposed port — wired by user cable
			signalGraph.addEdge({
				id: `internal-${src.engineId}-${src.port}-${eid}-${port}`,
				sourceId: src.engineId,
				sourcePort: src.port,
				targetId: eid,
				targetPort: port,
			});
		}
	}
}

// ── Edge Sync ────────────────────────────────────────────────────

function syncEdgesToGraph(): void {
	const graphEdgeIds = new Set(signalGraph.getAllEdges().map((e) => e.id));
	const uiEdgeIds = new Set(edges.map((e) => e.id));

	// Add new canvas edges → engine
	for (const edge of edges) {
		if (graphEdgeIds.has(edge.id)) continue;
		const source = resolveExposedPort(
			edge.source,
			edge.sourceHandle ?? "",
			"output",
		);
		const target = resolveExposedPort(
			edge.target,
			edge.targetHandle ?? "",
			"input",
		);
		if (!source || !target) continue;
		signalGraph.addEdge({
			id: edge.id,
			sourceId: source.engineNodeId,
			sourcePort: source.portId,
			targetId: target.engineNodeId,
			targetPort: target.portId,
		});
	}

	// Remove engine edges deleted on canvas (skip internal wires)
	for (const graphEdge of signalGraph.getAllEdges()) {
		if (graphEdge.id.startsWith("internal-")) continue;
		if (!uiEdgeIds.has(graphEdge.id)) {
			signalGraph.removeEdge(graphEdge.id);
		}
	}
}

// ── Output Sync ($state.raw reassignment) ────────────────────────

function syncOutputs(): void {
	let anyChanged = false;
	const updated = nodes.map((sfNode) => {
		const def = getNodeDef(sfNode.data.nodeType as string);
		if (!def || def.components.length === 0) return sfNode;

		const newData: Record<string, unknown> = { ...sfNode.data };
		let nodeChanged = false;

		for (const slot of def.components) {
			const instance = signalGraph.getNode(`${sfNode.id}_${slot.id}`);
			if (!instance) continue;
			for (const [key, val] of Object.entries(instance.outputs)) {
				if (newData[key] !== val) {
					newData[key] = val;
					nodeChanged = true;
				}
			}
		}

		if (nodeChanged) {
			anyChanged = true;
			return { ...sfNode, data: newData };
		}
		return sfNode;
	});

	if (anyChanged) nodes = updated;
}

// ── Node Cleanup (after SvelteFlow delete) ──────────────────────

function cleanupDeletedNodes(): void {
	const sfIds = new Set(nodes.map((n) => n.id));
	for (const [sfId, engineIds] of nodeEngineMap) {
		if (sfIds.has(sfId)) continue;
		for (const engineId of engineIds) {
			signalGraph.removeNode(engineId);
		}
		nodeEngineMap.delete(sfId);
	}
}

function isValidConnection(_connection: Connection | Edge): boolean {
	return true; // All types cross-compatible (R3)
}

function toggleSidebar(): void {
	sidebarOpen = !sidebarOpen;
}

// ── Bridge Sync (Signal 0-1 → remap → VR) ───────────────────
// Output Nodes are pure sinks (components: []). Remap from 0-1
// to real-world range happens HERE via PARAMETER_PRESETS.

function syncBridge(): void {
	const settings: Record<string, number> = {};

	for (const sfNode of nodes) {
		const def = getNodeDef(sfNode.data.nodeType as string);
		if (!def || def.category !== "output") continue;

		const paramKey = def.type.replace("output-", "");
		const edge = edges.find(
			(e) => e.target === sfNode.id && e.targetHandle === "value",
		);
		if (!edge) continue;

		const source = resolveExposedPort(
			edge.source,
			edge.sourceHandle ?? "",
			"output",
		);
		if (!source) continue;

		const signal = signalGraph.getOutput(source.engineNodeId, source.portId);
		const preset = getPreset(paramKey);
		settings[paramKey] = preset
			? remap(signal, preset.min, preset.max)
			: signal;
	}

	if (Object.keys(settings).length > 0) {
		sendSettings(settings);
	}
}

// ── Engine Loop ──────────────────────────────────────────────────

function loop(time: number): void {
	if (!running) return;
	const dt = lastTime === 0 ? 0.016 : (time - lastTime) / 1000;
	lastTime = time;

	cleanupDeletedNodes();
	syncEdgesToGraph();
	signalGraph.evaluate(dt);
	syncOutputs();
	syncBridge();

	animationId = requestAnimationFrame(loop);
}

function start(): void {
	if (running) return;
	initBridge();
	running = true;
	lastTime = 0;
	animationId = requestAnimationFrame(loop);
}

function stop(): void {
	running = false;
	if (animationId !== null) {
		cancelAnimationFrame(animationId);
		animationId = null;
	}
}

function toggleEngine(): void {
	running ? stop() : start();
}

onMount(() => {
	start();
	statusInterval = setInterval(() => {
		status = getBridgeStatus();
	}, 500);
});

onDestroy(() => {
	stop();
	clearInterval(statusInterval);
});
</script>

<svelte:head>
	<title>Node Editor | ICAROS</title>
</svelte:head>

<NodeCatalog open={sidebarOpen} onClose={toggleSidebar} />

<div class="editor-page">
	<PageHeader icon={Workflow} label="Node Editor" {status}>
		{#snippet actions()}
			<button
				class="header-settings-btn"
				onclick={toggleEngine}
				aria-label={running ? "Stop" : "Start"}
			>
				{#if running}
					<Square size={16} />
				{:else}
					<Play size={16} />
				{/if}
			</button>
			<button
				class="header-settings-btn"
				onclick={toggleSidebar}
				aria-label="Add node"
				class:active={sidebarOpen}
			>
				<Plus size={16} />
			</button>
		{/snippet}
	</PageHeader>

	<main class="editor-main">
		<SvelteFlowProvider>
			<EditorCanvas
				bind:nodes
				bind:edges
				{nodeTypes}
				flowProps={FLOW_EDITOR_PROPS}
				ondrop={handleNodeDrop}
				{isValidConnection}
			/>
		</SvelteFlowProvider>
	</main>
</div>

<style>
	.editor-page {
		display: flex;
		flex-direction: column;
		height: 100dvh;
		background: var(--bg);
	}

	.editor-main {
		flex: 1;
		overflow: hidden;
	}

	:global(.header-settings-btn.active) {
		background: var(--accent-muted);
		color: var(--bg);
	}
</style>
