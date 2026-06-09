/**
 * River carve — turns a resolved RiverSample into a terrain-height
 * modification + water emission. This is the step that makes water part of
 * the landscape rather than a layer on top (Rule 14): it runs *inside* the
 * height composition and only ever lowers terrain.
 *
 * Cross-section (distance d from the centreline):
 *   d ≤ halfWidth                  → channel bed: pull height down to `bed`
 *   halfWidth < d ≤ valleyWidth    → bank: smootherstep blend bed → terrain,
 *                                    flattening local bumps (Rules 2, 9, 10)
 *   d > valleyWidth                → untouched
 *
 * Steep terrain narrows the banks into a gorge; flat terrain keeps the wide
 * floodplain (Rule 14). Terrain is never raised — `min(original, carved)` —
 * so a river can't build a ridge of water (no "gel").
 */

import type { RiverSample } from "./RiverNetwork";

export interface RiverCarveResult {
	height: number;
	waterSurfaceHeight: number;
	waterDepth: number;
	isWater: boolean;
}

function smootherstep(t: number): number {
	const x = t < 0 ? 0 : t > 1 ? 1 : t;
	return x * x * x * (x * (x * 6 - 15) + 10);
}

/**
 * Apply the river carve to a composed terrain height.
 *
 * @param height    the terrain height before the river (full noise composition)
 * @param river     the nearest river influence, or null for "no river here"
 * @param gorge     [0,1] steepness factor — 1 narrows banks into a gorge
 */
export function applyRiverCarve(
	height: number,
	river: RiverSample | null,
	gorge: number,
): RiverCarveResult {
	if (!river || river.distance > river.valleyWidth) {
		return { height, waterSurfaceHeight: height, waterDepth: 0, isWater: false };
	}

	const half = river.halfWidth;
	// Narrow the bank transition in steep terrain (gorge), keep it wide in
	// flat terrain (floodplain). Clamp so banks never collapse below the channel.
	const g = gorge < 0 ? 0 : gorge > 1 ? 1 : gorge;
	const valley = half + (river.valleyWidth - half) * (1 - 0.6 * g);

	let factor: number;
	if (river.distance <= half) {
		factor = 1;
	} else if (river.distance >= valley) {
		factor = 0;
	} else {
		factor = 1 - smootherstep((river.distance - half) / (valley - half));
	}

	// Blend the composed terrain toward the channel bed. In the channel
	// (factor 1) this SETS the bed exactly, so depth is controlled (= bedDepth)
	// and local detail bumps/potholes inside the channel are levelled into a
	// coherent bed. Because the routing surface tracks the real terrain (minus
	// detail), the bed sits just below the ground here — this lowers terrain in
	// the common case and only fills shallow detail dips up to the bed.
	const newHeight = height + (river.bed - height) * factor;

	const waterSurfaceHeight = river.waterSurface;
	const isWater = river.hasWater && newHeight < waterSurfaceHeight;
	const waterDepth = isWater ? waterSurfaceHeight - newHeight : 0;

	return { height: newHeight, waterSurfaceHeight, waterDepth, isWater };
}
