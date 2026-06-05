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
	"deep-water": "#102a56",
	lake: "#1c6d8f",
	river: "#30a4c6",
	wetland: "#4f7d54",
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
		const height = (normalizedHeight - preset.hydrology.waterLevel) * preset.terrain.heightScale;

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

function chooseBiome(
	sample: BaseWorldSample,
	waterDepth: number,
	isRiver: boolean,
	isLake: boolean,
	preset: WorldPreset,
): BiomeId {
	if (waterDepth > 0.18 && sample.normalizedHeight < preset.hydrology.waterLevel - 0.08) return "deep-water";
	if (isRiver) return "river";
	if (isLake) return "lake";
	// Actual standing water → always wetland regardless of weights.
	if (waterDepth > 0.02) return "wetland";

	const softness = preset.biomes.transitionSoftness;
	const highland = smootherstep((sample.normalizedHeight - 0.58 + softness * 0.18) / 0.34);
	const dry = 1 - sample.moisture;
	const wet = sample.moisture;
	const warm = sample.temperature;
	const cool = 1 - sample.temperature;
	const flat = 1 - sample.slope;

	const fw  = preset.biomes.forestWeight;
	const ww  = preset.biomes.wetlandWeight;
	const ds  = preset.biomes.drySteppeWeight;
	const alp = preset.biomes.alpineWeight;
	const rr  = preset.vegetation.rockRatio;

	// Weight-squared bonus: at weight=1 the bonus alone (0.65) exceeds the
	// meadow ceiling (~0.35), so the biome wins everywhere when at max.
	// At weight=0 the score is exactly 0, so the biome never appears.
	const scores: Array<{ biome: BiomeId; score: number }> = [
		{ biome: "forest",     score: fw  * (wet * warm * flat            + fw  * 0.65) },
		{ biome: "wetland",    score: ww  * (wet * flat * (1 - sample.normalizedHeight) + ww  * 0.65) },
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

function neighborIndices(index: number, size: number): number[] {
	const x = index % size;
	const z = Math.floor(index / size);
	const result: number[] = [];
	for (let dz = -1; dz <= 1; dz++) {
		for (let dx = -1; dx <= 1; dx++) {
			if (dx === 0 && dz === 0) continue;
			const nx = x + dx;
			const nz = z + dz;
			if (nx < 0 || nz < 0 || nx >= size || nz >= size) continue;
			result.push(nz * size + nx);
		}
	}
	return result;
}

function distanceSq(a: BaseWorldSample, b: BaseWorldSample): number {
	const dx = a.x - b.x;
	const dz = a.z - b.z;
	return dx * dx + dz * dz;
}

function selectRiverSources(
	cells: BaseWorldSample[],
	candidates: Array<{ index: number; score: number }>,
	requestedCount: number,
	size: number,
	worldSpan: number,
): number[] {
	const selected: number[] = [];
	const targetCount = Math.max(0, Math.round(requestedCount));
	if (targetCount === 0) return selected;

	const cellSpacing = worldSpan / Math.max(1, size - 1);
	const minDistance = Math.max(cellSpacing * 9, worldSpan / Math.max(4, targetCount * 1.35));
	const minDistanceSq = minDistance * minDistance;

	for (const candidate of candidates) {
		if (candidate.score <= 0) continue;
		const source = cells[candidate.index];
		const tooClose = selected.some((index) => distanceSq(source, cells[index]) < minDistanceSq);
		if (tooClose) continue;
		selected.push(candidate.index);
		if (selected.length >= targetCount) break;
	}

	return selected;
}

interface LakeSystem {
	lakeMask: Uint8Array;
	lakeDepth: Float32Array;
	targetMask: Uint8Array;
}

function selectLakeSystems(
	cells: BaseWorldSample[],
	preset: WorldPreset,
	size: number,
	worldSpan: number,
): LakeSystem {
	const lakeMask = new Uint8Array(cells.length);
	const lakeDepth = new Float32Array(cells.length);
	const targetMask = new Uint8Array(cells.length);
	const cellSpacing = worldSpan / Math.max(1, size - 1);
	const candidates: Array<{ index: number; score: number }> = [];
	const lakeCount = Math.max(1, Math.min(5, Math.round(preset.hydrology.riverSourceCount / 3)));

	for (let index = 0; index < cells.length; index++) {
		const cell = cells[index];
		const lowland = smootherstep((preset.hydrology.waterLevel + 0.18 - cell.normalizedHeight) / 0.28);
		const flat = 1 - cell.slope;
		const score =
			lowland *
			flat *
			(0.35 + cell.moisture * 0.4 + cell.rainfall * 0.25) *
			(1 - Math.abs(cell.temperature - 0.48) * 0.2);
		candidates.push({ index, score });
	}

	candidates.sort((a, b) => b.score - a.score);
	const centers: number[] = [];
	const minDistance = Math.max(cellSpacing * 12, worldSpan / Math.max(3, lakeCount + 1));
	const minDistanceSq = minDistance * minDistance;

	for (const candidate of candidates) {
		if (candidate.score <= 0.08) continue;
		const center = cells[candidate.index];
		const tooClose = centers.some((index) => distanceSq(center, cells[index]) < minDistanceSq);
		if (tooClose) continue;
		centers.push(candidate.index);
		if (centers.length >= lakeCount) break;
	}

	if (centers.length === 0 && candidates[0]) {
		centers.push(candidates[0].index);
	}

	for (const centerIndex of centers) {
		const center = cells[centerIndex];
		const radius = cellSpacing * (4.5 + preset.hydrology.riverWidth * 0.28);
		const radiusSq = radius * radius;
		const lakeLevel = Math.min(
			preset.hydrology.waterLevel + 0.08,
			center.normalizedHeight + 0.055 + preset.hydrology.lakeThreshold * 0.004,
		);

		for (let index = 0; index < cells.length; index++) {
			const cell = cells[index];
			if (distanceSq(center, cell) > radiusSq) continue;
			const localDepth = Math.max(0, lakeLevel - cell.normalizedHeight);
			if (localDepth <= 0) continue;
			lakeMask[index] = 1;
			targetMask[index] = 1;
			lakeDepth[index] = Math.max(lakeDepth[index], Math.min(0.26, localDepth));
		}
	}

	return { lakeMask, lakeDepth, targetMask };
}

interface QueueEntry {
	index: number;
	priority: number;
}

class MinQueue {
	private readonly heap: QueueEntry[] = [];

	get size(): number {
		return this.heap.length;
	}

	push(entry: QueueEntry): void {
		this.heap.push(entry);
		this.bubbleUp(this.heap.length - 1);
	}

	pop(): QueueEntry | null {
		if (this.heap.length === 0) return null;
		const root = this.heap[0];
		const last = this.heap.pop();
		if (last && this.heap.length > 0) {
			this.heap[0] = last;
			this.bubbleDown(0);
		}
		return root;
	}

	private bubbleUp(index: number): void {
		let current = index;
		while (current > 0) {
			const parent = Math.floor((current - 1) / 2);
			if (this.heap[parent].priority <= this.heap[current].priority) break;
			[this.heap[parent], this.heap[current]] = [this.heap[current], this.heap[parent]];
			current = parent;
		}
	}

	private bubbleDown(index: number): void {
		let current = index;
		while (true) {
			const left = current * 2 + 1;
			const right = left + 1;
			let smallest = current;
			if (left < this.heap.length && this.heap[left].priority < this.heap[smallest].priority) {
				smallest = left;
			}
			if (right < this.heap.length && this.heap[right].priority < this.heap[smallest].priority) {
				smallest = right;
			}
			if (smallest === current) break;
			[this.heap[current], this.heap[smallest]] = [this.heap[smallest], this.heap[current]];
			current = smallest;
		}
	}
}

function moveDistance(a: number, b: number, size: number): number {
	const ax = a % size;
	const az = Math.floor(a / size);
	const bx = b % size;
	const bz = Math.floor(b / size);
	return ax !== bx && az !== bz ? 1.414 : 1;
}

function routeStepCost(current: BaseWorldSample, next: BaseWorldSample, distance: number): number {
	const delta = next.normalizedHeight - current.normalizedHeight;
	const uphillPenalty = Math.max(0, delta) * 28;
	const downhillReward = Math.max(0, -delta) * 2.4;
	const wetValleyBias = (next.moisture * 0.45 + next.rainfall * 0.35) * 0.55;
	const slopePenalty = next.slope * 0.55;
	return Math.max(0.08, distance + uphillPenalty + slopePenalty - downhillReward - wetValleyBias);
}

function reconstructPath(previous: Int32Array, sourceIndex: number, outletIndex: number): number[] {
	const reversed: number[] = [];
	let current = outletIndex;
	for (let guard = 0; guard < previous.length; guard++) {
		reversed.push(current);
		if (current === sourceIndex) break;
		current = previous[current];
		if (current < 0) return [];
	}
	return reversed.reverse();
}

function findRiverPath(
	sourceIndex: number,
	cells: BaseWorldSample[],
	size: number,
	targetMask: Uint8Array,
	riverMask: Uint8Array,
): number[] {
	const minLength = Math.max(12, Math.round(size * 0.18));
	const dist = new Float64Array(cells.length);
	const previous = new Int32Array(cells.length);
	const visited = new Uint8Array(cells.length);
	dist.fill(Number.POSITIVE_INFINITY);
	previous.fill(-1);
	dist[sourceIndex] = 0;

	const queue = new MinQueue();
	queue.push({ index: sourceIndex, priority: 0 });
	let fallbackTarget = -1;
	let fallbackScore = Number.POSITIVE_INFINITY;

	while (queue.size > 0) {
		const entry = queue.pop();
		if (!entry || visited[entry.index]) continue;
		visited[entry.index] = 1;
		const path = reconstructPath(previous, sourceIndex, entry.index);
		const pathLength = path.length;
		const canJoinRiver = riverMask[entry.index] === 1 && pathLength >= Math.max(7, minLength * 0.55);
		const canEndInBasin = targetMask[entry.index] === 1 && pathLength >= minLength;

		if (entry.index !== sourceIndex && (canEndInBasin || canJoinRiver)) {
			return path;
		}

		if (targetMask[entry.index] === 1 && pathLength > 4 && entry.priority < fallbackScore) {
			fallbackTarget = entry.index;
			fallbackScore = entry.priority;
		}

		for (const neighbor of neighborIndices(entry.index, size)) {
			if (visited[neighbor]) continue;
			const current = cells[entry.index];
			const next = cells[neighbor];
			const candidate =
				dist[entry.index] + routeStepCost(current, next, moveDistance(entry.index, neighbor, size));
			if (candidate < dist[neighbor]) {
				dist[neighbor] = candidate;
				previous[neighbor] = entry.index;
				const basinBias = targetMask[neighbor] === 1 ? 0.65 : 0;
				const riverBias = riverMask[neighbor] === 1 ? 0.42 : 0;
				queue.push({ index: neighbor, priority: candidate - basinBias - riverBias });
			}
		}
	}

	return fallbackTarget >= 0 ? reconstructPath(previous, sourceIndex, fallbackTarget) : [];
}

function applyRiverPath(
	path: number[],
	springFlow: number,
	cells: BaseWorldSample[],
	flow: Float32Array,
	downstream: Array<number | null>,
	riverPathLength: Uint16Array,
	riverMask: Uint8Array,
	targetMask: Uint8Array,
): void {
	let carriedFlow = springFlow;
	for (let i = 0; i < path.length; i++) {
		const index = path[i];
		const remaining = path.length - i;
		carriedFlow += cells[index].rainfall * cells[index].moisture * 0.2;
		flow[index] += carriedFlow;
		carriedFlow *= 1.012;
		if (targetMask[index] !== 1) {
			riverMask[index] = 1;
		}
		if (targetMask[index] !== 1 && remaining > riverPathLength[index]) {
			riverPathLength[index] = remaining;
			downstream[index] = path[i + 1] ?? null;
		}
	}
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
	const baseCells: BaseWorldSample[] = [];
	const flow = new Float32Array(size * size);
	const downstream: Array<number | null> = [];
	const sourceCandidates: Array<{ index: number; score: number }> = [];

	for (let z = 0; z < size; z++) {
		for (let x = 0; x < size; x++) {
			baseCells.push(sampleBase(centerX + x * step - half, centerZ + z * step - half));
		}
	}

	const { lakeMask, lakeDepth, targetMask } = selectLakeSystems(baseCells, preset, size, worldSpan);
	const riverMask = new Uint8Array(baseCells.length);
	const riverPathLength = new Uint16Array(baseCells.length);

	for (let i = 0; i < baseCells.length; i++) {
		const cell = baseCells[i];
		downstream[i] = null;
		const heightAboveWater = Math.max(0, cell.normalizedHeight - preset.hydrology.waterLevel);
		const highlandScore = smootherstep((heightAboveWater - 0.12) / 0.26);
		const mountainScore = smootherstep((cell.normalizedHeight - 0.58) / 0.24);
		const sourceScore =
			cell.rainfall *
			(0.35 + cell.moisture * 0.65) *
			Math.max(highlandScore, mountainScore * 0.75) *
			(1 - cell.slope * 0.45);
		sourceCandidates.push({ index: i, score: sourceScore });
	}

	sourceCandidates.sort((a, b) => b.score - a.score);
	const sourceIndices = selectRiverSources(
		baseCells,
		sourceCandidates,
		preset.hydrology.riverSourceCount,
		size,
		worldSpan,
	);
	const sourceBoost = new Map<number, number>();
	for (const index of sourceIndices) {
		sourceBoost.set(index, sourceCandidates.find((entry) => entry.index === index)?.score ?? 0);
	}

	for (let i = 0; i < baseCells.length; i++) {
		flow[i] = baseCells[i].rainfall * baseCells[i].moisture * 0.012;
	}

	for (const sourceIndex of sourceIndices) {
		const path = findRiverPath(sourceIndex, baseCells, size, targetMask, riverMask);
		const springFlow = 3.8 + (sourceBoost.get(sourceIndex) ?? 0) * 4.8;
		if (path.length >= Math.max(10, Math.round(size * 0.14))) {
			applyRiverPath(
				path,
				springFlow,
				baseCells,
				flow,
				downstream,
				riverPathLength,
				riverMask,
				targetMask,
			);
		}
	}

	const cells: WorldMapCell[] = [];
	const biomeCounts = new Map<BiomeId, number>();
	let riverCells = 0;
	let lakeCells = 0;
	let waterCells = 0;
	let moistureTotal = 0;
	let flowTotal = 0;

	for (let index = 0; index < baseCells.length; index++) {
		const base = baseCells[index];
		const pathLength = riverPathLength[index];
		const isRiver =
			pathLength > 0 &&
			flow[index] >= preset.hydrology.flowThreshold &&
			base.normalizedHeight > preset.hydrology.waterLevel - 0.04;
		const isLake = lakeMask[index] === 1;
		const baseWaterDepth = Math.max(0, preset.hydrology.waterLevel - base.normalizedHeight);
		const localLakeDepth = isLake ? Math.max(lakeDepth[index], Math.min(0.22, flow[index] * 0.02)) : 0;
		const riverStrength = isRiver
			? clamp01((flow[index] - preset.hydrology.flowThreshold) / (preset.hydrology.flowThreshold * 5))
			: 0;
		const riverWidth = isRiver
			? preset.hydrology.riverWidth *
				(0.6 + riverStrength * 1.55 + Math.min(0.6, pathLength / size))
			: 0;
		const channelDepth = isRiver
			? preset.hydrology.channelCarveStrength *
				preset.terrain.heightScale *
				(0.45 + riverStrength * 1.25)
			: 0;
		const riverDepth = isRiver
			? Math.min(0.16, channelDepth / Math.max(1, preset.terrain.heightScale) + riverWidth * 0.003)
			: 0;
		const waterDepth = Math.max(baseWaterDepth, localLakeDepth, riverDepth);
		const biome = chooseBiome(base, waterDepth, isRiver, isLake, preset);
		const cell: WorldMapCell = {
			...base,
			index,
			gridX: index % size,
			gridZ: Math.floor(index / size),
			downstreamIndex: downstream[index],
			height: base.height - channelDepth,
			waterDepth,
			flow: flow[index],
			riverWidth,
			channelDepth,
			biome,
			isRiver,
			isLake,
		};
		cells.push(cell);
		biomeCounts.set(biome, (biomeCounts.get(biome) ?? 0) + 1);
		if (isRiver) riverCells++;
		if (isLake) lakeCells++;
		if (waterDepth > 0.01) waterCells++;
		moistureTotal += base.moisture;
		flowTotal += flow[index];
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
			riverCells,
			lakeCells,
			waterCells,
			dominantBiome,
			averageMoisture: moistureTotal / cells.length,
			averageFlow: flowTotal / cells.length,
		},
	};
}

export function sampleWorld(preset: WorldPreset, x: number, z: number): WorldSample {
	const base = createBaseWorldSampler(preset)(x, z);
	const waterDepth = Math.max(0, preset.hydrology.waterLevel - base.normalizedHeight);
	const biome = chooseBiome(base, waterDepth, false, waterDepth > 0.08, preset);
	return {
		...base,
		waterDepth,
		flow: 0,
		riverWidth: 0,
		channelDepth: 0,
		biome,
		isRiver: false,
		isLake: waterDepth > 0.08,
	};
}
