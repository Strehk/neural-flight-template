/**
 * Modules — Declarative node definitions (auto-register on import)
 */

// Import modules to trigger auto-registration
import "./lfo_ui";
import "./param-slider_ui";
import "./gate_ui";
import "./switch_ui";
import "./color_ui";

// Re-export types + registry
export * from "./types";
export { registerModule, getModule, getAllModules } from "./registry";

// Re-export module defs
export { LFO_MODULE } from "./lfo_ui";
export { createParamSliderModule } from "./param-slider_ui";
export { GATE_MODULE } from "./gate_ui";
export { SWITCH_MODULE } from "./switch_ui";
export { COLOR_MODULE } from "./color_ui";

// Renderer
export { default as ModuleRenderer } from "./ModuleRenderer.svelte";
