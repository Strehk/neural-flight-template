// ============================================================================
// index.ts — Experience entry point (re-exports)
//
// The catalog imports { manifest } from here.
// Lifecycle functions are also exported for direct access.
// ============================================================================

export { manifest } from "./manifest";
export { dispose, setup, tick } from "./scene";
