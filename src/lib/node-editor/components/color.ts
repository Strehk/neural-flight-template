/**
 * Color Signal Node — RGB color mixer
 *
 * 3 inputs (r, g, b) each 0-1. Passes through to 3 outputs.
 * UI layer converts to hex for VR scene settings.
 */

import type { ComputeResult, SignalDef, SignalValue } from "../graph/types";
import { clampSignal } from "../graph/types";

export const COMPONENT_COLOR: SignalDef = {
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
};
