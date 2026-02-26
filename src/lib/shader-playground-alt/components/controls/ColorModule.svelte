<script lang="ts">
/**
 * ColorModule — Color picker that outputs vec3 uniform.
 *
 * All styling via shader-rack.css — no local <style> block.
 */

import type { ColorConfig, ControlConfig } from "../../rack/types";

interface Props {
	config: ControlConfig;
	enabled: boolean;
	targetUniform: string;
	onConfigChange: (config: ControlConfig) => void;
	onUniformChange: (name: string, value: number | number[] | boolean) => void;
}

let { config, enabled, targetUniform, onConfigChange, onUniformChange }: Props =
	$props();

const colorConfig = $derived(config as ColorConfig);

$effect(() => {
	if (enabled) {
		const rgb = hexToRgb(colorConfig.hex);
		onUniformChange(targetUniform, rgb);
	}
});

function hexToRgb(hex: string): number[] {
	const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
	const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
	const b = Number.parseInt(hex.slice(5, 7), 16) / 255;
	return [r, g, b];
}

function rgbDisplay(): string {
	const rgb = hexToRgb(colorConfig.hex);
	return rgb.map((v) => v.toFixed(2)).join(", ");
}

function setColor(hex: string): void {
	onConfigChange({ ...colorConfig, hex });
}
</script>

<div class="sp-ctrl-module">
	<div class="sp-ctrl-row">
		<input
			type="color"
			value={colorConfig.hex}
			oninput={(e) => setColor((e.target as HTMLInputElement).value)}
			class="sp-ctrl-color-input"
		/>
		<div class="sp-ctrl-color-info">
			<span class="sp-ctrl-color-hex">{colorConfig.hex}</span>
			<span class="sp-ctrl-color-rgb">vec3({rgbDisplay()})</span>
		</div>
	</div>
</div>
