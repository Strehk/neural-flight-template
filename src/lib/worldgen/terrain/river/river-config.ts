/**
 * River system configuration — pure data + the discharge→geometry curves.
 *
 * The river network is graph-first hydrology on a deterministic node lattice
 * (see RiverNetwork.ts). Every tunable lives here so the whole system is a
 * pure function of (seed, coords, RiverConfig). In Phase 2 this gets wired
 * into WorldConfig; the defaults below are the starting tuning.
 *
 * Discharge `Q` is in abstract units: a spring leaf carries ~1, a confluence
 * sums its donors, so a large river reaches the hundreds. Width and depth
 * scale with sqrt(Q) (hydraulic geometry: channel width ∝ √discharge).
 */

export interface RiverConfig {
	/** Side length of a cached river region in world units. */
	regionSize: number;
	/**
	 * Extra world-unit margin sampled around each region so flow accumulation
	 * has upstream context. Larger = more correct discharge near region edges,
	 * but more nodes per build. The window is `regionSize + 2*regionMargin`.
	 */
	regionMargin: number;
	/** Spacing of the deterministic node lattice in world units. */
	nodeSpacing: number;
	/** Jitter applied to each lattice node, as a fraction of nodeSpacing. */
	nodeJitter: number;
	/**
	 * Depression resolution: when a node is a local minimum, search outward up
	 * to this many lattice rings for a lower node to "jump" to (the river cuts
	 * across the small rise and keeps flowing). 0 disables — rivers then stop at
	 * every little basin. Bounded ⇒ stays deterministic / seam-safe.
	 */
	maxJumpCells: number;
	/** Max regions kept in the LRU before eviction. */
	maxCachedRegions: number;

	/** Channel half-width curve: clamp(min + perSqrtQ*√Q, min, max). */
	minHalfWidth: number;
	widthPerSqrtQ: number;
	maxHalfWidth: number;

	/** Bed-depth curve below the water surface: clamp(min + perSqrtQ*√Q, min, max). */
	minBedDepth: number;
	depthPerSqrtQ: number;
	maxBedDepth: number;

	/** Bank/valley transition beyond the channel: base + perSqrtQ*√Q. */
	bankBase: number;
	bankPerSqrtQ: number;

	/** How far the water surface sits below the routing elevation (top of the cut). */
	surfaceInset: number;

	/** Per-node base rainfall and the moisture-driven bonus (Rule 7). */
	baseRain: number;
	moistureRain: number;

	/** Extra discharge injected at qualifying spring leaves (Rule 7) so water
	 *  starts right at the source instead of some way downstream. */
	springBonus: number;
	/** Spring-score threshold [0,1] above which a headwater leaf becomes a spring. */
	springThreshold: number;

	/** Minimum discharge for a segment to carry an open water surface. */
	waterMinQ: number;
	/** Minimum discharge for a segment to carve a channel at all (dry gullies below). */
	carveMinQ: number;

	/** Waterfalls only on small streams (order ≤ this) with drop/length above slope. */
	waterfallMaxOrder: number;
	waterfallSlope: number;

	// ── Curves (Phase 6) ──
	/** Sub-segments each node→node edge is split into (smoothness of the curve). */
	subdivisions: number;
	/** Perpendicular sampling radius (wu) used to find lower ground beside the path. */
	nudgeRadius: number;
	/** How strongly the path bends toward lower terrain (wu per wu of height diff). */
	nudgeGain: number;
	/** Cap on the terrain-driven perpendicular offset (wu). */
	maxNudge: number;
	/** Low-frequency meander noise: frequency + amplitude (wu), only in flat terrain. */
	meanderFreq: number;
	meanderAmp: number;

	// ── Lakes (Phase 5) ──
	/** Minimum inflow discharge for a sink to become a lake (smaller sinks stay dry). */
	lakeMinQ: number;
	/** Lake water level above the sink floor: base + perSqrtQ·√Q (bigger river → higher). */
	lakeRiseBase: number;
	lakeRisePerSqrtQ: number;
	/** Lake flood radius: base + perSqrtQ·√Q, capped (bigger river → bigger lake). */
	lakeRadiusBase: number;
	lakeRadiusPerSqrtQ: number;
	lakeMaxRadius: number;
}

export const BAT_RIVER_DEFAULTS: RiverConfig = {
	regionSize: 2048,
	regionMargin: 2048,
	nodeSpacing: 80,
	nodeJitter: 0.62,
	maxJumpCells: 6,
	maxCachedRegions: 6,

	minHalfWidth: 1.4,
	widthPerSqrtQ: 2.1,
	maxHalfWidth: 46,

	minBedDepth: 1.0,
	depthPerSqrtQ: 1.0,
	maxBedDepth: 16,

	bankBase: 5,
	bankPerSqrtQ: 2.4,

	surfaceInset: 0.6,

	baseRain: 0.5,
	moistureRain: 1.0,
	springBonus: 1.0,
	springThreshold: 0.55,

	waterMinQ: 3.5,
	carveMinQ: 2.6,

	waterfallMaxOrder: 2,
	waterfallSlope: 0.5,

	subdivisions: 6,
	nudgeRadius: 42,
	nudgeGain: 1.1,
	maxNudge: 40,
	meanderFreq: 0.012,
	meanderAmp: 10,

	lakeMinQ: 4,
	lakeRiseBase: 2,
	lakeRisePerSqrtQ: 0.7,
	lakeRadiusBase: 18,
	lakeRadiusPerSqrtQ: 6,
	lakeMaxRadius: 220,
};

// ── Discharge → geometry curves ────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
	return v < lo ? lo : v > hi ? hi : v;
}

/** Channel half-width in world units for a given discharge. */
export function riverHalfWidth(cfg: RiverConfig, q: number): number {
	return clamp(
		cfg.minHalfWidth + cfg.widthPerSqrtQ * Math.sqrt(q),
		cfg.minHalfWidth,
		cfg.maxHalfWidth,
	);
}

/** Bed depth below the water surface for a given discharge (Rule 5). */
export function riverBedDepth(cfg: RiverConfig, q: number): number {
	return clamp(
		cfg.minBedDepth + cfg.depthPerSqrtQ * Math.sqrt(q),
		cfg.minBedDepth,
		cfg.maxBedDepth,
	);
}

/** Bank transition width beyond the channel (Rule 10 — wider for bigger rivers). */
export function riverBankWidth(cfg: RiverConfig, q: number): number {
	return cfg.bankBase + cfg.bankPerSqrtQ * Math.sqrt(q);
}

/** Full valley half-extent: channel + banks. Beyond this the river has no effect. */
export function riverValleyWidth(cfg: RiverConfig, q: number): number {
	return riverHalfWidth(cfg, q) + riverBankWidth(cfg, q);
}

/** Lake water level above the sink floor for a given inflow discharge. */
export function lakeRise(cfg: RiverConfig, q: number): number {
	return cfg.lakeRiseBase + cfg.lakeRisePerSqrtQ * Math.sqrt(q);
}

/** Lake flood radius for a given inflow discharge (capped). */
export function lakeRadius(cfg: RiverConfig, q: number): number {
	return clamp(
		cfg.lakeRadiusBase + cfg.lakeRadiusPerSqrtQ * Math.sqrt(q),
		cfg.lakeRadiusBase,
		cfg.lakeMaxRadius,
	);
}
