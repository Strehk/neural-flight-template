/**
 * Switch Signal Node — Gate-controlled A/B selector
 *
 * Outputs value A when gate is LOW (0), value B when gate is HIGH (1).
 * Smooth crossfade optional.
 */

import type { SignalNodeDef, ComputeResult, SignalValue } from "../graph/types";
import { clamp01, lerp } from "../graph/types";
import { registerNodeType } from "../graph/engine";

interface SwitchState {
	/** Current blend position (0 = A, 1 = B) for smooth transitions */
	blend: number;
	/** Transition speed (0 = instant, 1 = 1 second) */
	smoothing: number;
}

export const SWITCH_NODE: SignalNodeDef = {
	type: "switch",
	label: "Switch",
	inputs: [
		{
			id: "gate",
			label: "Gate",
			default: 0,
		},
		{
			id: "a",
			label: "A",
			default: 0.25, // Value when gate is LOW
		},
		{
			id: "b",
			label: "B",
			default: 0.75, // Value when gate is HIGH
		},
	],
	outputs: [
		{
			id: "out",
			label: "Out",
			default: 0.25,
		},
	],
	createState: (): SwitchState => ({
		blend: 0,
		smoothing: 0.1, // 100ms transition
	}),
	compute: (
		inputs: Record<string, SignalValue>,
		state: unknown,
		dt: number,
	): ComputeResult => {
		const s = state as SwitchState;

		const gate = inputs.gate ?? 0;
		const a = inputs.a ?? 0.25;
		const b = inputs.b ?? 0.75;

		// Target blend based on gate
		const target = gate > 0.5 ? 1 : 0;

		// Smooth transition
		let newBlend: number;
		if (s.smoothing <= 0) {
			newBlend = target;
		} else {
			const speed = 1 / s.smoothing;
			const delta = (target - s.blend) * Math.min(1, speed * dt);
			newBlend = clamp01(s.blend + delta);
		}

		// Interpolate between A and B
		const out = lerp(a, b, newBlend);

		return {
			outputs: { out: clamp01(out) },
			state: { ...s, blend: newBlend },
		};
	},
};

/** Set transition smoothing time */
export function setSwitchSmoothing(
	state: SwitchState,
	smoothing: number,
): SwitchState {
	return { ...state, smoothing: Math.max(0, smoothing) };
}

// Auto-register
registerNodeType(SWITCH_NODE);
