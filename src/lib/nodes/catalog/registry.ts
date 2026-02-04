/**
 * Node Registry
 * Central registration of all available node types
 */

import type { NodeDef } from "../types";
import { cloudOutputNode } from "./cloud-output";
import { fogOutputNode } from "./fog-output";
import { lfoNode } from "./lfo";
import { remapNode } from "./remap";
import { skyOutputNode } from "./sky-output";
import { sunOutputNode } from "./sun-output";
import { terrainOutputNode } from "./terrain-output";
import { vrOutputNode } from "./vr-output";

/** All registered node definitions */
export const NODE_REGISTRY: Record<string, NodeDef> = {
	lfo: lfoNode,
	remap: remapNode,
	"vr-output": vrOutputNode,
	"fog-output": fogOutputNode,
	"sky-output": skyOutputNode,
	"sun-output": sunOutputNode,
	"cloud-output": cloudOutputNode,
	"terrain-output": terrainOutputNode,
};

/** Get node definition by type */
export function getNodeDef(type: string): NodeDef | undefined {
	return NODE_REGISTRY[type];
}

/** List all available node types */
export function listNodeTypes(): string[] {
	return Object.keys(NODE_REGISTRY);
}
