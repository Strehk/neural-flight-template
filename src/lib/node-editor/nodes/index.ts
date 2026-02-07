/**
 * Unified Node Registry (TypeScript only — no Svelte components)
 */

export type { NodeDef, NodeCategory } from "./types";
export { registerNode, getNodeDef, getAllNodeDefs } from "./registry";
export { resolvePortType, arePortTypesCompatible } from "./port_types";
