/**
 * Multiply Signal Node — out = clampSignal(a × b)
 *
 * Simplest useful math operator. Both inputs default to 0.5.
 */

import type { ComputeResult, SignalDef, SignalValue } from "../graph/types";
import { clampSignal } from "../graph/types";

export const COMPONENT_MULTIPLY: SignalDef = {
	type: "multiply",
	label: "Multiply",
	inputs: [
		{ id: "a", label: "A", default: 0.5 },
		{ id: "b", label: "B", default: 0.5 },
	],
	outputs: [{ id: "out", label: "Out", default: 0.25 }],
	createState: () => null,
	compute: (
		inputs: Record<string, SignalValue>,
		state: unknown,
		_dt: number,
	): ComputeResult => {
		const a = inputs.a ?? 0.5;
		const b = inputs.b ?? 0.5;
		return {
			outputs: { out: clampSignal(a * b) },
			state: null,
		};
	},
};
