/**
 * Components — Signal definitions + Module definitions
 *
 * Registration now happens via nodes/*_node.ts (unified NodeDef).
 * This barrel only re-exports definitions and utilities.
 */

// Re-export types + registry
export * from "./types";
export { registerModule, getModule, getAllModules } from "./registry";

// Re-export signal definitions
export { LFO_SIGNAL, setLfoSpeed } from "./lfo";
export { GATE_SIGNAL, triggerGate, setGateDuration } from "./gate";
export { SWITCH_SIGNAL, setSwitchSmoothing } from "./switch";
export { SLIDER_SIGNAL } from "./slider";
export { COLOR_SIGNAL } from "./color";

// Re-export module defs
export { LFO_MODULE } from "./lfo_ui";
export { createParamSliderModule } from "./param_slider_ui";
export { GATE_MODULE } from "./gate_ui";
export { SWITCH_MODULE } from "./switch_ui";
export { COLOR_MODULE } from "./color_ui";
export { MULTIPLY_SIGNAL } from "./multiply";
export { MULTIPLY_MODULE } from "./multiply_ui";
