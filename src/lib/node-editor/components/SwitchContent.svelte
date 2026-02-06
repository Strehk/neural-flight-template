<script lang="ts">
	import { useSvelteFlow } from "@xyflow/svelte";
	import { Slider, ValueDisplay } from "../controls";

	interface Props {
		id: string;
		data: Record<string, unknown>;
	}

	const { id, data }: Props = $props();
	const { updateNodeData } = useSvelteFlow();
</script>

<div class="gate-row">
	<span class="port-label">Gate</span>
	<span class="gate-status" class:high={data.gateActive as boolean}>
		{data.gateActive ? "B" : "A"}
	</span>
</div>

<Slider label="A" value={data.a as number} min={0} max={1} step={0.01} color="var(--info)" onchange={(v) => updateNodeData(id, { a: v })} />
<Slider label="B" value={data.b as number} min={0} max={1} step={0.01} color="var(--info)" onchange={(v) => updateNodeData(id, { b: v })} />
<ValueDisplay value={data.out as number} />

<style>
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
</style>
