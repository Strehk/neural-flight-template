<script lang="ts">
/**
 * SliderModule — Single-value slider for float uniforms.
 *
 * All styling via shader-rack.css — no local <style> block.
 */

import { Slider } from "bits-ui";
import type { ControlConfig, SliderConfig } from "../../rack/types";

interface Props {
	config: ControlConfig;
	enabled: boolean;
	targetUniform: string;
	onConfigChange: (config: ControlConfig) => void;
	onUniformChange: (name: string, value: number | number[] | boolean) => void;
}

let { config, enabled, targetUniform, onConfigChange, onUniformChange }: Props =
	$props();

const sliderConfig = $derived(config as SliderConfig);

$effect(() => {
	if (enabled) {
		onUniformChange(targetUniform, sliderConfig.value);
	}
});

function setValue(val: number): void {
	onConfigChange({ ...sliderConfig, value: val });
}
</script>

<div class="sp-ctrl-module">
	<div class="sp-ctrl-row">
		<span class="sp-ctrl-label">{targetUniform}</span>
		<Slider.Root
			type="single"
			min={sliderConfig.min}
			max={sliderConfig.max}
			step={sliderConfig.step}
			value={sliderConfig.value}
			onValueChange={setValue}
			class="slider-root sp-ctrl-slider"
		>
			<span class="slider-track">
				<Slider.Range class="slider-range" />
			</span>
			<Slider.Thumb class="slider-thumb" index={0} />
		</Slider.Root>
		<span class="sp-ctrl-value">{sliderConfig.value.toFixed(3)}</span>
	</div>
</div>
