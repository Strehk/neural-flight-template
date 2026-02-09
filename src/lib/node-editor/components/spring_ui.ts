/**
 * Spring UI — Damped spring physics with visual feedback.
 *
 * Self-contained: own compute(), independent from spring.ts.
 * Inputs: target (0-1), stiffness (0-1), damping (0-1)
 * Output: position (0-1)
 * Widget: spring_ui.svelte
 */

import type { ComputeResult, SignalDef, SignalValue } from "../graph/types";
import { clampSignal, remap } from "../graph/types";
import SpringUi from "./spring_ui.svelte";

// --- Configurable ranges ---
const STIFFNESS_MIN = 1;
const STIFFNESS_MAX = 50;
const DAMPING_MIN = 0.5;
const DAMPING_MAX = 10;
const VELOCITY_LIMIT = 10;

interface SpringState {
	position: number;
	velocity: number;
}

export const COMPONENT_SPRING_UI: SignalDef = {
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
	widget: SpringUi,
};
