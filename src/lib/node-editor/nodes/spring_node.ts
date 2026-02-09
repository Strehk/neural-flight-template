/**
 * Spring Node — Smooth signal follower with spring physics.
 *
 * Internal pipeline:
 *   External(signal_in) → Spring(target)
 *   Slider(out) → Spring(stiffness)
 *   Spring(position) → Output(signal_out)
 *
 * Exposed ports:
 *   Input:  signal_in (left)
 *   Output: signal_out (right)
 *
 * Components: 2 (Slider_UI + Spring_UI)
 */

import { Zap } from "lucide-svelte";
import { COMPONENT_SLIDER_UI } from "../components/slider_ui";
import { COMPONENT_SPRING_UI } from "../components/spring_ui";
import type { NodeDef } from "./types";

export const NODE_SPRING: NodeDef = {
	type: "spring",
	label: "Spring",
	category: "process",
	icon: Zap,

	components: [
		{
			id: "stiffness",
			signal: COMPONENT_SLIDER_UI,
			inputWires: {},
			outputWires: { out: "signal_stiffness_internal" },
		},
		{
			id: "spring",
			signal: COMPONENT_SPRING_UI,
			inputWires: {
				target: "signal_in",
				stiffness: "signal_stiffness_internal",
			},
			outputWires: { position: "signal_out" },
		},
	],

	inputs: [
		{ id: "signal_in", label: "Signal In", side: "left", portType: "number" },
	],
	outputs: [
		{ id: "signal_out", label: "Out", side: "right", portType: "number" },
	],
};
