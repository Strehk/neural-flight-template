<script lang="ts">
/**
 * NoiseModule — Frequency, Amplitude, Speed controls.
 */

import { Slider } from "bits-ui";

interface Props {
	params: Record<string, number>;
	onparamchange: (name: string, value: number) => void;
}

let { params, onparamchange }: Props = $props();

const sliders = [
	{ key: "frequency", label: "Frequency", min: 0.1, max: 20.0, step: 0.1 },
	{ key: "amplitude", label: "Amplitude", min: 0.0, max: 1.0, step: 0.01 },
	{ key: "speed", label: "Speed", min: 0.0, max: 5.0, step: 0.1 },
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
