/**
 * RiverNetwork — graph-first hydrology on a deterministic node lattice.
 *
 * Built once per cached region (RiverRegionCache) over the region + margin.
 * The whole graph is a pure function of (seed, RiverConfig, macroHeight), so
 * any region whose window overlaps a node computes the SAME node position,
 * elevation, and downstream edge — which is what makes rivers continuous
 * across chunk and region borders (Rule 12).
 *
 * Pipeline (mirrors the user's "Technische Wunschlogik"):
 *   1. jittered node lattice, elevation = macroHeight            (routing DEM)
 *   2. steepest-descent edge per node                            (Rule 1: always downhill)
 *   3. flow accumulation high→low → discharge Q                  (Rule 13)
 *   4. Strahler order from the tree                              (Rule 6/13: brook→river)
 *   5. per-edge segments with a monotone-falling water surface   (Rule 2)
 *      + waterfall marking                                       (Rule 8)
 *
 * No THREE imports — pure data, runs in the worker.
 */

import { fbm, type NoiseStack } from "$lib/three/world/NoiseStack";
import { saturate, smoothRange } from "$lib/three/world/math";
import type { TerrainBiomeId } from "../biome-types";
import { sampleMacro, routingHeightLite } from "./macro-height";
import {
	lakeRadius,
	lakeRise,
	riverBedDepth,
	riverHalfWidth,
	riverValleyWidth,
	type RiverConfig,
} from "./river-config";

interface RiverNode {
	i: number;
	j: number;
	x: number;
	z: number;
	elev: number;
	moisture: number;
	temperature: number;
	/** Lattice key of the steepest-descent neighbour, or null for a sink. */
	downKey: string | null;
	/** Accumulated discharge (own rain + all upstream). */
	q: number;
	/** Strahler order. */
	order: number;
	// Transient Strahler accumulators (filled during the high→low pass).
	childMax: number;
	childMaxCount: number;
}

export interface RiverSegment {
	ax: number;
	az: number;
	aWater: number;
	bx: number;
	bz: number;
	bWater: number;
	q: number;
	order: number;
	/** Pre-computed channel geometry (from discharge curves). */
	halfWidth: number;
	bedDepth: number;
	valleyWidth: number;
	isWaterfall: boolean;
	/** Lake "segment" — a degenerate point (a==b) that floods its basin. */
	isLake: boolean;
}

/** Resolved river influence at a query point — consumed by the height carve. */
export interface RiverSample {
	/** Perpendicular distance to the nearest segment centreline. */
	distance: number;
	/** Smooth water-surface elevation at the nearest point on the segment. */
	waterSurface: number;
	/** Target channel-bed elevation (waterSurface − bedDepth). */
	bed: number;
	halfWidth: number;
	valleyWidth: number;
	bedDepth: number;
	q: number;
	order: number;
	isWaterfall: boolean;
	/** True if discharge is high enough to render an open water surface. */
	hasWater: boolean;
	/** True when this is a lake basin (flood, don't carve a channel bed). */
	isLake: boolean;
}

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/** Deterministic 32-bit hash of two lattice indices + seed (vHash pattern). */
function latticeHash(a: number, b: number, seed: number): number {
	let h = (seed ^ FNV_OFFSET) >>> 0;
	h = Math.imul(h ^ (a & 0xffff), FNV_PRIME) >>> 0;
	h = Math.imul(h ^ (a >>> 16), FNV_PRIME) >>> 0;
	h = Math.imul(h ^ (b & 0xffff), FNV_PRIME) >>> 0;
	h = Math.imul(h ^ (b >>> 16), FNV_PRIME) >>> 0;
	h ^= h >>> 16;
	return h >>> 0;
}

const NEIGHBOURS: ReadonlyArray<readonly [number, number]> = [
	[-1, -1], [0, -1], [1, -1],
	[-1, 0], [1, 0],
	[-1, 1], [0, 1], [1, 1],
];

export interface RiverNetworkParams {
	noise: NoiseStack;
	config: RiverConfig;
	biomeScale: number;
	mountainHeight: number;
	seed: number;
	biomeMultipliers?: Partial<Record<TerrainBiomeId, number>>;
	/** World-space window to instantiate nodes over (region + margin). */
	minX: number;
	minZ: number;
	maxX: number;
	maxZ: number;
}

export class RiverNetwork {
	readonly config: RiverConfig;
	readonly segments: RiverSegment[] = [];

	/** Spatial bins: bin key → segment indices. Segments are inserted into
	 *  every bin their valley-expanded AABB overlaps, so a single-bin lookup
	 *  at query time finds every segment that can influence the point. */
	private readonly bins = new Map<string, number[]>();
	private readonly binSize: number;

	constructor(params: RiverNetworkParams) {
		this.config = params.config;
		this.binSize = Math.max(32, params.config.nodeSpacing);
		this.build(params);
	}

	// ── build ────────────────────────────────────────────────────────────

	private build(params: RiverNetworkParams): void {
		const { noise, config, biomeScale, mountainHeight, seed, biomeMultipliers } = params;
		const s = config.nodeSpacing;
		const jitter = config.nodeJitter;

		const iMin = Math.floor(params.minX / s) - 1;
		const iMax = Math.ceil(params.maxX / s) + 1;
		const jMin = Math.floor(params.minZ / s) - 1;
		const jMax = Math.ceil(params.maxZ / s) + 1;

		const nodes = new Map<string, RiverNode>();

		// 1. Node lattice + routing elevation.
		for (let j = jMin; j <= jMax; j++) {
			for (let i = iMin; i <= iMax; i++) {
				const jx = (latticeHash(i, j, seed ^ 0xa53a) / 0xffffffff - 0.5) * jitter;
				const jz = (latticeHash(i, j, seed ^ 0x5c1b) / 0xffffffff - 0.5) * jitter;
				const x = (i + 0.5 + jx) * s;
				const z = (j + 0.5 + jz) * s;
				const macro = sampleMacro(noise, x, z, biomeScale, mountainHeight, biomeMultipliers);
				nodes.set(`${i},${j}`, {
					i,
					j,
					x,
					z,
					elev: macro.height,
					moisture: macro.moisture,
					temperature: macro.temperature,
					downKey: null,
					q: config.baseRain + config.moistureRain * macro.moisture,
					order: 1,
					childMax: 0,
					childMaxCount: 0,
				});
			}
		}

		// 2. Steepest-descent edge: lowest strictly-lower neighbour.
		for (const node of nodes.values()) {
			let bestKey: string | null = null;
			let bestElev = node.elev;
			for (const [di, dj] of NEIGHBOURS) {
				const nb = nodes.get(`${node.i + di},${node.j + dj}`);
				if (nb && nb.elev < bestElev) {
					bestElev = nb.elev;
					bestKey = `${nb.i},${nb.j}`;
				}
			}
			node.downKey = bestKey;
		}

		// 2b. Spring bias (Rule 7): a headwater leaf (no upstream donor) in a
		// high / steep / wet / snowy place becomes a spring and gets extra
		// discharge, so water starts right at the source instead of appearing
		// some way downstream. Non-spring leaves stay dry gullies.
		const downstreamTargets = new Set<string>();
		for (const node of nodes.values()) {
			if (node.downKey) downstreamTargets.add(node.downKey);
		}
		for (const node of nodes.values()) {
			if (downstreamTargets.has(`${node.i},${node.j}`)) continue; // not a leaf
			const down = node.downKey ? nodes.get(node.downKey) : null;
			const dist = down ? Math.hypot(down.x - node.x, down.z - node.z) || 1 : 1;
			const slope = down ? saturate(((node.elev - down.elev) / dist) * 6) : 0;
			const elevFactor = smoothRange(node.elev, 12, 70);
			const snowFactor = saturate((1 - node.temperature) * 0.7 + elevFactor * 0.5 - 0.2);
			const springScore = saturate(
				elevFactor * 0.4 + slope * 0.35 + node.moisture * 0.45 + snowFactor * 0.35,
			);
			if (springScore > config.springThreshold) node.q += config.springBonus;
		}

		// Process high→low: a node's donors are all strictly higher, so they
		// are visited first. This makes both accumulation and Strahler single-pass.
		const sorted = [...nodes.values()].sort((a, b) => b.elev - a.elev);

		// 3. Flow accumulation.
		for (const node of sorted) {
			if (!node.downKey) continue;
			const down = nodes.get(node.downKey);
			if (down) down.q += node.q;
		}

		// 4. Strahler order.
		for (const node of sorted) {
			node.order = node.childMax === 0 ? 1 : node.childMaxCount >= 2 ? node.childMax + 1 : node.childMax;
			if (!node.downKey) continue;
			const down = nodes.get(node.downKey);
			if (!down) continue;
			if (node.order > down.childMax) {
				down.childMax = node.order;
				down.childMaxCount = 1;
			} else if (node.order === down.childMax) {
				down.childMaxCount++;
			}
		}

		// 5. Curved sub-segments with a monotone-falling water surface.
		// Each node→down edge becomes a quadratic Bézier whose control point is
		// pushed sideways toward lower terrain (the river bends around hills) +
		// a small meander in flat ground. Sub-dividing the curve gives dense,
		// overlapping channels so the carved trench stays continuous (no gaps).
		const K = Math.max(1, Math.floor(config.subdivisions));
		for (const node of sorted) {
			if (!node.downKey) continue;
			if (node.q < config.carveMinQ) continue;
			const down = nodes.get(node.downKey);
			if (!down) continue;

			const aWater = node.elev - config.surfaceInset;
			const bWater = down.elev - config.surfaceInset;
			const dx = down.x - node.x;
			const dz = down.z - node.z;
			const length = Math.hypot(dx, dz) || 1;
			const drop = aWater - bWater;
			const isWaterfall =
				node.order <= config.waterfallMaxOrder && drop / length > config.waterfallSlope;

			const q = node.q;
			const halfWidth = riverHalfWidth(config, q);
			const bedDepth = riverBedDepth(config, q);
			const valleyWidth = riverValleyWidth(config, q);

			// Control point: midpoint nudged perpendicular toward lower ground.
			const midX = (node.x + down.x) / 2;
			const midZ = (node.z + down.z) / 2;
			const perpX = -dz / length;
			const perpZ = dx / length;
			const probe = config.nudgeRadius;
			const hPlus = routingHeightLite(noise, midX + perpX * probe, midZ + perpZ * probe, biomeScale, mountainHeight);
			const hMinus = routingHeightLite(noise, midX - perpX * probe, midZ - perpZ * probe, biomeScale, mountainHeight);
			// Move toward the lower side; clamp the magnitude.
			let offset = (hMinus - hPlus) * config.nudgeGain;
			if (offset > config.maxNudge) offset = config.maxNudge;
			else if (offset < -config.maxNudge) offset = -config.maxNudge;
			// Flat terrain (small cross-gradient) → add a gentle noise meander.
			const flatness = saturate(1 - Math.abs(hPlus - hMinus) / 8);
			const meander =
				fbm(noise.getNoise("basins"), midX * config.meanderFreq, midZ * config.meanderFreq, 2, 2, 0.5) *
				config.meanderAmp *
				flatness;
			const ctrlX = midX + perpX * (offset + meander);
			const ctrlZ = midZ + perpZ * (offset + meander);

			let prevX = node.x;
			let prevZ = node.z;
			let prevW = aWater;
			for (let k = 1; k <= K; k++) {
				const t = k / K;
				const mt = 1 - t;
				const bx = mt * mt * node.x + 2 * mt * t * ctrlX + t * t * down.x;
				const bz = mt * mt * node.z + 2 * mt * t * ctrlZ + t * t * down.z;
				// Anchor the water surface to the macro terrain UNDER the curve
				// (the curve bends toward lower ground, so the straight node
				// interpolation would float the surface above the valley and
				// pool deep). Sample macro at the curve point, minus inset, and
				// clamp monotone-decreasing into [bWater, prevW] so it never
				// rises and meets the downstream node exactly.
				let bw: number;
				if (k === K) {
					bw = bWater;
				} else {
					const macro = sampleMacro(noise, bx, bz, biomeScale, mountainHeight, biomeMultipliers).height - config.surfaceInset;
					bw = macro > prevW ? prevW : macro < bWater ? bWater : macro;
				}
				const seg: RiverSegment = {
					ax: prevX,
					az: prevZ,
					aWater: prevW,
					bx,
					bz,
					bWater: bw,
					q,
					order: node.order,
					halfWidth,
					bedDepth,
					valleyWidth,
					isWaterfall,
					isLake: false,
				};
				const index = this.segments.push(seg) - 1;
				this.insertSegment(index, seg);
				prevX = bx;
				prevZ = bz;
				prevW = bw;
			}
		}

		// 6. Lakes (Rule 11): a sink (local minimum) that collects enough inflow
		// becomes a lake. Modelled as a degenerate point-segment whose flood
		// radius + level scale with the inflow discharge (bigger river → bigger
		// lake). The carve floods the basin rather than cutting a channel, so a
		// river entering a sink ends in a lake instead of stopping abruptly.
		for (const node of sorted) {
			if (node.downKey) continue; // not a sink
			if (node.q < config.lakeMinQ) continue;
			// Level uses a constant rise over the sink floor (node.elev is a pure
			// function ⇒ window-independent ⇒ no border seam). Lake *size* still
			// scales with inflow via the radius (bigger river → bigger/deeper lake
			// as more of the basin floods); the radius isn't seam-critical.
			const level = node.elev + lakeRise(config, config.lakeMinQ);
			const radius = lakeRadius(config, node.q);
			const seg: RiverSegment = {
				ax: node.x,
				az: node.z,
				aWater: level,
				bx: node.x,
				bz: node.z,
				bWater: level,
				q: node.q,
				order: node.order,
				halfWidth: radius,
				bedDepth: 0,
				valleyWidth: radius,
				isWaterfall: false,
				isLake: true,
			};
			const index = this.segments.push(seg) - 1;
			this.insertSegment(index, seg);
		}
	}

	private insertSegment(index: number, seg: RiverSegment): void {
		const reach = seg.valleyWidth;
		const minBx = Math.floor((Math.min(seg.ax, seg.bx) - reach) / this.binSize);
		const maxBx = Math.floor((Math.max(seg.ax, seg.bx) + reach) / this.binSize);
		const minBz = Math.floor((Math.min(seg.az, seg.bz) - reach) / this.binSize);
		const maxBz = Math.floor((Math.max(seg.az, seg.bz) + reach) / this.binSize);
		for (let bz = minBz; bz <= maxBz; bz++) {
			for (let bx = minBx; bx <= maxBx; bx++) {
				const key = `${bx},${bz}`;
				const list = this.bins.get(key);
				if (list) list.push(index);
				else this.bins.set(key, [index]);
			}
		}
	}

	// ── query ────────────────────────────────────────────────────────────

	/**
	 * Resolve the nearest influencing river segment at (x, z), or null if the
	 * point is outside every valley. Picks the nearest centreline; the height
	 * carve then decides channel vs. bank vs. untouched terrain.
	 */
	sampleAt(x: number, z: number): RiverSample | null {
		const key = `${Math.floor(x / this.binSize)},${Math.floor(z / this.binSize)}`;
		const list = this.bins.get(key);
		if (!list) return null;

		// Track the nearest river segment and, separately, any lake the point
		// falls inside. A lake the point sits within wins over a river feeding
		// it, so the junction reads as "river enters lake" not "channel".
		let bestRiver: RiverSegment | null = null;
		let bestRiverDist = Infinity;
		let bestRiverT = 0;
		let bestLake: RiverSegment | null = null;
		let bestLakeDist = Infinity;
		for (const idx of list) {
			const seg = this.segments[idx];
			const { distance, t } = distanceToSegment(x, z, seg);
			if (seg.isLake) {
				if (distance <= seg.halfWidth && distance < bestLakeDist) {
					bestLakeDist = distance;
					bestLake = seg;
				}
			} else if (distance <= seg.valleyWidth && distance < bestRiverDist) {
				bestRiverDist = distance;
				bestRiverT = t;
				bestRiver = seg;
			}
		}

		if (bestLake) {
			return {
				distance: bestLakeDist,
				waterSurface: bestLake.aWater,
				bed: bestLake.aWater,
				halfWidth: bestLake.halfWidth,
				valleyWidth: bestLake.valleyWidth,
				bedDepth: 0,
				q: bestLake.q,
				order: bestLake.order,
				isWaterfall: false,
				hasWater: bestLake.q >= this.config.waterMinQ,
				isLake: true,
			};
		}

		const best = bestRiver;
		if (!best) return null;

		// Linear interpolation keeps the surface smooth and monotone along the
		// curve. (isWaterfall is kept as metadata for later visual treatment;
		// stepping it per sub-segment would jag the surface.)
		const waterSurface = best.aWater + (best.bWater - best.aWater) * bestRiverT;

		return {
			distance: bestRiverDist,
			waterSurface,
			bed: waterSurface - best.bedDepth,
			halfWidth: best.halfWidth,
			valleyWidth: best.valleyWidth,
			bedDepth: best.bedDepth,
			q: best.q,
			order: best.order,
			isWaterfall: best.isWaterfall,
			hasWater: best.q >= this.config.waterMinQ,
			isLake: false,
		};
	}
}

/** Perpendicular distance from (px,pz) to a segment + the clamped parameter t. */
function distanceToSegment(
	px: number,
	pz: number,
	seg: RiverSegment,
): { distance: number; t: number } {
	const vx = seg.bx - seg.ax;
	const vz = seg.bz - seg.az;
	const lenSq = vx * vx + vz * vz;
	let t = lenSq > 0 ? ((px - seg.ax) * vx + (pz - seg.az) * vz) / lenSq : 0;
	t = t < 0 ? 0 : t > 1 ? 1 : t;
	const cx = seg.ax + vx * t;
	const cz = seg.az + vz * t;
	return { distance: Math.hypot(px - cx, pz - cz), t };
}
