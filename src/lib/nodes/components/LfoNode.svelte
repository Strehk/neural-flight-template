<script lang="ts">
	/**
	 * LFO Node — Low Frequency Oscillator (Source Node)
	 * Generates a sine wave from 0-1 at configurable speed
	 *
	 * Features:
	 * - speedMod input (0-1): modulates speed (0.5 = neutral, 0 = slow, 1 = fast)
	 * - wave output (0-1): sine wave
	 */

	import { Handle, Position, useSvelteFlow } from "@xyflow/svelte";
	import { Activity } from "lucide-svelte";

	interface LfoNodeData {
		wave: number;
		speed: number;
		/** speedMod input value (0-1), neutral at 0.5 */
		speedMod?: number;
		/** Whether speedMod is driven by a connection */
		speedModDriven?: boolean;
	}

	interface Props {
		id: string;
		data: LfoNodeData;
	}

	let { id, data }: Props = $props();
	const { updateNodeData } = useSvelteFlow();

	// Wave visualization (0-1 mapped to visual height)
	const waveHeight = $derived(Math.round(data.wave * 100));

	// Speed mod indicator
	const speedModValue = $derived(data.speedMod ?? 0.5);
	const speedModPercent = $derived(Math.round(speedModValue * 100));

	function handleSpeedChange(e: Event) {
		const target = e.target as HTMLInputElement;
		updateNodeData(id, { speed: Number.parseFloat(target.value) });
	}
</script>

<div class="lfo-node">
	<!-- Input handle for speed modulation (left side) -->
	<Handle type="target" position={Position.Left} id="speedMod" class="handle-input" />

	<div class="node-header">
		<Activity size={14} />
		<span>LFO</span>
	</div>

	<div class="node-content">
		<!-- Wave visualization bar -->
		<div class="wave-bar">
			<div class="wave-fill" style="height: {waveHeight}%"></div>
		</div>

		<!-- Speed control -->
		<div class="control-row">
			<span class="control-label">Speed</span>
			<input
				type="range"
				min="0.01"
				max="1"
				step="0.01"
				value={data.speed}
				oninput={handleSpeedChange}
				class="nodrag slider"
			/>
			<span class="control-value">{data.speed.toFixed(2)}Hz</span>
		</div>

		<!-- Speed mod indicator (only visible when driven) -->
		{#if data.speedModDriven}
			<div class="mod-indicator">
				<span class="mod-label">Mod</span>
				<div class="mod-bar">
					<div class="mod-fill" style="width: {speedModPercent}%"></div>
				</div>
			</div>
		{/if}

		<!-- Current wave value -->
		<div class="wave-value">{data.wave.toFixed(2)}</div>
	</div>

	<!-- Output handle (right side) -->
	<Handle type="source" position={Position.Right} id="wave" class="handle-output" />
</div>

<style>
	.lfo-node {
		background: var(--surface);
		border: 1px solid var(--success);
		padding: 0.5rem;
		min-width: 140px;
		font-family: var(--font-mono);
		font-size: 0.7rem;
	}

	.node-header {
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

	.node-content {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.wave-bar {
		height: 32px;
		background: var(--border);
		position: relative;
		overflow: hidden;
	}

	.wave-fill {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		background: var(--success);
		opacity: 0.6;
		transition: height 0.05s ease-out;
	}

	.control-row {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.control-label {
		color: var(--text-muted);
		font-size: 0.65rem;
		text-transform: uppercase;
		min-width: 36px;
	}

	.slider {
		flex: 1;
		height: 4px;
		accent-color: var(--success);
		cursor: pointer;
	}

	.control-value {
		color: var(--success);
		font-size: 0.65rem;
		min-width: 48px;
		text-align: right;
	}

	.wave-value {
		text-align: center;
		color: var(--text);
		font-size: 0.9rem;
		font-weight: 600;
	}

	/* Mod indicator */
	.mod-indicator {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.mod-label {
		color: var(--warning);
		font-size: 0.6rem;
		text-transform: uppercase;
		min-width: 24px;
	}

	.mod-bar {
		flex: 1;
		height: 4px;
		background: var(--border);
		position: relative;
	}

	.mod-fill {
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		background: var(--warning);
		transition: width 0.05s ease-out;
	}

	/* Handle styling */
	:global(.lfo-node .handle-output) {
		width: 10px;
		height: 10px;
		background: var(--success);
		border: none;
		border-radius: 0;
	}

	:global(.lfo-node .handle-input) {
		width: 10px;
		height: 10px;
		background: var(--warning);
		border: none;
		border-radius: 0;
	}
</style>
