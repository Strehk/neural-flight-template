/**
 * Components — Node definitions + UI modules (auto-register on import)
 */

// Import logic nodes to trigger auto-registration
import "./lfo";
import "./gate";
import "./switch";
import "./slider";
import "./color";

// Import UI modules to trigger auto-registration
import "./lfo_ui";
import "./param_slider_ui";
import "./gate_ui";
import "./switch_ui";
import "./color_ui";

// Re-export types + registry
export * from "./types";
export { registerModule, getModule, getAllModules } from "./registry";

// Re-export node definitions
export { LFO_NODE, setLfoSpeed } from "./lfo";
export { GATE_NODE, triggerGate, setGateDuration } from "./gate";
export { SWITCH_NODE, setSwitchSmoothing } from "./switch";
export { SLIDER_NODE } from "./slider";
export { COLOR_NODE } from "./color";

// Re-export module defs
export { LFO_MODULE } from "./lfo_ui";
export { createParamSliderModule } from "./param_slider_ui";
export { GATE_MODULE } from "./gate_ui";
export { SWITCH_MODULE } from "./switch_ui";
export { COLOR_MODULE } from "./color_ui";
