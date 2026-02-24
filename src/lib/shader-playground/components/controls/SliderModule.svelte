<script lang="ts">
	/**
	 * SliderModule — Single-value slider for float uniforms.
	 */

	import { Slider } from "bits-ui";
	import type { SliderConfig, ControlConfig } from "../../rack/types";

	interface Props {
		config: ControlConfig;
		enabled: boolean;
		targetUniform: string;
		onConfigChange: (config: ControlConfig) => void;
		onUniformChange: (name: string, value: number | number[] | boolean) => void;
	}

	let { config, enabled, targetUniform, onConfigChange, onUniformChange }: Props = $props();

	const sliderConfig = $derived(config as SliderConfig);

	// Push value when config changes
	$effect(() => {
		if (enabled) {
			onUniformChange(targetUniform, sliderConfig.value);
		}
	});

	function setValue(val: number): void {
		onConfigChange({ ...sliderConfig, value: val });
	}
</script>

<div class="slider-module">
	<div class="slider-row">
		<span class="slider-label">{targetUniform}</span>
		<Slider.Root
			type="single"
			min={sliderConfig.min}
			max={sliderConfig.max}
			step={sliderConfig.step}
			value={sliderConfig.value}
			onValueChange={setValue}
			class="slider-root slider-ctrl"
		>
			<span class="slider-track">
				<Slider.Range class="slider-range" />
			</span>
			<Slider.Thumb class="slider-thumb" index={0} />
		</Slider.Root>
		<span class="slider-value">{sliderConfig.value.toFixed(3)}</span>
	</div>
</div>

<style>
	.slider-module {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.slider-row {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.slider-label {
		font-size: 0.5625rem;
		font-family: var(--font-mono);
		color: var(--text-subtle);
		text-transform: uppercase;
		min-width: 4rem;
		flex-shrink: 0;
	}

	:global(.slider-ctrl) {
		flex: 1;
	}

	.slider-value {
		font-size: 0.625rem;
		font-family: var(--font-mono);
		color: var(--accent);
		font-weight: 700;
		min-width: 3.5rem;
		text-align: right;
		flex-shrink: 0;
	}
</style>
