/**
 * Terrain biome zones used by the noise-based terrain generation system.
 * These are the six coarse terrain-zone types produced by the Voronoi
 * biome sampler — distinct from worldgen's ecological BiomeId set.
 */
export type TerrainBiomeId =
	| "forest"
	| "grassland"
	| "mountains"
	| "snow"
	| "desert"
	| "barrens";

export const TERRAIN_BIOME_IDS: readonly TerrainBiomeId[] = [
	"forest",
	"grassland",
	"mountains",
	"snow",
	"desert",
	"barrens",
];
