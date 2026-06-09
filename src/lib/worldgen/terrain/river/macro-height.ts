/**
 * Macro routing height — the smooth elevation surface the river network
 * routes water over.
 *
 * It MUST NOT depend on the rivers themselves (that would be circular): the
 * rivers route on `macroHeight`, and the terrain carve then lowers the
 * ground to match. To keep water surfaces tracking the real ground — so
 * rivers sit in actual valleys and banks contain the water (no "Wasserteppich",
 * no floating pools) — this reproduces the *real* terrain shape via the shared
 * `composeRelief`, dropping only the high-frequency `detail` term (which would
 * otherwise add spurious local minima to the routing graph).
 *
 * Pure + deterministic for a given (noise, x, z): this is what makes rivers
 * consistent across chunk and region borders.
 */

import type { NoiseStack } from "$lib/three/world/NoiseStack";
import { sampleBiome } from "../biome-sampler";
import { composeRelief } from "../height-sampler";
import type { TerrainBiomeId } from "../biome-types";

export interface MacroSample {
	/** Routing elevation in world units (real terrain minus detail). */
	height: number;
	/** Remapped moisture [0,1] at this point (drives rainfall / source bias). */
	moisture: number;
	/** Remapped temperature [0,1] (low + high elevation ⇒ snow-fed springs). */
	temperature: number;
}

/**
 * Sample the macro routing surface: the shared relief composition (real
 * terrain minus the detail term), plus the biome climate signals used for
 * rainfall and source biasing.
 */
export function sampleMacro(
	noise: NoiseStack,
	x: number,
	z: number,
	biomeScale: number,
	mountainHeight: number,
	biomeMultipliers?: Partial<Record<TerrainBiomeId, number>>,
): MacroSample {
	const biome = sampleBiome(x, z, noise, biomeScale, null, biomeMultipliers);
	const relief = composeRelief(biome, noise, biomeScale, mountainHeight);
	return {
		height: relief.reliefHeight,
		moisture: biome.moisture,
		temperature: biome.temperature,
	};
}

/** Convenience: routing elevation only. */
export function macroHeight(
	noise: NoiseStack,
	x: number,
	z: number,
	biomeScale: number,
	mountainHeight: number,
	biomeMultipliers?: Partial<Record<TerrainBiomeId, number>>,
): number {
	return sampleMacro(noise, x, z, biomeScale, mountainHeight, biomeMultipliers).height;
}
