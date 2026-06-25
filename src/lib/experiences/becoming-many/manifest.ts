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
	{
		// Base forward speed when not boosting (FlightController.cruiseSpeed).
		id: "cruiseSpeed",
		label: "Cruise Speed",
		group: "Flight",
		min: 2,
		max: 30,
		default: 11,
		step: 0.5,
		unit: "m/s",
		icon: "Gauge",
	},
	{
		// Forward speed while accelerating (FlightController.boostSpeed).
		id: "boostSpeed",
		label: "Boost Speed",
		group: "Flight",
		min: 5,
		max: 50,
		default: 18,
		step: 0.5,
		unit: "m/s",
		icon: "Rocket",
	},
	{
		// Index into the terrain provider registry (0 = Sine Hills, 1 = Ridged
		// Peaks, 2 = WorldGen — WFC biomes + noise + hydrology, generated in the
		// dedicated worldgen worker). Switches the streamed algorithm live.
		id: "terrainProvider",
		label: "Terrain Algorithm",
		group: "Terrain",
		min: 0,
		max: 2,
		default: 2,
		step: 1,
		icon: "Mountain",
	},
	{
		// Master seed — different worlds from the same algorithm.
		id: "worldSeed",
		label: "World Seed",
		group: "Terrain",
		min: 0,
		max: 999,
		default: 0,
		step: 1,
		icon: "Dice5",
	},
	{
		// Vertical scale multiplier on the terrain field.
		id: "terrainAmplitude",
		label: "Terrain Amplitude",
		group: "Terrain",
		min: 0.2,
		max: 3,
		default: 1,
		step: 0.1,
		unit: "×",
		icon: "MoveVertical",
	},
	{
		// Instanced rock/grass scatter density (0 = off).
		id: "decorations",
		label: "Decorations",
		group: "Terrain",
		min: 0,
		max: 1,
		default: 0.6,
		step: 0.1,
		icon: "Trees",
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
		"Fly over a streaming, GPU-generated world (M3) with the 7-sense view-mode state machine (M2). WASD/Shift or a controller/gyro to fly; keys 1–7 or the Sense parameter switch senses; the Terrain Algorithm is a pluggable, swappable generation provider. Toward the Sinneswandler mirror.",
	version: "0.5.0",
	author: "Tade Strehk",

	// ── Renderer ──
	// "webgpu" = three/webgpu WebGPURenderer + TSL. Omit (or "webgl") for the
	// classic WebGLRenderer path used by every other experience.
	renderer: "webgpu",

	// ── I/O Contract ──
	parameters,
	outputs: [],
	// Flight is live (M1): orientation (pitch/roll) + speed (accelerate/brake)
	// feed the modular input system's NetworkSource via updatePlayer(); keyboard
	// and XR-controller sources are wired locally. See input/ + flight-controller.
	interfaces: { orientation: true, speed: true },

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
	// Keep in sync with SPAWN in scene.ts (the flight rig is placed there). High
	// enough to clear the hill crests; the soft altitude floor settles it down.
	spawn: { position: { x: 0, y: 100, z: 0 } },

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
