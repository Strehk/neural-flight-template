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
		type SignalEdge,
		getBridgeStatus,
		initBridge,
		sendSettings,
		NodeCatalog,
		EditorCanvas,
		ModuleRenderer,
		getNodeDef,
		getModule,
		resolvePortType,
		arePortTypesCompatible,
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

	/** Create a param node with defaults from the module registry */
	function createParamNode(
		id: string,
		presetKey: string,
		position: { x: number; y: number },
	): Node {
		const nodeType = `param-${presetKey}`;
		const moduleDef = getModule(nodeType);
		return {
			id,
			type: "module",
			position,
			data: { moduleType: nodeType, ...moduleDef?.defaultData },
		};
	}

	/** Create initial demo graph — showcases all 4 node categories */
	function createDemoGraph(): { nodes: Node[]; edges: Edge[] } {
		const demoNodes: Node[] = [
			// Input: LFO
			{
				id: "lfo-1",
				type: "module",
				position: { x: 50, y: 100 },
				data: { moduleType: "lfo", wave: 0, speed: 0.15 },
			},
			// Trigger: Gate
			{
				id: "gate-1",
				type: "module",
				position: { x: 300, y: 220 },
				data: { moduleType: "gate", open: false, duration: 0.8, eventType: "ring-pass" },
			},
			// Process: Switch (A/B blend via gate)
			{
				id: "switch-1",
				type: "module",
				position: { x: 540, y: 180 },
				data: { moduleType: "switch", out: 0.25, gateActive: false },
			},
			// Output: Color (showcase, unconnected)
			{
				id: "color-1",
				type: "module",
				position: { x: 50, y: 380 },
				data: { moduleType: "color", value: "#4caf50" },
			},
			// Parameter nodes — driven
			createParamNode("terrain-amplitude", "terrainAmplitude", { x: 300, y: 20 }),
			createParamNode("fog-near", "fogNear", { x: 780, y: 100 }),
			createParamNode("sun-intensity", "sunIntensity", { x: 780, y: 240 }),
			// Parameter nodes — manual
			createParamNode("water-level", "waterLevel", { x: 300, y: 380 }),
			createParamNode("fog-far", "fogFar", { x: 540, y: 380 }),
			createParamNode("terrain-frequency", "terrainFrequency", { x: 780, y: 380 }),
		];

		const demoEdges: Edge[] = [
			// LFO → Terrain Amplitude (direct modulation)
			{
				id: "e-lfo-terrain",
				source: "lfo-1",
				target: "terrain-amplitude",
				sourceHandle: "wave",
				targetHandle: "value",
				animated: true,
			},
			// LFO → Gate trigger
			{
				id: "e-lfo-gate",
				source: "lfo-1",
				target: "gate-1",
				sourceHandle: "wave",
				targetHandle: "trigger",
				animated: true,
			},
			// LFO → Switch input A
			{
				id: "e-lfo-switch-a",
				source: "lfo-1",
				target: "switch-1",
				sourceHandle: "wave",
				targetHandle: "a",
				animated: true,
			},
			// Gate → Switch gate control
			{
				id: "e-gate-switch",
				source: "gate-1",
				target: "switch-1",
				sourceHandle: "gate",
				targetHandle: "gate",
				animated: true,
			},
			// Switch → Fog Near
			{
				id: "e-switch-fog",
				source: "switch-1",
				target: "fog-near",
				sourceHandle: "out",
				targetHandle: "value",
				animated: true,
			},
			// Switch → Sun Intensity
			{
				id: "e-switch-sun",
				source: "switch-1",
				target: "sun-intensity",
				sourceHandle: "out",
				targetHandle: "value",
				animated: true,
			},
		];

		return { nodes: demoNodes, edges: demoEdges };
	}

	/** Resolve the signal graph type from moduleType (decoupled via NodeDef) */
	function getSignalType(node: Node): string {
		const moduleType = (node.data.moduleType as string) ?? "";
		const nodeDef = getNodeDef(moduleType);
		return nodeDef?.signal.type ?? moduleType;
	}

	/**
	 * Sync SvelteFlow nodes → SignalGraph
	 */
	function syncNodesToGraph(): void {
		const graphNodeIds = new Set(signalGraph.getAllNodes().map((n) => n.id));
		const uiNodeIds = new Set(nodes.map((n) => n.id));

		for (const node of nodes) {
			const signalType = getSignalType(node);
			const moduleType = (node.data.moduleType as string) ?? "";
			const nodeDef = getNodeDef(moduleType);

			if (!graphNodeIds.has(node.id)) {
				const instance = signalGraph.addNode(node.id, signalType);
				if (instance && nodeDef?.syncInputs) {
					nodeDef.syncInputs(node, instance);
				}
			} else {
				const instance = signalGraph.getNode(node.id);
				if (instance && nodeDef?.syncInputs) {
					nodeDef.syncInputs(node, instance);
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
	 * Sync SignalGraph outputs → SvelteFlow UI (generic via NodeDef.syncOutputs)
	 * Also sends changed parameter values to the VR bridge.
	 */
	function syncGraphToUI(): void {
		let updated = false;
		const settingsBatch: Record<string, number | boolean | string> = {};

		for (const node of nodes) {
			const instance = signalGraph.getNode(node.id);
			if (!instance) continue;

			const nodeDef = getNodeDef(node.data.moduleType as string);
			if (!nodeDef) continue;

			const changes = nodeDef.syncOutputs(instance, node, edges);
			if (changes) {
				node.data = { ...node.data, ...changes };
				updated = true;

				const param = node.data.param as string;
				if (param && "value" in changes) {
					settingsBatch[param] = changes.value as number | boolean | string;
				}
			}
		}

		if (updated) {
			nodes = [...nodes];
		}
		if (Object.keys(settingsBatch).length > 0) {
			sendSettings(settingsBatch);
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

	/** Validate connections using port type compatibility matrix */
	function isValidConnection(connection: Connection | Edge): boolean {
		const sourceType = resolvePortType(nodes, connection.source, connection.sourceHandle ?? null, "source");
		const targetType = resolvePortType(nodes, connection.target, connection.targetHandle ?? null, "target");
		return arePortTypesCompatible(sourceType, targetType);
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
