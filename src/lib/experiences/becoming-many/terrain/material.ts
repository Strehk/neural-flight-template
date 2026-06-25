// ── Becoming Many — Shared Terrain Material ────────────────────
//
// One MeshStandardNodeMaterial reused by every streamed chunk. Chunk geometry is
// built on the CPU in a worker (plain position + normal attributes), so this
// material needs no vertex overrides — it just derives its *look* from the
// shared sense uniforms (depthBands + distanceFog + viewReveal + fresnelEdge,
// the M1 node-graph). One sense transition restyles the whole world at once.
//
// IMPORTANT — see AGENTS.md "WebGPU + TSL": node fns from `three/tsl`, classes
// from `three/webgpu`.

import { cameraPosition, mix, positionWorld, uniform } from "three/tsl";
import * as THREE from "three/webgpu";
import { MeshStandardNodeMaterial, type Node } from "three/webgpu";
import { depthBands, distanceFog, fresnelEdge, viewReveal } from "$lib/tsl";

/**
 * The kit/sense uniforms as live TSL `uniform()` nodes. A factory so the inferred
 * return type (`KitUniforms`) keeps the node math methods — typing it as the
 * structural `SenseUniforms` ({value} only) would mask them. The nodes still
 * satisfy `SenseUniforms` structurally, so the SenseManager can lerp them.
 */
export function createSenseUniforms() {
	return {
		viewRadius: uniform(160),
		revealSoftness: uniform(28),
		depthLevels: uniform(6),
		fogNear: uniform(30),
		fogFar: uniform(220),
		rimPower: uniform(2.5),
		rimStrength: uniform(0.6),
		colorNear: uniform(new THREE.Color(0x8fa86a)),
		colorFar: uniform(new THREE.Color(0x6a7a88)),
		fogColor: uniform(new THREE.Color(0x0a0a14)),
		rimColor: uniform(new THREE.Color(0x9fc0ff)),
	};
}

export type KitUniforms = ReturnType<typeof createSenseUniforms>;

/**
 * Build the shared terrain material. `uTime` is the clock uniform node (rim
 * "breath"); `u` are the live sense uniforms the SenseManager lerps.
 */
export function createTerrainMaterial(
	u: KitUniforms,
	uTime: Node,
): MeshStandardNodeMaterial {
	const material = new MeshStandardNodeMaterial();
	material.metalness = 0.0;
	material.roughness = 0.95;
	// Chunk index winding follows PlaneGeometry; double-side avoids culling the
	// ground when its base winding faces away.
	material.side = THREE.DoubleSide;

	// ── The sense look (world-space, so it works per-chunk unchanged) ──
	const camDist = cameraPosition.distance(positionWorld);
	const tNorm = camDist.div(u.viewRadius).clamp(0, 1);
	const banded = depthBands(tNorm, u.depthLevels);
	const albedo = mix(u.colorNear, u.colorFar, banded);

	const fogged = distanceFog(albedo, u.fogColor, u.fogNear, u.fogFar);
	const reveal = viewReveal(u.viewRadius, u.revealSoftness);
	material.colorNode = mix(u.fogColor, fogged, reveal);

	const breath = uTime.mul(0.8).sin().mul(0.15).add(0.85); // 0.7 … 1.0
	const rim = fresnelEdge(u.rimPower)
		.mul(u.rimStrength)
		.mul(reveal)
		.mul(breath);
	material.emissiveNode = u.rimColor.mul(rim);

	return material;
}
