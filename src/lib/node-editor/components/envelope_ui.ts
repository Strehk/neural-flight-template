/**
 * Envelope UI — ADSR envelope with interactive sliders.
 *
 * Self-contained: own compute(), independent from envelope.ts.
 * Inputs: gate, attack, decay, sustain, release (0-1)
 * Output: envelope (0-1)
 * Widget: envelope_ui.svelte
 */

import type { ComputeResult, SignalDef, SignalValue } from "../graph/types";
import { clampSignal, remap } from "../graph/types";
import EnvelopeUi from "./envelope_ui.svelte";

// --- Configurable ranges (ADSR time mapping) ---
/** Minimum time in seconds (input=0) */
export const ADSR_TIME_MIN = 0.01;
/** Maximum time in seconds (input=1) */
export const ADSR_TIME_MAX = 2.0;

type EnvelopePhase = "idle" | "attack" | "decay" | "sustain" | "release";

interface EnvelopeState {
	phase: EnvelopePhase;
	level: number;
	gateWasHigh: boolean;
}

export const COMPONENT_ENVELOPE_UI: SignalDef = {
	type: "envelope",
	label: "Envelope",
	inputs: [
		{ id: "gate", label: "Gate", default: 0 },
		{ id: "attack", label: "Attack", default: 0.2 },
		{ id: "decay", label: "Decay", default: 0.3 },
		{ id: "sustain", label: "Sustain", default: 0.7 },
		{ id: "release", label: "Release", default: 0.4 },
	],
	outputs: [{ id: "envelope", label: "Envelope", default: 0 }],
	createState: (): EnvelopeState => ({
		phase: "idle",
		level: 0,
		gateWasHigh: false,
	}),
	compute: (
		inputs: Record<string, SignalValue>,
		state: unknown,
		dt: number,
	): ComputeResult => {
		const s = state as EnvelopeState;
		const gateHigh = (inputs.gate ?? 0) > 0.5;

		const attackTime = remap(inputs.attack ?? 0.2, ADSR_TIME_MIN, ADSR_TIME_MAX);
		const decayTime = remap(inputs.decay ?? 0.3, ADSR_TIME_MIN, ADSR_TIME_MAX);
		const sustainLevel = clampSignal(inputs.sustain ?? 0.7);
		const releaseTime = remap(
			inputs.release ?? 0.4,
			ADSR_TIME_MIN,
			ADSR_TIME_MAX,
		);

		let { phase, level } = s;

		const risingEdge = gateHigh && !s.gateWasHigh;
		const fallingEdge = !gateHigh && s.gateWasHigh;

		if (risingEdge) phase = "attack";
		if (fallingEdge && phase !== "idle") phase = "release";

		switch (phase) {
			case "attack":
				level += dt / attackTime;
				if (level >= 1) {
					level = 1;
					phase = "decay";
				}
				break;
			case "decay":
				level -= (dt / decayTime) * (1 - sustainLevel);
				if (level <= sustainLevel) {
					level = sustainLevel;
					phase = "sustain";
				}
				break;
			case "sustain":
				level = sustainLevel;
				break;
			case "release":
				level -= (dt / releaseTime) * level;
				if (level <= 0.001) {
					level = 0;
					phase = "idle";
				}
				break;
			case "idle":
				level = 0;
				break;
		}

		return {
			outputs: { envelope: clampSignal(level) },
			state: {
				phase,
				level,
				gateWasHigh: gateHigh,
			} satisfies EnvelopeState,
		};
	},
	widget: EnvelopeUi,
};
