import { createNoise2D } from "simplex-noise";
import { seededRandom } from "./random";
import type {
	BaseWorldSample,
	BiomeId,
	WorldMap,
	WorldMapCell,
	WorldPreset,
	WorldSample,
} from "./types";

type Noise2D = (x: number, y: number) => number;

const BIOME_COLORS: Record<BiomeId, string> = {
	meadow: "#7fa35a",
	forest: "#245c3e",
	"fungal-grove": "#7f5aa0",
	"dry-steppe": "#a28d55",
	rock: "#77716b",
	alpine: "#b6c1bc",
};

export function colorForBiome(biome: BiomeId): string {
	return BIOME_COLORS[biome];
}

function clamp01(value: number): number {
	return Math.min(1, Math.max(0, value));
}

function smootherstep(value: number): number {
	const x = clamp01(value);
	return x * x * x * (x * (x * 6 - 15) + 10);
}

function smooth01(value: number): number {
	const x = clamp01(value);
	return x * x * (3 - 2 * x);
}

function hashName(name: string): number {
	let hash = 2166136261;
	for (let i = 0; i < name.length; i++) {
		hash ^= name.charCodeAt(i);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}

function makeNoise(seed: number, name: string): Noise2D {
	let offset = 0;
	const streamSeed = seed + hashName(name);
	return createNoise2D(() => seededRandom(streamSeed + offset++ * 31));
}

function fbm(
	noise: Noise2D,
	x: number,
	z: number,
	octaves: number,
	lacunarity: number,
	gain: number,
): number {
	let value = 0;
	let amplitude = 1;
	let frequency = 1;
	let totalAmplitude = 0;

	for (let i = 0; i < octaves; i++) {
		value += noise(x * frequency, z * frequency) * amplitude;
		totalAmplitude += amplitude;
		amplitude *= gain;
		frequency *= lacunarity;
	}

	return totalAmplitude > 0 ? value / totalAmplitude : 0;
}

interface SamplerNoise {
	continent: Noise2D;
	ridges: Noise2D;
	basins: Noise2D;
	detail: Noise2D;
	temperature: Noise2D;
	moisture: Noise2D;
	rainfall: Noise2D;
	vegetation: Noise2D;
}

function createNoises(seed: number): SamplerNoise {
	return {
		continent: makeNoise(seed, "continent"),
		ridges: makeNoise(seed, "ridges"),
		basins: makeNoise(seed, "basins"),
		detail: makeNoise(seed, "detail"),
		temperature: makeNoise(seed, "temperature"),
		moisture: makeNoise(seed, "moisture"),
		rainfall: makeNoise(seed, "rainfall"),
		vegetation: makeNoise(seed, "vegetation"),
	};
}

export function createBaseWorldSampler(
	preset: WorldPreset,
): (x: number, z: number) => BaseWorldSample {
	const noise = createNoises(preset.seed);

	return (x: number, z: number): BaseWorldSample => {
		const terrainScale = 0.0025 * preset.terrain.continentScale;
		const continent = fbm(noise.continent, x * terrainScale, z * terrainScale, 5, 2, 0.54);
		const ridges = 1 - Math.abs(fbm(noise.ridges, x * terrainScale * 2.2, z * terrainScale * 2.2, 4, 2.1, 0.52));
		const basins = smootherstep(fbm(noise.basins, x * terrainScale * 0.82, z * terrainScale * 0.82, 3, 2, 0.5) * 0.5 + 0.5);
		const detail = fbm(noise.detail, x * terrainScale * 7.5, z * terrainScale * 7.5, 3, 2.35, 0.45);

		const normalizedHeight = clamp01(
			0.48 +
				continent * 0.31 +
				ridges * preset.terrain.ridgeStrength * 0.34 -
				basins * preset.terrain.basinDepth * 0.28 +
				detail * preset.terrain.detailAmplitude * 0.18,
		);
		const height = (normalizedHeight - preset.terrain.waterLevel) * preset.terrain.heightScale;

		const temperatureNoise = fbm(noise.temperature, x * 0.002, z * 0.002, 3, 2.05, 0.55) * 0.5 + 0.5;
		const moistureNoise = fbm(noise.moisture, x * 0.0024, z * 0.0024, 4, 2.1, 0.52) * 0.5 + 0.5;
		const rainfallNoise = fbm(noise.rainfall, x * 0.0018, z * 0.0018, 4, 2, 0.56) * 0.5 + 0.5;
		const vegetationNoise = fbm(noise.vegetation, x * 0.006, z * 0.006, 3, 2.2, 0.5) * 0.5 + 0.5;
		const slope = clamp01(Math.abs(detail) * 0.45 + Math.max(0, ridges - preset.terrain.cliffThreshold) * 2.2);
		const temperature = clamp01(
			preset.climate.temperatureBias * 0.68 +
				temperatureNoise * 0.42 -
				normalizedHeight * preset.climate.altitudeCooling,
		);
		const moisture = clamp01(preset.climate.moistureBias * 0.55 + moistureNoise * 0.45);
		const rainfall = clamp01(preset.climate.rainfallAmount * 0.58 + rainfallNoise * 0.42);
		const clearing = smootherstep(vegetationNoise) * preset.vegetation.clearingAmount;
		const vegetationDensity = clamp01(
			(moisture * 0.55 + rainfall * 0.35 + vegetationNoise * 0.25) *
				preset.vegetation.density -
				clearing,
		);

		return {
			x,
			z,
			normalizedHeight,
			height,
			slope,
			temperature,
			moisture,
			rainfall,
			vegetationDensity,
		};
	};
}

function chooseBiome(sample: BaseWorldSample, preset: WorldPreset): BiomeId {
	const softness = preset.biomes.transitionSoftness;
	const highland = smootherstep((sample.normalizedHeight - 0.58 + softness * 0.18) / 0.34);
	const dry = 1 - sample.moisture;
	const wet = sample.moisture;
	const warm = sample.temperature;
	const cool = 1 - sample.temperature;
	const flat = 1 - sample.slope;

	const fw  = preset.biomes.forestWeight;
	const ds  = preset.biomes.drySteppeWeight;
	const alp = preset.biomes.alpineWeight;
	const rr  = preset.vegetation.rockRatio;

	const scores: Array<{ biome: BiomeId; score: number }> = [
		{ biome: "forest",     score: fw  * (wet * warm * flat            + fw  * 0.65) },
		{ biome: "dry-steppe", score: ds  * (dry * warm * flat            + ds  * 0.65) },
		{ biome: "alpine",     score: alp * (highland * cool              + alp * 0.65) },
		{ biome: "rock",       score: rr  * (sample.slope * 1.2 + highland * 0.35 + rr * 0.5) },
		{ biome: "meadow",     score: flat * (0.12 + (1 - Math.abs(sample.moisture - 0.48)) * 0.22) },
	];

	let best = scores[0];
	for (const score of scores) {
		if (score.score > best.score) best = score;
	}
	return best.biome;
}

export function buildWorldMap(
	preset: WorldPreset,
	size: number,
	worldSpan: number,
	centerX = 0,
	centerZ = 0,
): WorldMap {
	const sampleBase = createBaseWorldSampler(preset);
	const half = worldSpan / 2;
	const step = worldSpan / Math.max(1, size - 1);

	const cells: WorldMapCell[] = [];
	const biomeCounts = new Map<BiomeId, number>();
	let moistureTotal = 0;

	for (let z = 0; z < size; z++) {
		for (let x = 0; x < size; x++) {
			const index = z * size + x;
			const base = sampleBase(centerX + x * step - half, centerZ + z * step - half);
			const biome = chooseBiome(base, preset);
			const cell: WorldMapCell = {
				...base,
				index,
				gridX: x,
				gridZ: z,
				biome,
			};
			cells.push(cell);
			biomeCounts.set(biome, (biomeCounts.get(biome) ?? 0) + 1);
			moistureTotal += base.moisture;
		}
	}

	let dominantBiome: BiomeId = "meadow";
	let dominantCount = 0;
	for (const [biome, count] of biomeCounts.entries()) {
		if (count > dominantCount) {
			dominantBiome = biome;
			dominantCount = count;
		}
	}

	return {
		size,
		worldSpan,
		cells,
		stats: {
			dominantBiome,
			averageMoisture: moistureTotal / cells.length,
		},
	};
}

export function sampleWorld(preset: WorldPreset, x: number, z: number): WorldSample {
	const base = createBaseWorldSampler(preset)(x, z);
	const biome = chooseBiome(base, preset);
	return { ...base, biome };
}
