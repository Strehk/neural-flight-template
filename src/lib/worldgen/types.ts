export type BiomeId =
	| "meadow"
	| "forest"
	| "fungal-grove"
	| "dry-steppe"
	| "rock"
	| "alpine";

export interface TerrainGenerationConfig {
	heightScale: number;
	continentScale: number;
	ridgeStrength: number;
	basinDepth: number;
	detailAmplitude: number;
	cliffThreshold: number;
	waterLevel: number;
}

export interface ClimateConfig {
	temperatureBias: number;
	moistureBias: number;
	rainfallAmount: number;
	windDirectionDeg: number;
	altitudeCooling: number;
}

export interface BiomeRuleConfig {
	forestWeight: number;
	fungalWeight: number;
	drySteppeWeight: number;
	alpineWeight: number;
	transitionSoftness: number;
}

export interface VegetationConfig {
	density: number;
	clustering: number;
	clearingAmount: number;
	treeRatio: number;
	bushRatio: number;
	rockRatio: number;
}

export interface WorldStreamingConfig {
	chunkSize: number;
	buildRadius: number;
	keepRadius: number;
	maxBuildsPerFrame: number;
	workerCount: number;
}

export interface WorldPreset {
	id: string;
	name: string;
	description: string;
	version: string;
	seed: number;
	terrain: TerrainGenerationConfig;
	climate: ClimateConfig;
	biomes: BiomeRuleConfig;
	vegetation: VegetationConfig;
	streaming: WorldStreamingConfig;
}

export interface BaseWorldSample {
	x: number;
	z: number;
	normalizedHeight: number;
	height: number;
	slope: number;
	temperature: number;
	moisture: number;
	rainfall: number;
	vegetationDensity: number;
}

export interface WorldSample extends BaseWorldSample {
	biome: BiomeId;
}

export interface WorldMapCell extends WorldSample {
	index: number;
	gridX: number;
	gridZ: number;
}

export interface WorldMap {
	size: number;
	worldSpan: number;
	cells: WorldMapCell[];
	stats: {
		dominantBiome: BiomeId;
		averageMoisture: number;
	};
}

export type WorldParameterPath =
	| "seed"
	| "terrain.heightScale"
	| "terrain.continentScale"
	| "terrain.ridgeStrength"
	| "terrain.basinDepth"
	| "terrain.detailAmplitude"
	| "terrain.cliffThreshold"
	| "terrain.waterLevel"
	| "climate.temperatureBias"
	| "climate.moistureBias"
	| "climate.rainfallAmount"
	| "climate.windDirectionDeg"
	| "climate.altitudeCooling"
	| "biomes.forestWeight"
	| "biomes.fungalWeight"
	| "biomes.drySteppeWeight"
	| "biomes.alpineWeight"
	| "biomes.transitionSoftness"
	| "vegetation.density"
	| "vegetation.clustering"
	| "vegetation.clearingAmount"
	| "vegetation.treeRatio"
	| "vegetation.bushRatio"
	| "vegetation.rockRatio";

export interface WorldParameterDef {
	id: WorldParameterPath;
	label: string;
	group: string;
	min: number;
	max: number;
	step: number;
	unit?: string;
}
