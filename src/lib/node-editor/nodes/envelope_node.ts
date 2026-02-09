/**
 * Envelope Node — ADSR envelope triggered by external gate.
 *
 * Internal pipeline:
 *   External(signal_trigger) → Gate(trigger)
 *   Gate(gate) → Envelope(gate)
 *   Envelope(envelope) → Output(signal_envelope)
 *
 * Exposed ports:
 *   Input:  signal_trigger (left, portType "trigger")
 *   Output: signal_envelope (right)
 *
 * Components: 2 (Gate_UI + Envelope_UI)
 */

import { TrendingUp } from "lucide-svelte";
import { COMPONENT_ENVELOPE_UI } from "../components/envelope_ui";
import { COMPONENT_GATE_UI } from "../components/gate_ui";
import type { NodeDef } from "./types";

export const NODE_ENVELOPE: NodeDef = {
	type: "envelope",
	label: "Envelope",
	category: "process",
	icon: TrendingUp,

	components: [
		{
			id: "gate",
			signal: COMPONENT_GATE_UI,
			inputWires: { trigger: "signal_trigger" },
			outputWires: { gate: "signal_gate_internal" },
		},
		{
			id: "env",
			signal: COMPONENT_ENVELOPE_UI,
			inputWires: { gate: "signal_gate_internal" },
			outputWires: { envelope: "signal_envelope" },
		},
	],

	inputs: [
		{
			id: "signal_trigger",
			label: "Trigger",
			side: "left",
			portType: "trigger",
		},
	],
	outputs: [
		{
			id: "signal_envelope",
			label: "Envelope",
			side: "right",
			portType: "number",
		},
	],
};
