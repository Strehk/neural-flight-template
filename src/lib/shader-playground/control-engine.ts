/**
 * Control Engine — CPU-side control output computation (normalized 0–1).
 *
 * All control outputs are normalized to [0, 1] so modulation scales
 * uniformly across different target parameter ranges.
 *
 * LFO shape morphing: 0=Sine, 1=Triangle, 2=Square, 3=Random (S&H)
 */

import type { RackModuleInstance } from "./modules/types";

const TWO_PI = Math.PI * 2;

function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * Math.max(0, Math.min(1, t));
}

function hashRandom(seed: number): number {
	return (((Math.sin(seed * 12.9898) * 43758.5453) % 1) + 1) % 1;
}

/** Compute the normalized (0–1) scalar output of a control module. */
export function computeControlOutput(
	mod: RackModuleInstance,
	time: number,
): number {
	switch (mod.type) {
		case "slider":
			return mod.params.value ?? 0;
		case "lfo": {
			const rate = mod.params.rate ?? 1;
			const shape = mod.params.shape ?? 0;
			const phase = (time * rate) % 1;

			const sine = 0.5 + 0.5 * Math.sin(time * rate * TWO_PI);
			const tri = 1 - Math.abs(2 * phase - 1);
			const square = phase < 0.5 ? 0 : 1;
			const random = hashRandom(Math.floor(time * rate));

			let v = lerp(sine, tri, shape);
			v = lerp(v, square, shape - 1);
			v = lerp(v, random, shape - 2);
			return v;
		}
		case "xy":
			return mod.params.x ?? 0;
		case "noise":
			return 0.5;
		default:
			return 0;
	}
}
