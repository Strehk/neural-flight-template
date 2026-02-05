<script lang="ts">
	/**
	 * Color Node — Color Picker with Input Handle
	 *
	 * For controlling sky color and other color-based parameters.
	 * Input handle can receive a hue value from LFO (0-1 mapped to hue).
	 */

	import { Handle, Position, useSvelteFlow, useNodeConnections } from "@xyflow/svelte";
	import { Palette } from "lucide-svelte";
	import { ColorPicker } from "../controls";
	import { sendSettings } from "../bridge";

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

	// Check if input is connected
	const connections = useNodeConnections({ handleType: "target", handleId: "hue" });
	const isConnected = $derived(connections.current.length > 0);

	function handleColorChange(color: string) {
		updateNodeData(id, { value: color });
	}

	// Send color to VR scene
	$effect(() => {
		sendSettings({ [data.param]: data.value });
	});
</script>

<div class="node node--output" class:connected={isConnected}>
	<Handle type="target" position={Position.Left} id="hue" class="handle-input" />

	<header>
		<Palette size={14} />
		<span>{data.label}</span>
	</header>

	<div class="content">
		<ColorPicker value={data.value} disabled={isConnected} onchange={handleColorChange} />
	</div>
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

	.node--output.connected {
		border-color: var(--accent-muted);
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

	/* Handle styling */
	:global(.node--output .handle-input) {
		width: 10px;
		height: 10px;
		background: var(--border);
		border: none;
		border-radius: 0;
	}

	:global(.node--output.connected .handle-input) {
		background: var(--accent-muted);
	}
</style>
