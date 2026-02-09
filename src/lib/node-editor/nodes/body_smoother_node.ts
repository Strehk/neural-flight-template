/**
 * Body Smoother Node — Spring-damped signal smoothing
 *
 * Internal pipeline:
 *   External(signal_in) → Spring(target)
 *   Slider_stiffness(out) → Spring(stiffness)
 *   Slider_damping(out) → Spring(damping)
 *   Spring(position) → Output(signal_out)
 *
 * Exposed ports:
 *   Input:  signal_in (left handle)
 *   Output: signal_out (right handle)
 *
 * Components: 3 (Spring_UI + 2× Slider_UI)
 */

import { Waves } from "lucide-svelte";
import { COMPONENT_SLIDER_UI } from "../components/slider_ui";
import { COMPONENT_SPRING_UI } from "../components/spring_ui";
import type { NodeDef } from "./types";

export const NODE_BODY_SMOOTHER: NodeDef = {
	type: "body-smoother",
	label: "Body Smoother",
	category: "process",
	icon: Waves,

	components: [
		{
			id: "spring",
			signal: COMPONENT_SPRING_UI,
			inputWires: {
				target: "signal_in",
				stiffness: "signal_stiffness",
				damping: "signal_damping",
			},
			outputWires: { position: "signal_out" },
		},
		{
			id: "stiffness",
			signal: COMPONENT_SLIDER_UI,
			inputWires: {},
			outputWires: { out: "signal_stiffness" },
		},
		{
			id: "damping",
			signal: COMPONENT_SLIDER_UI,
			inputWires: {},
			outputWires: { out: "signal_damping" },
		},
	],

	inputs: [
		{
			id: "signal_in",
			label: "Signal In",
			side: "left",
			portType: "number",
		},
	],
	outputs: [
		{
			id: "signal_out",
			label: "Smoothed",
			side: "right",
			portType: "number",
		},
	],
};
