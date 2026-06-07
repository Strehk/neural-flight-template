import type { BiomeId, WorldMap, WorldMapCell } from "./types";

export const WORLDGEN_BIOME_IDS: readonly BiomeId[] = [
	"meadow",
	"forest",
	"fungal-grove",
	"dry-steppe",
	"rock",
	"alpine",
];

export interface WorldLayerMetadata {
	size: number;
	worldSpan: number;
	cellSize: number;
	originX: number;
	originZ: number;
}

export interface WorldLayerBuffers {
	meta: WorldLayerMetadata;
	height: Float32Array;
	normalizedHeight: Float32Array;
	slope: Float32Array;
	temperature: Float32Array;
	moisture: Float32Array;
	rainfall: Float32Array;
	vegetationDensity: Float32Array;
	biome: Uint8Array;
}

export function biomeToLayerId(biome: BiomeId): number {
	const id = WORLDGEN_BIOME_IDS.indexOf(biome);
	return id >= 0 ? id : WORLDGEN_BIOME_IDS.indexOf("meadow");
}

export function layerIdToBiome(id: number): BiomeId {
	return WORLDGEN_BIOME_IDS[id] ?? "meadow";
}

export function worldMapToLayerBuffers(map: WorldMap): WorldLayerBuffers {
	const count = map.size * map.size;
	const first = map.cells[0];
	const cellSize = map.worldSpan / Math.max(1, map.size - 1);
	const buffers: WorldLayerBuffers = {
		meta: {
			size: map.size,
			worldSpan: map.worldSpan,
			cellSize,
			originX: first?.x ?? 0,
			originZ: first?.z ?? 0,
		},
		height: new Float32Array(count),
		normalizedHeight: new Float32Array(count),
		slope: new Float32Array(count),
		temperature: new Float32Array(count),
		moisture: new Float32Array(count),
		rainfall: new Float32Array(count),
		vegetationDensity: new Float32Array(count),
		biome: new Uint8Array(count),
	};

	for (const cell of map.cells) {
		writeCell(buffers, cell);
	}

	return buffers;
}

function writeCell(buffers: WorldLayerBuffers, cell: WorldMapCell): void {
	const index = cell.index;
	buffers.height[index] = cell.height;
	buffers.normalizedHeight[index] = cell.normalizedHeight;
	buffers.slope[index] = cell.slope;
	buffers.temperature[index] = cell.temperature;
	buffers.moisture[index] = cell.moisture;
	buffers.rainfall[index] = cell.rainfall;
	buffers.vegetationDensity[index] = cell.vegetationDensity;
	buffers.biome[index] = biomeToLayerId(cell.biome);
}
