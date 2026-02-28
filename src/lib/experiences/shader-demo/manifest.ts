// ============================================================================
// manifest.ts — Declarative I/O contract for the experience
//
// The manifest defines everything the infrastructure needs to know:
//   - Identity (id, name, description)
//   - Parameters (steerable via Node Editor + Settings Sidebar)
//   - Scene defaults (background, fog, lights)
//   - Camera config (fov, near, far)
//   - Spawn position
//   - Lifecycle methods (setup, tick, dispose, applySettings, updatePlayer)
//
// CUSTOMIZE: Change id, name, parameters, and scene config for your experience.
// ============================================================================

import type { ExperienceManifest, ParameterDef } from "../types";
import { updatePlayer } from "./player";
import { dispose, setup, tick } from "./scene";
import { applySettings } from "./settings";

// ── Parameters ──
// Each parameter appears as a slider in the Settings Sidebar and as an
// output node in the Node Editor. The id must match the switch cases in
// settings.ts for the UI to actually control the shader.

const parameters: ParameterDef[] = [
	// ── Noise ───────────────────────────────────────────
	{
		id: "noiseScale",
		label: "Noise Scale",
		group: "Noise",
		min: 1,
		max: 10,
		default: 3,
		step: 0.1,
		icon: "Waves",
	},
	{
		id: "speed",
		label: "Speed",
		group: "Noise",
		min: 0,
		max: 2,
		default: 0.3,
		step: 0.01,
		icon: "Gauge",
	},
	{
		id: "distortion",
		label: "Distortion",
		group: "Noise",
		min: 0,
		max: 2,
		default: 0.5,
		step: 0.01,
		icon: "Blend",
	},

	// ── Color ───────────────────────────────────────────
	{
		id: "colorShift",
		label: "Color Shift",
		group: "Color",
		min: 0,
		max: 6.28,
		default: 0,
		step: 0.01,
		icon: "Palette",
	},
	{
		id: "brightness",
		label: "Brightness",
		group: "Color",
		min: 0.2,
		max: 2,
		default: 1,
		step: 0.01,
		icon: "Sun",
	},
];

// ── Manifest ──

export const manifest: ExperienceManifest = {
	// CUSTOMIZE: Identity
	id: "shader-demo",
	name: "Shader Demo",
	description: "Interactive shader experience with FBM noise and domain warping",
	version: "1.0.0",
	author: "ICAROS Lab",

	// CUSTOMIZE: I/O contract
	parameters,
	outputs: [],
	interfaces: { orientation: true, speed: false },

	// CUSTOMIZE: Camera — fov, clipping planes
	camera: { fov: 75, near: 0.1, far: 100 },

	// CUSTOMIZE: Scene defaults — background, fog, lighting
	scene: {
		background: "#0a0a0a",
		fogNear: 0,
		fogFar: 0,
		fogColor: "#000000",
		ambientIntensity: 0.5,
		sunIntensity: 1.0,
		sunColor: "#ffffff",
		sunPosition: { x: 0, y: 10, z: 10 },
	},

	// CUSTOMIZE: Where the camera starts (camera.position in setup)
	spawn: { position: { x: 0, y: 0, z: 4 } },

	// Lifecycle — wired to the other 4 files
	setup,
	tick,
	applySettings,
	updatePlayer,
	dispose,
};
