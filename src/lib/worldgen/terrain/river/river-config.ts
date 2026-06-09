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

	/** Minimum discharge for a segment to carry an open water surface. */
	waterMinQ: number;
	/** Minimum discharge for a segment to carve a channel at all (dry gullies below). */
	carveMinQ: number;

	/** Waterfalls only on small streams (order ≤ this) with drop/length above slope. */
	waterfallMaxOrder: number;
	waterfallSlope: number;
}

export const BAT_RIVER_DEFAULTS: RiverConfig = {
	regionSize: 2048,
	regionMargin: 2048,
	nodeSpacing: 80,
	nodeJitter: 0.62,
	maxCachedRegions: 6,

	minHalfWidth: 2,
	widthPerSqrtQ: 1.6,
	maxHalfWidth: 36,

	minBedDepth: 1.2,
	depthPerSqrtQ: 0.9,
	maxBedDepth: 14,

	bankBase: 6,
	bankPerSqrtQ: 2.2,

	surfaceInset: 0.6,

	baseRain: 0.5,
	moistureRain: 1.0,

	waterMinQ: 2.5,
	carveMinQ: 1.0,

	waterfallMaxOrder: 2,
	waterfallSlope: 0.5,
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
