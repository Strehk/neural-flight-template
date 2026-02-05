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
		SvelteFlow,
		SvelteFlowProvider,
		Background,
		Controls,
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

	// Canvas wrapper ref for drop coordinate calculation
	let canvasWrapper: HTMLDivElement;

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

		// Add new nodes to graph
		for (const node of nodes) {
			if (!graphNodeIds.has(node.id)) {
				const instance = signalGraph.addNode(node.id, node.type ?? "");
				if (instance && node.type === "lfo") {
					// Sync initial speed from UI
					const speed = (node.data.speed as number) ?? 0.1;
					instance.state = setLfoSpeed(instance.state as { phase: number; baseSpeed: number }, speed);
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
				// Get normalized value (0-1) from graph
				const normalizedValue = instance.outputs.out ?? 0.5;
				const min = node.data.min as number;
				const max = node.data.max as number;

				// Remap to actual parameter range
				const value = remap(normalizedValue, min, max);

				// Check if driven by a connection
				const hasInput = edges.some((e) => e.target === node.id && e.targetHandle === "value");

				if (node.data.value !== value || node.data.driven !== hasInput) {
					node.data = { ...node.data, value, driven: hasInput };
					updated = true;

					// Send to VR scene
					const param = node.data.param as string;
					if (param) {
						sendSettings({ [param]: value });
					}
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

	/** Handle new connections */
	function handleConnect(connection: Connection) {
		const newEdge: Edge = {
			id: `e-${connection.source}-${connection.sourceHandle}-${connection.target}-${connection.targetHandle}`,
			source: connection.source,
			target: connection.target,
			sourceHandle: connection.sourceHandle,
			targetHandle: connection.targetHandle,
			animated: true,
		};

		// Remove existing edge to same target handle (one connection per input)
		edges = edges.filter(
			(e) => !(e.target === connection.target && e.targetHandle === connection.targetHandle),
		);
		edges = [...edges, newEdge];
	}

	/** Toggle sidebar */
	function toggleSidebar(): void {
		sidebarOpen = !sidebarOpen;
	}

	/** Handle drag over canvas (required for drop to work) */
	function handleDragOver(e: DragEvent): void {
		e.preventDefault();
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = "move";
		}
	}

	/** Handle drop on canvas — create new node */
	function handleDrop(e: DragEvent): void {
		e.preventDefault();
		if (!e.dataTransfer || !canvasWrapper) return;

		const nodeType = e.dataTransfer.getData("application/reactflow");
		if (!nodeType) return;

		// Calculate position relative to canvas wrapper
		const bounds = canvasWrapper.getBoundingClientRect();
		const position = {
			x: e.clientX - bounds.left,
			y: e.clientY - bounds.top,
		};
		const newId = `${nodeType}-${nodeIdCounter++}`;

		let newNode: Node;

		switch (nodeType) {
			case "lfo":
				newNode = {
					id: newId,
					type: "lfo",
					position,
					data: { wave: 0, speed: 0.1 },
				};
				break;
			case "slider":
				// Default to terrain amplitude preset
				newNode = {
					id: newId,
					type: "slider",
					position,
					data: { ...PARAMETER_PRESETS.terrainAmplitude },
				};
				break;
			case "color":
				newNode = {
					id: newId,
					type: "color",
					position,
					data: { label: "Color", param: "ringColor", value: "#f1c40f" },
				};
				break;
			case "gate":
				newNode = {
					id: newId,
					type: "gate",
					position,
					data: { open: false, duration: 0.5, eventType: "ring-pass" },
				};
				break;
			case "switch":
				newNode = {
					id: newId,
					type: "switch",
					position,
					data: { a: 0.25, b: 0.75, out: 0.25 },
				};
				break;
			default:
				// Unknown type — skip
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
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="editor-canvas" bind:this={canvasWrapper} ondragover={handleDragOver} ondrop={handleDrop}>
			<SvelteFlowProvider>
			<SvelteFlow
				bind:nodes
				bind:edges
				{nodeTypes}
				colorMode="dark"
				fitView
				onconnect={handleConnect}
				{...FLOW_EDITOR_PROPS}
			>
				<Background />
				<Controls />
			</SvelteFlow>
			</SvelteFlowProvider>
		</div>
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

	.editor-canvas {
		width: 100%;
		height: 100%;
	}

	/* Active sidebar toggle button */
	:global(.header-settings-btn.active) {
		background: var(--accent-muted);
		color: var(--bg);
	}
</style>
