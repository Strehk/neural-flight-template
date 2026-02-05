<script lang="ts">
	/**
	 * Switch Node — Gate-controlled A/B selector
	 *
	 * Outputs value A when gate is LOW, value B when gate is HIGH.
	 * Uses Slider controls for A and B values.
	 */

	import { Handle, Position, useSvelteFlow } from "@xyflow/svelte";
	import { ToggleLeft } from "lucide-svelte";
	import { Slider, ValueDisplay } from "../controls";

	interface SwitchNodeData {
		a: number;
		b: number;
		out: number;
		gateActive?: boolean;
	}

	interface Props {
		id: string;
		data: SwitchNodeData;
	}

	const { id, data }: Props = $props();
	const { updateNodeData } = useSvelteFlow();

	function handleAChange(value: number) {
		updateNodeData(id, { a: value });
	}

	function handleBChange(value: number) {
		updateNodeData(id, { b: value });
	}
</script>

<div class="node node--logic" class:active={data.gateActive}>
	<Handle type="target" position={Position.Left} id="gate" class="handle-gate" style="top: 25%;" />
	<Handle type="target" position={Position.Left} id="a" class="handle-input" style="top: 55%;" />
	<Handle type="target" position={Position.Left} id="b" class="handle-input" style="top: 85%;" />

	<header>
		<ToggleLeft size={14} />
		<span>SWITCH</span>
	</header>

	<div class="content">
		<div class="gate-row">
			<span class="port-label">Gate</span>
			<span class="gate-status" class:high={data.gateActive}>
				{data.gateActive ? "B" : "A"}
			</span>
		</div>

		<Slider
			label="A"
			value={data.a}
			min={0}
			max={1}
			step={0.01}
			color="var(--info)"
			onchange={handleAChange}
		/>

		<Slider
			label="B"
			value={data.b}
			min={0}
			max={1}
			step={0.01}
			color="var(--info)"
			onchange={handleBChange}
		/>

		<ValueDisplay value={data.out} />
	</div>

	<Handle type="source" position={Position.Right} id="out" class="handle-output" />
</div>

<style>
	.node {
		background: var(--surface);
		padding: 0.5rem;
		min-width: 130px;
		font-family: var(--font-mono);
		font-size: 0.7rem;
	}

	.node--logic {
		border: 1px solid var(--info);
	}

	.node--logic.active {
		border-color: var(--success);
	}

	header {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		color: var(--info);
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
		gap: 0.4rem;
	}

	.gate-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.port-label {
		color: var(--text-muted);
		font-size: 0.6rem;
		text-transform: uppercase;
	}

	.gate-status {
		background: var(--bg);
		border: 1px solid var(--border);
		color: var(--text-muted);
		font-size: 0.7rem;
		font-weight: 700;
		padding: 0.15rem 0.4rem;
	}

	.gate-status.high {
		background: var(--success);
		border-color: var(--success);
		color: var(--bg);
	}

	/* Handle styling */
	:global(.node--logic .handle-gate) {
		width: 10px;
		height: 10px;
		background: var(--warning);
		border: none;
		border-radius: 0;
	}

	:global(.node--logic .handle-input) {
		width: 10px;
		height: 10px;
		background: var(--border);
		border: none;
		border-radius: 0;
	}

	:global(.node--logic .handle-output) {
		width: 10px;
		height: 10px;
		background: var(--info);
		border: none;
		border-radius: 0;
	}
</style>
