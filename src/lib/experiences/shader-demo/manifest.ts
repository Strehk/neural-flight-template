import type { ExperienceManifest, ParameterDef } from "../types";
import { updatePlayer } from "./player";
import { dispose, setup, tick } from "./scene";
import { applySettings } from "./settings";

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

export const manifest: ExperienceManifest = {
	id: "shader-demo",
	name: "✨ Shader Demo",
	description: "Interactive shader experience with FBM noise landscape",
	version: "1.0.0",
	author: "ICAROS Lab",

	parameters,
	outputs: [],
	interfaces: { orientation: true, speed: false },

	camera: { fov: 75, near: 0.1, far: 100 },
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
	spawn: { position: { x: 0, y: 0, z: 3 } },

	setup,
	tick,
	applySettings,
	updatePlayer,
	dispose,
};
