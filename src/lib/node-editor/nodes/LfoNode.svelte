<script lang="ts">
	/**
	 * LFO Node — Low Frequency Oscillator (Source Node)
	 *
	 * Generates a sine wave from 0-1 at configurable speed.
	 * Uses WaveBar for visualization and Slider for speed control.
	 */

	import { Handle, Position, useSvelteFlow } from "@xyflow/svelte";
	import { Activity } from "lucide-svelte";
	import { WaveBar, Slider, ValueDisplay } from "../controls";

	interface LfoNodeData {
		wave: number;
		speed: number;
	}

	interface Props {
		id: string;
		data: LfoNodeData;
	}

	const { id, data }: Props = $props();
	const { updateNodeData } = useSvelteFlow();

	function handleSpeedChange(value: number) {
		updateNodeData(id, { speed: value });
	}
</script>

<div class="node node--input">
	<Handle type="target" position={Position.Left} id="speedMod" class="handle-input" />

	<header>
		<Activity size={14} />
		<span>LFO</span>
	</header>

	<div class="content">
		<WaveBar value={data.wave} color="var(--success)" />

		<Slider
			label="Speed"
			value={data.speed}
			min={0.01}
			max={1}
			step={0.01}
			unit="Hz"
			color="var(--success)"
			onchange={handleSpeedChange}
		/>

		<ValueDisplay value={data.wave} />
	</div>

	<Handle type="source" position={Position.Right} id="wave" class="handle-output" />
</div>

<style>
	.node {
		background: var(--surface);
		padding: 0.5rem;
		min-width: 140px;
		font-family: var(--font-mono);
		font-size: 0.7rem;
	}

	.node--input {
		border: 1px solid var(--success);
	}

	header {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		color: var(--success);
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
		gap: 0.5rem;
	}

	/* Handle styling */
	:global(.node--input .handle-output) {
		width: 10px;
		height: 10px;
		background: var(--success);
		border: none;
		border-radius: 0;
	}

	:global(.node--input .handle-input) {
		width: 10px;
		height: 10px;
		background: var(--warning);
		border: none;
		border-radius: 0;
	}
</style>
