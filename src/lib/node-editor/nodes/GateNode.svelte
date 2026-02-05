<script lang="ts">
	/**
	 * Gate Node — Event to 0/1 signal
	 *
	 * Outputs 1 when triggered, stays HIGH for configured duration, then 0.
	 * Uses GateButton for trigger and Slider for duration control.
	 */

	import { Handle, Position, useSvelteFlow } from "@xyflow/svelte";
	import { Zap } from "lucide-svelte";
	import { GateButton, Slider } from "../controls";

	interface GateNodeData {
		open: boolean;
		duration: number;
		eventType: string;
	}

	interface Props {
		id: string;
		data: GateNodeData;
	}

	const { id, data }: Props = $props();
	const { updateNodeData, deleteElements } = useSvelteFlow();

	function deleteNode() {
		deleteElements({ nodes: [{ id }] });
	}

	function handleDurationChange(value: number) {
		updateNodeData(id, { duration: value });
	}

	function triggerGate() {
		updateNodeData(id, { open: true });
		setTimeout(() => {
			updateNodeData(id, { open: false });
		}, data.duration * 1000);
	}
</script>

<div class="node node--trigger" class:active={data.open}>
	<Handle type="target" position={Position.Left} id="trigger" class="handle-input" />

	<header>
		<Zap size={14} />
		<span class="node-title">GATE</span>
		<button class="node-delete" onclick={deleteNode} type="button">×</button>
	</header>

	<div class="content">
		<GateButton open={data.open} onclick={triggerGate} />

		<Slider
			label="Hold"
			value={data.duration}
			min={0.1}
			max={2}
			step={0.1}
			unit="s"
			color="var(--warning)"
			onchange={handleDurationChange}
		/>

		<div class="event-type">{data.eventType}</div>
	</div>

	<Handle type="source" position={Position.Right} id="gate" class="handle-output" />
</div>

<style>
	.node {
		background: var(--surface);
		padding: 0.5rem;
		min-width: 120px;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		transition: border-color 0.15s ease;
	}

	.node--trigger {
		border: 1px solid var(--warning);
	}

	.node--trigger.active {
		border-color: var(--success);
		box-shadow: 0 0 8px var(--success);
	}

	header {
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

	.node-title {
		flex: 1;
	}

	.node-delete {
		background: none;
		border: none;
		color: var(--text-subtle);
		cursor: pointer;
		font-size: 0.9rem;
		line-height: 1;
		padding: 0 0.15rem;
		opacity: 0;
		transition: opacity 0.15s;
	}

	.node:hover .node-delete {
		opacity: 1;
	}

	.node-delete:hover {
		color: var(--error, #e74c3c);
	}

	.content {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.event-type {
		text-align: center;
		color: var(--text-subtle);
		font-size: 0.6rem;
		text-transform: uppercase;
	}

	/* Handle styling */
	:global(.node--trigger .handle-input) {
		width: 10px;
		height: 10px;
		background: var(--border);
		border: none;
		border-radius: 0;
	}

	:global(.node--trigger .handle-output) {
		width: 10px;
		height: 10px;
		background: var(--warning);
		border: none;
		border-radius: 0;
	}

	:global(.node--trigger.active .handle-output) {
		background: var(--success);
	}
</style>
