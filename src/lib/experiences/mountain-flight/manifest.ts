import type { ExperienceManifest, ParameterDef } from "../types";
import { updatePlayer } from "./player";
import { setup, tick, dispose } from "./scene";
import { applySettings } from "./settings";

const parameters: ParameterDef[] = [
	{
		id: "terrainAmplitude",
		label: "Terrain Amplitude",
		group: "Environment",
		min: 30,
		max: 90,
		default: 60,
		step: 1,
		icon: "Mountain",
	},
	{
		id: "terrainFrequency",
		label: "Terrain Frequency",
		group: "Environment",
		min: 0.001,
		max: 0.01,
		default: 0.005,
		step: 0.001,
		icon: "Waves",
	},
	{
		id: "waterLevel",
		label: "Water Level",
		group: "Environment",
		min: 0,
		max: 20,
		default: 5,
		step: 1,
		icon: "Droplets",
	},
	{
		id: "fogNear",
		label: "Fog Near",
		group: "Environment",
		min: 50,
		max: 200,
		default: 100,
		step: 1,
		icon: "CloudFog",
	},
	{
		id: "fogFar",
		label: "Fog Far",
		group: "Environment",
		min: 300,
		max: 800,
		default: 500,
		step: 1,
		icon: "Maximize",
	},
	{
		id: "sunIntensity",
		label: "Sun Intensity",
		group: "Environment",
		min: 1,
		max: 5,
		default: 3,
		step: 0.1,
		icon: "Sun",
	},
	{
		id: "cloudOpacity",
		label: "Cloud Opacity",
		group: "Environment",
		min: 0,
		max: 1,
		default: 0.8,
		step: 0.1,
		icon: "Cloud",
	},
	{
		id: "windSpeed",
		label: "Wind Speed",
		group: "Environment",
		min: 0,
		max: 10,
		default: 2,
		step: 0.5,
		icon: "Wind",
	},
];

export const manifest: ExperienceManifest = {
	// Identity
	id: "mountain-flight",
	name: "Mountain Flight",
	description: "Fly through procedurally generated mountains, collect rings",
	version: "1.0.0",
	author: "ICAROS Lab",

	// I/O Contract
	parameters,
	outputs: [{ id: "score", label: "Score", type: "number" }],
	interfaces: { orientation: true, speed: true },

	// Scene Defaults
	camera: { fov: 75, near: 0.1, far: 1000 },
	scene: {
		background: "#87ceeb",
		fogNear: 100,
		fogFar: 500,
		fogColor: "#87ceeb",
		ambientIntensity: 0.3,
		sunIntensity: 3.0,
		sunColor: "#fff4e0",
		sunPosition: { x: 80, y: 150, z: 40 },
	},
	spawn: { position: { x: 0, y: 50, z: 0 } },

	// Lifecycle
	setup,
	tick,
	applySettings,
	updatePlayer,
	dispose,
};
