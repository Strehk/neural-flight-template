<script lang="ts">
	/**
	 * Gate Node — Event to 0/1 signal
	 *
	 * Outputs 1 when triggered, stays HIGH for configured duration, then 0.
	 * Like a gate signal in analog synthesizers.
	 */

	import { Handle, Position, useSvelteFlow } from "@xyflow/svelte";
	import { Zap } from "lucide-svelte";

	interface GateNodeData {
		/** Whether gate is currently open */
		open: boolean;
		/** Gate duration in seconds */
		duration: number;
		/** Event type (for display) */
		eventType: string;
	}

	interface Props {
		id: string;
		data: GateNodeData;
	}

	let { id, data }: Props = $props();
	const { updateNodeData } = useSvelteFlow();

	function handleDurationChange(e: Event) {
		const target = e.target as HTMLInputElement;
		updateNodeData(id, { duration: Number.parseFloat(target.value) });
	}

	/** Manual trigger for testing */
	function triggerGate() {
		updateNodeData(id, { open: true });
		setTimeout(() => {
			updateNodeData(id, { open: false });
		}, data.duration * 1000);
	}
</script>

<div class="gate-node" class:active={data.open}>
	<!-- Input handle for external trigger -->
	<Handle type="target" position={Position.Left} id="trigger" class="handle-input" />

	<div class="node-header">
		<Zap size={14} />
		<span>GATE</span>
	</div>

	<div class="node-content">
		<!-- Gate status indicator -->
		<button class="gate-indicator" onclick={triggerGate} class:open={data.open}>
			{data.open ? "HIGH" : "LOW"}
		</button>

		<!-- Duration control -->
		<div class="control-row">
			<span class="control-label">Hold</span>
			<input
				type="range"
				min="0.1"
				max="2"
				step="0.1"
				value={data.duration}
				oninput={handleDurationChange}
				class="nodrag slider"
			/>
			<span class="control-value">{data.duration.toFixed(1)}s</span>
		</div>

		<!-- Event type display -->
		<div class="event-type">{data.eventType}</div>
	</div>

	<!-- Output handle -->
	<Handle type="source" position={Position.Right} id="gate" class="handle-output" />
</div>

<style>
	.gate-node {
		background: var(--surface);
		border: 1px solid var(--warning);
		padding: 0.5rem;
		min-width: 120px;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		transition: border-color 0.15s ease;
	}

	.gate-node.active {
		border-color: var(--success);
		box-shadow: 0 0 8px var(--success);
	}

	.node-header {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		color: var(--warning);
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

	.gate-indicator {
		background: var(--bg);
		border: 1px solid var(--border);
		color: var(--text-muted);
		font-family: var(--font-mono);
		font-size: 0.8rem;
		font-weight: 700;
		padding: 0.5rem;
		cursor: pointer;
		text-align: center;
		transition: all 0.1s ease;
	}

	.gate-indicator:hover {
		border-color: var(--warning);
	}

	.gate-indicator.open {
		background: var(--success);
		border-color: var(--success);
		color: var(--bg);
	}

	.control-row {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.control-label {
		color: var(--text-muted);
		font-size: 0.6rem;
		text-transform: uppercase;
		min-width: 28px;
	}

	.slider {
		flex: 1;
		height: 4px;
		accent-color: var(--warning);
		cursor: pointer;
	}

	.control-value {
		color: var(--warning);
		font-size: 0.6rem;
		min-width: 28px;
		text-align: right;
	}

	.event-type {
		text-align: center;
		color: var(--text-subtle);
		font-size: 0.6rem;
		text-transform: uppercase;
	}

	/* Handle styling */
	:global(.gate-node .handle-input) {
		width: 10px;
		height: 10px;
		background: var(--border);
		border: none;
		border-radius: 0;
	}

	:global(.gate-node .handle-output) {
		width: 10px;
		height: 10px;
		background: var(--warning);
		border: none;
		border-radius: 0;
	}

	:global(.gate-node.active .handle-output) {
		background: var(--success);
	}
</style>
