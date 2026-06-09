/**
 * Generic terrain noise configuration — types and defaults for the
 * 14-layer noise stack, derived-field bands, and chunk streaming.
 *
 * This module is a pure-data layer with no Three.js or experience-specific
 * dependencies. Any experience that wants to drive the terrain sampler can
 * import from here.
 */

// ---------------------------------------------------------------------------
// Master seed + stream seeding
// ---------------------------------------------------------------------------

export const BAT_MASTER_SEED = 0xba75ee_d;

/**
 * Derive a 32-bit unsigned stream seed from the master seed and a stream
 * name. Used for both noise-layer seeding and per-chunk RNG streams.
 * Pure, deterministic, fast.
 */
export function streamSeed(master: number, name: string): number {
	let h = (master ^ 0x811c9dc5) >>> 0;
	for (let i = 0; i < name.length; i++) {
		h ^= name.charCodeAt(i);
		h = Math.imul(h, 0x01000193) >>> 0;
	}
	h ^= h >>> 16;
	h = Math.imul(h, 0x85ebca6b) >>> 0;
	h ^= h >>> 13;
	h = Math.imul(h, 0xc2b2ae35) >>> 0;
	h ^= h >>> 16;
	return h >>> 0;
}

// ---------------------------------------------------------------------------
// Noise stack
// ---------------------------------------------------------------------------

export interface NoiseLayerConfig {
	name: string;
	sourceLayer?: string;
	seed?: number;
	scale: number;
	absolute?: boolean;
	phaseX?: number;
	phaseZ?: number;
	octaves: number;
	lacunarity: number;
	gain: number;
	ridge?: boolean;
	exponent?: number;
	signed?: boolean;
}

export interface NoiseStackConfig {
	warpAmount: number;
	layers: Record<string, NoiseLayerConfig>;
}

export const BAT_NOISE_DEFAULTS: NoiseStackConfig = {
	warpAmount: 52,
	layers: {
		warpX: {
			name: "warpX",
			seed: 11,
			scale: 1.7,
			octaves: 1,
			lacunarity: 2,
			gain: 0.5,
			signed: true,
		},
		warpZ: {
			name: "warpZ",
			seed: 23,
			scale: 1.7,
			octaves: 1,
			lacunarity: 2,
			gain: 0.5,
			signed: true,
		},
		temperature: {
			name: "temperature",
			seed: 41,
			scale: 0.8,
			octaves: 3,
			lacunarity: 2.1,
			gain: 0.55,
		},
		moisture: {
			name: "moisture",
			seed: 59,
			scale: 0.9,
			octaves: 4,
			lacunarity: 2.0,
			gain: 0.52,
		},
		rugged: {
			name: "rugged",
			seed: 71,
			scale: 1.3,
			octaves: 4,
			lacunarity: 2.24,
			gain: 0.58,
			exponent: 1.5,
		},
		continent: {
			name: "continent",
			seed: 83,
			scale: 0.34,
			octaves: 5,
			lacunarity: 2.0,
			gain: 0.54,
			signed: true,
		},
		basins: {
			name: "basins",
			seed: 97,
			scale: 0.52,
			octaves: 4,
			lacunarity: 2.05,
			gain: 0.52,
		},
		chains: {
			name: "chains",
			seed: 113,
			scale: 0.4,
			octaves: 4,
			lacunarity: 2.06,
			gain: 0.54,
		},
		rolling: {
			name: "rolling",
			sourceLayer: "continent",
			scale: 0.86,
			phaseX: 19.0,
			phaseZ: -11.0,
			octaves: 4,
			lacunarity: 2.05,
			gain: 0.52,
			signed: true,
		},
		ridges: {
			name: "ridges",
			seed: 131,
			scale: 1.35,
			octaves: 5,
			lacunarity: 2.2,
			gain: 0.56,
			ridge: true,
			exponent: 3.8,
			signed: true,
		},
		cliffs: {
			name: "cliffs",
			seed: 149,
			scale: 3.25,
			octaves: 4,
			lacunarity: 2.16,
			gain: 0.48,
			ridge: true,
			exponent: 5.4,
			signed: true,
		},
		detail: {
			name: "detail",
			seed: 167,
			scale: 5.4,
			octaves: 3,
			lacunarity: 2.45,
			gain: 0.45,
			signed: true,
		},
		treeCluster: {
			name: "treeCluster",
			seed: 181,
			scale: 2.1,
			octaves: 3,
			lacunarity: 2.08,
			gain: 0.52,
		},
		grassCluster: {
			name: "grassCluster",
			seed: 197,
			scale: 2.5,
			octaves: 3,
			lacunarity: 2.16,
			gain: 0.5,
		},
		rockScatter: {
			name: "rockScatter",
			seed: 211,
			scale: 2.35,
			octaves: 3,
			lacunarity: 2.14,
			gain: 0.52,
		},
		clearing: {
			name: "clearing",
			sourceLayer: "treeCluster",
			scale: 0.0105,
			absolute: true,
			phaseX: 31.7,
			phaseZ: -18.4,
			octaves: 3,
			lacunarity: 2.02,
			gain: 0.52,
		},
	},
};

// ---------------------------------------------------------------------------
// Derived-field elevation bands
// ---------------------------------------------------------------------------

export interface DerivedFieldConfig {
	mountainGrayHeightStart: number;
	mountainGrayHeightEnd: number;
	vegetationHeightStart: number;
	vegetationHeightEnd: number;
	midAltitudeStart: number;
	midAltitudePeak: number;
	alpineHeightStart: number;
	alpineHeightEnd: number;
	clearingScale: number;
}

export const BAT_DERIVED_FIELD_DEFAULTS: DerivedFieldConfig = {
	mountainGrayHeightStart: 14,
	mountainGrayHeightEnd: 86,
	vegetationHeightStart: 8,
	vegetationHeightEnd: 58,
	midAltitudeStart: 22,
	midAltitudePeak: 54,
	alpineHeightStart: 48,
	alpineHeightEnd: 88,
	clearingScale: 0.0105,
};

// ---------------------------------------------------------------------------
// Chunk streaming
// ---------------------------------------------------------------------------

export interface StreamingConfig {
	chunkSize: number;
	terrainSegments: number;
	anchorStepCells: number;
	buildRadius: number;
	keepRadius: number;
	maxBuildsPerFrame: number;
	acousticFieldEnabled: boolean;
	acousticFieldGridStep: number;
}

export const BAT_STREAMING_DEFAULTS: StreamingConfig = {
	chunkSize: 112,
	terrainSegments: 40,
	anchorStepCells: 1,
	buildRadius: 2,
	keepRadius: 3,
	maxBuildsPerFrame: 3,
	acousticFieldEnabled: true,
	acousticFieldGridStep: 4,
};
