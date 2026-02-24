<script lang="ts">
	/**
	 * XYPadModule — 2D touch/mouse pad for vec2 uniforms.
	 *
	 * Outputs X and Y as a vec2 uniform (2-element array).
	 */

	import type { XYConfig, ControlConfig } from "../../rack/types";

	interface Props {
		config: ControlConfig;
		enabled: boolean;
		targetUniform: string;
		onConfigChange: (config: ControlConfig) => void;
		onUniformChange: (name: string, value: number | number[] | boolean) => void;
	}

	let { config, enabled, targetUniform, onConfigChange, onUniformChange }: Props = $props();

	const xyConfig = $derived(config as XYConfig);

	let canvas: HTMLCanvasElement | undefined = $state();
	let dragging = $state(false);

	// Push value when config changes
	$effect(() => {
		if (enabled) {
			onUniformChange(targetUniform, [xyConfig.x, xyConfig.y]);
		}
	});

	$effect(() => {
		drawPad();
	});

	function drawPad(): void {
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const w = canvas.width;
		const h = canvas.height;
		ctx.clearRect(0, 0, w, h);

		// Background grid
		ctx.strokeStyle = "#333";
		ctx.lineWidth = 0.5;
		ctx.beginPath();
		ctx.moveTo(w / 2, 0);
		ctx.lineTo(w / 2, h);
		ctx.moveTo(0, h / 2);
		ctx.lineTo(w, h / 2);
		ctx.stroke();

		// Cursor position
		const nx = (xyConfig.x - xyConfig.minX) / (xyConfig.maxX - xyConfig.minX);
		const ny = 1 - (xyConfig.y - xyConfig.minY) / (xyConfig.maxY - xyConfig.minY);
		const cx = nx * w;
		const cy = ny * h;

		// Crosshair
		ctx.strokeStyle = "#a78bfa55";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(cx, 0);
		ctx.lineTo(cx, h);
		ctx.moveTo(0, cy);
		ctx.lineTo(w, cy);
		ctx.stroke();

		// Dot
		ctx.fillStyle = "#a78bfa";
		ctx.beginPath();
		ctx.arc(cx, cy, 5, 0, Math.PI * 2);
		ctx.fill();
	}

	function updateFromEvent(e: MouseEvent): void {
		if (!canvas || !enabled) return;
		const rect = canvas.getBoundingClientRect();
		const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
		const ny = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
		const x = xyConfig.minX + nx * (xyConfig.maxX - xyConfig.minX);
		const y = xyConfig.minY + ny * (xyConfig.maxY - xyConfig.minY);
		onConfigChange({ ...xyConfig, x, y });
	}

	function onMouseDown(e: MouseEvent): void {
		dragging = true;
		updateFromEvent(e);
	}

	function onMouseMove(e: MouseEvent): void {
		if (dragging) updateFromEvent(e);
	}

	function onMouseUp(): void {
		dragging = false;
	}
</script>

<svelte:window onmousemove={onMouseMove} onmouseup={onMouseUp} />

<div class="xy-module">
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<canvas
		bind:this={canvas}
		width={160}
		height={160}
		class="xy-canvas"
		onmousedown={onMouseDown}
	></canvas>

	<div class="xy-readouts">
		<div class="xy-readout">
			<span class="xy-label">X</span>
			<span class="xy-value">{xyConfig.x.toFixed(3)}</span>
		</div>
		<div class="xy-readout">
			<span class="xy-label">Y</span>
			<span class="xy-value">{xyConfig.y.toFixed(3)}</span>
		</div>
	</div>
</div>

<style>
	.xy-module {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		align-items: center;
	}

	.xy-canvas {
		width: 100%;
		max-width: 160px;
		height: 160px;
		background: var(--bg);
		border: 1px solid var(--border-subtle);
		cursor: crosshair;
	}

	.xy-readouts {
		display: flex;
		gap: var(--space-md);
		width: 100%;
		justify-content: center;
	}

	.xy-readout {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.xy-label {
		font-size: 0.5625rem;
		font-family: var(--font-mono);
		color: var(--text-subtle);
		font-weight: 700;
	}

	.xy-value {
		font-size: 0.625rem;
		font-family: var(--font-mono);
		color: var(--accent);
		font-weight: 700;
	}
</style>
