import type { ExperienceManifest, ParameterDef } from "../types";
import { updatePlayer } from "./player";
import { dispose, setup, tick } from "./scene";
import { applySettings } from "./settings";

const parameters: ParameterDef[] = [
	// ── Flight ──────────────────────────────────────────
	{
		id: "flightSpeed",
		label: "Flight Speed",
		group: "Flight",
		min: 3,
		max: 25,
		default: 10,
		step: 0.5,
		unit: "m/s",
		icon: "Gauge",
	},
	{
		id: "smoothing",
		label: "Smoothing",
		group: "Flight",
		min: 0.02,
		max: 0.3,
		default: 0.1,
		step: 0.01,
		icon: "Activity",
	},
	{
		id: "turnSensitivity",
		label: "Turn Sensitivity",
		group: "Flight",
		min: 0.3,
		max: 2.0,
		default: 0.8,
		step: 0.1,
		icon: "RotateCcw",
	},

	// ── City ────────────────────────────────────────────
	{
		id: "pointDensity",
		label: "Point Density",
		group: "City",
		min: 20,
		max: 80,
		default: 50,
		step: 5,
		unit: "pts",
		icon: "Grid3x3",
	},
	{
		id: "buildingMaxHeight",
		label: "Max Height",
		group: "City",
		min: 40,
		max: 200,
		default: 120,
		step: 10,
		unit: "m",
		icon: "Building2",
	},
	{
		id: "growthSpeed",
		label: "Growth Speed",
		group: "City",
		min: 0.1,
		max: 3.0,
		default: 0.8,
		step: 0.1,
		icon: "TrendingUp",
	},

	// ── Visual ──────────────────────────────────────────
	{
		id: "pointSize",
		label: "Point Size",
		group: "Visual",
		min: 0.5,
		max: 5.0,
		default: 2.0,
		step: 0.1,
		icon: "Circle",
	},
	{
		id: "pointBrightness",
		label: "Brightness",
		group: "Visual",
		min: 0.2,
		max: 2.0,
		default: 1.0,
		step: 0.1,
		icon: "Sun",
	},
	{
		id: "fogDistance",
		label: "Fog Distance",
		group: "Visual",
		min: 80,
		max: 400,
		default: 200,
		step: 10,
		unit: "m",
		icon: "Cloud",
	},

	// ── PostFX ──────────────────────────────────────────
	{
		id: "bloomIntensity",
		label: "Bloom",
		group: "PostFX",
		min: 0,
		max: 3,
		default: 1.5,
		step: 0.1,
		icon: "Sparkle",
	},
	{
		id: "grainIntensity",
		label: "Film Grain",
		group: "PostFX",
		min: 0,
		max: 0.5,
		default: 0.08,
		step: 0.01,
		icon: "Tv",
	},
	{
		id: "vignetteIntensity",
		label: "Vignette",
		group: "PostFX",
		min: 0,
		max: 1.5,
		default: 0.6,
		step: 0.05,
		icon: "Circle",
	},
];

export const manifest: ExperienceManifest = {
	id: "cloud-towers",
	name: "Cloud Towers",
	description:
		"Drift through an endless city of light — skyscrapers materialize from point clouds in the dark",
	version: "1.0.0",
	author: "ICAROS Lab",
	thumbnail: "/experiences/cloud-towers/preview.webp",

	parameters,
	outputs: [],
	interfaces: { orientation: true, speed: true },

	camera: { fov: 75, near: 0.1, far: 800 },
	scene: {
		background: "#050508",
		fogNear: 40,
		fogFar: 200,
		fogColor: "#050508",
		ambientIntensity: 0,
		sunIntensity: 0,
		sunColor: "#000000",
		sunPosition: { x: 0, y: 0, z: 0 },
	},
	spawn: { position: { x: 0, y: 90, z: 0 } },

	setup,
	tick,
	applySettings,
	updatePlayer,
	dispose,
};
