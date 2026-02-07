/**
 * Port Type Utilities — Lookup + Compatibility
 *
 * Resolves port types from NodeDef registry and checks
 * whether two port types can be connected.
 */

import type { Node } from "@xyflow/svelte";
import type { PortType } from "../graph/types";
import { getNodeDef } from "./registry";

/** Resolve the PortType for a specific handle on a node */
export function resolvePortType(
	nodes: Node[],
	nodeId: string,
	handleId: string | null,
	handleSide: "source" | "target",
): PortType {
	if (!handleId) return "number";

	const node = nodes.find((n) => n.id === nodeId);
	if (!node) return "number";

	const moduleType = (node.data.moduleType as string) ?? "";
	const nodeDef = getNodeDef(moduleType);
	if (!nodeDef) return "number";

	const ports =
		handleSide === "source"
			? nodeDef.module.outputs
			: nodeDef.module.inputs;

	const port = ports.find((p) => p.id === handleId);
	return port?.portType ?? "number";
}

/**
 * Check if two port types are compatible.
 *
 * All types cross-compatible (number ↔ trigger).
 * Add restrictions here when new types (e.g. audio, compound) need them.
 */
export function arePortTypesCompatible(
	_sourceType: PortType,
	_targetType: PortType,
): boolean {
	return true;
}
