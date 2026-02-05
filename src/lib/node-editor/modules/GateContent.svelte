<script lang="ts">
	import { useSvelteFlow } from "@xyflow/svelte";
	import { GateButton, Slider } from "../controls";

	interface Props {
		id: string;
		data: Record<string, unknown>;
	}

	const { id, data }: Props = $props();
	const { updateNodeData } = useSvelteFlow();

	function triggerGate() {
		updateNodeData(id, { open: true });
		setTimeout(() => updateNodeData(id, { open: false }), (data.duration as number) * 1000);
	}
</script>

<GateButton open={data.open as boolean} onclick={triggerGate} />
<Slider
	label="Hold"
	value={data.duration as number}
	min={0.1}
	max={2}
	step={0.1}
	unit="s"
	color="var(--warning)"
	onchange={(v) => updateNodeData(id, { duration: v })}
/>
<div class="event-type">{data.eventType}</div>

<style>
	.event-type {
		text-align: center;
		color: var(--text-subtle);
		font-size: 0.6rem;
		text-transform: uppercase;
	}
</style>
