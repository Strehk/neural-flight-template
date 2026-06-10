import type { RiverPresetConfig, WorldPreset } from "../types";
import type { TerrainBiomeId } from "./biome-types";
import { BAT_RIVER_DEFAULTS, type RiverConfig } from "./river/river-config";
import {
	BAT_MASTER_SEED,
	BAT_WORLD_CONFIG_DEFAULTS,
	type WorldConfig,
} from "./world-config";

function clamp(v: number, lo: number, hi: number): number {
	return v < lo ? lo : v > hi ? hi : v;
}
function clamp01(v: number): number {
	return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** River knobs that reproduce the engine defaults (each at 0.5). */
export const DEFAULT_RIVER_PRESET: RiverPresetConfig = {
	density: 0.5,
	width: 0.5,
	depth: 0.5,
	lakeSize: 0.5,
	curviness: 0.5,
	amount: 0.5,
};

/**
 * Map the normalised [0,1] river knobs onto the engine RiverConfig by scaling
 * the defaults (each knob at 0.5 ≈ BAT_RIVER_DEFAULTS). Drives both preview
 * and flight.
 */
export function riverPresetToConfig(input?: RiverPresetConfig): RiverConfig {
	const rp = { ...DEFAULT_RIVER_PRESET, ...(input ?? {}) };
	const d = clamp01(rp.density);
	const widthScale = 0.03 + 1.47 * clamp01(rp.width); // ~0 (slider 0) … 1.5×
	const depthScale = 0.4 + 1.1 * clamp01(rp.depth);
	const lakeScale = 0.4 + 1.2 * clamp01(rp.lakeSize);
	const curveScale = 2 * clamp01(rp.curviness); // 0 straight … 2× very curvy
	const am = clamp01(rp.amount);
	const b = BAT_RIVER_DEFAULTS;
	return {
		...b,
		nodeSpacing: clamp(b.nodeSpacing * (1.5 - d), 40, 160),
		minHalfWidth: b.minHalfWidth * widthScale,
		widthPerSqrtQ: b.widthPerSqrtQ * widthScale,
		maxHalfWidth: b.maxHalfWidth * widthScale,
		minBedDepth: b.minBedDepth * depthScale,
		depthPerSqrtQ: b.depthPerSqrtQ * depthScale,
		maxBedDepth: b.maxBedDepth * depthScale,
		lakeRadiusBase: b.lakeRadiusBase * lakeScale,
		lakeRadiusPerSqrtQ: b.lakeRadiusPerSqrtQ * lakeScale,
		lakeMaxRadius: b.lakeMaxRadius * lakeScale,
		maxNudge: b.maxNudge * curveScale,
		nudgeGain: b.nudgeGain * curveScale,
		meanderAmp: b.meanderAmp * curveScale,
		waterMinQ: clamp(b.waterMinQ * (1.6 - am), 1.2, 8),
		carveMinQ: clamp(b.carveMinQ * (1.6 - am), 1.0, 6),
		springThreshold: clamp(b.springThreshold * (1.5 - am), 0.2, 0.9),
	};
}

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
	// Feature size: the preset's "continents" knob maps to the noise frequency.
	// Larger continentScale → lower frequency → bigger landforms.
	const continentScale = preset?.terrain.continentScale ?? 0.72;
	const biomeScale = clamp(
		BAT_WORLD_CONFIG_DEFAULTS.biomeScale * (0.72 / Math.max(0.1, continentScale)),
		BAT_WORLD_CONFIG_DEFAULTS.biomeScale * 0.5,
		BAT_WORLD_CONFIG_DEFAULTS.biomeScale * 2,
	);

	return {
		...BAT_WORLD_CONFIG_DEFAULTS,
		masterSeed: preset?.seed ?? BAT_MASTER_SEED,
		biomeScale,
		river: riverPresetToConfig(preset?.river),
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
