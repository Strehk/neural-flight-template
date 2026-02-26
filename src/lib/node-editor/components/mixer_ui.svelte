<script lang="ts">
/**
 * Mixer UI Widget — Per-channel gain sliders with dynamic "+" button
 *
 * Reads `data._channelCount` for visible channels.
 * Writes gain values via `signalGraph.setInput()`.
 * "+" button increments channelCount on both engine and SvelteFlow data.
 * Calls `useUpdateNodeInternals()` so SvelteFlow recalculates handle positions.
 */
import { useSvelteFlow, useUpdateNodeInternals } from "@xyflow/svelte";
import { AddButton, Slider, WaveBar } from "../controls";
import { signalGraph } from "../graph/engine";

interface Props {
	id: string;
	data: Record<string, unknown>;
	slotId: string;
}

const { id, data, slotId }: Props = $props();
const { updateNodeData } = useSvelteFlow();
const updateNodeInternals = useUpdateNodeInternals();

const engineId = $derived(`${id}_${slotId}`);
const channelCount = $derived((data._channelCount as number) ?? 2);
const mix = $derived((data.mix as number) ?? 0);

function handleGainChange(channel: number, value: number) {
	signalGraph.setInput(engineId, `gain${channel}`, value);
}

function addChannel() {
	if (channelCount >= 8) return;
	const next = channelCount + 1;
	signalGraph.setInput(engineId, "channelCount", next);
	updateNodeData(id, { _channelCount: next });
	updateNodeInternals(id);
}
</script>

<div class="mixer-channels nodrag">
	{#each Array.from({ length: channelCount }, (_, i) => i + 1) as ch}
		<Slider
			label="Ch{ch}"
			value={(data[`gain${ch}`] as number) ?? 0.5}
			min={0}
			max={1}
			step={0.01}
			onchange={(v) => handleGainChange(ch, v)}
		/>
	{/each}
	{#if channelCount < 8}
		<AddButton onclick={addChannel} />
	{/if}
</div>
<WaveBar value={mix} height={20} color="var(--accent-muted)" />

<style>
	.mixer-channels {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
</style>
