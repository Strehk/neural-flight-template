<script lang="ts">
	import { useSvelteFlow, useNodeConnections } from "@xyflow/svelte";
	import { Slider, ValueDisplay } from "../controls";
	import { sendSettings } from "../bridge";

	interface Props {
		id: string;
		data: Record<string, unknown>;
	}

	const { id, data }: Props = $props();
	const { updateNodeData } = useSvelteFlow();

	const connections = useNodeConnections({ handleType: "target", handleId: "value" });
	const isConnected = $derived(connections.current.length > 0);

	const precision = $derived(() => {
		const step = (data.step as number) ?? 1;
		if (step < 0.01) return 3;
		if (step < 1) return 2;
		return 0;
	});

	function handleChange(value: number) {
		updateNodeData(id, { value });
		if (!isConnected && data.param) {
			sendSettings({ [data.param as string]: value });
		}
	}
</script>

<Slider
	value={data.value as number}
	min={data.min as number}
	max={data.max as number}
	step={(data.step as number) ?? 1}
	disabled={isConnected}
	onchange={handleChange}
/>
<ValueDisplay value={data.value as number} precision={precision()} driven={isConnected} />
