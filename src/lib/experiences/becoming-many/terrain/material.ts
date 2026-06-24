// ── Becoming Many — Shared Terrain Material ────────────────────
//
// One MeshStandardNodeMaterial reused by every streamed chunk. It reads each
// chunk's GPU-computed vertex data through named storage attributes
// (positionNode/normalNode → attribute(...)), and derives its *look* from the
// shared sense uniforms exactly like the M1 static terrain did — so a single
// sense transition restyles the whole world at once, and one material instance
// serves all chunks (the per-chunk data lives on each chunk's geometry).
//
// This is the M1 sense node-graph (depthBands + distanceFog + viewReveal +
// fresnelEdge over the sense uniforms), lifted out of scene.ts and given GPU
// position/normal inputs.
//
// IMPORTANT — see AGENTS.md "WebGPU + TSL": node fns from `three/tsl`, classes
// from `three/webgpu`.

import { attribute, cameraPosition, mix, positionWorld, uniform } from "three/tsl";
import * as THREE from "three/webgpu";
import { MeshStandardNodeMaterial, type Node } from "three/webgpu";
import { depthBands, distanceFog, fresnelEdge, viewReveal } from "$lib/tsl";

/** Storage-attribute names the chunk compute kernel writes and this material reads. */
export const STORAGE_POSITION = "storagePosition";
export const STORAGE_NORMAL = "storageNormal";

/**
 * The kit/sense uniforms as live TSL `uniform()` nodes. Defined as a factory so
 * the inferred return type (`KitUniforms`) keeps the node math methods — typing
 * the object as the structural `SenseUniforms` ({value} only) would mask them and
 * break the material graph. The nodes still satisfy `SenseUniforms` structurally
 * (they have `.value`), so the SenseManager can lerp them.
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
 * Build the shared terrain material. `uTime` is the clock uniform node (for the
 * rim "breath"); `u` are the live sense uniforms the SenseManager lerps.
 */
export function createTerrainMaterial(
	u: KitUniforms,
	uTime: Node,
): MeshStandardNodeMaterial {
	const material = new MeshStandardNodeMaterial();
	material.metalness = 0.0;
	material.roughness = 0.95;
	// Chunk winding follows PlaneGeometry; double-side avoids culling the ground
	// when its base winding faces away after the GPU displacement.
	material.side = THREE.DoubleSide;

	// Vertex data straight from the chunk's GPU storage buffers.
	material.positionNode = attribute(STORAGE_POSITION);
	material.normalNode = attribute(STORAGE_NORMAL);

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
