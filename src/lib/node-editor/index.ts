/**
 * Node Editor — Public API
 *
 * Modular signal system for VR parameter control.
 * Architecture: Canvas → Nodes → Components → graph/
 */

// Bridge (WebSocket → Three.js)
export {
	disconnectBridge,
	getBridgeStatus,
	initBridge,
	sendSettings,
} from "./bridge";
// Canvas (SvelteFlow infrastructure)
export * from "./canvas";
// Controls (dumb UI widgets, bits-ui based)
export * from "./controls";
// Graph Engine (headless compute)
export * from "./graph";
// Port Types (compatibility check)
export { arePortTypesCompatible } from "./nodes/port_types";
// Node Registry (catalog + lookup)
export { ALL_NODES, getAllNodes, getNodeDef } from "./nodes/registry";
export type { ComponentSlot, ExposedPort, NodeDef } from "./nodes/types";
// Parameters (VR parameter registry)
export * from "./parameters/registry";
