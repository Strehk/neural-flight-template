<script lang="ts">
/**
 * LFO UI Widget — wave display + frequency control
 *
 * Reads `data.wave` (output port) for animation.
 * Speed slider updates engine state directly via setLfoSpeed().
 */

import { Slider, ValueDisplay, WaveBar } from "../controls";
import { signalGraph } from "../graph/engine";
import { setLfoSpeed } from "./lfo_ui";

interface Props {
	id: string;
	data: Record<string, unknown>;
	slotId: string;
}

const { id, data, slotId }: Props = $props();

const engineId = $derived(`${id}_${slotId}`);
const wave = $derived((data.wave as number) ?? 0.5);

/** Read current speed from engine state (re-evaluates each frame via data prop) */
const speed = $derived(() => {
	// Access data.wave to establish reactive dependency (changes every frame)
	void data.wave;
	const instance = signalGraph.getNode(engineId);
	return (instance?.state as { baseSpeed?: number })?.baseSpeed ?? 0.1;
});

function handleSpeedChange(v: number) {
	const instance = signalGraph.getNode(engineId);
	if (!instance) return;
	instance.state = setLfoSpeed(instance.state, v);
}
</script>

<WaveBar value={wave} color="var(--success)" />
<Slider
	label="Freq"
	value={speed()}
	min={0.01}
	max={1}
	step={0.01}
	unit="Hz"
	color="var(--success)"
	onchange={handleSpeedChange}
/>
<ValueDisplay value={wave} />
