import type { ExperienceManifest, ParameterDef } from "../types";
import { updatePlayer } from "./player";
import { dispose, setup, tick } from "./scene";
import { applySettings } from "./settings";

// ── Parameter Definitions ──────────────────────────────────────
// Appear in the Settings Sidebar (slider/toggle) and the Node Editor (0-1 signal
// remapped to min/max). The senses now own the material-kit uniforms (the
// SenseManager lerps them every frame), so the steerable surface here is the
// active sense + how fast it transitions (see scene.ts / senses.ts / settings.ts).

const parameters: ParameterDef[] = [
	{
		// 0=Luft, 1=Echo, 2=Infrarot, 3=Duft, 4=Netzwerk, 5=Depth, 6=Normal.
		// Keys 1–7 switch the same modes on desktop.
		id: "sense",
		label: "Sense",
		group: "Perception",
		min: 0,
		max: 6,
		default: 6,
		step: 1,
		icon: "Eye",
	},
	{
		id: "transitionTime",
		label: "Transition Time",
		group: "Perception",
		min: 0.5,
		max: 8,
		default: 4.5,
		step: 0.1,
		unit: "s",
		icon: "Timer",
	},
	{
		// Scales the global clock: transitions, auto-orbit, and timed audio cues.
		id: "timeScale",
		label: "Time Scale",
		group: "Perception",
		min: 0,
		max: 3,
		default: 1,
		step: 0.05,
		unit: "×",
		icon: "Clock",
	},
	{
		id: "masterVolume",
		label: "Master Volume",
		group: "Perception",
		min: 0,
		max: 1,
		default: 0.8,
		step: 0.05,
		icon: "Volume2",
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
		"WebGPU + TSL terrain with the 7-sense view-mode state machine (M2). Switch senses with keys 1–7 or the Sense parameter; each is a TSL material-kit variant over the same world. Toward the Sinneswandler mirror.",
	version: "0.3.0",
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
