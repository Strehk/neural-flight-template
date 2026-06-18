import type { ExperienceManifest, ParameterDef } from "../types";
import { updatePlayer } from "./player";
import { dispose, setup, tick } from "./scene";
import { applySettings } from "./settings";

// ── Parameter Definitions ──────────────────────────────────────
// Appear in the Settings Sidebar (slider/toggle) and the Node Editor (0-1 signal
// remapped to min/max). These steer the terrain preview's TSL material-kit
// uniforms live (see scene.ts / settings.ts).

const parameters: ParameterDef[] = [
	{
		id: "depthLevels",
		label: "Depth Bands",
		group: "Vision",
		min: 1,
		max: 16,
		default: 6,
		step: 1,
		icon: "Layers",
	},
	{
		id: "viewRadius",
		label: "View Radius",
		group: "Vision",
		min: 20,
		max: 400,
		default: 160,
		step: 5,
		unit: "m",
		icon: "Radar",
	},
	{
		id: "revealSoftness",
		label: "Reveal Softness",
		group: "Vision",
		min: 2,
		max: 80,
		default: 28,
		step: 2,
		unit: "m",
		icon: "Aperture",
	},
	{
		id: "fogNear",
		label: "Fog Near",
		group: "Atmosphere",
		min: 0,
		max: 200,
		default: 30,
		step: 5,
		unit: "m",
		icon: "CloudFog",
	},
	{
		id: "fogFar",
		label: "Fog Far",
		group: "Atmosphere",
		min: 40,
		max: 500,
		default: 220,
		step: 10,
		unit: "m",
		icon: "Cloud",
	},
	{
		id: "rimPower",
		label: "Edge Sharpness",
		group: "Atmosphere",
		min: 0.5,
		max: 6,
		default: 2.5,
		step: 0.1,
		icon: "Sparkles",
	},
	{
		id: "rimStrength",
		label: "Edge Glow",
		group: "Atmosphere",
		min: 0,
		max: 2,
		default: 0.6,
		step: 0.05,
		icon: "Sun",
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
		"WebGPU + TSL terrain preview — exercises the shared material kit (depth bands, view-radius reveal, fog, fresnel) on a static surface. First step toward the Sinneswandler mirror.",
	version: "0.2.0",
	author: "Tade Strehk",

	// ── Renderer ──
	// "webgpu" = three/webgpu WebGPURenderer + TSL. Omit (or "webgl") for the
	// classic WebGLRenderer path used by every other experience.
	renderer: "webgpu",

	// ── I/O Contract ──
	parameters,
	outputs: [],
	// No input interfaces yet — the preview only auto-orbits. Flip orientation/
	// speed on once player.ts grows a flight controller (M1).
	interfaces: { orientation: false, speed: false },

	// ── Scene Defaults ──
	// Applied by the loader before setup(): background, fog, ambient + sun light.
	// `far` clears the largest view radius so distant terrain fades via the TSL
	// fog/reveal rather than popping at the frustum. Scene fog is off — the kit
	// does its own fog in the material. FOV/near/far mirror Sinneswandler (§1.1).
	camera: { fov: 78, near: 0.1, far: 620 },
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
	spawn: { position: { x: 0, y: 22, z: 0 } },

	// ── Lifecycle ──
	// No custom `render` hook — the terrain has no compute step, so the default
	// renderer.render() is used. (The swarm reference in swarm-scene.ts needed
	// one to dispatch its per-frame compute kernel.)
	setup,
	tick,
	applySettings,
	updatePlayer,
	dispose,
};
