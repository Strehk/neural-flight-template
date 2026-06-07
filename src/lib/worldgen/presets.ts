import type { WorldParameterDef, WorldPreset } from "./types";

export const DEFAULT_WORLD_PRESET_ID = "temperate-forest";

export const WORLD_PRESETS: WorldPreset[] = [
	{
		id: "temperate-forest",
		name: "Temperate Forest",
		description:
			"Feuchter, biomreicher Wald mit Hügeln, Lichtungen und dichter Vegetation.",
		version: "0.1.0",
		seed: 4107,
		terrain: {
			heightScale: 58,
			continentScale: 0.72,
			ridgeStrength: 0.34,
			basinDepth: 0.18,
			detailAmplitude: 0.22,
			cliffThreshold: 0.78,
			waterLevel: 0.34,
		},
		climate: {
			temperatureBias: 0.48,
			moistureBias: 0.72,
			rainfallAmount: 0.72,
			windDirectionDeg: 35,
			altitudeCooling: 0.28,
		},
		biomes: {
			forestWeight: 0.84,
			fungalWeight: 0.38,
			drySteppeWeight: 0.14,
			alpineWeight: 0.3,
			transitionSoftness: 0.22,
		},
		vegetation: {
			density: 0.78,
			clustering: 0.65,
			clearingAmount: 0.24,
			treeRatio: 0.72,
			bushRatio: 0.44,
			rockRatio: 0.18,
		},
		streaming: {
			chunkSize: 128,
			buildRadius: 2,
			keepRadius: 3,
			maxBuildsPerFrame: 1,
			workerCount: 2,
		},
	},
	{
		id: "alpine-forest",
		name: "Alpine Forest",
		description:
			"Hochgelegener Nadelwald mit steilen Kämmen, Felsformationen und Schneefeldern auf den Gipfeln.",
		version: "0.1.0",
		seed: 2847,
		terrain: {
			heightScale: 88,
			continentScale: 0.86,
			ridgeStrength: 0.72,
			basinDepth: 0.14,
			detailAmplitude: 0.38,
			cliffThreshold: 0.58,
			waterLevel: 0.28,
		},
		climate: {
			temperatureBias: 0.28,
			moistureBias: 0.58,
			rainfallAmount: 0.64,
			windDirectionDeg: 270,
			altitudeCooling: 0.54,
		},
		biomes: {
			forestWeight: 0.72,
			fungalWeight: 0.12,
			drySteppeWeight: 0.06,
			alpineWeight: 0.82,
			transitionSoftness: 0.18,
		},
		vegetation: {
			density: 0.62,
			clustering: 0.72,
			clearingAmount: 0.16,
			treeRatio: 0.82,
			bushRatio: 0.24,
			rockRatio: 0.44,
		},
		streaming: {
			chunkSize: 128,
			buildRadius: 2,
			keepRadius: 3,
			maxBuildsPerFrame: 1,
			workerCount: 2,
		},
	},
	{
		id: "fungal-valley",
		name: "Fungal Valley",
		description:
			"Feuchtes Tiefland mit dichtem Pilzbewuchs, verfaulten Baumstümpfen und mystischen Lichtungen.",
		version: "0.1.0",
		seed: 6634,
		terrain: {
			heightScale: 34,
			continentScale: 0.44,
			ridgeStrength: 0.16,
			basinDepth: 0.56,
			detailAmplitude: 0.28,
			cliffThreshold: 0.92,
			waterLevel: 0.42,
		},
		climate: {
			temperatureBias: 0.62,
			moistureBias: 0.88,
			rainfallAmount: 0.82,
			windDirectionDeg: 185,
			altitudeCooling: 0.12,
		},
		biomes: {
			forestWeight: 0.68,
			fungalWeight: 0.94,
			drySteppeWeight: 0.04,
			alpineWeight: 0.08,
			transitionSoftness: 0.44,
		},
		vegetation: {
			density: 0.92,
			clustering: 0.82,
			clearingAmount: 0.34,
			treeRatio: 0.56,
			bushRatio: 0.62,
			rockRatio: 0.08,
		},
		streaming: {
			chunkSize: 128,
			buildRadius: 2,
			keepRadius: 3,
			maxBuildsPerFrame: 1,
			workerCount: 2,
		},
	},
	{
		id: "dry-steppe",
		name: "Dry Steppe",
		description:
			"Weite, trockene Ebene mit vereinzelten Felsformationen, Kakteen und dürrem Grasland.",
		version: "0.1.0",
		seed: 3391,
		terrain: {
			heightScale: 38,
			continentScale: 0.64,
			ridgeStrength: 0.18,
			basinDepth: 0.24,
			detailAmplitude: 0.14,
			cliffThreshold: 0.88,
			waterLevel: 0.22,
		},
		climate: {
			temperatureBias: 0.82,
			moistureBias: 0.14,
			rainfallAmount: 0.12,
			windDirectionDeg: 55,
			altitudeCooling: 0.08,
		},
		biomes: {
			forestWeight: 0.08,
			fungalWeight: 0.04,
			drySteppeWeight: 0.92,
			alpineWeight: 0.12,
			transitionSoftness: 0.28,
		},
		vegetation: {
			density: 0.22,
			clustering: 0.44,
			clearingAmount: 0.62,
			treeRatio: 0.12,
			bushRatio: 0.28,
			rockRatio: 0.52,
		},
		streaming: {
			chunkSize: 128,
			buildRadius: 2,
			keepRadius: 3,
			maxBuildsPerFrame: 1,
			workerCount: 2,
		},
	},
];

export const WORLD_PARAMETER_DEFS: WorldParameterDef[] = [
	{ id: "seed", label: "Seed", group: "Terrain", min: 1, max: 99999, step: 1 },
	{ id: "terrain.heightScale", label: "Höhe", group: "Terrain", min: 8, max: 120, step: 1, unit: "m" },
	{ id: "terrain.continentScale", label: "Kontinente", group: "Terrain", min: 0.1, max: 1.4, step: 0.01 },
	{ id: "terrain.ridgeStrength", label: "Bergkämme", group: "Terrain", min: 0, max: 1, step: 0.01 },
	{ id: "terrain.basinDepth", label: "Becken", group: "Terrain", min: 0, max: 0.8, step: 0.01 },
	{ id: "terrain.detailAmplitude", label: "Detail", group: "Terrain", min: 0, max: 0.6, step: 0.01 },
	{ id: "terrain.cliffThreshold", label: "Klippen-Schwelle", group: "Terrain", min: 0.45, max: 0.98, step: 0.01 },
	{ id: "terrain.waterLevel", label: "Höhen-Offset", group: "Terrain", min: 0.1, max: 0.7, step: 0.01 },
	{ id: "climate.temperatureBias", label: "Temperatur", group: "Klima", min: 0, max: 1, step: 0.01 },
	{ id: "climate.moistureBias", label: "Feuchtigkeit", group: "Klima", min: 0, max: 1, step: 0.01 },
	{ id: "climate.rainfallAmount", label: "Regenmenge", group: "Klima", min: 0, max: 1, step: 0.01 },
	{ id: "climate.windDirectionDeg", label: "Windrichtung", group: "Klima", min: 0, max: 360, step: 1, unit: "°" },
	{ id: "climate.altitudeCooling", label: "Höhenkühlung", group: "Klima", min: 0, max: 0.8, step: 0.01 },
	{ id: "biomes.forestWeight", label: "Wald", group: "Biome", min: 0, max: 1, step: 0.01 },
	{ id: "biomes.drySteppeWeight", label: "Trockensteppe", group: "Biome", min: 0, max: 1, step: 0.01 },
	{ id: "biomes.alpineWeight", label: "Alpin", group: "Biome", min: 0, max: 1, step: 0.01 },
	{ id: "biomes.transitionSoftness", label: "Übergänge", group: "Biome", min: 0, max: 0.7, step: 0.01 },
	{ id: "vegetation.density", label: "Dichte", group: "Vegetation", min: 0, max: 1, step: 0.01 },
	{ id: "vegetation.clustering", label: "Cluster", group: "Vegetation", min: 0, max: 1, step: 0.01 },
	{ id: "vegetation.clearingAmount", label: "Lichtungen", group: "Vegetation", min: 0, max: 1, step: 0.01 },
	{ id: "vegetation.treeRatio", label: "Bäume", group: "Vegetation", min: 0, max: 1, step: 0.01 },
	{ id: "vegetation.bushRatio", label: "Büsche", group: "Vegetation", min: 0, max: 1, step: 0.01 },
	{ id: "vegetation.rockRatio", label: "Felsen", group: "Vegetation", min: 0, max: 1, step: 0.01 },
];

export function cloneWorldPreset(preset: WorldPreset): WorldPreset {
	return JSON.parse(JSON.stringify(preset)) as WorldPreset;
}

export function getBuiltInWorldPreset(id: string): WorldPreset {
	const preset = WORLD_PRESETS.find((entry) => entry.id === id);
	if (!preset) return cloneWorldPreset(WORLD_PRESETS[0]);
	return cloneWorldPreset(preset);
}
