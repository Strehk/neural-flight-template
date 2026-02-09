<script lang="ts">
/**
 * Mixer UI Widget — Per-channel gain sliders with dynamic "+" button
 *
 * Reads `data._channelCount` for visible channels.
 * Writes gain values via `signalGraph.setInput()`.
 * "+" button increments channelCount on both engine and SvelteFlow data.
 */
import { useSvelteFlow } from "@xyflow/svelte";
import { signalGraph } from "../graph/engine";
import { Slider, WaveBar } from "../controls";

interface Props {
	id: string;
	data: Record<string, unknown>;
	slotId: string;
}

const { id, data, slotId }: Props = $props();
const { updateNodeData } = useSvelteFlow();

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
}
</script>

<div class="mixer-channels nodrag">
	{#each Array.from({ length: channelCount }, (_, i) => i + 1) as ch}
		<div class="channel">
			<span class="ch-label">Ch{ch}</span>
			<Slider
				value={(data[`gain${ch}`] as number) ?? 0.5}
				min={0}
				max={1}
				step={0.01}
				onchange={(v) => handleGainChange(ch, v)}
			/>
		</div>
	{/each}
	{#if channelCount < 8}
		<button class="add-btn" onclick={addChannel} aria-label="Add channel">+</button>
	{/if}
</div>
<WaveBar value={mix} height={20} color="var(--accent-muted)" />

<style>
	.mixer-channels {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.channel {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.ch-label {
		font-size: 0.55rem;
		color: var(--text-muted);
		min-width: 24px;
		text-transform: uppercase;
	}

	.add-btn {
		align-self: flex-start;
		background: var(--border);
		border: none;
		color: var(--text-muted);
		font-size: 0.7rem;
		padding: 0.1rem 0.4rem;
		cursor: pointer;
		border-radius: 2px;
	}

	.add-btn:hover {
		background: var(--accent-muted);
		color: var(--bg);
	}
</style>
