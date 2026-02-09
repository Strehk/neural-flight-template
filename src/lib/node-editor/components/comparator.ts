/**
 * Comparator — Threshold gate: outputs 1 when signal exceeds threshold.
 *
 * Stateless. Like a Schmitt trigger in analog electronics.
 * Input: signal (0-1), threshold (0-1, default 0.5)
 * Output: gate (0 or 1, portType "trigger")
 */

import type { ComputeResult, SignalDef, SignalValue } from "../graph/types";

export const COMPONENT_COMPARATOR: SignalDef = {
	type: "comparator",
	label: "Comparator",
	inputs: [
		{ id: "signal", label: "Signal", default: 0 },
		{ id: "threshold", label: "Threshold", default: 0.5 },
	],
	outputs: [{ id: "gate", label: "Gate", default: 0, portType: "trigger" }],
	createState: () => null,
	compute: (
		inputs: Record<string, SignalValue>,
		_state: unknown,
		_dt: number,
	): ComputeResult => ({
		outputs: {
			gate: (inputs.signal ?? 0) > (inputs.threshold ?? 0.5) ? 1 : 0,
		},
		state: null,
	}),
};
