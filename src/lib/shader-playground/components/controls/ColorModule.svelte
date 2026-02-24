<script lang="ts">
	/**
	 * ColorModule — Color picker that outputs vec3 uniform.
	 *
	 * Converts hex color to normalized RGB [0..1] vec3.
	 */

	import type { ColorConfig, ControlConfig } from "../../rack/types";

	interface Props {
		config: ControlConfig;
		enabled: boolean;
		targetUniform: string;
		onConfigChange: (config: ControlConfig) => void;
		onUniformChange: (name: string, value: number | number[] | boolean) => void;
	}

	let { config, enabled, targetUniform, onConfigChange, onUniformChange }: Props = $props();

	const colorConfig = $derived(config as ColorConfig);

	// Convert hex to normalized RGB and push to uniform
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

<div class="color-module">
	<div class="color-row">
		<input
			type="color"
			value={colorConfig.hex}
			oninput={(e) => setColor((e.target as HTMLInputElement).value)}
			class="color-input"
		/>
		<div class="color-info">
			<span class="color-hex">{colorConfig.hex}</span>
			<span class="color-rgb">vec3({rgbDisplay()})</span>
		</div>
	</div>
</div>

<style>
	.color-module {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.color-row {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.color-input {
		width: 36px;
		height: 36px;
		border: 1px solid var(--border);
		cursor: pointer;
		padding: 0;
		background: none;
		flex-shrink: 0;
	}

	.color-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.color-hex {
		font-size: 0.75rem;
		font-family: var(--font-mono);
		font-weight: 700;
		color: var(--text);
	}

	.color-rgb {
		font-size: 0.5625rem;
		font-family: var(--font-mono);
		color: var(--accent);
	}
</style>
