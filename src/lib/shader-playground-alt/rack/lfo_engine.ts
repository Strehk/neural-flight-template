/**
 * LFO Engine — Low Frequency Oscillator for Control Modules.
 *
 * Generates time-based waveforms (sine, square, saw, triangle)
 * scaled to a configurable min/max range.
 */

import type { LFOConfig, Waveform } from "./types";

// ── Waveform Generators ──
// Each returns a value in [0, 1] for a given phase (0..1)

const WAVEFORMS: Record<Waveform, (phase: number) => number> = {
	sine: (phase) => (Math.sin(phase * Math.PI * 2) + 1) / 2,
	square: (phase) => (phase < 0.5 ? 1 : 0),
	saw: (phase) => phase,
	triangle: (phase) => (phase < 0.5 ? phase * 2 : 2 - phase * 2),
};

// ── LFO Instance ──

export interface LFOInstance {
	getValue(timeMs: number): number;
	getPhase(timeMs: number): number;
}

export function createLFO(config: LFOConfig): LFOInstance {
	const waveFn = WAVEFORMS[config.waveform];

	return {
		getValue(timeMs: number): number {
			const phase = (timeMs * config.rate * 0.001) % 1;
			const normalized = waveFn(phase);
			return config.min + normalized * (config.max - config.min);
		},

		getPhase(timeMs: number): number {
			return (timeMs * config.rate * 0.001) % 1;
		},
	};
}
