/**
 * Node Registry — All available nodes for the catalog
 *
 * Standard nodes are static imports. Output nodes are generated
 * dynamically from the active experience manifest.
 *
 * When creating a new node:
 * 1. Create the NodeDef file in nodes/
 * 2. Import it here
 * 3. Add it to STANDARD_NODES
 */

import { NODE_COLOR_BLEND } from "./color_blend_node";
import { NODE_ENVELOPE } from "./envelope_node";
import { NODE_LFO_MODULATOR } from "./lfo_modulator_node";
import { NODE_LOGIC_GATE } from "./logic_gate_node";
import { NODE_MIXER } from "./mixer_node";
import { NODE_NOISE } from "./noise_node";
import { NODE_PULSE_GENERATOR } from "./pulse_generator_node";
import { NODE_SLIDER } from "./slider_node";
import { NODE_SPRING } from "./spring_node";
import { generateOutputNodes } from "./system_nodes";
import type { NodeDef } from "./types";

/** Static standard nodes — always available regardless of experience */
const STANDARD_NODES: NodeDef[] = [
	NODE_LFO_MODULATOR,
	NODE_SLIDER,
	NODE_ENVELOPE,
	NODE_NOISE,
	NODE_LOGIC_GATE,
	NODE_SPRING,
	NODE_PULSE_GENERATOR,
	NODE_COLOR_BLEND,
	NODE_MIXER,
];

/** Get all nodes: standard + dynamically generated output nodes */
export function getAllNodes(): NodeDef[] {
	return [...STANDARD_NODES, ...generateOutputNodes()];
}

// Backward compat — existing code importing ALL_NODES
export const ALL_NODES = new Proxy([] as NodeDef[], {
	get(target, prop) {
		const nodes = getAllNodes();
		if (prop === "length") return nodes.length;
		if (prop === Symbol.iterator) return nodes[Symbol.iterator].bind(nodes);
		if (typeof prop === "string" && !Number.isNaN(Number(prop))) {
			return nodes[Number(prop)];
		}
		return Reflect.get(nodes, prop);
	},
});

export function getNodeDef(type: string): NodeDef | undefined {
	return getAllNodes().find((n) => n.type === type);
}
