<script lang="ts">
/**
 * EditorCanvas — SvelteFlow wrapper that handles drag & drop
 *
 * Must live inside SvelteFlowProvider to access useSvelteFlow().
 * Uses screenToFlowPosition for correct drop coordinates.
 */

import {
	Background,
	type Connection,
	Controls,
	type Edge,
	type Node,
	type NodeTypes,
	SvelteFlow,
	useSvelteFlow,
} from "@xyflow/svelte";

interface Props {
	nodes: Node[];
	edges: Edge[];
	nodeTypes: NodeTypes;
	flowProps: Record<string, unknown>;
	onconnect: (connection: Connection) => void;
	ondrop: (nodeType: string, position: { x: number; y: number }) => void;
	isValidConnection?: (connection: Connection | Edge) => boolean;
}

let {
	nodes = $bindable(),
	edges = $bindable(),
	nodeTypes,
	flowProps,
	onconnect,
	ondrop,
	isValidConnection,
}: Props = $props();

/** Force $state.raw reassignment on SvelteFlow delete events */
function handleDelete(params: { nodes: Node[]; edges: Edge[] }) {
	if (params.nodes.length > 0) {
		const nodeIds = new Set(params.nodes.map((n) => n.id));
		nodes = nodes.filter((n) => !nodeIds.has(n.id));
	}
	if (params.edges.length > 0) {
		const edgeIds = new Set(params.edges.map((e) => e.id));
		edges = edges.filter((e) => !edgeIds.has(e.id));
	}
}

const { screenToFlowPosition } = useSvelteFlow();

function handleDragOver(e: DragEvent): void {
	e.preventDefault();
	if (e.dataTransfer) {
		e.dataTransfer.dropEffect = "move";
	}
}

function handleDrop(e: DragEvent): void {
	e.preventDefault();
	if (!e.dataTransfer) return;

	const nodeType = e.dataTransfer.getData("application/reactflow");
	if (!nodeType) return;

	const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
	ondrop(nodeType, position);
}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="editor-canvas" ondragover={handleDragOver} ondrop={handleDrop}>
	<SvelteFlow
		bind:nodes
		bind:edges
		{nodeTypes}
		colorMode="dark"
		fitView
		onconnect={onconnect}
		ondelete={handleDelete}
		{isValidConnection}
		{...flowProps}
	>
		<Background />
		<Controls />
	</SvelteFlow>
</div>

<style>
	.editor-canvas {
		width: 100%;
		height: 100%;
	}
</style>
