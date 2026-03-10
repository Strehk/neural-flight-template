/**
 * TSL Helpers — Reusable node functions for shader modules.
 *
 * Cosine Palette: IQ's classic color ramp technique as native TSL Fn().
 * Noise: Re-exports Three.js built-in triNoise3D.
 */

import type { Node } from "three/webgpu";
import { Fn } from "three/tsl";
export { triNoise3D } from "three/tsl";

/** Cosine Palette — a + b * cos(2π(c*t + d)) */
export const cosinePalette = Fn(
	([t, a, b, c, d]: [Node, Node, Node, Node, Node]) => {
		return a.add(b.mul(c.mul(t).add(d).mul(Math.PI * 2).cos()));
	},
);
