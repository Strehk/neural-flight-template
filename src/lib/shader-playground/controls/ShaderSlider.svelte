<script lang="ts">
	/**
	 * ShaderSlider — bits-ui Slider wrapper for shader uniforms.
	 */
	import { Slider } from "bits-ui";

	interface Props {
		value: number;
		min?: number;
		max?: number;
		step?: number;
		label?: string;
		onchange: (value: number) => void;
	}

	const {
		value,
		min = 0,
		max = 1,
		step = 0.01,
		label,
		onchange,
	}: Props = $props();

	const displayValue = $derived(() => {
		const v = value ?? 0;
		if (step < 0.01) return v.toFixed(3);
		if (step < 1) return v.toFixed(2);
		return v.toFixed(0);
	});
</script>

<div class="sp-ctrl-slider">
	{#if label}
		<span class="sp-ctrl-label">{label}</span>
	{/if}
	<Slider.Root
		type="single"
		{min}
		{max}
		{step}
		value={value ?? 0}
		onValueChange={onchange}
		class="slider-root"
	>
		<span class="slider-track">
			<Slider.Range class="slider-range" />
		</span>
		<Slider.Thumb class="slider-thumb" index={0} />
	</Slider.Root>
	<span class="sp-ctrl-value">{displayValue()}</span>
</div>

<style>
	.sp-ctrl-slider {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.sp-ctrl-label {
		color: var(--text-muted);
		font-size: 0.65rem;
		min-width: 0.8rem;
		font-family: var(--font-mono);
	}

	.sp-ctrl-value {
		color: var(--text-muted);
		font-size: 0.6rem;
		min-width: 2.5rem;
		text-align: right;
		font-family: var(--font-mono);
	}
</style>
