/**
 * Comparator UI — Threshold gate with interactive threshold slider.
 *
 * Self-contained: own compute(), independent from comparator.ts.
 * Inputs: signal (0-1), threshold (0-1)
 * Output: gate (0 or 1, portType "trigger")
 * Widget: comparator_ui.svelte
 */

import type { ComputeResult, SignalDef, SignalValue } from "../graph/types";
import ComparatorUi from "./comparator_ui.svelte";

export const COMPONENT_COMPARATOR_UI: SignalDef = {
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
	widget: ComparatorUi,
};
