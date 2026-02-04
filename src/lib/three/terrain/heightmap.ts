import { createNoise2D } from "simplex-noise";
import { TERRAIN, runtimeConfig } from "$lib/config/flight";

export interface HeightmapConfig {
	/** Number of noise octaves layered together. */
	octaves: number;
	/** Maximum terrain height in world units. */
	amplitude: number;
	/** Base frequency — lower = wider hills. */
	frequency: number;
	/** How much each octave shrinks in amplitude (0–1). */
	persistence: number;
}

/** Get current heightmap config with dynamic amplitude/frequency from runtimeConfig. */
export function getHeightmapConfig(): HeightmapConfig {
	return {
		octaves: TERRAIN.NOISE.octaves,
		amplitude: runtimeConfig.terrainAmplitude,
		frequency: runtimeConfig.terrainFrequency,
		persistence: TERRAIN.NOISE.persistence,
	};
}

/** @deprecated Use getHeightmapConfig() for dynamic values */
export const DEFAULT_HEIGHTMAP: HeightmapConfig = { ...TERRAIN.NOISE };

const noise2D = createNoise2D();

/** Sample terrain height at world coordinates (x, z) using fractal Brownian motion. */
export function getHeight(
	x: number,
	z: number,
	config: HeightmapConfig,
): number {
	let value = 0;
	let amp = config.amplitude;
	let freq = config.frequency;

	for (let i = 0; i < config.octaves; i++) {
		value += noise2D(x * freq, z * freq) * amp;
		amp *= config.persistence;
		freq *= 2;
	}

	return value;
}
