<script lang="ts">
	/**
	 * Node Editor — SvelteFlow Native Implementation
	 *
	 * Pattern: "One Cable, One Function"
	 * Each VR parameter is its own SliderNode with input handle.
	 * LFO nodes can drive multiple sliders via connections.
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

	// Node Editor imports
	import {
		signalGraph,
		remap,
		type SignalEdge,
		setLfoSpeed,
		getBridgeStatus,
		initBridge,
		sendSettings,
		PARAMETER_PRESETS,
		LfoNode,
		SliderNode,
		ColorNode,
		GateNode,
		SwitchNode,
		NodeCatalog,
		EditorCanvas,
	} from "$lib/node-editor";

	// Register custom node types
	const nodeTypes: NodeTypes = {
		lfo: LfoNode,
		slider: SliderNode,
		color: ColorNode,
		gate: GateNode,
		switch: SwitchNode,
	};

	// SvelteFlow state
	let nodes = $state<Node[]>([]);
	let edges = $state<Edge[]>([]);

	// Engine state
	let running = $state(false);
	let animationId: number | null = null;
	let lastTime = 0;

	// Sidebar state
	let sidebarOpen = $state(false);

	// Connection status
	let status = $state<"connected" | "disconnected" | "connecting" | "error">("disconnected");
	let statusInterval: ReturnType<typeof setInterval>;

	// Node ID counter for unique IDs
	let nodeIdCounter = 100;

	/** Create initial demo graph */
	function createDemoGraph(): { nodes: Node[]; edges: Edge[] } {
		const demoNodes: Node[] = [
			// LFO Node (source)
			{
				id: "lfo-1",
				type: "lfo",
				position: { x: 50, y: 120 },
				data: { wave: 0, speed: 0.1 },
			},

			// Parameter Slider Nodes (targets)
			{
				id: "terrain-amplitude",
				type: "slider",
				position: { x: 280, y: 50 },
				data: { ...PARAMETER_PRESETS.terrainAmplitude },
			},
			{
				id: "fog-near",
				type: "slider",
				position: { x: 280, y: 170 },
				data: { ...PARAMETER_PRESETS.fogNear },
			},
			{
				id: "fog-far",
				type: "slider",
				position: { x: 280, y: 290 },
				data: { ...PARAMETER_PRESETS.fogFar },
			},
			{
				id: "sun-intensity",
				type: "slider",
				position: { x: 280, y: 410 },
				data: { ...PARAMETER_PRESETS.sunIntensity },
			},
		];

		const demoEdges: Edge[] = [
			// Connect LFO to terrain amplitude (demo connection)
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

	/**
	 * Sync SvelteFlow nodes → SignalGraph
	 * Adds new nodes, removes deleted ones, updates state from UI.
	 */
	function syncNodesToGraph(): void {
		const graphNodeIds = new Set(signalGraph.getAllNodes().map((n) => n.id));
		const uiNodeIds = new Set(nodes.map((n) => n.id));

		// Add new nodes / sync existing LFO speed
		for (const node of nodes) {
			if (!graphNodeIds.has(node.id)) {
				const instance = signalGraph.addNode(node.id, node.type ?? "");
				if (instance && node.type === "lfo") {
					const speed = (node.data.speed as number) ?? 0.1;
					instance.state = setLfoSpeed(instance.state as { phase: number; baseSpeed: number }, speed);
				}
			} else if (node.type === "lfo") {
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

		// Remove deleted nodes from graph
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

		// Add new edges to graph
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

		// Remove deleted edges from graph
		for (const graphEdge of signalGraph.getAllEdges()) {
			if (!uiEdgeIds.has(graphEdge.id)) {
				signalGraph.removeEdge(graphEdge.id);
			}
		}
	}

	/**
	 * Sync SignalGraph outputs → SvelteFlow UI
	 * Updates node.data with computed values and sends to VR.
	 */
	function syncGraphToUI(): void {
		let updated = false;

		for (const node of nodes) {
			const instance = signalGraph.getNode(node.id);
			if (!instance) continue;

			if (node.type === "lfo") {
				// Update wave output for UI display
				const wave = instance.outputs.wave ?? 0.5;
				const state = instance.state as { phase: number; baseSpeed: number };
				if (node.data.wave !== wave) {
					node.data = { ...node.data, wave, phase: state.phase };
					updated = true;
				}
			} else if (node.type === "slider") {
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
			} else if (node.type === "gate") {
				const gateValue = instance.outputs.gate ?? 0;
				const isOpen = gateValue > 0.5;
				if (node.data.open !== isOpen) {
					node.data = { ...node.data, open: isOpen };
					updated = true;
				}
			} else if (node.type === "switch") {
				const out = instance.outputs.out ?? 0.25;
				const gateInput = edges.some((e) => e.target === node.id && e.targetHandle === "gate");
				const gateActive = gateInput
					? (signalGraph.getOutput(
							edges.find((e) => e.target === node.id && e.targetHandle === "gate")!.source,
							edges.find((e) => e.target === node.id && e.targetHandle === "gate")!.sourceHandle ?? "gate",
						) > 0.5)
					: false;

				if (node.data.out !== out || node.data.gateActive !== gateActive) {
					node.data = { ...node.data, out, gateActive };
					updated = true;
				}
			} else if (node.type === "color") {
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
			nodes = [...nodes]; // Trigger reactivity
		}
	}

	/** Animation loop */
	function loop(time: number): void {
		if (!running) return;

		const dt = lastTime === 0 ? 0.016 : (time - lastTime) / 1000;
		lastTime = time;

		// Sync UI state → Signal Graph (handles additions/removals)
		syncNodesToGraph();
		syncEdgesToGraph();

		// Evaluate graph (topological sort + compute all nodes)
		signalGraph.evaluate(dt);

		// Sync results back to UI
		syncGraphToUI();

		animationId = requestAnimationFrame(loop);
	}

	/** Start the engine */
	function start(): void {
		if (running) return;
		initBridge();

		// Initialize signal graph with current nodes/edges
		signalGraph.clear();
		syncNodesToGraph();
		syncEdgesToGraph();

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

	/** Toggle engine running state */
	function toggleEngine(): void {
		if (running) {
			stop();
		} else {
			start();
		}
	}

	/** Handle new connections (allows multiple inputs for signal mixing) */
	function handleConnect(connection: Connection) {
		const edgeId = `e-${connection.source}-${connection.sourceHandle}-${connection.target}-${connection.targetHandle}`;

		const duplicate = edges.some((e) => e.id === edgeId);
		if (duplicate) return;

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

	/** Toggle sidebar */
	function toggleSidebar(): void {
		sidebarOpen = !sidebarOpen;
	}

	/** Handle drop on canvas — create new node at flow position */
	function handleNodeDrop(nodeType: string, position: { x: number; y: number }): void {
		const newId = `${nodeType}-${nodeIdCounter++}`;

		let newNode: Node;

		switch (nodeType) {
			case "lfo":
				newNode = { id: newId, type: "lfo", position, data: { wave: 0, speed: 0.1 } };
				break;
			case "slider":
				newNode = { id: newId, type: "slider", position, data: { ...PARAMETER_PRESETS.terrainAmplitude } };
				break;
			case "color":
				newNode = { id: newId, type: "color", position, data: { label: "Color", param: "ringColor", value: "#f1c40f" } };
				break;
			case "gate":
				newNode = { id: newId, type: "gate", position, data: { open: false, duration: 0.5, eventType: "ring-pass" } };
				break;
			case "switch":
				newNode = { id: newId, type: "switch", position, data: { a: 0.25, b: 0.75, out: 0.25 } };
				break;
			default:
				return;
		}

		nodes = [...nodes, newNode];
	}

	onMount(() => {
		// Load demo graph
		const demo = createDemoGraph();
		nodes = demo.nodes;
		edges = demo.edges;

		// Start engine
		start();

		// Update connection status
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

	/* Active sidebar toggle button */
	:global(.header-settings-btn.active) {
		background: var(--accent-muted);
		color: var(--bg);
	}
</style>
