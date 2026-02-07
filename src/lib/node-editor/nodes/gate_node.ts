/**
 * Gate Node — Event to 0/1 signal (Unified)
 *
 * Signal: Outputs 1 when triggered, decays back to 0
 * Module: Gate button + open/closed indicator
 */

import { GATE_SIGNAL } from "../components/gate";
import { GATE_MODULE } from "../components/gate_ui";
import { registerNode } from "./registry";
import type { NodeDef } from "./types";

export const GATE_NODE: NodeDef = {
	type: "gate",
	label: "Gate",
	description: "Event → 0/1 signal",
	category: "trigger",
	signal: GATE_SIGNAL,
	module: GATE_MODULE,
	syncOutputs: (instance, node) => {
		const gateValue = instance.outputs.gate ?? 0;
		const isOpen = gateValue > 0.5;
		if (node.data.open === isOpen) return null;
		return { open: isOpen };
	},
};

registerNode(GATE_NODE);
