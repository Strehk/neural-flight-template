import type { ExperienceManifest, ParameterDef } from "../types";
import { updatePlayer } from "./player";
import { dispose, render, setup, tick } from "./scene";
import { applySettings } from "./settings";

// ── Parameter Definitions ──────────────────────────────────────
// Appear in the Settings Sidebar (slider/toggle) and the Node Editor (0-1 signal
// remapped to min/max). These steer the GPU compute swarm's uniforms live.

const parameters: ParameterDef[] = [
	{
		id: "swarmSpeed",
		label: "Swarm Speed",
		group: "Simulation",
		min: 0,
		max: 3,
		default: 1,
		step: 0.05,
		unit: "×",
		icon: "Gauge",
	},
	{
		id: "turbulence",
		label: "Turbulence",
		group: "Simulation",
		min: 0,
		max: 2,
		default: 0.6,
		step: 0.05,
		icon: "Wind",
	},
	{
		id: "attraction",
		label: "Cohesion",
		group: "Simulation",
		min: 0,
		max: 3,
		default: 1.2,
		step: 0.05,
		icon: "Magnet",
	},
	{
		id: "pointSize",
		label: "Particle Size",
		group: "Appearance",
		min: 0.01,
		max: 0.2,
		default: 0.05,
		step: 0.005,
		icon: "Circle",
	},
	{
		id: "running",
		label: "Simulate",
		group: "Simulation",
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
	spawn: { position: { x: 0, y: 1.6, z: 6 } },

	// ── Lifecycle ──
	setup,
	tick,
	// Custom render hook: dispatches the per-frame GPU compute step before
	// drawing. Defining `render` means this experience owns its frame (the /vr
	// route calls it instead of the default renderer.render()).
	render,
	applySettings,
	updatePlayer,
	dispose,
};
