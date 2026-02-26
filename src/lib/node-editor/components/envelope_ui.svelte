<script lang="ts">
/**
 * Envelope UI Widget — WaveBar + 4× ADSR sliders
 *
 * Reads `data.envelope` for animation.
 * Sets A/D/S/R inputs via signalGraph.setInput().
 */

import { Slider, WaveBar } from "../controls";
import { signalGraph } from "../graph/engine";

interface Props {
	id: string;
	data: Record<string, unknown>;
	slotId: string;
}

const { id, data, slotId }: Props = $props();

const engineId = $derived(`${id}_${slotId}`);
const envelope = $derived((data.envelope as number) ?? 0);

function setParam(param: string, v: number) {
	signalGraph.setInput(engineId, param, v);
}
</script>

<WaveBar value={envelope} color="var(--success)" />
<Slider
	label="A"
	value={0.2}
	min={0}
	max={1}
	step={0.01}
	color="var(--success)"
	onchange={(v) => setParam("attack", v)}
/>
<Slider
	label="D"
	value={0.3}
	min={0}
	max={1}
	step={0.01}
	color="var(--success)"
	onchange={(v) => setParam("decay", v)}
/>
<Slider
	label="S"
	value={0.7}
	min={0}
	max={1}
	step={0.01}
	color="var(--success)"
	onchange={(v) => setParam("sustain", v)}
/>
<Slider
	label="R"
	value={0.4}
	min={0}
	max={1}
	step={0.01}
	color="var(--success)"
	onchange={(v) => setParam("release", v)}
/>
