<script lang="ts">
/**
 * SliderModule — Single value control with min/max range.
 */

import { Slider } from "bits-ui";

interface Props {
	params: Record<string, number>;
	onparamchange: (name: string, value: number) => void;
}

let { params, onparamchange }: Props = $props();
</script>

<div class="control-module">
	<div class="control-row">
		<span class="control-label">Value</span>
		<span class="control-value">{params.value.toFixed(2)}</span>
	</div>
	<Slider.Root
		type="single"
		value={params.value}
		min={params.min}
		max={params.max}
		step={0.01}
		onValueChange={(v: number) => onparamchange("value", v)}
		class="slider-root"
	>
		<Slider.Range class="slider-range" />
		<Slider.Thumb index={0} class="slider-thumb" />
	</Slider.Root>
</div>
