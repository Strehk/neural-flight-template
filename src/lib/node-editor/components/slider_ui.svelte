<script lang="ts">
/**
 * Slider UI Widget — interactive offset control
 *
 * Reads `data.out` (output port) for display.
 * Writes to engine via `signalGraph.setInput()` on user drag.
 */
import { signalGraph } from "../graph/engine";
import { Slider, ValueDisplay } from "../controls";

interface Props {
	id: string;
	data: Record<string, unknown>;
	slotId: string;
}

const { id, data, slotId }: Props = $props();

const engineId = $derived(`${id}_${slotId}`);
const value = $derived((data.out as number) ?? 0.5);

function handleChange(v: number) {
	signalGraph.setInput(engineId, "value", v);
}
</script>

<Slider
	{value}
	min={0}
	max={1}
	step={0.01}
	label="Offset"
	onchange={handleChange}
/>
<ValueDisplay {value} precision={2} />
