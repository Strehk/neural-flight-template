/**
 * Logic Gate Node — Signal-to-trigger converter via threshold.
 *
 * Internal pipeline:
 *   External(signal_in) → Comparator(signal)
 *   Comparator(gate) → Gate(trigger)
 *   Gate(gate) → Output(signal_gate)
 *
 * Exposed ports:
 *   Input:  signal_in (left)
 *   Output: signal_gate (right, portType "trigger")
 *
 * Components: 2 (Comparator_UI + Gate_UI)
 */

import { GitBranch } from "lucide-svelte";
import { COMPONENT_COMPARATOR_UI } from "../components/comparator_ui";
import { COMPONENT_GATE_UI } from "../components/gate_ui";
import type { NodeDef } from "./types";

export const NODE_LOGIC_GATE: NodeDef = {
	type: "logic-gate",
	label: "Logic Gate",
	category: "logic",
	icon: GitBranch,

	components: [
		{
			id: "compare",
			signal: COMPONENT_COMPARATOR_UI,
			inputWires: { signal: "signal_in" },
			outputWires: { gate: "signal_compare_out" },
		},
		{
			id: "gate",
			signal: COMPONENT_GATE_UI,
			inputWires: { trigger: "signal_compare_out" },
			outputWires: { gate: "signal_gate" },
		},
	],

	inputs: [
		{ id: "signal_in", label: "Signal In", side: "left", portType: "number" },
	],
	outputs: [
		{
			id: "signal_gate",
			label: "Gate",
			side: "right",
			portType: "trigger",
		},
	],
};
