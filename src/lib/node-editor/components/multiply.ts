/**
 * Multiply Signal Node — out = clamp01(a × b)
 *
 * Simplest useful math operator. Both inputs default to 0.5.
 */

import type { SignalDef, ComputeResult, SignalValue } from "../graph/types";
import { clamp01 } from "../graph/types";

export const MULTIPLY_SIGNAL: SignalDef = {
	type: "multiply",
	label: "Multiply",
	inputs: [
		{ id: "a", label: "A", default: 0.5 },
		{ id: "b", label: "B", default: 0.5 },
	],
	outputs: [{ id: "out", label: "Out", default: 0.25 }],
	createState: () => ({}),
	compute: (
		inputs: Record<string, SignalValue>,
		state: unknown,
		_dt: number,
	): ComputeResult => {
		const a = inputs.a ?? 0.5;
		const b = inputs.b ?? 0.5;
		return {
			outputs: { out: clamp01(a * b) },
			state,
		};
	},
};
