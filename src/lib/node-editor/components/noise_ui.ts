/**
 * Noise UI — Smooth random signal with visual feedback.
 *
 * Self-contained: own compute(), independent from noise.ts.
 * Input: speed (0-1)
 * Output: noise (0-1, smooth random)
 * Widget: noise_ui.svelte
 */

import type { ComputeResult, SignalDef, SignalValue } from "../graph/types";
import { clampSignal, lerp, remap } from "../graph/types";
import NoiseUi from "./noise_ui.svelte";

// --- Configurable ranges ---
const PERIOD_MIN = 0.1;
const PERIOD_MAX = 5.0;

interface NoiseState {
	value: number;
	target: number;
	time: number;
}

export const COMPONENT_NOISE_UI: SignalDef = {
	type: "noise",
	label: "Noise",
	inputs: [{ id: "speed", label: "Speed", default: 0.5 }],
	outputs: [{ id: "noise", label: "Noise", default: 0.5 }],
	createState: (): NoiseState => ({
		value: 0.5,
		target: Math.random(),
		time: 0,
	}),
	compute: (
		inputs: Record<string, SignalValue>,
		state: unknown,
		dt: number,
	): ComputeResult => {
		const s = state as NoiseState;
		const speed = inputs.speed ?? 0.5;
		const period = remap(1 - speed, PERIOD_MIN, PERIOD_MAX);

		let { value, target, time } = s;

		time -= dt;
		if (time <= 0) {
			target = Math.random();
			time = period;
		}

		value = lerp(value, target, Math.min(dt / period, 1));

		return {
			outputs: { noise: clampSignal(value) },
			state: { value, target, time } satisfies NoiseState,
		};
	},
	widget: NoiseUi,
};
