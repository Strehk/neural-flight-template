import type { WorldPreset } from "../types";
import type { TerrainBiomeId } from "./biome-types";
import {
	BAT_MASTER_SEED,
	BAT_WORLD_CONFIG_DEFAULTS,
	type WorldConfig,
} from "./world-config";

export interface TerrainConfigOverrides
	extends Partial<
		Pick<
			WorldConfig,
			| "biomeScale"
			| "mountainHeight"
			| "treeDensity"
			| "grassDensity"
			| "baseVisibility"
			| "fogIntensity"
			| "revealIntensity"
			| "wireThickness"
		>
	> {}

/**
 * Maps generic WorldPreset biome weights to the six terrain-biome slots used by
 * the Voronoi terrain sampler.
 */
export function worldPresetToTerrainBiomeMultipliers(
	preset: WorldPreset,
): Partial<Record<TerrainBiomeId, number>> {
	const b = preset.biomes;
	return {
		forest: b.forestWeight + b.fungalWeight * 0.5,
		grassland: 1 - b.drySteppeWeight,
		mountains: b.alpineWeight,
		snow: b.alpineWeight * 0.6,
		desert: b.drySteppeWeight,
		barrens: b.drySteppeWeight * 0.8,
	};
}

/**
 * Converts a Terrain Builder preset into the shared terrain module's runtime
 * config. Experience-local settings can override visual/runtime fields without
 * changing the saved preset.
 */
export function worldPresetToTerrainConfig(
	preset: WorldPreset | null | undefined,
	overrides: TerrainConfigOverrides = {},
): WorldConfig {
	return {
		...BAT_WORLD_CONFIG_DEFAULTS,
		masterSeed: preset?.seed ?? BAT_MASTER_SEED,
		biomeMultipliers: preset
			? worldPresetToTerrainBiomeMultipliers(preset)
			: undefined,
		mountainHeight:
			overrides.mountainHeight ?? preset?.terrain.heightScale ?? BAT_WORLD_CONFIG_DEFAULTS.mountainHeight,
		treeDensity:
			overrides.treeDensity ??
			(preset
				? preset.vegetation.treeRatio * preset.vegetation.density * 42
				: BAT_WORLD_CONFIG_DEFAULTS.treeDensity),
		grassDensity:
			overrides.grassDensity ??
			(preset
				? preset.vegetation.density * (0.65 + preset.vegetation.bushRatio * 0.35) * 56
				: BAT_WORLD_CONFIG_DEFAULTS.grassDensity),
		...overrides,
	};
}
