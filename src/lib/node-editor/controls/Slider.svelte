<script lang="ts">
	/**
	 * Slider Control — bits-ui Slider with label and value display
	 */
	import { Slider as BitsSlider } from "bits-ui";

	interface Props {
		value: number;
		min?: number;
		max?: number;
		step?: number;
		label?: string;
		unit?: string;
		disabled?: boolean;
		color?: string;
		onchange: (value: number) => void;
	}

	const {
		value,
		min = 0,
		max = 1,
		step = 0.01,
		label,
		unit = "",
		disabled = false,
		color = "var(--text-muted)",
		onchange,
	}: Props = $props();

	const displayValue = $derived(() => {
		if (step < 0.01) return value.toFixed(3);
		if (step < 1) return value.toFixed(2);
		return value.toFixed(0);
	});
</script>

<div class="control-slider" style="--slider-color: {color}">
	{#if label}
		<span class="label">{label}</span>
	{/if}
	<BitsSlider.Root
		type="single"
		{min}
		{max}
		{step}
		{value}
		{disabled}
		onValueChange={onchange}
		class="slider-root nodrag"
	>
		<span class="slider-track">
			<BitsSlider.Range class="slider-range" />
		</span>
		<BitsSlider.Thumb class="slider-thumb" index={0} />
	</BitsSlider.Root>
	<span class="value">{displayValue()}{unit}</span>
</div>

<style>
	.control-slider {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.label {
		color: var(--text-muted);
		font-size: 0.65rem;
		text-transform: uppercase;
		min-width: 36px;
	}

	.value {
		color: var(--slider-color);
		font-size: 0.65rem;
		min-width: 48px;
		text-align: right;
	}
</style>
