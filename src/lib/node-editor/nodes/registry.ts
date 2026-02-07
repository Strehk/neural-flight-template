/**
 * Node Registry — Unified registration for Signal + Module + Sync
 *
 * Single source of truth for all node types.
 * Registers in both the signal registry (graph/engine) and module registry (components/registry).
 */

import type { NodeDef } from "./types";
import { registerNodeType } from "../graph/engine";
import { registerModule } from "../components/registry";

const nodeRegistry = new Map<string, NodeDef>();

/** Register a unified node definition (auto-registers in signal + module layers) */
export function registerNode(def: NodeDef): void {
	nodeRegistry.set(def.type, def);
	registerNodeType(def.signal);
	registerModule(def.module);
}

/** Get a node definition by type */
export function getNodeDef(type: string): NodeDef | undefined {
	return nodeRegistry.get(type);
}

/** Get all registered node definitions */
export function getAllNodeDefs(): NodeDef[] {
	return Array.from(nodeRegistry.values());
}
