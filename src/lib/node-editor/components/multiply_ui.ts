/**
 * Multiply UI — Signal multiplier with output display
 *
 * Self-contained: own compute(), independent from multiply.ts.
 * Inputs: a, b (0-1)
 * Output: out (0-1, clamped product)
 * Widget: multiply_ui.svelte
 */

import type { ComputeResult, SignalDef, SignalValue } from "../graph/types";
import { clampSignal } from "../graph/types";
import MultiplyUi from "./multiply_ui.svelte";

export const COMPONENT_MULTIPLY_UI: SignalDef = {
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
		_state: unknown,
		_dt: number,
	): ComputeResult => {
		const a = inputs.a ?? 0.5;
		const b = inputs.b ?? 0.5;
		return {
			outputs: { out: clampSignal(a * b) },
			state: null,
		};
	},
	widget: MultiplyUi,
};
