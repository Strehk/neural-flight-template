import { buildWorldMap, sampleWorld } from "./sampler";
import { worldMapToLayerBuffers } from "./layers";
import type { WorldLayerBuffers } from "./layers";
import type { BiomeId, WorldMap, WorldMapCell, WorldPreset, WorldSample } from "./types";

export interface WorldRuntimeOptions {
	regionSize?: number;
	regionResolution?: number;
	maxCachedRegions?: number;
}

export interface WorldRuntimeStats {
	regionSize: number;
	regionResolution: number;
	cachedRegions: number;
}

export interface WorldRegion {
	key: string;
	gridX: number;
	gridZ: number;
	map: WorldMap;
	lastUsed: number;
}

export class WorldRuntime {
	readonly preset: WorldPreset;
	readonly regionSize: number;
	readonly regionResolution: number;
	readonly maxCachedRegions: number;

	private readonly regions = new Map<string, WorldRegion>();
	private tick = 0;

	constructor(preset: WorldPreset, options: WorldRuntimeOptions = {}) {
		this.preset = preset;
		this.regionSize = options.regionSize ?? 4096;
		this.regionResolution = options.regionResolution ?? 128;
		this.maxCachedRegions = options.maxCachedRegions ?? 12;
	}

	sample(x: number, z: number): WorldSample {
		const region = this.getRegionForPoint(x, z);
		return interpolatedSample(region.map, x, z, this.preset);
	}

	sampleHeight(x: number, z: number): number {
		return this.sample(x, z).height;
	}

	getRegionForPoint(x: number, z: number): WorldRegion {
		const gridX = Math.floor(x / this.regionSize);
		const gridZ = Math.floor(z / this.regionSize);
		return this.getRegion(gridX, gridZ);
	}

	getRegion(gridX: number, gridZ: number): WorldRegion {
		const key = `${gridX},${gridZ}`;
		const existing = this.regions.get(key);
		if (existing) {
			existing.lastUsed = ++this.tick;
			return existing;
		}

		const centerX = gridX * this.regionSize + this.regionSize / 2;
		const centerZ = gridZ * this.regionSize + this.regionSize / 2;
		const entry: WorldRegion = {
			key,
			gridX,
			gridZ,
			map: buildWorldMap(
				this.preset,
				this.regionResolution,
				this.regionSize,
				centerX,
				centerZ,
			),
			lastUsed: ++this.tick,
		};
		this.regions.set(key, entry);
		this.evictOldRegions();
		return entry;
	}

	getLayerBuffers(gridX: number, gridZ: number): WorldLayerBuffers {
		return worldMapToLayerBuffers(this.getRegion(gridX, gridZ).map);
	}

	getLayerBuffersForPoint(x: number, z: number): WorldLayerBuffers {
		const region = this.getRegionForPoint(x, z);
		return worldMapToLayerBuffers(region.map);
	}

	stats(): WorldRuntimeStats {
		return {
			regionSize: this.regionSize,
			regionResolution: this.regionResolution,
			cachedRegions: this.regions.size,
		};
	}

	clear(): void {
		this.regions.clear();
	}

	private evictOldRegions(): void {
		if (this.regions.size <= this.maxCachedRegions) return;
		const oldest = Array.from(this.regions.values()).sort(
			(a, b) => a.lastUsed - b.lastUsed,
		)[0];
		if (oldest) this.regions.delete(oldest.key);
	}
}

function interpolatedSample(
	map: WorldMap,
	x: number,
	z: number,
	preset: WorldPreset,
): WorldSample {
	if (map.cells.length === 0) return sampleWorld(preset, x, z);
	const cellSize = map.worldSpan / Math.max(1, map.size - 1);
	const first = map.cells[0];
	const originX = first.x;
	const originZ = first.z;
	const sampleX = (x - originX) / cellSize;
	const sampleZ = (z - originZ) / cellSize;
	if (
		sampleX < 0 ||
		sampleZ < 0 ||
		sampleX > map.size - 1 ||
		sampleZ > map.size - 1
	) {
		return sampleWorld(preset, x, z);
	}
	const gridX = Math.min(map.size - 2, Math.max(0, Math.floor(sampleX)));
	const gridZ = Math.min(map.size - 2, Math.max(0, Math.floor(sampleZ)));
	const tx = smootherstep(sampleX - gridX);
	const tz = smootherstep(sampleZ - gridZ);
	const c00 = map.cells[gridZ * map.size + gridX];
	const c10 = map.cells[gridZ * map.size + gridX + 1];
	const c01 = map.cells[(gridZ + 1) * map.size + gridX];
	const c11 = map.cells[(gridZ + 1) * map.size + gridX + 1];
	if (!c00 || !c10 || !c01 || !c11) return sampleWorld(preset, x, z);

	return {
		x,
		z,
		normalizedHeight: bilerp(c00.normalizedHeight, c10.normalizedHeight, c01.normalizedHeight, c11.normalizedHeight, tx, tz),
		height: bilerp(c00.height, c10.height, c01.height, c11.height, tx, tz),
		slope: bilerp(c00.slope, c10.slope, c01.slope, c11.slope, tx, tz),
		temperature: bilerp(c00.temperature, c10.temperature, c01.temperature, c11.temperature, tx, tz),
		moisture: bilerp(c00.moisture, c10.moisture, c01.moisture, c11.moisture, tx, tz),
		rainfall: bilerp(c00.rainfall, c10.rainfall, c01.rainfall, c11.rainfall, tx, tz),
		vegetationDensity: bilerp(c00.vegetationDensity, c10.vegetationDensity, c01.vegetationDensity, c11.vegetationDensity, tx, tz),
		biome: interpolatedBiome(c00, c10, c01, c11, tx, tz),
	};
}

function interpolatedBiome(
	c00: WorldMapCell,
	c10: WorldMapCell,
	c01: WorldMapCell,
	c11: WorldMapCell,
	tx: number,
	tz: number,
): BiomeId {
	const weights = new Map<BiomeId, number>();
	addBiomeWeight(weights, c00.biome, (1 - tx) * (1 - tz));
	addBiomeWeight(weights, c10.biome, tx * (1 - tz));
	addBiomeWeight(weights, c01.biome, (1 - tx) * tz);
	addBiomeWeight(weights, c11.biome, tx * tz);

	let bestBiome: BiomeId = c00.biome;
	let bestWeight = -Infinity;
	for (const [biome, weight] of weights.entries()) {
		if (weight > bestWeight) {
			bestBiome = biome;
			bestWeight = weight;
		}
	}
	return bestBiome;
}

function addBiomeWeight(weights: Map<BiomeId, number>, biome: BiomeId, weight: number): void {
	weights.set(biome, (weights.get(biome) ?? 0) + weight);
}

function bilerp(a: number, b: number, c: number, d: number, tx: number, tz: number): number {
	return lerp(lerp(a, b, tx), lerp(c, d, tx), tz);
}

function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

function smootherstep(value: number): number {
	const x = Math.min(1, Math.max(0, value));
	return x * x * x * (x * (x * 6 - 15) + 10);
}
