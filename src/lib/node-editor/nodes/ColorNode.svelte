<script lang="ts">
	/**
	 * Color Node — RGB mixer with 3 input handles
	 *
	 * Each channel (R, G, B) can be driven by a signal source.
	 * Manual color picker as fallback when not connected.
	 */

	import { Handle, Position, useSvelteFlow } from "@xyflow/svelte";
	import { Palette } from "lucide-svelte";
	import { ColorPicker } from "../controls";

	interface ColorNodeData {
		label: string;
		param: string;
		value: string;
	}

	interface Props {
		id: string;
		data: ColorNodeData;
	}

	const { id, data }: Props = $props();
	const { updateNodeData } = useSvelteFlow();

	function handleColorChange(color: string) {
		updateNodeData(id, { value: color });
	}
</script>

<div class="node node--output">
	<Handle type="target" position={Position.Left} id="r" class="handle-r" style="top: 30%;" />
	<Handle type="target" position={Position.Left} id="g" class="handle-g" style="top: 55%;" />
	<Handle type="target" position={Position.Left} id="b" class="handle-b" style="top: 80%;" />

	<header>
		<Palette size={14} />
		<span>{data.label}</span>
	</header>

	<div class="content">
		<div class="color-preview" style="background: {data.value};" />
		<ColorPicker value={data.value} onchange={handleColorChange} />
		<div class="port-labels">
			<span class="port-label" style="color: #e74c3c;">R</span>
			<span class="port-label" style="color: #2ecc71;">G</span>
			<span class="port-label" style="color: #3498db;">B</span>
		</div>
	</div>

	<Handle type="source" position={Position.Right} id="r" class="handle-r" style="top: 30%;" />
	<Handle type="source" position={Position.Right} id="g" class="handle-g" style="top: 55%;" />
	<Handle type="source" position={Position.Right} id="b" class="handle-b" style="top: 80%;" />
</div>

<style>
	.node {
		background: var(--surface);
		padding: 0.5rem;
		min-width: 120px;
		font-family: var(--font-mono);
		font-size: 0.7rem;
	}

	.node--output {
		border: 1px solid var(--border);
	}

	header {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		color: var(--text-muted);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.5rem;
		padding-bottom: 0.25rem;
		border-bottom: 1px solid var(--border);
	}

	.content {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.color-preview {
		width: 100%;
		height: 20px;
		border: 1px solid var(--border);
	}

	.port-labels {
		display: flex;
		justify-content: space-around;
		font-size: 0.6rem;
		font-weight: 700;
	}

	.port-label {
		opacity: 0.8;
	}

	/* Handle styling */
	:global(.node--output .handle-r) {
		width: 10px;
		height: 10px;
		background: #e74c3c;
		border: none;
		border-radius: 0;
	}

	:global(.node--output .handle-g) {
		width: 10px;
		height: 10px;
		background: #2ecc71;
		border: none;
		border-radius: 0;
	}

	:global(.node--output .handle-b) {
		width: 10px;
		height: 10px;
		background: #3498db;
		border: none;
		border-radius: 0;
	}
</style>
