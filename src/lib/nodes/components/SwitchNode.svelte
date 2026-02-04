<script lang="ts">
	/**
	 * Switch Node — Gate-controlled A/B selector
	 *
	 * Outputs value A when gate is LOW (0), value B when gate is HIGH (1).
	 * All values are 0-1 normalized.
	 */

	import { Handle, Position, useSvelteFlow } from "@xyflow/svelte";
	import { ToggleLeft } from "lucide-svelte";

	interface SwitchNodeData {
		/** Value A (when gate = 0) */
		a: number;
		/** Value B (when gate = 1) */
		b: number;
		/** Current output (interpolated) */
		out: number;
		/** Whether gate is connected and active */
		gateActive?: boolean;
	}

	interface Props {
		id: string;
		data: SwitchNodeData;
	}

	let { id, data }: Props = $props();
	const { updateNodeData } = useSvelteFlow();

	function handleAChange(e: Event) {
		const target = e.target as HTMLInputElement;
		updateNodeData(id, { a: Number.parseFloat(target.value) });
	}

	function handleBChange(e: Event) {
		const target = e.target as HTMLInputElement;
		updateNodeData(id, { b: Number.parseFloat(target.value) });
	}
</script>

<div class="switch-node" class:active={data.gateActive}>
	<!-- Input handles (left side) -->
	<Handle type="target" position={Position.Left} id="gate" class="handle-gate" style="top: 25%;" />
	<Handle type="target" position={Position.Left} id="a" class="handle-input" style="top: 55%;" />
	<Handle type="target" position={Position.Left} id="b" class="handle-input" style="top: 85%;" />

	<div class="node-header">
		<ToggleLeft size={14} />
		<span>SWITCH</span>
	</div>

	<div class="node-content">
		<!-- Gate indicator -->
		<div class="gate-row">
			<span class="port-label">Gate</span>
			<span class="gate-status" class:high={data.gateActive}>
				{data.gateActive ? "B" : "A"}
			</span>
		</div>

		<!-- Value A control -->
		<div class="control-row">
			<span class="port-label">A</span>
			<input
				type="range"
				min="0"
				max="1"
				step="0.01"
				value={data.a}
				oninput={handleAChange}
				class="nodrag slider"
			/>
			<span class="control-value">{data.a.toFixed(2)}</span>
		</div>

		<!-- Value B control -->
		<div class="control-row">
			<span class="port-label">B</span>
			<input
				type="range"
				min="0"
				max="1"
				step="0.01"
				value={data.b}
				oninput={handleBChange}
				class="nodrag slider"
			/>
			<span class="control-value">{data.b.toFixed(2)}</span>
		</div>

		<!-- Output value -->
		<div class="output-value">{data.out.toFixed(2)}</div>
	</div>

	<!-- Output handle -->
	<Handle type="source" position={Position.Right} id="out" class="handle-output" />
</div>

<style>
	.switch-node {
		background: var(--surface);
		border: 1px solid var(--info);
		padding: 0.5rem;
		min-width: 130px;
		font-family: var(--font-mono);
		font-size: 0.7rem;
	}

	.switch-node.active {
		border-color: var(--success);
	}

	.node-header {
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

	.node-content {
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
		min-width: 24px;
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

	.control-row {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.slider {
		flex: 1;
		height: 4px;
		accent-color: var(--info);
		cursor: pointer;
	}

	.control-value {
		color: var(--info);
		font-size: 0.6rem;
		min-width: 32px;
		text-align: right;
	}

	.output-value {
		text-align: center;
		color: var(--text);
		font-size: 0.9rem;
		font-weight: 600;
		margin-top: 0.25rem;
	}

	/* Handle styling */
	:global(.switch-node .handle-gate) {
		width: 10px;
		height: 10px;
		background: var(--warning);
		border: none;
		border-radius: 0;
	}

	:global(.switch-node .handle-input) {
		width: 10px;
		height: 10px;
		background: var(--border);
		border: none;
		border-radius: 0;
	}

	:global(.switch-node .handle-output) {
		width: 10px;
		height: 10px;
		background: var(--info);
		border: none;
		border-radius: 0;
	}
</style>
