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
 * Current matrix: all types cross-compatible (number ↔ trigger).
 * Infrastructure ready for future restrictions (e.g. audio, compound).
 */
export function arePortTypesCompatible(
	sourceType: PortType,
	targetType: PortType,
): boolean {
	const compatible: Record<PortType, PortType[]> = {
		number: ["number", "trigger"],
		trigger: ["number", "trigger"],
	};
	return compatible[sourceType]?.includes(targetType) ?? false;
}
