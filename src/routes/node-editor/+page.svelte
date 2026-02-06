<script lang="ts">
	/**
	 * Node Editor — SvelteFlow + Module System
	 *
	 * All nodes use a single nodeType (ModuleRenderer) that reads
	 * the ModuleDef from registry via data.moduleType.
	 *
	 * Engine: Uses Signal Library (src/lib/node-editor/graph) for evaluation.
	 * UI syncs bidirectionally with SignalGraph.
	 */

	import { onMount, onDestroy } from "svelte";
	import {
		SvelteFlowProvider,
		type Node,
		type Edge,
		type Connection,
		type NodeTypes,
	} from "@xyflow/svelte";
	import "@xyflow/svelte/dist/style.css";
	import { Workflow, Play, Square, Plus } from "lucide-svelte";
	import PageHeader from "$lib/components/PageHeader.svelte";
	import { FLOW_EDITOR_PROPS } from "$lib/flow/config";

	import {
		signalGraph,
		remap,
		type SignalEdge,
		setLfoSpeed,
		getBridgeStatus,
		initBridge,
		sendSettings,
		PARAMETER_PRESETS,
		NodeCatalog,
		EditorCanvas,
		ModuleRenderer,
		getModule,
	} from "$lib/node-editor";

	// Single nodeType — ModuleRenderer handles all module types
	const nodeTypes: NodeTypes = { module: ModuleRenderer };

	// SvelteFlow state (raw to avoid deep-proxy overhead)
	let nodes = $state.raw<Node[]>([]);
	let edges = $state.raw<Edge[]>([]);

	// Engine state
	let running = $state(false);
	let animationId: number | null = null;
	let lastTime = 0;

	// Sidebar state
	let sidebarOpen = $state(false);

	// Connection status
	let status = $state<"connected" | "disconnected" | "connecting" | "error">("disconnected");
	let statusInterval: ReturnType<typeof setInterval>;

	// Node ID counter
	let nodeIdCounter = 100;

	/** Create initial demo graph */
	function createDemoGraph(): { nodes: Node[]; edges: Edge[] } {
		const demoNodes: Node[] = [
			{
				id: "lfo-1",
				type: "module",
				position: { x: 50, y: 120 },
				data: { moduleType: "lfo", wave: 0, speed: 0.1 },
			},
			{
				id: "terrain-amplitude",
				type: "module",
				position: { x: 280, y: 50 },
				data: { moduleType: "slider", ...PARAMETER_PRESETS.terrainAmplitude },
			},
			{
				id: "fog-near",
				type: "module",
				position: { x: 280, y: 170 },
				data: { moduleType: "slider", ...PARAMETER_PRESETS.fogNear },
			},
			{
				id: "fog-far",
				type: "module",
				position: { x: 280, y: 290 },
				data: { moduleType: "slider", ...PARAMETER_PRESETS.fogFar },
			},
			{
				id: "sun-intensity",
				type: "module",
				position: { x: 280, y: 410 },
				data: { moduleType: "slider", ...PARAMETER_PRESETS.sunIntensity },
			},
		];

		const demoEdges: Edge[] = [
			{
				id: "e-lfo-terrain",
				source: "lfo-1",
				target: "terrain-amplitude",
				sourceHandle: "wave",
				targetHandle: "value",
				animated: true,
			},
		];

		return { nodes: demoNodes, edges: demoEdges };
	}

	/** Resolve the signal graph type from moduleType */
	function getSignalType(node: Node): string {
		return (node.data.moduleType as string) ?? "";
	}

	/**
	 * Sync SvelteFlow nodes → SignalGraph
	 */
	function syncNodesToGraph(): void {
		const graphNodeIds = new Set(signalGraph.getAllNodes().map((n) => n.id));
		const uiNodeIds = new Set(nodes.map((n) => n.id));

		for (const node of nodes) {
			const signalType = getSignalType(node);

			if (!graphNodeIds.has(node.id)) {
				const instance = signalGraph.addNode(node.id, signalType);
				if (instance && signalType === "lfo") {
					const speed = (node.data.speed as number) ?? 0.1;
					instance.state = setLfoSpeed(instance.state as { phase: number; baseSpeed: number }, speed);
				}
			} else if (signalType === "lfo") {
				const instance = signalGraph.getNode(node.id);
				if (instance) {
					const speed = (node.data.speed as number) ?? 0.1;
					instance.state = setLfoSpeed(
						instance.state as { phase: number; baseSpeed: number },
						speed,
					);
				}
			}
		}

		for (const instance of signalGraph.getAllNodes()) {
			if (!uiNodeIds.has(instance.id)) {
				signalGraph.removeNode(instance.id);
			}
		}
	}

	/**
	 * Sync SvelteFlow edges → SignalGraph
	 */
	function syncEdgesToGraph(): void {
		const graphEdgeIds = new Set(signalGraph.getAllEdges().map((e) => e.id));
		const uiEdgeIds = new Set(edges.map((e) => e.id));

		for (const edge of edges) {
			if (!graphEdgeIds.has(edge.id)) {
				const signalEdge: SignalEdge = {
					id: edge.id,
					sourceId: edge.source,
					sourcePort: edge.sourceHandle ?? "wave",
					targetId: edge.target,
					targetPort: edge.targetHandle ?? "value",
				};
				signalGraph.addEdge(signalEdge);
			}
		}

		for (const graphEdge of signalGraph.getAllEdges()) {
			if (!uiEdgeIds.has(graphEdge.id)) {
				signalGraph.removeEdge(graphEdge.id);
			}
		}
	}

	/**
	 * Sync SignalGraph outputs → SvelteFlow UI
	 */
	function syncGraphToUI(): void {
		let updated = false;

		for (const node of nodes) {
			const instance = signalGraph.getNode(node.id);
			if (!instance) continue;

			const moduleType = node.data.moduleType as string;

			if (moduleType === "lfo") {
				const wave = instance.outputs.wave ?? 0.5;
				const state = instance.state as { phase: number; baseSpeed: number };
				if (node.data.wave !== wave) {
					node.data = { ...node.data, wave, phase: state.phase };
					updated = true;
				}
			} else if (moduleType === "slider") {
				const normalizedValue = instance.outputs.out ?? 0.5;
				const min = node.data.min as number;
				const max = node.data.max as number;
				const value = remap(normalizedValue, min, max);
				const hasInput = edges.some((e) => e.target === node.id && e.targetHandle === "value");

				if (node.data.value !== value || node.data.driven !== hasInput) {
					node.data = { ...node.data, value, driven: hasInput };
					updated = true;

					const param = node.data.param as string;
					if (param) {
						sendSettings({ [param]: value });
					}
				}
			} else if (moduleType === "gate") {
				const gateValue = instance.outputs.gate ?? 0;
				const isOpen = gateValue > 0.5;
				if (node.data.open !== isOpen) {
					node.data = { ...node.data, open: isOpen };
					updated = true;
				}
			} else if (moduleType === "switch") {
				const out = instance.outputs.out ?? 0.25;
				const gateEdge = edges.find((e) => e.target === node.id && e.targetHandle === "gate");
				const gateActive = gateEdge
					? signalGraph.getOutput(gateEdge.source, gateEdge.sourceHandle ?? "gate") > 0.5
					: false;

				if (node.data.out !== out || node.data.gateActive !== gateActive) {
					node.data = { ...node.data, out, gateActive };
					updated = true;
				}
			} else if (moduleType === "color") {
				const r = Math.round((instance.outputs.r ?? 0.5) * 255);
				const g = Math.round((instance.outputs.g ?? 0.5) * 255);
				const b = Math.round((instance.outputs.b ?? 0.5) * 255);
				const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
				const hasInput = edges.some((e) => e.target === node.id);

				if (hasInput && node.data.value !== hex) {
					node.data = { ...node.data, value: hex };
					sendSettings({ [node.data.param as string]: hex });
					updated = true;
				}
			}
		}

		if (updated) {
			nodes = [...nodes];
		}
	}

	/** Animation loop */
	function loop(time: number): void {
		if (!running) return;

		const dt = lastTime === 0 ? 0.016 : (time - lastTime) / 1000;
		lastTime = time;

		syncNodesToGraph();
		syncEdgesToGraph();
		signalGraph.evaluate(dt);
		syncGraphToUI();

		animationId = requestAnimationFrame(loop);
	}

	function start(): void {
		if (running) return;
		initBridge();

		signalGraph.clear();
		syncNodesToGraph();
		syncEdgesToGraph();

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

	function handleConnect(connection: Connection) {
		const edgeId = `e-${connection.source}-${connection.sourceHandle}-${connection.target}-${connection.targetHandle}`;
		if (edges.some((e) => e.id === edgeId)) return;

		const newEdge: Edge = {
			id: edgeId,
			source: connection.source,
			target: connection.target,
			sourceHandle: connection.sourceHandle,
			targetHandle: connection.targetHandle,
			animated: true,
		};

		edges = [...edges, newEdge];
	}

	function toggleSidebar(): void {
		sidebarOpen = !sidebarOpen;
	}

	/** Handle drop on canvas — create new node from module registry */
	function handleNodeDrop(nodeType: string, position: { x: number; y: number }): void {
		const moduleDef = getModule(nodeType);
		if (!moduleDef) return;

		const newId = `${nodeType}-${nodeIdCounter++}`;
		const newNode: Node = {
			id: newId,
			type: "module",
			position,
			data: { moduleType: nodeType, ...moduleDef.defaultData },
		};

		nodes = [...nodes, newNode];
	}

	onMount(() => {
		const demo = createDemoGraph();
		nodes = demo.nodes;
		edges = demo.edges;
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
				onconnect={handleConnect}
				ondrop={handleNodeDrop}
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
