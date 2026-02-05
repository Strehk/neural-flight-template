<script lang="ts">
	/**
	 * Slider Control — Range input with label and value display
	 */

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

	// Format value based on step precision
	const displayValue = $derived(() => {
		if (step < 0.01) return value.toFixed(3);
		if (step < 1) return value.toFixed(2);
		return value.toFixed(0);
	});

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		onchange(Number.parseFloat(target.value));
	}
</script>

<div class="control-slider" style="--slider-color: {color}">
	{#if label}
		<span class="label">{label}</span>
	{/if}
	<input
		type="range"
		{min}
		{max}
		{step}
		{value}
		{disabled}
		oninput={handleInput}
		class="nodrag slider"
	/>
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

	.slider {
		flex: 1;
		height: 4px;
		accent-color: var(--slider-color);
		cursor: pointer;
	}

	.slider:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.value {
		color: var(--slider-color);
		font-size: 0.65rem;
		min-width: 48px;
		text-align: right;
	}
</style>
