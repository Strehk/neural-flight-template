/**
 * Sinneswandler Perception plugins — three plugin definitions
 * (echolocation, daylight, chemosense) for the shared
 * `PerceptionRouter` (refactor step 10b).
 *
 * Each plugin carries:
 *   - `id` matching `VisionModeId` (so `router.activate("daylight")`
 *     and `senseSwitch.currentMode === "daylight"` stay in sync),
 *   - `layerMask` controlling which Three.js layer channels render,
 *   - `data.visionMode` — the legacy `VisionMode` struct
 *     SenseSwitchManager keeps reading for its uniform-lerp logic.
 *
 * What this step intentionally DOES NOT do: it doesn't migrate
 * SenseSwitchManager's uniform-write code onto plugin `onTick`
 * callbacks. That migration is straightforward but bigger; the
 * current step proves the router architecture works end-to-end and
 * gets the LayerMask payoff (chemosense hotspots auto-hidden outside
 * chemosense mode).
 */

import {
  BASE_MASK,
  makeMask,
  type Perception,
} from "$lib/three/perception";
import {
  VISION_MODES,
  type VisionMode,
  type VisionModeId,
} from "../vision-modes";

/**
 * Payload attached to each perception so consumers (SenseSwitchManager,
 * future audio routers, etc.) can read the underlying VisionMode by
 * id without importing vision-modes directly.
 */
export interface SinneswandlerPerceptionData extends Record<string, unknown> {
  visionMode: VisionMode;
}

function buildPerception(id: VisionModeId, layerMask: number): Perception {
  const mode = VISION_MODES[id];
  return {
    id,
    label: mode.label,
    layerMask,
    // SenseSwitchManager keeps owning the uniform-lerp; perception
    // `onTick` stays a no-op until step 10c migrates the lerps over.
    // Using a payload here so any future consumer can resolve the
    // underlying mode without re-importing vision-modes.
    uniforms: undefined,
    onActivate(ctx) {
      // Surface the mode data on the context so hosts can read it
      // without a back-channel.
      if (ctx.data) (ctx.data as SinneswandlerPerceptionData).visionMode = mode;
    },
  };
}

/** Perceptions for all 7 Sinneswandler vision modes. */
export const SINNESWANDLER_PERCEPTIONS: readonly Perception[] = [
  buildPerception("luft", BASE_MASK),
  buildPerception("echoLocation", BASE_MASK),
  buildPerception("infrarot", BASE_MASK),
  buildPerception("duft", makeMask("base", "chemosense")),
  buildPerception("netzwerk", BASE_MASK),
  buildPerception("depthDebug", BASE_MASK),
  buildPerception("normal", BASE_MASK),
];
