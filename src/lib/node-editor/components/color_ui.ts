/**
 * Color UI — RGB color mixer with color picker widget
 *
 * Self-contained: own compute(), independent from color.ts.
 * Inputs: r, g, b (0-1)
 * Outputs: r, g, b (0-1, passthrough)
 * Widget: color_ui.svelte
 */

import type { ComputeResult, SignalDef, SignalValue } from "../graph/types";
import { clampSignal } from "../graph/types";
import ColorUi from "./color_ui.svelte";

export const COMPONENT_COLOR_UI: SignalDef = {
	type: "color",
	label: "Color",
	inputs: [
		{ id: "r", label: "R", default: 0.5 },
		{ id: "g", label: "G", default: 0.5 },
		{ id: "b", label: "B", default: 0.5 },
	],
	outputs: [
		{ id: "r", label: "R", default: 0.5 },
		{ id: "g", label: "G", default: 0.5 },
		{ id: "b", label: "B", default: 0.5 },
	],
	createState: () => ({}),
	compute: (
		inputs: Record<string, SignalValue>,
		state: unknown,
		_dt: number,
	): ComputeResult => ({
		outputs: {
			r: clampSignal(inputs.r ?? 0.5),
			g: clampSignal(inputs.g ?? 0.5),
			b: clampSignal(inputs.b ?? 0.5),
		},
		state,
	}),
	widget: ColorUi,
};
