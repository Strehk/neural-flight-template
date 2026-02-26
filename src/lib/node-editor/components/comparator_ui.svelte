<script lang="ts">
/**
 * Comparator UI Widget — threshold slider + gate indicator
 *
 * Reads `data.gate` for display. Sets threshold via signalGraph.setInput().
 */

import { Slider, ValueDisplay } from "../controls";
import { signalGraph } from "../graph/engine";

interface Props {
	id: string;
	data: Record<string, unknown>;
	slotId: string;
}

const { id, data, slotId }: Props = $props();

const engineId = $derived(`${id}_${slotId}`);
const gate = $derived((data.gate as number) ?? 0);

function handleThresholdChange(v: number) {
	signalGraph.setInput(engineId, "threshold", v);
}
</script>

<Slider
	label="Thresh"
	value={0.5}
	min={0}
	max={1}
	step={0.01}
	color="var(--warning)"
	onchange={handleThresholdChange}
/>
<ValueDisplay value={gate} precision={0} />
