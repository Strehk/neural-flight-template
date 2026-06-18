// ── Becoming Many — Static TSL Terrain Preview ─────────────────
//
// The first step of the real experience: a single, static terrain surface that
// proves the M0 "material kit" (src/lib/tsl) renders on a world surface. No
// streaming, no flight yet (those are M1/M3) — the terrain is baked once on the
// CPU so its normals are correct, and every *look* comes from TSL nodes:
//
//   - `depthBands`  → the quantized "papercut" banding (the dark-sense cue)
//   - `viewReveal`  → the per-mode view-radius bubble (world fades into the void)
//   - `distanceFog` → biome-tintable haze
//   - `fresnelEdge` → grazing-angle rim glow
//
// All four are driven by `uniform()` nodes so the Settings sidebar steers them
// live (settings.ts) with no shader rebuild. The compute-swarm reference lives
// in swarm-scene.ts.
//
// IMPORTANT — see AGENTS.md "WebGPU + TSL": classes come from `three/webgpu`,
// node functions from `three/tsl`. Never import core classes from plain `three`.

import { cameraPosition, color, mix, positionWorld, uniform } from "three/tsl";
import * as THREE from "three/webgpu";
import { MeshStandardNodeMaterial } from "three/webgpu";
import { depthBands, distanceFog, fresnelEdge, viewReveal } from "$lib/tsl";
import type { ExperienceState, SetupContext, TickContext } from "../types";

// ── Palette ────────────────────────────────────────────────────
// FOG matches manifest.scene.background so the reveal cutoff reads as the world
// dissolving into the void rather than a visible edge.
const NEAR_BAND = 0x9fb8d0; // close terrain — cool, light
const FAR_BAND = 0x222f44; // distant terrain — dark
const FOG_COLOR = 0x0a0a14; // == manifest background
const RIM_COLOR = 0x6fa8ff; // fresnel edge glow

// Half-extent of the (square) terrain patch, in metres. Big enough that the
// default view radius never reaches the edge.
const PATCH = 350;
const SEGMENTS = 200;

// Camera vantage for the desktop preview (overridden by the headset pose in XR).
const EYE_HEIGHT = 22;
const LOOK_DOWN = -0.32; // radians of downward pitch

type Uniform = ReturnType<typeof uniform>;

export interface BecomingManyState extends ExperienceState {
	camera: THREE.PerspectiveCamera;
	terrain: THREE.Mesh;
	geometry: THREE.PlaneGeometry;
	material: MeshStandardNodeMaterial;
	uniforms: {
		depthLevels: Uniform;
		viewRadius: Uniform;
		revealSoftness: Uniform;
		fogNear: Uniform;
		fogFar: Uniform;
		rimPower: Uniform;
		rimStrength: Uniform;
	};
	/** Auto-orbit heading for the preview camera (radians). */
	yaw: number;
}

// Deterministic rolling-hills height field (planar coords → metres). A handful of
// layered sines — cheap, seed-free, and good enough to show relief under the kit.
function terrainHeight(x: number, y: number): number {
	let h = 8.0 * Math.sin(x * 0.045) * Math.cos(y * 0.05);
	h += 3.2 * Math.sin(x * 0.12 + 1.3) * Math.cos(y * 0.1 - 0.7);
	h += 1.6 * Math.sin(x * 0.27 - 2.1) * Math.cos(y * 0.31 + 0.4);
	h += 0.8 * Math.sin((x + y) * 0.05);
	return h;
}

export async function setup(ctx: SetupContext): Promise<BecomingManyState> {
	// ── Geometry: bake the height field on the CPU, then lay the patch flat ──
	// PlaneGeometry sits in the XY plane (z = 0); we displace z by the height
	// field, recompute normals (so lighting + fresnel are correct), then rotate
	// the mesh so +z becomes world-up.
	const geometry = new THREE.PlaneGeometry(
		PATCH * 2,
		PATCH * 2,
		SEGMENTS,
		SEGMENTS,
	);
	const pos = geometry.attributes.position;
	for (let i = 0; i < pos.count; i++) {
		pos.setZ(i, terrainHeight(pos.getX(i), pos.getY(i)));
	}
	pos.needsUpdate = true;
	geometry.computeVertexNormals();

	// ── Steerable uniforms (settings.ts mutates .value live) ──
	const uniforms = {
		depthLevels: uniform(6),
		viewRadius: uniform(160),
		revealSoftness: uniform(28),
		fogNear: uniform(30),
		fogFar: uniform(220),
		rimPower: uniform(2.5),
		rimStrength: uniform(0.6),
	};

	// ── Material: every look comes from the kit ──
	const material = new MeshStandardNodeMaterial();
	material.metalness = 0.0;
	material.roughness = 0.95;

	// Normalized camera distance → quantized bands → near/far tint.
	const camDist = cameraPosition.distance(positionWorld);
	const tNorm = camDist.div(uniforms.viewRadius).clamp(0, 1);
	const banded = depthBands(tNorm, uniforms.depthLevels);
	const albedo = mix(color(NEAR_BAND), color(FAR_BAND), banded);

	// Haze, then the hard-ish view-radius bubble — both fade to the void colour.
	const fogged = distanceFog(
		albedo,
		color(FOG_COLOR),
		uniforms.fogNear,
		uniforms.fogFar,
	);
	const reveal = viewReveal(uniforms.viewRadius, uniforms.revealSoftness);
	material.colorNode = mix(color(FOG_COLOR), fogged, reveal);

	// Grazing-angle rim, gated by the reveal so it never glows in the void.
	const rim = fresnelEdge(uniforms.rimPower).mul(uniforms.rimStrength).mul(reveal);
	material.emissiveNode = color(RIM_COLOR).mul(rim);

	const terrain = new THREE.Mesh(geometry, material);
	terrain.rotation.x = -Math.PI / 2; // XY patch → XZ ground, +z → +y up
	ctx.scene.add(terrain);

	// Elevated vantage looking out over the relief (desktop preview framing).
	ctx.camera.position.set(0, EYE_HEIGHT, 0);
	ctx.camera.rotation.set(LOOK_DOWN, 0, 0);

	return { camera: ctx.camera, terrain, geometry, material, uniforms, yaw: 0 };
}

export function tick(
	state: ExperienceState,
	ctx: TickContext,
): { state: ExperienceState } {
	const s = state as BecomingManyState;

	// Slow auto-orbit so the radial bands + reveal edge are visible in motion.
	// Preview-only framing — in XR the headset pose drives the camera instead.
	s.yaw += ctx.delta * 0.12;
	s.camera.rotation.set(LOOK_DOWN, s.yaw, 0);

	return { state: s };
}

export function dispose(state: ExperienceState, scene: THREE.Scene): void {
	const s = state as BecomingManyState;
	scene.remove(s.terrain);
	s.geometry.dispose();
	s.material.dispose();
}
