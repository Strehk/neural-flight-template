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

import { fbm, type NoiseStack } from "$lib/three/world/NoiseStack";
import { remapNoise, ridge, saturate } from "$lib/three/world/math";
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

/**
 * Cheap routing-height proxy WITHOUT the biome sampler — used only to probe
 * the local terrain gradient when bending river curves toward lower ground.
 * Accuracy isn't critical here (we only need a direction), so this skips the
 * Voronoi biome pass and approximates the mountain mass from noise. Roughly
 * 6 FBM calls vs. the full `sampleMacro`.
 */
export function routingHeightLite(
	noise: NoiseStack,
	x: number,
	z: number,
	biomeScale: number,
	mountainHeight: number,
): number {
	const scale = biomeScale;
	const warp = noise.warpAmount;
	const wis = scale * 1.7;
	const wx = x + noise.getNoise("warpX")(x * wis, z * wis) * warp;
	const wz = z + noise.getNoise("warpZ")(x * wis, z * wis) * warp;

	const continent = fbm(noise.getNoise("continent"), wx * scale * 0.34, wz * scale * 0.34, 5, 2.0, 0.54);
	const rolling = fbm(noise.getNoise("continent"), wx * scale * 0.86 + 19.0, wz * scale * 0.86 - 11.0, 4, 2.05, 0.52);
	const rugged = Math.pow(
		remapNoise(fbm(noise.getNoise("rugged"), wx * scale * 1.3, wz * scale * 1.3, 4, 2.24, 0.58)),
		1.5,
	);
	const chainNoise = remapNoise(fbm(noise.getNoise("chains"), wx * scale * 0.4, wz * scale * 0.4, 4, 2.06, 0.54));
	const moisture = remapNoise(fbm(noise.getNoise("moisture"), wx * scale * 0.9, wz * scale * 0.9, 4, 2.0, 0.52));
	const highlandSignal = saturate(chainNoise * 0.82 + rugged * 0.78 - moisture * 0.08);
	const ridgePrimary = ridge(fbm(noise.getNoise("ridges"), wx * scale * 1.35, wz * scale * 1.35, 5, 2.2, 0.56)) ** 1.9;
	const mountainMass = saturate(highlandSignal * 1.1);
	return continent * 24 + rolling * 9 + mountainMass * (22 + ridgePrimary * mountainHeight * 0.95);
}
