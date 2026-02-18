<script lang="ts">
	/**
	 * ModulationCanvas — SvelteFlow canvas for modulation routing.
	 *
	 * Reuses EditorCanvas + SvelteFlowProvider from the node editor.
	 * Shader Node (sink) + Source Nodes (LFO, Noise, etc.) + Edge Sync → SignalGraph.
	 *
	 * State (nodes, edges, sourceEngineMap) is owned by playground_state
	 * so it persists across tab switches.
	 */

	import {
		type Connection,
		type Edge,
		type Node,
		type NodeTypes,
		SvelteFlowProvider,
	} from "@xyflow/svelte";
	import { onDestroy, untrack } from "svelte";
	import "@xyflow/svelte/dist/style.css";
	import { FLOW_EDITOR_PROPS } from "$lib/flow/config";
	import { EditorCanvas } from "$lib/node-editor";
	import ShaderNodeRenderer from "./ShaderNodeRenderer.svelte";
	import SourceNodeRenderer from "./SourceNodeRenderer.svelte";
	import { getModSource } from "../modulation_nodes";
	import type { ModulationBridge } from "../modulation";
	import type { UniformDef } from "../types";

	interface Props {
		bridge: ModulationBridge | null;
		endpointUniforms: UniformDef[];
		nodes: Node[];
		edges: Edge[];
		sourceEngineMap: Map<string, string>;
	}

	let {
		bridge,
		endpointUniforms,
		nodes = $bindable(),
		edges = $bindable(),
		sourceEngineMap,
	}: Props = $props();

	const nodeTypes: NodeTypes = {
		"shader-code": ShaderNodeRenderer,
		"mod-source": SourceNodeRenderer,
	};

	const SHADER_NODE_ID = "shader-node";

	let nodeCounter = 0;
	let edgeCounter = 0;

	// ── Initialize shader node if nodes are empty ──

	$effect(() => {
		if (nodes.length === 0) {
			nodes = [
				{
					id: SHADER_NODE_ID,
					type: "shader-code",
					position: { x: 400, y: 100 },
					data: { label: "Shader", inputs: [] },
					draggable: true,
					deletable: false,
				},
			];
		}
	});

	// ── Sync shader node inputs when endpoints change ──

	const shaderNodeInputs = $derived(
		endpointUniforms.map((ep) => ({
			id: ep.name,
			label: ep.label ?? ep.name,
		})),
	);

	let lastInputsJSON = "";

	$effect(() => {
		const inputs = shaderNodeInputs;
		const json = JSON.stringify(inputs);
		if (json === lastInputsJSON) return;
		lastInputsJSON = json;

		nodes = untrack(() => nodes).map((n) =>
			n.id === SHADER_NODE_ID
				? { ...n, data: { ...n.data, inputs, label: "Shader" } }
				: n,
		);
	});

	// ── Source Node Drop ──

	function handleDrop(
		sourceType: string,
		position: { x: number; y: number },
	): void {
		if (!bridge) return;

		const source = getModSource(sourceType);
		if (!source) return;

		const sfId = `source-${++nodeCounter}`;
		const engineId = bridge.addSource(sourceType);
		sourceEngineMap.set(sfId, engineId);

		nodes = [
			...nodes,
			{
				id: sfId,
				type: "mod-source",
				position,
				data: { sourceType },
			},
		];
	}

	// ── Edge Sync (Canvas → Bridge) ──

	function syncEdges(currentEdges: Edge[], currentNodes: Node[]): void {
		if (!bridge) return;

		const currentEdgeIds = new Set(currentEdges.map((e) => e.id));

		for (const edge of currentEdges) {
			const sourceEngineId = sourceEngineMap.get(edge.source);
			if (!sourceEngineId) continue;

			const endpointId = bridge.getEndpointNodeId(
				edge.targetHandle ?? "",
			);
			if (!endpointId) continue;

			const graphEdges = bridge.graph.getAllEdges();
			if (graphEdges.some((ge) => ge.id === edge.id)) continue;

			const source = getModSource(
				(
					currentNodes.find((n) => n.id === edge.source)?.data as Record<
						string,
						unknown
					>
				)?.sourceType as string,
			);
			if (!source) continue;

			bridge.connect(sourceEngineId, source.outputPort, endpointId, edge.id);
		}

		for (const graphEdge of bridge.graph.getAllEdges()) {
			if (graphEdge.id.startsWith("edge_")) continue;
			if (!currentEdgeIds.has(graphEdge.id)) {
				bridge.disconnect(graphEdge.id);
			}
		}
	}

	// ── Connection handler ──

	function handleConnect(connection: Connection): void {
		edgeCounter++;
		const newEdge: Edge = {
			id: `mod-edge-${edgeCounter}`,
			source: connection.source,
			sourceHandle: connection.sourceHandle,
			target: connection.target,
			targetHandle: connection.targetHandle,
		};
		edges = [...edges, newEdge];
	}

	// ── Cleanup deleted source nodes ──

	function cleanupDeletedNodes(currentNodes: Node[]): void {
		if (!bridge) return;
		const sfIds = new Set(currentNodes.map((n) => n.id));
		for (const [sfId, engineId] of sourceEngineMap) {
			if (sfIds.has(sfId)) continue;
			bridge.removeSource(engineId);
			sourceEngineMap.delete(sfId);
		}
	}

	$effect(() => {
		if (!bridge) return;
		const currentEdges = edges;
		const currentNodes = nodes;
		untrack(() => {
			cleanupDeletedNodes(currentNodes);
			syncEdges(currentEdges, currentNodes);
		});
	});

	// ── Validation ──

	function isValidConnection(connection: Connection | Edge): boolean {
		return connection.target === SHADER_NODE_ID;
	}

	onDestroy(() => {
		if (bridge) {
			for (const [, engineId] of sourceEngineMap) {
				bridge.removeSource(engineId);
			}
		}
		sourceEngineMap.clear();
	});
</script>

<div class="modulation-layout">
	{#if endpointUniforms.length === 0}
		<div class="modulation-help">
			<p class="modulation-help-title">No endpoints found</p>
			<p class="modulation-help-text">
				Add <code>@endpoint</code> annotations to your uniforms to modulate them from the Node Editor.
			</p>
			<pre class="modulation-help-example">uniform float brightness; // @endpoint min:0 max:1
uniform vec3 tint; // @endpoint default:#FF00FF color</pre>
		</div>
	{/if}

	<div class="modulation-canvas-wrap">
		<SvelteFlowProvider>
			<EditorCanvas
				bind:nodes
				bind:edges
				{nodeTypes}
				flowProps={FLOW_EDITOR_PROPS}
				ondrop={handleDrop}
				onconnect={handleConnect}
				{isValidConnection}
			/>
		</SvelteFlowProvider>
	</div>
</div>

<style>
	.modulation-layout {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		position: relative;
	}

	.modulation-canvas-wrap {
		flex: 1;
		min-width: 0;
		min-height: 0;
		height: 100%;
	}

	.modulation-help {
		padding: var(--space-sm) var(--space-md);
		background: color-mix(in srgb, var(--accent) 5%, var(--bg));
		border-bottom: 1px solid var(--border-subtle);
		font-family: var(--font-main);
	}

	.modulation-help-title {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-muted);
		margin: 0 0 var(--space-xs);
	}

	.modulation-help-text {
		font-size: 0.7rem;
		color: var(--text-subtle);
		margin: 0 0 var(--space-xs);
	}

	.modulation-help-text code {
		background: var(--surface);
		padding: 0.1rem 0.3rem;
		border-radius: var(--radius-sm);
		color: var(--accent);
		font-family: var(--font-mono);
		font-size: 0.65rem;
	}

	.modulation-help-example {
		background: var(--surface);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-sm);
		font-family: var(--font-mono);
		font-size: 0.6rem;
		color: var(--text-muted);
		margin: 0;
		white-space: pre-wrap;
		line-height: 1.5;
	}
</style>
