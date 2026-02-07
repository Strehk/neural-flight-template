/**
 * Signal Layer Type Definitions
 *
 * Modular-synth inspired signal system where ALL values are 0-1 normalized.
 * Like CV (Control Voltage) in analog synthesizers.
 */

/** All signal values are normalized to 0-1 range */
export type SignalValue = number;

/** Port definition for inputs/outputs */
export interface SignalPort {
	/** Unique identifier within the node */
	id: string;
	/** Display label */
	label: string;
	/** Default value (0-1) */
	default: SignalValue;
}

/** Result of a node computation */
export interface ComputeResult {
	/** Output values keyed by port id */
	outputs: Record<string, SignalValue>;
	/** Updated node state (if any) */
	state: unknown;
}

/** Base interface for all signal nodes */
export interface SignalDef {
	/** Unique node type identifier */
	type: string;
	/** Human-readable label */
	label: string;
	/** Input port definitions */
	inputs: SignalPort[];
	/** Output port definitions */
	outputs: SignalPort[];
	/** Initial state factory */
	createState: () => unknown;
	/** Compute outputs from inputs */
	compute: (
		inputs: Record<string, SignalValue>,
		state: unknown,
		dt: number,
	) => ComputeResult;
}

/** Runtime instance of a signal node */
export interface SignalNodeInstance {
	/** Unique instance id */
	id: string;
	/** Node type (references SignalDef) */
	type: string;
	/** Current internal state */
	state: unknown;
	/** Current output values */
	outputs: Record<string, SignalValue>;
}

/** Connection between two node ports */
export interface SignalEdge {
	/** Unique edge id */
	id: string;
	/** Source node id */
	sourceId: string;
	/** Source output port id */
	sourcePort: string;
	/** Target node id */
	targetId: string;
	/** Target input port id */
	targetPort: string;
}

/** Clamp a value to 0-1 range */
export function clamp01(value: number): SignalValue {
	return Math.max(0, Math.min(1, value));
}

/** Linear interpolation between a and b */
export function lerp(a: number, b: number, t: SignalValue): number {
	return a + (b - a) * t;
}

/** Remap 0-1 to arbitrary range */
export function remap(value: SignalValue, min: number, max: number): number {
	return min + value * (max - min);
}
