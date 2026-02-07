/**
 * Gate Signal Node — Event to 0/1 signal
 *
 * Outputs 1 when triggered, stays HIGH for configured duration, then returns to 0.
 * Like a gate signal in analog synthesizers.
 */

import type { SignalDef, ComputeResult, SignalValue } from "../graph/types";


interface GateState {
	/** Whether gate is currently open */
	open: boolean;
	/** Time remaining until gate closes (seconds) */
	timeRemaining: number;
	/** Gate duration in seconds */
	duration: number;
	/** Event type this gate listens to */
	eventType: string;
}

export const GATE_SIGNAL: SignalDef = {
	type: "gate",
	label: "Gate",
	inputs: [
		{
			id: "trigger",
			label: "Trigger",
			default: 0, // External trigger input
		},
	],
	outputs: [
		{
			id: "gate",
			label: "Gate",
			default: 0,
		},
	],
	createState: (): GateState => ({
		open: false,
		timeRemaining: 0,
		duration: 0.5, // 500ms default
		eventType: "ring-pass",
	}),
	compute: (
		inputs: Record<string, SignalValue>,
		state: unknown,
		dt: number,
	): ComputeResult => {
		const s = state as GateState;
		const newState = { ...s };

		// Check for trigger (rising edge: value > 0.5)
		const triggerInput = inputs.trigger ?? 0;
		if (triggerInput > 0.5 && !s.open) {
			newState.open = true;
			newState.timeRemaining = s.duration;
		}

		// Countdown if gate is open
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
};

/** Manually trigger the gate (called from external events) */
export function triggerGate(state: GateState): GateState {
	return {
		...state,
		open: true,
		timeRemaining: state.duration,
	};
}

/** Set gate duration */
export function setGateDuration(state: GateState, duration: number): GateState {
	return { ...state, duration: Math.max(0.05, duration) };
}

