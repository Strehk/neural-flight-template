/**
 * TSL Surface Kit — reusable node helpers for world-surface materials.
 *
 * These are the shared building blocks the Becoming Many senses compose over a
 * single set of materials (see `becoming-many/docs/sinneswandler-spec.md` §4,
 * "one material model, many sense-variants"). Each is a camera-relative effect
 * evaluated in world space, so they slot straight into a `*NodeMaterial`'s
 * `colorNode` / `opacityNode` with no per-frame CPU work.
 *
 * Author note: these read the world-space builtins (`cameraPosition`,
 * `positionWorld`, `normalWorld`), so they only make sense inside a surface
 * material's node graph — not in a compute kernel.
 */

import {
	Fn,
	cameraPosition,
	float,
	mix,
	normalWorld,
	positionWorld,
	smoothstep,
} from "three/tsl";
import type { Node } from "three/webgpu";

/**
 * Fresnel-style edge term — bright at grazing angles, dark face-on.
 *
 * Drives the edge emphasis of infrared (noir shadowing), network (accent lines)
 * and echo (wireframe glow). `power` sharpens the falloff.
 *
 * @param power Exponent node — higher = thinner, crisper rim.
 */
export const fresnelEdge = Fn(([power]: [Node]) => {
	const viewDir = cameraPosition.sub(positionWorld).normalize();
	const facing = normalWorld.dot(viewDir).clamp(0, 1);
	return float(1).sub(facing).pow(power);
});

/**
 * Per-mode view-radius reveal — 1 within `radius`, fading to 0 beyond.
 *
 * This is the "how far you can see" cutoff each sense sets: luft ≈ 0 (whiteout),
 * echo ≈ 120 m, normal ≈ 500 m. Multiply it into opacity / styling so newly
 * revealed geometry fades in at the bubble's edge.
 *
 * @param radius   Reveal radius in metres (scalar node).
 * @param softness Width of the fade band at the edge, in metres (scalar node).
 * @returns        Reveal factor in [0, 1].
 */
export const viewReveal = Fn(([radius, softness]: [Node, Node]) => {
	const dist = cameraPosition.distance(positionWorld);
	return float(1).sub(smoothstep(radius.sub(softness), radius, dist));
});

/**
 * Distance fog — blend `fogColor` into `baseColor` from `near` to `far`.
 *
 * `fogColor` is meant to be a biome-tinted uniform so the haze shifts with the
 * world (spec §4: blend ~0.18 in dark modes, ~0.60 in daylight).
 *
 * @param baseColor Lit surface colour (vec3 node).
 * @param fogColor  Fog/haze colour (vec3 node, typically a `uniform`).
 * @param near      Distance where fog begins (scalar node).
 * @param far       Distance where fog fully saturates (scalar node).
 */
export const distanceFog = Fn(
	([baseColor, fogColor, near, far]: [Node, Node, Node, Node]) => {
		const dist = cameraPosition.distance(positionWorld);
		const f = dist.sub(near).div(far.sub(near)).clamp(0, 1);
		return mix(baseColor, fogColor, f);
	},
);
