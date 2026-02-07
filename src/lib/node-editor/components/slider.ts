/**
 * Slider Signal Node — Parameter output with value passthrough
 *
 * Receives 0-1 normalized input and outputs the same value.
 * UI layer handles remapping to actual parameter ranges.
 */

import type { SignalDef, ComputeResult, SignalValue } from "../graph/types";
import { clamp01 } from "../graph/types";


interface SliderState {
	/** Whether input is connected (for UI styling) */
	driven: boolean;
}

export const SLIDER_SIGNAL: SignalDef = {
	type: "slider",
	label: "Slider",
	inputs: [
		{
			id: "value",
			label: "Value",
			default: 0.5, // Mid-range default
		},
	],
	outputs: [
		{
			id: "out",
			label: "Out",
			default: 0.5,
		},
	],
	createState: (): SliderState => ({
		driven: false,
	}),
	compute: (
		inputs: Record<string, SignalValue>,
		state: unknown,
		_dt: number,
	): ComputeResult => {
		const s = state as SliderState;
		const value = clamp01(inputs.value ?? 0.5);

		return {
			outputs: { out: value },
			state: { ...s, driven: true },
		};
	},
};

