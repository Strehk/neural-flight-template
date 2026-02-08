/**
 * LFO UI — Sine oscillator with WaveBar + speed knob.
 *
 * Self-contained: own compute(), independent from lfo.ts.
 * Input: speedMod (0-1, modulates oscillation speed)
 * Output: wave (0-1, sine)
 * Widget: lfo_ui.svelte
 */

import type { SignalDef } from "../graph/types";
import { clampSignal } from "../graph/types";
import LfoUi from "./lfo_ui.svelte";

interface LfoState {
	phase: number;
	baseSpeed: number;
}

export const COMPONENT_LFO_UI: SignalDef = {
	type: "lfo",
	label: "LFO",
	inputs: [{ id: "speedMod", label: "Speed Mod", default: 0.5 }],
	outputs: [{ id: "wave", label: "Wave", default: 0.5 }],
	createState: (): LfoState => ({ phase: 0, baseSpeed: 0.1 }),
	compute: (inputs, state, dt) => {
		const s = state as LfoState;
		const speedMod = inputs.speedMod ?? 0.5;
		const speed = s.baseSpeed * (0.25 + speedMod * 3.75);
		const phase = (s.phase + speed * dt) % 1;
		const wave = clampSignal((Math.sin(phase * Math.PI * 2) + 1) / 2);
		return { outputs: { wave }, state: { ...s, phase } };
	},
	widget: LfoUi,
};

export function setLfoSpeed(state: unknown, speed: number): LfoState {
	const s = state as LfoState;
	return { ...s, baseSpeed: Math.max(0.01, speed) };
}
