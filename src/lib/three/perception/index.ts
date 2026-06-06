/**
 * Multi-Perception-Rendering — public surface.
 *
 * Re-exports the five primitives that make up the perception layer.
 * Consumers should import from this module rather than the individual
 * files so adding/renaming submodules later doesn't break call sites.
 */

export type {
  Perception,
  PerceptionContext,
  MaterialOverride,
  LayerMask,
} from "./types";

export {
  LAYER_IDS,
  BASE_MASK,
  makeMask,
  applyLayerMask,
  setObjectLayers,
  type LayerChannelName,
} from "./LayerMask";

export { MaterialOverrideRegistry } from "./MaterialOverrideRegistry";

export {
  PostProcessingStack,
  type PostProcessingStackOptions,
} from "./PostProcessingStack";

export {
  PerceptionRouter,
  type PerceptionRouterOptions,
} from "./PerceptionRouter";
