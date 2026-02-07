/**
 * NodeDef — Unified node definition (Signal + Module + Sync)
 *
 * Single registration point for each node type.
 * Eliminates the split between SignalDef and ModuleDef registries.
 */

import type { Node, Edge } from "@xyflow/svelte";
import type { SignalDef, SignalNodeInstance } from "../graph/types";
import type { ModuleDef } from "../components/types";

/** Category for organizing nodes in the catalog */
export type NodeCategory = "input" | "process" | "trigger" | "output";

/** Unified node definition — 1 registration = Signal + Module + Sync */
export interface NodeDef {
	/** Unique node type identifier (must match signal.type and module.type) */
	type: string;
	/** Human-readable label */
	label: string;
	/** Short description for catalog */
	description: string;
	/** Category for grouping */
	category: NodeCategory;
	/** Signal layer definition (headless compute) */
	signal: SignalDef;
	/** Module layer definition (UI rendering) */
	module: ModuleDef;
	/** Map signal outputs → node.data changes. Return null if nothing changed. */
	syncOutputs: (
		instance: SignalNodeInstance,
		node: Node,
		edges: Edge[],
	) => Record<string, unknown> | null;
	/** Optional: sync node.data → signal instance state (e.g. LFO speed knob) */
	syncInputs?: (node: Node, instance: SignalNodeInstance) => void;
}
