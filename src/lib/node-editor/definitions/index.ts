/**
 * Node Definitions — Auto-registration
 *
 * Import this module to register all built-in node types.
 */

// Import nodes to trigger auto-registration
import "./lfo";
import "./gate";
import "./switch";
import "./slider";

// Re-export for convenience
export { LFO_NODE, setLfoSpeed } from "./lfo";
export { GATE_NODE, triggerGate, setGateDuration } from "./gate";
export { SWITCH_NODE, setSwitchSmoothing } from "./switch";
export { SLIDER_NODE } from "./slider";
