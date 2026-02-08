/**
 * Slider UI — Parameter output with interactive slider control
 *
 * Self-contained: own compute(), no separate slider.ts logic variant.
 * Input: value (0-1, can be driven by external signal)
 * Output: out (0-1, passthrough)
 * Widget: slider_ui.svelte
 */

import type { ComputeResult, SignalDef, SignalValue } from "../graph/types";
import { clampSignal } from "../graph/types";
import SliderUi from "./slider_ui.svelte";

interface SliderState {
	/** Whether input is connected (for UI styling) */
	driven: boolean;
}

export const COMPONENT_SLIDER_UI: SignalDef = {
	type: "slider",
	label: "Slider",
	inputs: [{ id: "value", label: "Value", default: 0.5 }],
	outputs: [{ id: "out", label: "Out", default: 0.5 }],
	createState: (): SliderState => ({ driven: false }),
	compute: (
		inputs: Record<string, SignalValue>,
		state: unknown,
		_dt: number,
	): ComputeResult => {
		const s = state as SliderState;
		const value = clampSignal(inputs.value ?? 0.5);
		return {
			outputs: { out: value },
			state: { ...s, driven: true },
		};
	},
	widget: SliderUi,
};
