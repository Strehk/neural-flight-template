/**
 * RiverRegionCache — LRU cache of built RiverNetworks, one network per
 * `regionSize` tile. Mirrors the WorldRuntime region pattern
 * (worldgen/runtime.ts) so the streaming terrain can query rivers lazily:
 * a chunk vertex asks `sample(x, z)`, the cache builds (or reuses) the
 * region whose tile contains the point, and the network resolves the
 * nearest river there.
 *
 * Each point is always served by the region whose tile owns it, where the
 * point is interior to the built window (region + margin) and therefore has
 * full upstream context for discharge. Networks are pure functions of
 * (seed, config, macroHeight), so neighbouring regions agree on the shared
 * overlap and rivers never break at borders.
 *
 * One cache lives inside each TerrainSampler (i.e. one per worker), the same
 * way each sampler owns its NoiseStack.
 */

import type { NoiseStack } from "$lib/three/world/NoiseStack";
import type { TerrainBiomeId } from "../biome-types";
import { RiverNetwork, type RiverSample } from "./RiverNetwork";
import type { RiverConfig } from "./river-config";

interface CachedRegion {
	key: string;
	network: RiverNetwork;
	lastUsed: number;
}

export interface RiverRegionCacheOptions {
	noise: NoiseStack;
	config: RiverConfig;
	biomeScale: number;
	mountainHeight: number;
	seed: number;
	biomeMultipliers?: Partial<Record<TerrainBiomeId, number>>;
}

export class RiverRegionCache {
	private readonly noise: NoiseStack;
	private readonly config: RiverConfig;
	private readonly biomeScale: number;
	private readonly mountainHeight: number;
	private readonly seed: number;
	private readonly biomeMultipliers?: Partial<Record<TerrainBiomeId, number>>;

	private readonly regions = new Map<string, CachedRegion>();
	private tick = 0;

	constructor(opts: RiverRegionCacheOptions) {
		this.noise = opts.noise;
		this.config = opts.config;
		this.biomeScale = opts.biomeScale;
		this.mountainHeight = opts.mountainHeight;
		this.seed = opts.seed;
		this.biomeMultipliers = opts.biomeMultipliers;
	}

	/** Resolve the nearest river influence at (x, z), or null if none nearby. */
	sample(x: number, z: number): RiverSample | null {
		return this.getRegionForPoint(x, z).network.sampleAt(x, z);
	}

	private getRegionForPoint(x: number, z: number): CachedRegion {
		const R = this.config.regionSize;
		const gridX = Math.floor(x / R);
		const gridZ = Math.floor(z / R);
		return this.getRegion(gridX, gridZ);
	}

	private getRegion(gridX: number, gridZ: number): CachedRegion {
		const key = `${gridX},${gridZ}`;
		const existing = this.regions.get(key);
		if (existing) {
			existing.lastUsed = ++this.tick;
			return existing;
		}

		const R = this.config.regionSize;
		const margin = this.config.regionMargin;
		const network = new RiverNetwork({
			noise: this.noise,
			config: this.config,
			biomeScale: this.biomeScale,
			mountainHeight: this.mountainHeight,
			seed: this.seed,
			biomeMultipliers: this.biomeMultipliers,
			minX: gridX * R - margin,
			minZ: gridZ * R - margin,
			maxX: (gridX + 1) * R + margin,
			maxZ: (gridZ + 1) * R + margin,
		});

		const entry: CachedRegion = { key, network, lastUsed: ++this.tick };
		this.regions.set(key, entry);
		this.evictOldRegions();
		return entry;
	}

	clear(): void {
		this.regions.clear();
	}

	private evictOldRegions(): void {
		if (this.regions.size <= this.config.maxCachedRegions) return;
		let oldest: CachedRegion | null = null;
		for (const region of this.regions.values()) {
			if (!oldest || region.lastUsed < oldest.lastUsed) oldest = region;
		}
		if (oldest) this.regions.delete(oldest.key);
	}
}
