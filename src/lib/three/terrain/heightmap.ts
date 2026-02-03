import { createNoise2D } from "simplex-noise";
import { TERRAIN } from "$lib/config/flight";

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
