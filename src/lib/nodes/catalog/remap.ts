/**
 * Remap Node
 * Maps input 0-1 to output min-max range
 */

import type { NodeDef } from "../types";

export const remapNode: NodeDef = {
	type: "remap",
	category: "process",
	label: "Remap",
	inputs: [
		{ id: "in", label: "Input", type: "number", default: 0 },
		{ id: "min", label: "Min", type: "number", default: 50 },
		{ id: "max", label: "Max", type: "number", default: 200 },
	],
	outputs: [{ id: "out", label: "Output", type: "number", default: 50 }],
	tick: (inputs, state) => {
		const value = (inputs.in as number) ?? 0;
		const min = (inputs.min as number) ?? 50;
		const max = (inputs.max as number) ?? 200;

		// Linear interpolation: 0 → min, 1 → max
		const out = min + value * (max - min);

		return {
			outputs: { out },
			state,
		};
	},
};
