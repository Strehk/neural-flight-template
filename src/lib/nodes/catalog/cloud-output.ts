/**
 * Cloud Output Node
 * Controls cloud generation parameters via WebSocket
 */

import type { NodeDef } from "../types";
import { sendSettings } from "../bridge";

export const cloudOutputNode: NodeDef = {
	type: "cloud-output",
	category: "output",
	label: "Cloud Output",
	inputs: [
		{ id: "cloudCount", label: "Count", type: "number", default: 40 },
		{ id: "cloudHeight", label: "Height", type: "number", default: 200 },
	],
	outputs: [],
	tick: (inputs) => {
		const cloudCount = Math.round(inputs.cloudCount as number);
		const cloudHeight = inputs.cloudHeight as number;

		sendSettings({ cloudCount, cloudHeight });

		return { outputs: {}, state: {} };
	},
};
