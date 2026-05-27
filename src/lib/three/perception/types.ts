/**
 * Multi-Perception-Rendering — shared types.
 *
 * A `Perception` is a plugin that contributes up to three independent
 * visual layers to a scene:
 *
 *   1. **Post-processing stack** — ordered EffectComposer passes.
 *   2. **Material overrides** — `match`-based shader-swap rules.
 *   3. **Layer mask** — Three.js `Object3D.layers` channels visible
 *      while this perception is active.
 *
 * Plus optional per-frame uniform updates and activation hooks. The
 * `PerceptionRouter` activates one perception at a time and cross-
 * fades between two by ramping a `weight` parameter the perception
 * can use to blend its own uniforms.
 *
 * Step 10a of the refactor plan establishes these primitives; step 10b
 * migrates sinneswandler's existing vision-modes / sense-switch onto
 * them.
 */

import type * as THREE from "three";
import type { PostFXConfig } from "$lib/three/postfx-pipeline";

/** Three.js layer-channel bitmask. See `LAYER_IDS` in LayerMask.ts. */
export type LayerMask = number;

/**
 * Shader-swap rule. `MaterialOverrideRegistry.applyAll` walks the scene
 * (Mesh / InstancedMesh / Points / Line / Sprite), and for each match
 * stashes the object's base material in `userData.__baseMaterial`
 * before assigning the override. `restoreAll` puts everything back.
 *
 * `material` can be a constant or a per-object factory — the factory
 * form lets a perception colour-vary overrides by object identity
 * (e.g. tinting only `userData.echoSurface === "tree"` meshes).
 */
export interface MaterialOverride {
  /** Predicate against the candidate object. Returns true to swap. */
  match: (object: THREE.Object3D) => boolean;
  /** Either a fixed material or a factory producing one per matched object. */
  material: THREE.Material | ((object: THREE.Object3D) => THREE.Material);
}

/**
 * Per-frame context passed into `onTick` / `onActivate` /
 * `onDeactivate`. Keeps the perception decoupled from BatWorld so the
 * router can host perceptions from multiple subsystems.
 */
export interface PerceptionContext {
  /** Whatever the host wants to expose — scene, camera, world, time, etc. */
  scene?: THREE.Scene;
  camera?: THREE.Camera;
  delta?: number;
  elapsed?: number;
  /** Free-form payload; the host owns the shape. */
  data?: Record<string, unknown>;
}

/**
 * A Perception plugin.
 *
 * All three contribution slots are optional — a perception can be a
 * pure post-processing skin (no overrides, no layer changes), a pure
 * shader-swap (no post-fx), or a layer-only "show/hide these objects"
 * filter. The router treats each slot independently.
 */
export interface Perception {
  /** Stable id. Used by `router.activate(id, …)` and for cross-fade tracking. */
  id: string;
  /** Human-readable label, optional. */
  label?: string;
  /** Three.js layer channels this perception renders. Default = layer 0. */
  layerMask: LayerMask;
  /** Optional post-processing recipe; the router rebuilds the composer on activation. */
  postFx?: PostFXConfig;
  /** Optional shader-swap rules. */
  overrides?: MaterialOverride[];
  /** Shared shader uniforms the perception writes to per frame (e.g. fog, daylight factor). */
  uniforms?: Record<string, THREE.IUniform>;
  /** Called once when this perception becomes the active (or fading-in) one. */
  onActivate?(ctx: PerceptionContext): void;
  /** Called once when the perception is fully deactivated (weight reaches 0). */
  onDeactivate?(ctx: PerceptionContext): void;
  /**
   * Called every frame the perception is active (weight > 0). `weight` is
   * 1 for the fully-active perception, 0 → 1 ramping for an incoming one
   * mid-transition, and 1 → 0 for an outgoing one.
   */
  onTick?(ctx: PerceptionContext, weight: number): void;
}
