/**
 * Sun Output Node
 * Controls sun light intensity and position via WebSocket
 */

import type { NodeDef } from "../types";
import { sendSettings } from "../bridge";

export const sunOutputNode: NodeDef = {
	type: "sun-output",
	category: "output",
	label: "Sun Output",
	inputs: [
		{ id: "sunIntensity", label: "Intensity", type: "number", default: 3.0 },
		{ id: "sunElevation", label: "Elevation", type: "number", default: 65 },
	],
	outputs: [],
	tick: (inputs) => {
		const sunIntensity = inputs.sunIntensity as number;
		const sunElevation = inputs.sunElevation as number;

		sendSettings({ sunIntensity, sunElevation });

		return { outputs: {}, state: {} };
	},
};
