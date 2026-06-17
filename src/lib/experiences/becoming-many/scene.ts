import * as THREE from "three";
import { color, mix, sin, time } from "three/tsl";
import { MeshStandardNodeMaterial } from "three/webgpu";
import type { ExperienceState, SetupContext, TickContext } from "../types";

// ── Becoming Many — WebGPU Scaffold ────────────────────────────
//
// This is the GROUND-FLOOR scaffold for a fresh, WebGPU-native rebuild of the
// Sinneswandler experience. Long-term goal: mirror Sinneswandler's perception /
// sense-switching world exactly, but built on three/webgpu + TSL + WebXR from the
// start so performance budgets are respected by construction.
//
// For now it does the minimum needed to PROVE the pipeline runs:
//   - mount a WebGPURenderer scene (handled by the /vr route + loader)
//   - draw one spinning cube whose colour is driven by a TSL node graph
//   - leave clear seams (player.ts / settings.ts) for the real world to grow into
//
// Everything here uses the same ExperienceManifest contract as the WebGL
// experiences — the only difference is `manifest.renderer === "webgpu"`, which
// tells the loader/route to spin up a WebGPURenderer instead of WebGLRenderer.

// ── State ──────────────────────────────────────────────────────
// Held across frames so tick()/settings.ts/dispose() can reach the GPU objects.

export interface BecomingManyState extends ExperienceState {
	camera: THREE.PerspectiveCamera;
	cube: THREE.Mesh;
	geometry: THREE.BoxGeometry;
	material: MeshStandardNodeMaterial;
	/** Radians per second the cube rotates (steered via settings.ts). */
	rotationSpeed: number;
	/** Whether the cube spins at all (steered via settings.ts). */
	spin: boolean;
}

// ── Lifecycle: setup() ─────────────────────────────────────────
// Called once on load. The loader has already applied scene defaults (background,
// fog, ambient + directional light) before we get here, so the standard-lit cube
// is illuminated without us adding lights ourselves.

export async function setup(ctx: SetupContext): Promise<BecomingManyState> {
	// Eye-height camera, pulled back so the cube sits in front of you both on
	// desktop preview and at the VR reference-space origin.
	ctx.camera.position.set(0, 1.6, 3);
	ctx.camera.lookAt(0, 1.6, 0);

	const geometry = new THREE.BoxGeometry(1, 1, 1);

	// TSL node material — this is the "fresh WebGPU" part. The colour is a node
	// graph evaluated on the GPU, oscillating between two hues over time. `time`
	// is a built-in TSL uniform the renderer advances each frame, so no manual
	// per-frame uniform update is needed.
	const material = new MeshStandardNodeMaterial();
	material.metalness = 0.1;
	material.roughness = 0.5;
	const pulse = sin(time).mul(0.5).add(0.5); // 0 → 1
	material.colorNode = mix(color(0x4f9dff), color(0xff5f8f), pulse);

	const cube = new THREE.Mesh(geometry, material);
	cube.position.set(0, 1.6, 0);
	ctx.scene.add(cube);

	return {
		camera: ctx.camera,
		cube,
		geometry,
		material,
		rotationSpeed: 0.6,
		spin: true,
	};
}

// ── Lifecycle: tick() ──────────────────────────────────────────
// Called every frame. The TSL colour animation runs on the GPU on its own; here
// we just advance the CPU-side cube rotation.

export function tick(
	state: ExperienceState,
	ctx: TickContext,
): { state: ExperienceState } {
	const s = state as BecomingManyState;

	if (s.spin) {
		s.cube.rotation.y += s.rotationSpeed * ctx.delta;
		s.cube.rotation.x += s.rotationSpeed * 0.4 * ctx.delta;
	}

	return { state: s };
}

// ── Lifecycle: dispose() ───────────────────────────────────────
// Free every GPU resource we created. NodeMaterials dispose like any other
// THREE.Material. Critical on Quest — see RULES.md "Dispose Requirement".

export function dispose(state: ExperienceState, scene: THREE.Scene): void {
	const s = state as BecomingManyState;
	s.geometry.dispose();
	s.material.dispose();
	scene.remove(s.cube);
}
