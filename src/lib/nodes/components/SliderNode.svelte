<script lang="ts">
	/**
	 * Slider Node — Generic Parameter with Range (Target Node)
	 *
	 * Like the SvelteFlow homepage demo:
	 * - Input handle (left) receives LFO or other source
	 * - Slider allows manual control when not connected
	 * - Sends value to VR scene via WebSocket
	 */

	import { Handle, Position, useSvelteFlow, useNodeConnections } from "@xyflow/svelte";
	import type { ComponentType } from "svelte";
	import { sendSettings } from "$lib/nodes/bridge";

	interface SliderNodeData {
		label: string;
		param: string;
		icon: ComponentType;
		min: number;
		max: number;
		step?: number;
		value: number;
		/** When true, an LFO is connected and driving the value */
		driven?: boolean;
	}

	interface Props {
		id: string;
		data: SliderNodeData;
	}

	let { id, data }: Props = $props();
	const { updateNodeData } = useSvelteFlow();

	// Check if input is connected
	const connections = useNodeConnections({ handleType: "target", handleId: "value" });
	const isConnected = $derived(connections.current.length > 0);

	// Format value for display
	const displayValue = $derived(() => {
		const step = data.step ?? 1;
		if (step < 0.01) return data.value.toFixed(3);
		if (step < 1) return data.value.toFixed(2);
		return data.value.toFixed(0);
	});

	function handleSliderChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const newValue = Number.parseFloat(target.value);
		updateNodeData(id, { value: newValue });
	}

	// Send settings to VR scene when value changes (only if not driven by LFO)
	$effect(() => {
		if (!data.driven) {
			sendSettings({ [data.param]: data.value });
		}
	});
</script>

<div class="slider-node" class:connected={isConnected}>
	<!-- Input handle (left side) -->
	<Handle type="target" position={Position.Left} id="value" class="handle-input" />

	<div class="node-header">
		<data.icon size={14} />
		<span>{data.label}</span>
	</div>

	<div class="node-content">
		<div class="slider-row">
			<span class="range-label">{data.min}</span>
			<input
				type="range"
				min={data.min}
				max={data.max}
				step={data.step ?? 1}
				value={data.value}
				oninput={handleSliderChange}
				disabled={isConnected}
				class="nodrag slider"
			/>
			<span class="range-label">{data.max}</span>
		</div>

		<div class="value-display" class:driven={isConnected}>
			{displayValue()}
		</div>
	</div>
</div>

<style>
	.slider-node {
		background: var(--surface);
		border: 1px solid var(--border);
		padding: 0.5rem;
		min-width: 160px;
		font-family: var(--font-mono);
		font-size: 0.7rem;
	}

	.slider-node.connected {
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

	.slider-row {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.range-label {
		color: var(--text-subtle);
		font-size: 0.6rem;
		min-width: 28px;
		text-align: center;
	}

	.slider {
		flex: 1;
		height: 4px;
		accent-color: var(--accent-muted);
		cursor: pointer;
	}

	.slider:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.value-display {
		text-align: center;
		color: var(--text);
		font-size: 0.9rem;
		font-weight: 600;
	}

	.value-display.driven {
		color: var(--accent);
	}

	/* Handle styling */
	:global(.slider-node .handle-input) {
		width: 10px;
		height: 10px;
		background: var(--border);
		border: none;
		border-radius: 0;
	}

	:global(.slider-node.connected .handle-input) {
		background: var(--accent-muted);
	}
</style>
