<script lang="ts">
/**
 * XYPadModule — 2D touch/mouse pad for vec2 uniforms.
 *
 * All styling via shader-rack.css — no local <style> block.
 */

import type { ControlConfig, XYConfig } from "../../rack/types";

interface Props {
	config: ControlConfig;
	enabled: boolean;
	targetUniform: string;
	onConfigChange: (config: ControlConfig) => void;
	onUniformChange: (name: string, value: number | number[] | boolean) => void;
}

let { config, enabled, targetUniform, onConfigChange, onUniformChange }: Props =
	$props();

const xyConfig = $derived(config as XYConfig);

let canvas: HTMLCanvasElement | undefined = $state();
let dragging = $state(false);

$effect(() => {
	if (enabled) {
		onUniformChange(targetUniform, [xyConfig.x, xyConfig.y]);
	}
});

$effect(() => {
	drawPad();
});

function getCssColor(prop: string, fallback: string): string {
	if (!canvas) return fallback;
	return getComputedStyle(canvas).getPropertyValue(prop).trim() || fallback;
}

function drawPad(): void {
	if (!canvas) return;
	const ctx = canvas.getContext("2d");
	if (!ctx) return;

	const w = canvas.width;
	const h = canvas.height;
	ctx.clearRect(0, 0, w, h);

	const borderColor = getCssColor("--border", "#333");
	const accentColor = getCssColor("--accent", "#a78bfa");

	ctx.strokeStyle = borderColor;
	ctx.lineWidth = 0.5;
	ctx.beginPath();
	ctx.moveTo(w / 2, 0);
	ctx.lineTo(w / 2, h);
	ctx.moveTo(0, h / 2);
	ctx.lineTo(w, h / 2);
	ctx.stroke();

	const nx = (xyConfig.x - xyConfig.minX) / (xyConfig.maxX - xyConfig.minX);
	const ny = 1 - (xyConfig.y - xyConfig.minY) / (xyConfig.maxY - xyConfig.minY);
	const cx = nx * w;
	const cy = ny * h;

	ctx.strokeStyle = `${accentColor}55`;
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(cx, 0);
	ctx.lineTo(cx, h);
	ctx.moveTo(0, cy);
	ctx.lineTo(w, cy);
	ctx.stroke();

	ctx.fillStyle = accentColor;
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

<div class="sp-ctrl-module" data-type="xy">
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<canvas
		bind:this={canvas}
		width={160}
		height={160}
		class="sp-ctrl-canvas"
		data-type="xy"
		onmousedown={onMouseDown}
	></canvas>

	<div class="sp-ctrl-readouts">
		<div class="sp-ctrl-readout-pair">
			<span class="sp-ctrl-readout-label">X</span>
			<span class="sp-ctrl-readout-num">{xyConfig.x.toFixed(3)}</span>
		</div>
		<div class="sp-ctrl-readout-pair">
			<span class="sp-ctrl-readout-label">Y</span>
			<span class="sp-ctrl-readout-num">{xyConfig.y.toFixed(3)}</span>
		</div>
	</div>
</div>
