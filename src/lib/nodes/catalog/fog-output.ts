/**
 * Fog Output Node
 * Controls scene fog parameters via WebSocket
 */

import type { NodeDef } from "../types";
import { sendSettings } from "../bridge";

export const fogOutputNode: NodeDef = {
	type: "fog-output",
	category: "output",
	label: "Fog Output",
	inputs: [
		{ id: "fogNear", label: "Near", type: "number", default: 100 },
		{ id: "fogFar", label: "Far", type: "number", default: 500 },
	],
	outputs: [],
	tick: (inputs) => {
		const fogNear = inputs.fogNear as number;
		const fogFar = inputs.fogFar as number;

		sendSettings({ fogNear, fogFar });

		return { outputs: {}, state: {} };
	},
};
