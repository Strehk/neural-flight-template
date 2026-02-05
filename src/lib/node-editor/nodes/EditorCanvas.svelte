<script lang="ts">
	/**
	 * EditorCanvas — SvelteFlow wrapper that handles drag & drop
	 *
	 * Must live inside SvelteFlowProvider to access useSvelteFlow().
	 * Uses screenToFlowPosition for correct drop coordinates.
	 */

	import {
		SvelteFlow,
		Background,
		Controls,
		useSvelteFlow,
		type Node,
		type Edge,
		type Connection,
		type NodeTypes,
	} from "@xyflow/svelte";

	interface Props {
		nodes: Node[];
		edges: Edge[];
		nodeTypes: NodeTypes;
		flowProps: Record<string, unknown>;
		onconnect: (connection: Connection) => void;
		ondrop: (nodeType: string, position: { x: number; y: number }) => void;
	}

	let { nodes = $bindable(), edges = $bindable(), nodeTypes, flowProps, onconnect, ondrop }: Props = $props();

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
