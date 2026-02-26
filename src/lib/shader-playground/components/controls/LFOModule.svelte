<script lang="ts">
/**
 * LFOModule — Low Frequency Oscillator control.
 *
 * Generates time-based waveforms and pushes values to a target uniform.
 * All styling via shader-rack.css — no local <style> block.
 */

import { Slider, ToggleGroup } from "bits-ui";
import { onDestroy } from "svelte";
import { createLFO } from "../../rack/lfo_engine";
import type { ControlConfig, LFOConfig, Waveform } from "../../rack/types";

interface Props {
	config: ControlConfig;
	enabled: boolean;
	targetUniform: string;
	onConfigChange: (config: ControlConfig) => void;
	onUniformChange: (name: string, value: number | number[] | boolean) => void;
}

let { config, enabled, targetUniform, onConfigChange, onUniformChange }: Props =
	$props();

const lfoConfig = $derived(config as LFOConfig);
const WAVEFORMS: Waveform[] = ["sine", "square", "saw", "triangle"];

let canvas: HTMLCanvasElement | undefined = $state();
let currentValue = $state(0);
let animId = 0;
let startTime = performance.now();

const lfo = $derived(createLFO(lfoConfig));

$effect(() => {
	if (!enabled) {
		cancelAnimationFrame(animId);
		return;
	}

	const instance = lfo;

	function tick(): void {
		const elapsed = performance.now() - startTime;
		currentValue = instance.getValue(elapsed);
		onUniformChange(targetUniform, currentValue);
		drawWaveform(instance.getPhase(elapsed));
		animId = requestAnimationFrame(tick);
	}

	animId = requestAnimationFrame(tick);

	return () => cancelAnimationFrame(animId);
});

function getCssColor(prop: string, fallback: string): string {
	if (!canvas) return fallback;
	return getComputedStyle(canvas).getPropertyValue(prop).trim() || fallback;
}

function drawWaveform(currentPhase: number): void {
	if (!canvas) return;
	const ctx = canvas.getContext("2d");
	if (!ctx) return;

	const w = canvas.width;
	const h = canvas.height;
	ctx.clearRect(0, 0, w, h);

	const accentColor = getCssColor("--accent", "#a78bfa");
	const accentSecondary = getCssColor("--warning", "#facc15");

	ctx.strokeStyle = accentColor;
	ctx.lineWidth = 1.5;
	ctx.beginPath();

	const instance = lfo;
	for (let x = 0; x < w; x++) {
		const phase = x / w;
		const val = instance.getValue((phase * 1000) / lfoConfig.rate);
		const normalized = (val - lfoConfig.min) / (lfoConfig.max - lfoConfig.min);
		const y = h - normalized * h;
		if (x === 0) ctx.moveTo(x, y);
		else ctx.lineTo(x, y);
	}
	ctx.stroke();

	const px = currentPhase * w;
	ctx.strokeStyle = accentSecondary;
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(px, 0);
	ctx.lineTo(px, h);
	ctx.stroke();
}

function setWaveform(wf: string): void {
	if (wf) onConfigChange({ ...lfoConfig, waveform: wf as Waveform });
}

function setRate(val: number): void {
	onConfigChange({ ...lfoConfig, rate: val });
}

function setMin(val: number): void {
	onConfigChange({ ...lfoConfig, min: val });
}

function setMax(val: number): void {
	onConfigChange({ ...lfoConfig, max: val });
}

onDestroy(() => cancelAnimationFrame(animId));
</script>

<div class="sp-ctrl-module">
	<canvas bind:this={canvas} width={200} height={48} class="sp-ctrl-canvas"></canvas>

	<div class="sp-ctrl-row">
		<span class="sp-ctrl-label">WAVE</span>
		<ToggleGroup.Root
			type="single"
			value={lfoConfig.waveform}
			onValueChange={setWaveform}
			class="sp-ctrl-waveforms"
		>
			{#each WAVEFORMS as wf (wf)}
				<ToggleGroup.Item value={wf}>
					{wf.slice(0, 3).toUpperCase()}
				</ToggleGroup.Item>
			{/each}
		</ToggleGroup.Root>
	</div>

	<div class="sp-ctrl-row">
		<span class="sp-ctrl-label">RATE</span>
		<Slider.Root
			type="single"
			min={0.1}
			max={10}
			step={0.1}
			value={lfoConfig.rate}
			onValueChange={setRate}
			class="slider-root sp-ctrl-slider"
		>
			<span class="slider-track">
				<Slider.Range class="slider-range" />
			</span>
			<Slider.Thumb class="slider-thumb" index={0} />
		</Slider.Root>
		<span class="sp-ctrl-value">{lfoConfig.rate.toFixed(1)} Hz</span>
	</div>

	<div class="sp-ctrl-row">
		<span class="sp-ctrl-label">MIN</span>
		<Slider.Root
			type="single"
			min={-2}
			max={2}
			step={0.01}
			value={lfoConfig.min}
			onValueChange={setMin}
			class="slider-root sp-ctrl-slider"
		>
			<span class="slider-track">
				<Slider.Range class="slider-range" />
			</span>
			<Slider.Thumb class="slider-thumb" index={0} />
		</Slider.Root>
		<span class="sp-ctrl-value">{lfoConfig.min.toFixed(2)}</span>
	</div>

	<div class="sp-ctrl-row">
		<span class="sp-ctrl-label">MAX</span>
		<Slider.Root
			type="single"
			min={-2}
			max={2}
			step={0.01}
			value={lfoConfig.max}
			onValueChange={setMax}
			class="slider-root sp-ctrl-slider"
		>
			<span class="slider-track">
				<Slider.Range class="slider-range" />
			</span>
			<Slider.Thumb class="slider-thumb" index={0} />
		</Slider.Root>
		<span class="sp-ctrl-value">{lfoConfig.max.toFixed(2)}</span>
	</div>

	<div class="sp-ctrl-readout">
		<span class="sp-ctrl-label">OUT</span>
		<span class="sp-ctrl-readout-value">{currentValue.toFixed(3)}</span>
	</div>
</div>
