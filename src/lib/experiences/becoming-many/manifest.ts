import type { ExperienceManifest, ParameterDef } from "../types";
import { updatePlayer } from "./player";
import { dispose, setup, tick } from "./scene";
import { applySettings } from "./settings";

// ── Parameter Definitions ──────────────────────────────────────
// Appear in the Settings Sidebar (slider/toggle) and the Node Editor (0-1 signal
// remapped to min/max). Kept minimal for the scaffold — the cube's animation.

const parameters: ParameterDef[] = [
	{
		id: "rotationSpeed",
		label: "Rotation Speed",
		group: "Animation",
		min: 0,
		max: 3,
		default: 0.6,
		step: 0.1,
		unit: "rad/s",
		icon: "RotateCw",
	},
	{
		id: "spin",
		label: "Spin",
		group: "Animation",
		type: "boolean",
		min: 0,
		max: 1,
		default: true,
		step: 1,
		icon: "Play",
	},
];

// ── Manifest ───────────────────────────────────────────────────
// The contract between this experience and the platform. The one thing that sets
// it apart from the WebGL experiences is `renderer: "webgpu"` — that flag tells
// the loader/route to create a three/webgpu WebGPURenderer (with WebXR) instead
// of a WebGLRenderer.

export const manifest: ExperienceManifest = {
	// ── Identity ──
	id: "becoming-many",
	name: "Becoming Many",
	description:
		"WebGPU + WebXR scaffold — fresh, performance-first rebuild that will grow into a mirror of Sinneswandler.",
	version: "0.1.0",
	author: "Tade Strehk",

	// ── Renderer ──
	// "webgpu" = three/webgpu WebGPURenderer + TSL. Omit (or "webgl") for the
	// classic WebGLRenderer path used by every other experience.
	renderer: "webgpu",

	// ── I/O Contract ──
	parameters,
	outputs: [],
	// No input interfaces yet — the scaffold has no movement. Flip orientation/
	// speed on once player.ts grows a flight controller.
	interfaces: { orientation: false, speed: false },

	// ── Scene Defaults ──
	// Applied by the loader before setup(): background, fog, ambient + sun light.
	camera: { fov: 70, near: 0.1, far: 100 },
	scene: {
		background: "#0a0a14",
		fogNear: 0, // 0 = no fog
		fogFar: 0,
		fogColor: "#0a0a14",
		ambientIntensity: 0.6,
		sunIntensity: 1.4,
		sunColor: "#ffffff",
		sunPosition: { x: 5, y: 8, z: 4 },
	},
	spawn: { position: { x: 0, y: 1.6, z: 3 } },

	// ── Lifecycle ──
	setup,
	tick,
	applySettings,
	updatePlayer,
	dispose,
};
