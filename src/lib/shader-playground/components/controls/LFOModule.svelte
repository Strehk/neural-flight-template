<script lang="ts">
	/**
	 * LFOModule — Low Frequency Oscillator control.
	 *
	 * Generates time-based waveforms and pushes values to a target uniform.
	 * Renders: waveform selector, rate knob, min/max range, live waveform canvas.
	 */

	import { onDestroy } from "svelte";
	import { Slider } from "bits-ui";
	import { createLFO } from "../../rack/lfo_engine";
	import type { LFOConfig, Waveform, ControlConfig } from "../../rack/types";

	interface Props {
		config: ControlConfig;
		enabled: boolean;
		targetUniform: string;
		onConfigChange: (config: ControlConfig) => void;
		onUniformChange: (name: string, value: number | number[] | boolean) => void;
	}

	let { config, enabled, targetUniform, onConfigChange, onUniformChange }: Props = $props();

	const lfoConfig = $derived(config as LFOConfig);
	const WAVEFORMS: Waveform[] = ["sine", "square", "saw", "triangle"];

	let canvas: HTMLCanvasElement | undefined = $state();
	let currentValue = $state(0);
	let animId = 0;
	let startTime = performance.now();

	// Recreate LFO when config changes
	const lfo = $derived(createLFO(lfoConfig));

	// Animation loop
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

	function drawWaveform(currentPhase: number): void {
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const w = canvas.width;
		const h = canvas.height;
		ctx.clearRect(0, 0, w, h);

		// Draw waveform line
		ctx.strokeStyle = "#a78bfa";
		ctx.lineWidth = 1.5;
		ctx.beginPath();

		const instance = lfo;
		for (let x = 0; x < w; x++) {
			const phase = x / w;
			const val = instance.getValue(phase * 1000 / lfoConfig.rate);
			const normalized = (val - lfoConfig.min) / (lfoConfig.max - lfoConfig.min);
			const y = h - normalized * h;
			if (x === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.stroke();

		// Draw playhead
		const px = currentPhase * w;
		ctx.strokeStyle = "#facc15";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(px, 0);
		ctx.lineTo(px, h);
		ctx.stroke();
	}

	function setWaveform(wf: Waveform): void {
		onConfigChange({ ...lfoConfig, waveform: wf });
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

<div class="lfo-module">
	<!-- Waveform Canvas -->
	<canvas bind:this={canvas} width={200} height={48} class="lfo-canvas"></canvas>

	<!-- Waveform Selector -->
	<div class="lfo-row">
		<span class="lfo-label">WAVE</span>
		<div class="lfo-waveforms">
			{#each WAVEFORMS as wf (wf)}
				<button
					class="lfo-wf-btn"
					class:active={lfoConfig.waveform === wf}
					onclick={() => setWaveform(wf)}
				>
					{wf.slice(0, 3).toUpperCase()}
				</button>
			{/each}
		</div>
	</div>

	<!-- Rate -->
	<div class="lfo-row">
		<span class="lfo-label">RATE</span>
		<Slider.Root
			type="single"
			min={0.1}
			max={10}
			step={0.1}
			value={lfoConfig.rate}
			onValueChange={setRate}
			class="slider-root lfo-slider"
		>
			<span class="slider-track">
				<Slider.Range class="slider-range" />
			</span>
			<Slider.Thumb class="slider-thumb" index={0} />
		</Slider.Root>
		<span class="lfo-value">{lfoConfig.rate.toFixed(1)} Hz</span>
	</div>

	<!-- Min/Max -->
	<div class="lfo-row">
		<span class="lfo-label">MIN</span>
		<Slider.Root
			type="single"
			min={-2}
			max={2}
			step={0.01}
			value={lfoConfig.min}
			onValueChange={setMin}
			class="slider-root lfo-slider"
		>
			<span class="slider-track">
				<Slider.Range class="slider-range" />
			</span>
			<Slider.Thumb class="slider-thumb" index={0} />
		</Slider.Root>
		<span class="lfo-value">{lfoConfig.min.toFixed(2)}</span>
	</div>

	<div class="lfo-row">
		<span class="lfo-label">MAX</span>
		<Slider.Root
			type="single"
			min={-2}
			max={2}
			step={0.01}
			value={lfoConfig.max}
			onValueChange={setMax}
			class="slider-root lfo-slider"
		>
			<span class="slider-track">
				<Slider.Range class="slider-range" />
			</span>
			<Slider.Thumb class="slider-thumb" index={0} />
		</Slider.Root>
		<span class="lfo-value">{lfoConfig.max.toFixed(2)}</span>
	</div>

	<!-- Current Value -->
	<div class="lfo-readout">
		<span class="lfo-label">OUT</span>
		<span class="lfo-current">{currentValue.toFixed(3)}</span>
	</div>
</div>

<style>
	.lfo-module {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.lfo-canvas {
		width: 100%;
		height: 48px;
		background: var(--bg);
		border: 1px solid var(--border-subtle);
	}

	.lfo-row {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.lfo-label {
		font-size: 0.5625rem;
		font-family: var(--font-mono);
		color: var(--text-subtle);
		text-transform: uppercase;
		min-width: 2.5rem;
		flex-shrink: 0;
	}

	.lfo-value {
		font-size: 0.625rem;
		font-family: var(--font-mono);
		color: var(--text-muted);
		min-width: 3.5rem;
		text-align: right;
		flex-shrink: 0;
	}

	.lfo-waveforms {
		display: flex;
		gap: 2px;
	}

	.lfo-wf-btn {
		all: unset;
		font-size: 0.5rem;
		font-family: var(--font-mono);
		padding: 2px 6px;
		background: var(--border);
		color: var(--text-muted);
		cursor: pointer;
		text-transform: uppercase;
	}

	.lfo-wf-btn:hover {
		color: var(--text);
	}

	.lfo-wf-btn.active {
		background: var(--accent-muted);
		color: var(--text);
	}

	:global(.lfo-slider) {
		flex: 1;
	}

	.lfo-readout {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding-top: var(--space-xs);
		border-top: 1px solid var(--border-subtle);
	}

	.lfo-current {
		font-size: 0.75rem;
		font-family: var(--font-mono);
		font-weight: 700;
		color: var(--accent);
	}
</style>
