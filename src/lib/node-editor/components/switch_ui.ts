/**
 * Switch UI — Gate-controlled A/B selector with crossfade
 *
 * Self-contained: own compute(), independent from switch.ts.
 * Inputs: gate (trigger), a (0-1), b (0-1)
 * Output: out (0-1, interpolated between a and b)
 * Widget: switch_ui.svelte
 */

import type { ComputeResult, SignalDef, SignalValue } from "../graph/types";
import { clampSignal, lerp } from "../graph/types";
import SwitchUi from "./switch_ui.svelte";

interface SwitchState {
	blend: number;
	smoothing: number;
}

export const COMPONENT_SWITCH_UI: SignalDef = {
	type: "switch",
	label: "Switch",
	inputs: [
		{ id: "gate", label: "Gate", default: 0, portType: "trigger" },
		{ id: "a", label: "A", default: 0.25 },
		{ id: "b", label: "B", default: 0.75 },
	],
	outputs: [{ id: "out", label: "Out", default: 0.25 }],
	createState: (): SwitchState => ({ blend: 0, smoothing: 0.1 }),
	compute: (
		inputs: Record<string, SignalValue>,
		state: unknown,
		dt: number,
	): ComputeResult => {
		const s = state as SwitchState;
		const gate = inputs.gate ?? 0;
		const a = inputs.a ?? 0.25;
		const b = inputs.b ?? 0.75;

		const target = gate > 0.5 ? 1 : 0;
		let newBlend: number;
		if (s.smoothing <= 0) {
			newBlend = target;
		} else {
			const speed = 1 / s.smoothing;
			const delta = (target - s.blend) * Math.min(1, speed * dt);
			newBlend = clampSignal(s.blend + delta);
		}

		const out = lerp(a, b, newBlend);
		return {
			outputs: { out: clampSignal(out) },
			state: { ...s, blend: newBlend },
		};
	},
	widget: SwitchUi,
};
