/**
 * TSL Gradient — N-stop gradient interpolation via chained mix/smoothstep.
 *
 * Unrolls at JS build-time into a static node graph (no shader loops).
 * Works with both constant vec3 nodes and uniform nodes.
 */

import { float, mix, smoothstep } from "three/tsl";
import type { Node } from "three/webgpu";

/**
 * Interpolate through N color stops evenly distributed along t ∈ [0, 1].
 *
 * @param colors - Array of TSL vec3 nodes (constants or uniforms)
 * @param t - Scalar node in [0, 1] range (e.g. normalized UV.y)
 */
export function nStopGradient(colors: Node[], t: Node): Node {
	if (colors.length === 0)
		throw new Error("nStopGradient: need at least 1 color");
	if (colors.length === 1) return colors[0];

	const n = colors.length;
	let result = colors[0];

	for (let i = 1; i < n; i++) {
		const start = (i - 1) / (n - 1);
		const end = i / (n - 1);
		result = mix(result, colors[i], smoothstep(float(start), float(end), t));
	}

	return result;
}
