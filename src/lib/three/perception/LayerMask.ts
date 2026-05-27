/**
 * LayerMask — named Three.js layer channels for Multi-Perception-Rendering.
 *
 * Three.js's `Object3D.layers` is a 32-bit bitmask the camera's `layers`
 * intersects to decide visibility. Naming the channels keeps the
 * intent visible at every assignment site, and centralising the
 * registry means a new perception can claim its own slot without
 * scanning the codebase for collisions.
 *
 * Step 10a primitive. Sinneswandler's actual layer assignments arrive
 * with step 10b's plugin migration.
 */

import type * as THREE from "three";
import type { LayerMask } from "./types";

/**
 * Canonical layer-channel slots. Channel 0 is the "default" channel
 * THREE assigns to every new object — every perception's mask
 * normally includes it so terrain / decorations / moths render unless
 * explicitly hidden.
 */
export const LAYER_IDS = {
  /** Always-visible base layer (terrain, decorations, moths). Channel 0. */
  base: 0,
  /** Chemosense-only objects (hotspots, scent volumes). Channel 1. */
  chemosense: 1,
  /** Sense-switch UI (ring portals, mode chips). Channel 2. */
  senseSwitch: 2,
  /** Debug overlays (gizmos, bounding boxes, dev arrows). Channel 3. */
  debug: 3,
  /**
   * Channels 4..31 are reserved for future perceptions / experiences.
   * Add slots here as needed.
   */
} as const;

export type LayerChannelName = keyof typeof LAYER_IDS;

/** Build a `LayerMask` (number) from a set of channel names. */
export function makeMask(...channels: LayerChannelName[]): LayerMask {
  let mask = 0;
  for (const name of channels) mask |= 1 << LAYER_IDS[name];
  return mask;
}

/** Convenience: the base-only mask (most perceptions extend this). */
export const BASE_MASK: LayerMask = makeMask("base");

/**
 * Push a perception's `LayerMask` onto a camera's `Layers`. Resets the
 * camera's layer set first so previous-perception channels don't leak.
 *
 * Pre-refactor camera setup happened in route code via direct
 * `camera.layers.enable(N)` calls; the router calls this once per
 * activation / cross-fade so plugins don't need to know about THREE.
 */
export function applyLayerMask(camera: THREE.Camera, mask: LayerMask): void {
  camera.layers.mask = mask >>> 0;
}

/**
 * Assign a `LayerMask` to an Object3D and (optionally) all its
 * descendants. Use at object creation time so the router doesn't have
 * to walk the scene every frame.
 */
export function setObjectLayers(
  object: THREE.Object3D,
  mask: LayerMask,
  recursive = true,
): void {
  object.layers.mask = mask >>> 0;
  if (recursive) {
    for (const child of object.children) setObjectLayers(child, mask, true);
  }
}
