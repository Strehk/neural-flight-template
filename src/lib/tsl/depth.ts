/**
 * TSL Depth Bands — the "papercut" quantizer.
 *
 * Quantizes a continuous scalar (a normalized depth / view-distance in [0, 1])
 * into a fixed number of discrete steps, producing the stacked-paper banding that
 * is the core spatial cue for Becoming Many's dark senses — echo, infrared, smell
 * and network (see `becoming-many/docs/sinneswandler-spec.md` §4).
 *
 * `levels` is meant to be driven by a live `uniform()` so the band count is a
 * cheap real-time tweak — the original exposes it as the `uDepthLevels`
 * dev-console parameter.
 */

import { Fn } from "three/tsl";
import type { Node } from "three/webgpu";

/**
 * Quantize `t` ∈ [0, 1] into `levels` discrete bands.
 *
 * @param t      Scalar node in [0, 1] (e.g. normalized camera distance).
 * @param levels Number of bands (scalar node — pass a `uniform()` to tweak live).
 * @returns      The quantized scalar, still in [0, 1].
 */
export const depthBands = Fn(([t, levels]: [Node, Node]) => {
	return t.clamp(0, 1).mul(levels).floor().div(levels);
});
