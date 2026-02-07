/**
 * Node Components — SvelteFlow integration + Unified Registry
 */

// Svelte components
export { default as NodeShell } from "./NodeShell.svelte";
export { default as NodeCatalog } from "./NodeCatalog.svelte";
export { default as EditorCanvas } from "./EditorCanvas.svelte";
export { default as ModuleRenderer } from "./ModuleRenderer.svelte";

// Unified registry
export type { NodeDef, NodeCategory } from "./types";
export { registerNode, getNodeDef, getAllNodeDefs } from "./registry";
