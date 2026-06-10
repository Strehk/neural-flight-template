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

	// Lake: flood the natural basin. The water surface is flat (the lake level);
	// the bed is the existing terrain (lakes are deep in the middle, shallow at
	// the rim) — we don't carve a flat disc, so hills around the basin keep the
	// water contained.
	if (river.isLake) {
		const waterSurfaceHeight = river.waterSurface;
		const isWater = height < waterSurfaceHeight;
		return {
			height,
			waterSurfaceHeight,
			waterDepth: isWater ? waterSurfaceHeight - height : 0,
			isWater,
		};
	}

	const d = river.distance;
	const half = river.halfWidth;
	const ws = river.waterSurface;
	const bed = river.bed; // ws - bedDepth
	// Narrow the bank transition in steep terrain (gorge), keep it wide in flat
	// terrain (floodplain). The bank is DRY valley — it shapes the land but does
	// not hold water.
	const g = gorge < 0 ? 0 : gorge > 1 ? 1 : gorge;
	const valley = half + (river.valleyWidth - half) * (1 - 0.6 * g);

	let newHeight: number;
	if (d <= half && half > 0) {
		// Channel: bed at the centre rising to the water surface exactly at the
		// rim, so the OPEN WATER spans 2·halfWidth — fully controlled by the
		// width knob (and reaches ~0 when set to 0).
		const t = smootherstep(d / half);
		newHeight = bed + (ws - bed) * t;
	} else if (d < valley) {
		// Dry bank: from the water rim up to the surrounding terrain.
		const t = smootherstep((d - half) / Math.max(1e-3, valley - half));
		newHeight = ws + (height - ws) * t;
	} else {
		newHeight = height;
	}
	// Never raise terrain above the original ground (a river can't build a hill).
	if (newHeight > height) newHeight = height;

	const waterSurfaceHeight = ws;
	const isWater = river.hasWater && newHeight < ws;
	const waterDepth = isWater ? ws - newHeight : 0;

	return { height: newHeight, waterSurfaceHeight, waterDepth, isWater };
}
