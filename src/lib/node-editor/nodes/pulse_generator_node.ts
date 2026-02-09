/**
 * Pulse Generator Node — LFO-driven rhythmic envelope
 *
 * Internal pipeline:
 *   External(signal_speed_mod) → LFO(speedMod)
 *   LFO(wave) → Comparator(signal)
 *   Comparator(gate) → Gate(trigger)
 *   Gate(gate) → Envelope(gate)
 *   Envelope(envelope) → Output(signal_pulse)
 *
 * Exposed ports:
 *   Input:  signal_speed_mod (left handle)
 *   Output: signal_pulse (right handle)
 *
 * Components: 4 (LFO_UI + Comparator_UI + Gate_UI + Envelope_UI)
 */

import { HeartPulse } from "lucide-svelte";
import { COMPONENT_COMPARATOR_UI } from "../components/comparator_ui";
import { COMPONENT_ENVELOPE_UI } from "../components/envelope_ui";
import { COMPONENT_GATE_UI } from "../components/gate_ui";
import { COMPONENT_LFO_UI } from "../components/lfo_ui";
import type { NodeDef } from "./types";

export const NODE_PULSE_GENERATOR: NodeDef = {
	type: "pulse-generator",
	label: "Pulse Generator",
	category: "trigger",
	icon: HeartPulse,

	components: [
		{
			id: "lfo",
			signal: COMPONENT_LFO_UI,
			inputWires: { speedMod: "signal_speed_mod" },
			outputWires: { wave: "signal_lfo_out" },
		},
		{
			id: "cmp",
			signal: COMPONENT_COMPARATOR_UI,
			inputWires: { signal: "signal_lfo_out", threshold: null },
			outputWires: { gate: "signal_cmp_gate" },
		},
		{
			id: "gate",
			signal: COMPONENT_GATE_UI,
			inputWires: { trigger: "signal_cmp_gate" },
			outputWires: { gate: "signal_gate_out" },
		},
		{
			id: "env",
			signal: COMPONENT_ENVELOPE_UI,
			inputWires: {
				gate: "signal_gate_out",
				attack: null,
				decay: null,
				sustain: null,
				release: null,
			},
			outputWires: { envelope: "signal_pulse" },
		},
	],

	inputs: [
		{
			id: "signal_speed_mod",
			label: "Speed",
			side: "left",
			portType: "number",
		},
	],
	outputs: [
		{
			id: "signal_pulse",
			label: "Pulse",
			side: "right",
			portType: "number",
		},
	],
};
