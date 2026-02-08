/**
 * Gate UI — Event gate with trigger button and hold slider
 *
 * Self-contained: own compute(), independent from gate.ts.
 * Input: trigger (0-1, rising edge opens gate)
 * Output: gate (0 or 1)
 * Widget: gate_ui.svelte
 */

import type { ComputeResult, SignalDef, SignalValue } from "../graph/types";
import GateUi from "./gate_ui.svelte";

interface GateState {
	open: boolean;
	timeRemaining: number;
	duration: number;
	eventType: string;
}

export const COMPONENT_GATE_UI: SignalDef = {
	type: "gate",
	label: "Gate",
	inputs: [{ id: "trigger", label: "Trigger", default: 0 }],
	outputs: [{ id: "gate", label: "Gate", default: 0, portType: "trigger" }],
	createState: (): GateState => ({
		open: false,
		timeRemaining: 0,
		duration: 0.5,
		eventType: "ring-pass",
	}),
	compute: (
		inputs: Record<string, SignalValue>,
		state: unknown,
		dt: number,
	): ComputeResult => {
		const s = state as GateState;
		const newState = { ...s };

		const triggerInput = inputs.trigger ?? 0;
		if (triggerInput > 0.5 && !s.open) {
			newState.open = true;
			newState.timeRemaining = s.duration;
		}

		if (newState.open) {
			newState.timeRemaining -= dt;
			if (newState.timeRemaining <= 0) {
				newState.open = false;
				newState.timeRemaining = 0;
			}
		}

		return {
			outputs: { gate: newState.open ? 1 : 0 },
			state: newState,
		};
	},
	widget: GateUi,
};
