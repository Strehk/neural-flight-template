/**
 * Spring — Damped spring physics for smooth signal following.
 *
 * Stateful. Like a physical spring pulling toward the target value.
 * Inputs: target (0-1), stiffness (0-1), damping (0-1)
 * Output: position (0-1)
 *
 * Physics: F = -k*(pos-target) - d*vel
 * k = remap(stiffness, 1, 50), d = remap(damping, 0.5, 10)
 */

import type { ComputeResult, SignalDef, SignalValue } from "../graph/types";
import { clampSignal, remap } from "../graph/types";

// --- Configurable ranges ---
/** Stiffness range: k = remap(input, STIFFNESS_MIN, STIFFNESS_MAX) */
export const STIFFNESS_MIN = 1;
export const STIFFNESS_MAX = 50;
/** Damping range: d = remap(input, DAMPING_MIN, DAMPING_MAX) */
export const DAMPING_MIN = 0.5;
export const DAMPING_MAX = 10;
/** Velocity clamp to prevent explosion */
const VELOCITY_LIMIT = 10;

interface SpringState {
	position: number;
	velocity: number;
}

export const COMPONENT_SPRING: SignalDef = {
	type: "spring",
	label: "Spring",
	inputs: [
		{ id: "target", label: "Target", default: 0.5 },
		{ id: "stiffness", label: "Stiffness", default: 0.5 },
		{ id: "damping", label: "Damping", default: 0.5 },
	],
	outputs: [{ id: "position", label: "Position", default: 0.5 }],
	createState: (): SpringState => ({ position: 0.5, velocity: 0 }),
	compute: (
		inputs: Record<string, SignalValue>,
		state: unknown,
		dt: number,
	): ComputeResult => {
		const s = state as SpringState;
		const target = inputs.target ?? 0.5;
		const k = remap(inputs.stiffness ?? 0.5, STIFFNESS_MIN, STIFFNESS_MAX);
		const d = remap(inputs.damping ?? 0.5, DAMPING_MIN, DAMPING_MAX);

		const force = -k * (s.position - target) - d * s.velocity;
		const velocity = Math.max(
			-VELOCITY_LIMIT,
			Math.min(VELOCITY_LIMIT, s.velocity + force * dt),
		);
		const position = clampSignal(s.position + velocity * dt);

		return {
			outputs: { position },
			state: { position, velocity } satisfies SpringState,
		};
	},
};
