<script lang="ts">
	import { useSvelteFlow } from "@xyflow/svelte";
	import { WaveBar, Slider, ValueDisplay } from "../controls";

	interface Props {
		id: string;
		data: Record<string, unknown>;
	}

	const { id, data }: Props = $props();
	const { updateNodeData } = useSvelteFlow();
</script>

<WaveBar value={data.wave as number} color="var(--success)" />
<Slider
	label="Speed"
	value={data.speed as number}
	min={0.01}
	max={1}
	step={0.01}
	unit="Hz"
	color="var(--success)"
	onchange={(v) => updateNodeData(id, { speed: v })}
/>
<ValueDisplay value={data.wave as number} />
