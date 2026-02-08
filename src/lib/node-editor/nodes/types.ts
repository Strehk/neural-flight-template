/**
 * Node Types — Compositions of Components
 *
 * A Node wires components into a pipeline and exposes selected ports to the canvas.
 * Every Node has at least 2 components (min: source + output).
 */

import type { AnyComponent } from "../components/types";
import type { PortType, SignalDef } from "../graph/types";

/** Category for catalog grouping + visual theming */
export type NodeCategory = "input" | "process" | "trigger" | "logic" | "output";

/** Exposed port — appears as a SvelteFlow Handle on the canvas */
export interface ExposedPort {
	/** Port identifier (signal_ prefix convention) */
	id: string;
	/** Display label */
	label: string;
	/** Handle position */
	side: "left" | "right";
	/** Semantic port type for visual hints (default: "number") */
	portType?: PortType;
}

/** Internal component slot within a Node */
export interface ComponentSlot {
	/** Unique slot ID within this node */
	id: string;
	/** Signal definition (carries compute + widget + defaults) */
	signal: SignalDef;
	/** Map: component port ID → internal wire name (null = unconnected) */
	inputWires: Record<string, string | null>;
	/** Map: component port ID → internal wire name */
	outputWires: Record<string, string>;
}

/** NodeDef — Unified node definition */
export interface NodeDef {
	/** Unique node type identifier */
	type: string;
	/** Human-readable label */
	label: string;
	/** Category for catalog grouping + visual theming */
	category: NodeCategory;
	/** Icon for catalog + node header */
	icon: AnyComponent;
	/** Internal component slots (the pipeline) */
	components: ComponentSlot[];
	/** Exposed input ports (appear as left handles) */
	inputs: ExposedPort[];
	/** Exposed output ports (appear as right handles) */
	outputs: ExposedPort[];
}
