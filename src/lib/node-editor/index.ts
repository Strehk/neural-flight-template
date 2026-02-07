/**
 * Node Editor — Public API
 *
 * Modular signal system for VR parameter control.
 */

// Graph Engine
export * from "./graph";

// Components (definitions + utilities, no auto-registration)
export * from "./components";

// Controls
export * from "./controls";

// Node Definitions + Unified Registry (TypeScript only)
export * from "./nodes";

// Canvas (SvelteFlow infrastructure)
export * from "./canvas";

// Import node registrations (side-effect: registers in all layers)
import "./nodes/lfo_node";
import "./nodes/gate_node";
import "./nodes/switch_node";
import "./nodes/color_node";
import "./nodes/multiply_node";
import "./nodes/param_nodes";

// Parameters
export * from "./parameters/registry";

// Bridge
export {
	initBridge,
	sendSettings,
	getBridgeStatus,
	disconnectBridge,
} from "./bridge";
