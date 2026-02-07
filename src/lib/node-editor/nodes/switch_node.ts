/**
 * Switch Node — Gate-controlled A/B selector (Unified)
 *
 * Signal: Crossfades between A and B based on gate input
 * Module: A/B display + gate indicator
 */

import { SWITCH_SIGNAL } from "../components/switch";
import { SWITCH_MODULE } from "../components/switch_ui";
import { signalGraph } from "../graph/engine";
import { registerNode } from "./registry";
import type { NodeDef } from "./types";

export const SWITCH_NODE: NodeDef = {
	type: "switch",
	label: "Switch",
	description: "Gate-controlled A/B selector",
	category: "process",
	signal: SWITCH_SIGNAL,
	module: SWITCH_MODULE,
	syncOutputs: (instance, node, edges) => {
		const out = instance.outputs.out ?? 0.25;
		const gateEdge = edges.find(
			(e) => e.target === node.id && e.targetHandle === "gate",
		);
		const gateActive = gateEdge
			? signalGraph.getOutput(
					gateEdge.source,
					gateEdge.sourceHandle ?? "gate",
				) > 0.5
			: false;

		if (node.data.out === out && node.data.gateActive === gateActive)
			return null;
		return { out, gateActive };
	},
};

registerNode(SWITCH_NODE);
