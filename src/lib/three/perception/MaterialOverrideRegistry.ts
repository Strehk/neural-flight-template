/**
 * MaterialOverrideRegistry — match-based shader-swap for
 * Multi-Perception-Rendering (refactor step 10a).
 *
 * Each `Perception` may declare an array of `MaterialOverride`
 * rules. When a perception activates the router calls
 * `applyAll(scene, overrides)`; for every Mesh / InstancedMesh /
 * Points / Line / Sprite that matches a rule, the original material
 * is stashed in `userData.__baseMaterial` and the override material
 * is assigned. `restoreAll(scene)` puts every stashed material back.
 *
 * Stashing on userData (rather than cloning the object) means we
 * preserve InstancedMesh `instanceMatrix` / `instanceColor` state,
 * keep geometry sharing intact, and survive scene re-walks (the
 * stash is idempotent — calling `applyAll` twice with the same
 * override yields the same end state).
 *
 * Designed to be re-applied after late-added objects show up — e.g.
 * after `ChunkScheduler.onChunkBuilt` fires. The router will wire
 * those callbacks in step 10b.
 */

import * as THREE from "three";
import type { MaterialOverride } from "./types";

/** Sentinel key on `userData` so we don't double-stash. */
const STASH_KEY = "__perceptionBaseMaterial";

/** Subset of Object3D types that carry a `material`. */
type MaterialBearing =
  | THREE.Mesh
  | THREE.InstancedMesh
  | THREE.Points
  | THREE.Line
  | THREE.Sprite;

function isMaterialBearing(object: THREE.Object3D): object is MaterialBearing {
  const candidate = object as THREE.Object3D & { material?: unknown };
  return candidate.material !== undefined;
}

function resolveOverride(
  rule: MaterialOverride,
  object: THREE.Object3D,
): THREE.Material {
  return typeof rule.material === "function"
    ? rule.material(object)
    : rule.material;
}

export class MaterialOverrideRegistry {
  /**
   * Walk the scene, apply the first matching override rule per object,
   * stashing the original material in `userData[STASH_KEY]` the first
   * time. Subsequent calls update the active override without losing
   * the original.
   *
   * Returns the count of objects whose material was swapped.
   */
  applyAll(scene: THREE.Object3D, overrides: readonly MaterialOverride[]): number {
    if (overrides.length === 0) return 0;
    let count = 0;
    scene.traverse((object) => {
      if (!isMaterialBearing(object)) return;
      for (const rule of overrides) {
        if (!rule.match(object)) continue;

        const stash = object.userData as Record<string, unknown>;
        if (stash[STASH_KEY] === undefined) {
          stash[STASH_KEY] = object.material;
        }
        object.material = resolveOverride(rule, object);
        count++;
        break; // first match wins; later rules ignored for this object.
      }
    });
    return count;
  }

  /**
   * Restore every stashed material across the subtree. Idempotent —
   * objects without a stash are skipped. Call before activating a
   * perception with a *different* override set, or on deactivation.
   */
  restoreAll(scene: THREE.Object3D): number {
    let count = 0;
    scene.traverse((object) => {
      if (!isMaterialBearing(object)) return;
      const stash = object.userData as Record<string, unknown>;
      const base = stash[STASH_KEY];
      if (base === undefined) return;
      object.material = base as THREE.Material | THREE.Material[];
      delete stash[STASH_KEY];
      count++;
    });
    return count;
  }

  /**
   * Apply overrides to a newly-added subtree (e.g. a freshly-built
   * chunk). Same semantics as `applyAll` but limited to `subtree`
   * and its descendants — avoids re-walking the whole scene.
   */
  applyToSubtree(subtree: THREE.Object3D, overrides: readonly MaterialOverride[]): number {
    return this.applyAll(subtree, overrides);
  }
}
