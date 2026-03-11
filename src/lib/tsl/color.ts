/**
 * TSL Color — Reusable color manipulation functions as TSL Fn() nodes.
 *
 * cosinePalette: IQ's classic a + b * cos(2π(c*t + d)) technique.
 * @see https://iquilezles.org/articles/palettes/
 */

import { Fn } from "three/tsl";
import type { Node } from "three/webgpu";

export const cosinePalette = Fn(
	([t, a, b, c, d]: [Node, Node, Node, Node, Node]) => {
		return a.add(
			b.mul(
				c
					.mul(t)
					.add(d)
					.mul(Math.PI * 2)
					.cos(),
			),
		);
	},
);
