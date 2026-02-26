<script lang="ts">
/**
 * LFOModule — Rate + min/max range controls.
 */

import { Slider } from "bits-ui";

interface Props {
	params: Record<string, number>;
	onparamchange: (name: string, value: number) => void;
}

let { params, onparamchange }: Props = $props();

const sliders = [
	{ key: "rate", label: "Rate (Hz)", min: 0.1, max: 10.0, step: 0.1 },
	{ key: "min", label: "Min", min: 0.0, max: 1.0, step: 0.01 },
	{ key: "max", label: "Max", min: 0.0, max: 1.0, step: 0.01 },
] as const;
</script>

<div class="control-module">
	{#each sliders as s (s.key)}
		<div class="control-row">
			<span class="control-label">{s.label}</span>
			<span class="control-value">{(params[s.key] ?? 0).toFixed(2)}</span>
		</div>
		<Slider.Root
			type="single"
			value={params[s.key] ?? 0}
			min={s.min}
			max={s.max}
			step={s.step}
			onValueChange={(v: number) => onparamchange(s.key, v)}
			class="slider-root"
		>
			<Slider.Range class="slider-range" />
			<Slider.Thumb index={0} class="slider-thumb" />
		</Slider.Root>
	{/each}
</div>
