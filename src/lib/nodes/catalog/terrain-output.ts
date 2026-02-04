/**
 * Terrain Output Node
 * Controls terrain generation parameters via WebSocket
 */

import type { NodeDef } from "../types";
import { sendSettings } from "../bridge";

export const terrainOutputNode: NodeDef = {
	type: "terrain-output",
	category: "output",
	label: "Terrain Output",
	inputs: [
		{ id: "terrainAmplitude", label: "Amplitude", type: "number", default: 60 },
		{ id: "terrainFrequency", label: "Frequency", type: "number", default: 0.005 },
		{ id: "waterLevel", label: "Water Level", type: "number", default: 5 },
	],
	outputs: [],
	tick: (inputs) => {
		const terrainAmplitude = inputs.terrainAmplitude as number;
		const terrainFrequency = inputs.terrainFrequency as number;
		const waterLevel = inputs.waterLevel as number;

		sendSettings({ terrainAmplitude, terrainFrequency, waterLevel });

		return { outputs: {}, state: {} };
	},
};
