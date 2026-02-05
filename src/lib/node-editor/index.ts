/**
 * Node Editor — Public API
 *
 * Modular signal system for VR parameter control.
 */

// Graph Engine
export * from "./graph";

// Node Definitions (auto-registers on import)
import "./definitions";
export * from "./definitions";

// Controls
export * from "./controls";

// Node Components
export * from "./nodes";

// Module System (auto-registers on import)
import "./modules";
export * from "./modules";

// Parameters
export * from "./parameters/registry";

// Bridge
export {
	initBridge,
	sendSettings,
	getBridgeStatus,
	disconnectBridge,
} from "./bridge";
