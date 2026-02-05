<script lang="ts">
	/**
	 * Slider Node — Parameter with Range (Target Node)
	 *
	 * Input handle receives LFO or other source.
	 * Slider allows manual control when not connected.
	 * Sends value to VR scene via WebSocket.
	 */

	import { Handle, Position, useSvelteFlow, useNodeConnections } from "@xyflow/svelte";
	import type { ComponentType } from "svelte";
	import { Slider, ValueDisplay } from "../controls";
	import { sendSettings } from "../bridge";

	interface SliderNodeData {
		label: string;
		param: string;
		icon: ComponentType;
		min: number;
		max: number;
		step?: number;
		value: number;
		driven?: boolean;
	}

	interface Props {
		id: string;
		data: SliderNodeData;
	}

	const { id, data }: Props = $props();
	const { updateNodeData } = useSvelteFlow();

	// Check if input is connected
	const connections = useNodeConnections({ handleType: "target", handleId: "value" });
	const isConnected = $derived(connections.current.length > 0);

	// Format value based on step
	const precision = $derived(() => {
		const step = data.step ?? 1;
		if (step < 0.01) return 3;
		if (step < 1) return 2;
		return 0;
	});

	function handleChange(value: number) {
		updateNodeData(id, { value });
	}

	// Send settings to VR scene when value changes (only if not driven)
	$effect(() => {
		if (!data.driven) {
			sendSettings({ [data.param]: data.value });
		}
	});
</script>

<div class="node node--process" class:connected={isConnected}>
	<Handle type="target" position={Position.Left} id="value" class="handle-input" />

	<header>
		<data.icon size={14} />
		<span>{data.label}</span>
	</header>

	<div class="content">
		<div class="slider-row">
			<span class="range-label">{data.min}</span>
			<input
				type="range"
				min={data.min}
				max={data.max}
				step={data.step ?? 1}
				value={data.value}
				oninput={(e) => handleChange(Number.parseFloat((e.target as HTMLInputElement).value))}
				disabled={isConnected}
				class="nodrag slider"
			/>
			<span class="range-label">{data.max}</span>
		</div>

		<ValueDisplay value={data.value} precision={precision()} driven={isConnected} />
	</div>
</div>

<style>
	.node {
		background: var(--surface);
		padding: 0.5rem;
		min-width: 160px;
		font-family: var(--font-mono);
		font-size: 0.7rem;
	}

	.node--process {
		border: 1px solid var(--border);
	}

	.node--process.connected {
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

	/* Handle styling */
	:global(.node--process .handle-input) {
		width: 10px;
		height: 10px;
		background: var(--border);
		border: none;
		border-radius: 0;
	}

	:global(.node--process.connected .handle-input) {
		background: var(--accent-muted);
	}
</style>
