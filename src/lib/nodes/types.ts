/**
 * Node Editor Engine Types
 * Defines the structure for visual programming nodes
 */

/** Port value type */
export type PortType = "number" | "string";

/** Port definition for node inputs/outputs */
export interface PortDef {
	id: string;
	label: string;
	type: PortType;
	default: number | string;
}

/** Static node definition (blueprint) */
export interface NodeDef {
	type: string;
	category: "input" | "process" | "output";
	label: string;
	inputs: PortDef[];
	outputs: PortDef[];
	/** Compute function called each tick */
	tick: (
		inputs: Record<string, number | string>,
		state: Record<string, number | string>,
		dt: number,
	) => { outputs: Record<string, number | string>; state: Record<string, number | string> };
}

/** Runtime node instance */
export interface NodeInstance {
	id: string;
	type: string;
	position: { x: number; y: number };
	/** Internal state (e.g., LFO phase, VR param name) */
	state: Record<string, number | string>;
	/** Current output values */
	values: Record<string, number | string>;
}

/** Connection between two nodes */
export interface Connection {
	id: string;
	sourceId: string;
	sourcePort: string;
	targetId: string;
	targetPort: string;
}

/** Complete graph state */
export interface NodeGraph {
	nodes: NodeInstance[];
	connections: Connection[];
}
