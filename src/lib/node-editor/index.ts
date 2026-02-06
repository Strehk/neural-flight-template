/**
 * Node Editor — Public API
 *
 * Modular signal system for VR parameter control.
 */

// Graph Engine
export * from "./graph";

// Components (definitions + modules, auto-registers on import)
import "./components";
export * from "./components";

// Controls
export * from "./controls";

// Node Components
export * from "./nodes";

// Parameters
export * from "./parameters/registry";

// Bridge
export {
	initBridge,
	sendSettings,
	getBridgeStatus,
	disconnectBridge,
} from "./bridge";
