/**
 * Node Registry — All available nodes for the catalog
 *
 * When creating a new node:
 * 1. Create the NodeDef file in nodes/
 * 2. Import it here
 * 3. Add it to ALL_NODES
 */

import { NODE_ENVELOPE } from "./envelope_node";
import { NODE_LFO_MODULATOR } from "./lfo_modulator_node";
import { NODE_LOGIC_GATE } from "./logic_gate_node";
import { NODE_NOISE } from "./noise_node";
import { NODE_SLIDER } from "./slider_node";
import { NODE_SPRING } from "./spring_node";
import { OUTPUT_NODES } from "./system_nodes";
import type { NodeDef } from "./types";

export const ALL_NODES: NodeDef[] = [
	NODE_LFO_MODULATOR,
	NODE_SLIDER,
	NODE_ENVELOPE,
	NODE_NOISE,
	NODE_LOGIC_GATE,
	NODE_SPRING,
	...OUTPUT_NODES,
];

export function getNodeDef(type: string): NodeDef | undefined {
	return ALL_NODES.find((n) => n.type === type);
}
