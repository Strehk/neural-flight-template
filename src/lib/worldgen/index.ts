export {
	cloneWorldPreset,
	DEFAULT_WORLD_PRESET_ID,
	getBuiltInWorldPreset,
	WORLD_PARAMETER_DEFS,
	WORLD_PRESETS,
} from "./presets";
export {
	getActiveWorldPresetId,
	getWorldPreset,
	listWorldPresets,
	saveCustomWorldPreset,
	setActiveWorldPresetId,
} from "./storage";
export { buildWorldMap, colorForBiome, createBaseWorldSampler, sampleWorld } from "./sampler";
export {
	biomeToLayerId,
	layerIdToBiome,
	WORLDGEN_BIOME_IDS,
	worldMapToLayerBuffers,
	type WorldLayerBuffers,
	type WorldLayerMetadata,
} from "./layers";
export {
	computeDecorationData,
	type ComputeDecorationDataOptions,
	type DecorationBucket,
	type DecorationColorizer,
	type DecorationData,
	type DecorationDataSettings,
	type DecorationName,
	type ForestSectionSampler,
	type RGBLike,
	type WorldDecorationSample,
} from "./vegetation/decoration-data";
export {
	type WorldRegion,
	type WorldRuntimeOptions,
	type WorldRuntimeStats,
} from "./runtime";
export {
	BAT_DERIVED_FIELD_DEFAULTS,
	BAT_MASTER_SEED,
	BAT_NOISE_DEFAULTS,
	BAT_STREAMING_DEFAULTS,
	streamSeed,
	type DerivedFieldConfig,
	type NoiseLayerConfig,
	type NoiseStackConfig,
	type StreamingConfig,
} from "./noise-config";
export { TERRAIN_BIOME_IDS, type TerrainBiomeId } from "./terrain/biome-types";
export {
	BAT_ACOUSTIC_DEFAULTS,
	BAT_BIOME_SCORE_PLACEHOLDER,
	BAT_DECORATION_PLACEHOLDER,
	BAT_ECHO_PROBE_DEFAULTS,
	BAT_HEIGHT_SYNTH_PLACEHOLDER,
	BAT_WORLD_CONFIG_DEFAULTS,
	TERRAIN_WORLD_CONFIG_DEFAULTS,
	TERRAIN_WORLD_DEFAULTS,
	type AcousticConfig,
	type AcousticMaterial,
	type BiomeScoreConfig,
	type BiomeScoreRecipe,
	type BiomeScoreTerm,
	type DecorationConfig,
	type DecorationTypeRecipe,
	type EchoProbeConfig,
	type HeightContributor,
	type HeightSynthConfig,
	type WorldConfig,
} from "./terrain/world-config";
export {
	TerrainSampler,
	type TerrainSample,
	type TerrainSamplerOptions,
} from "./terrain/terrain-sampler";
export type { RiverSegment, RiverSample } from "./terrain/river/RiverNetwork";
export {
	sampleBiome,
	type BiomeContext,
	type BiomeWeights,
} from "./terrain/biome-sampler";
export { sampleHeight, type HeightContext } from "./terrain/height-sampler";
export {
	applyTerrainDayColor,
	applyTerrainEchoColor,
	sampleDerivedFields,
	type DerivedContext,
	type RGBLike as TerrainRGBLike,
	type TerrainDayPalette,
	type TerrainEchoPalette,
} from "./terrain/derived-field-sampler";
export {
	estimateAcousticDensity,
	estimateAcousticRuggedness,
	estimateReflectivity,
	type AcousticReading,
	type EchoMaterial,
} from "./terrain/acoustics";
export {
	DEFAULT_RIVER_PRESET,
	riverPresetToConfig,
	worldPresetToTerrainBiomeMultipliers,
	worldPresetToTerrainConfig,
	type TerrainConfigOverrides,
} from "./terrain/preset-adapter";
export type {
	BaseWorldSample,
	BiomeId,
	BiomeRuleConfig,
	ClimateConfig,
	TerrainGenerationConfig,
	VegetationConfig,
	WorldMap,
	WorldMapCell,
	WorldParameterDef,
	WorldParameterPath,
	WorldPreset,
	WorldSample,
	WorldStreamingConfig,
} from "./types";
