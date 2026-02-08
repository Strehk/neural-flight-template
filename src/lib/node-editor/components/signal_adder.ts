/**
 * SignalAdder — Adds two signals, clamps to 0-1.
 *
 * Inputs: a, b (0-1)
 * Output: sum = clampSignal(a + b)
 */

import type { ComputeResult, SignalDef, SignalValue } from "../graph/types";
import { clampSignal } from "../graph/types";

export const COMPONENT_ADDER: SignalDef = {
	type: "signal-adder",
	label: "Signal Adder",
	inputs: [
		{ id: "a", label: "A", default: 0 },
		{ id: "b", label: "B", default: 0 },
	],
	outputs: [{ id: "sum", label: "Sum", default: 0 }],
	createState: () => null,
	compute: (
		inputs: Record<string, SignalValue>,
		_state: unknown,
		_dt: number,
	): ComputeResult => ({
		outputs: { sum: clampSignal((inputs.a ?? 0) + (inputs.b ?? 0)) },
		state: null,
	}),
};
