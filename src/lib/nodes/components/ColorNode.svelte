<script lang="ts">
	/**
	 * Color Node — Color Picker with Input Handle
	 *
	 * For controlling sky color and other color-based parameters.
	 * Input handle can receive a hue value from LFO (0-1 mapped to hue).
	 */

	import { Handle, Position, useSvelteFlow, useNodeConnections } from "@xyflow/svelte";
	import { Palette } from "lucide-svelte";
	import { sendSettings } from "$lib/nodes/bridge";

	interface ColorNodeData {
		label: string;
		param: string;
		value: string; // Hex color
		/** When driven by LFO, this is the hue (0-1) */
		hue?: number;
	}

	interface Props {
		id: string;
		data: ColorNodeData;
	}

	let { id, data }: Props = $props();
	const { updateNodeData } = useSvelteFlow();

	// Check if input is connected
	const connections = useNodeConnections({ handleType: "target", handleId: "hue" });
	const isConnected = $derived(connections.current.length > 0);

	function handleColorChange(e: Event) {
		const target = e.target as HTMLInputElement;
		updateNodeData(id, { value: target.value });
	}

	// Send color to VR scene
	$effect(() => {
		sendSettings({ [data.param]: data.value });
	});
</script>

<div class="color-node" class:connected={isConnected}>
	<!-- Input handle for hue (left side) -->
	<Handle type="target" position={Position.Left} id="hue" class="handle-input" />

	<div class="node-header">
		<Palette size={14} />
		<span>{data.label}</span>
	</div>

	<div class="node-content">
		<input
			type="color"
			value={data.value}
			oninput={handleColorChange}
			disabled={isConnected}
			class="nodrag color-input"
		/>
		<div class="value-display">{data.value}</div>
	</div>
</div>

<style>
	.color-node {
		background: var(--surface);
		border: 1px solid var(--border);
		padding: 0.5rem;
		min-width: 120px;
		font-family: var(--font-mono);
		font-size: 0.7rem;
	}

	.color-node.connected {
		border-color: var(--accent-muted);
	}

	.node-header {
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

	.node-content {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.color-input {
		width: 100%;
		height: 32px;
		border: 1px solid var(--border);
		background: var(--surface);
		cursor: pointer;
		padding: 2px;
	}

	.color-input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.value-display {
		text-align: center;
		color: var(--text-subtle);
		font-size: 0.65rem;
		text-transform: uppercase;
	}

	/* Handle styling */
	:global(.color-node .handle-input) {
		width: 10px;
		height: 10px;
		background: var(--border);
		border: none;
		border-radius: 0;
	}

	:global(.color-node.connected .handle-input) {
		background: var(--accent-muted);
	}
</style>
