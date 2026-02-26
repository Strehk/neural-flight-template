import type { ExperienceManifest, ParameterDef } from "../types";
import { updatePlayer } from "./player";
import { dispose, setup, tick } from "./scene";
import { applySettings } from "./settings";

/**
 * Mountain Flight — Parameter Definitions
 *
 * Each parameter is controllable via Settings Sidebar (direct) and
 * Node Editor (0-1 signal remapped to min/max). Grouped for UI clarity.
 *
 * type defaults to "number" (slider). Use "boolean" for toggles, "color" for pickers.
 */
const parameters: ParameterDef[] = [
	// ── Flight ──────────────────────────────────────────
	// Controls how the player moves through the scene
	{
		id: "baseSpeed",
		label: "Base Speed",
		group: "Flight",
		min: 5,
		max: 80,
		default: 20,
		step: 1,
		unit: "m/s",
		icon: "Gauge",
	},
	{
		id: "rollYawMultiplier",
		label: "Roll-Yaw Sensitivity",
		group: "Flight",
		min: 0.5,
		max: 4,
		default: 1.5,
		step: 0.1,
		icon: "RotateCw",
	},
	{
		id: "lerpAlpha",
		label: "Smoothing",
		group: "Flight",
		min: 0.01,
		max: 0.5,
		default: 0.15,
		step: 0.01,
		icon: "Spline",
	},

	// ── Scene ───────────────────────────────────────────
	// Lighting, fog, and atmosphere
	{
		id: "sunIntensity",
		label: "Sun Intensity",
		group: "Scene",
		min: 1,
		max: 5,
		default: 3,
		step: 0.1,
		icon: "Sun",
	},
	{
		id: "sunElevation",
		label: "Sun Elevation",
		group: "Scene",
		min: 5,
		max: 90,
		default: 65,
		step: 1,
		unit: "°",
		icon: "Sunrise",
	},
	{
		id: "fogNear",
		label: "Fog Near",
		group: "Scene",
		min: 50,
		max: 200,
		default: 100,
		step: 1,
		icon: "CloudFog",
	},
	{
		id: "fogFar",
		label: "Fog Far",
		group: "Scene",
		min: 300,
		max: 800,
		default: 500,
		step: 1,
		icon: "Maximize",
	},
	{
		id: "fogColor",
		label: "Fog Color",
		group: "Scene",
		type: "color",
		min: 0,
		max: 1,
		default: "#87ceeb",
		step: 1,
		icon: "Palette",
	},
	{
		id: "skyColorTop",
		label: "Sky Top",
		group: "Scene",
		type: "color",
		min: 0,
		max: 1,
		default: "#1a6fc4",
		step: 1,
		icon: "Palette",
	},
	{
		id: "skyColorHorizon",
		label: "Sky Horizon",
		group: "Scene",
		type: "color",
		min: 0,
		max: 1,
		default: "#ffeebb",
		step: 1,
		icon: "Palette",
	},
	{
		id: "skyColorBottom",
		label: "Sky Bottom",
		group: "Scene",
		type: "color",
		min: 0,
		max: 1,
		default: "#87ceeb",
		step: 1,
		icon: "Palette",
	},
	{
		id: "ringColor",
		label: "Ring Color",
		group: "Scene",
		type: "color",
		min: 0,
		max: 1,
		default: "#f1c40f",
		step: 1,
		icon: "Circle",
	},

	// ── Clouds ──────────────────────────────────────────
	// Cloud generation and behavior
	{
		id: "cloudCount",
		label: "Cloud Count",
		group: "Clouds",
		min: 10,
		max: 100,
		default: 40,
		step: 5,
		icon: "Cloud",
	},
	{
		id: "cloudHeight",
		label: "Cloud Height",
		group: "Clouds",
		min: 80,
		max: 400,
		default: 200,
		step: 10,
		unit: "m",
		icon: "CloudUpload",
	},
	{
		id: "cloudOpacity",
		label: "Cloud Opacity",
		group: "Clouds",
		min: 0,
		max: 1,
		default: 0.8,
		step: 0.1,
		icon: "Cloud",
	},
	{
		id: "cloudDriftEnabled",
		label: "Cloud Drift",
		group: "Clouds",
		type: "boolean",
		min: 0,
		max: 1,
		default: true,
		step: 1,
		icon: "Wind",
	},
	{
		id: "windSpeed",
		label: "Wind Speed",
		group: "Clouds",
		min: 0,
		max: 10,
		default: 2,
		step: 0.5,
		unit: "m/s",
		icon: "Wind",
	},

	// ── Terrain ─────────────────────────────────────────
	// Landscape generation and decoration
	{
		id: "terrainAmplitude",
		label: "Terrain Amplitude",
		group: "Terrain",
		min: 30,
		max: 90,
		default: 60,
		step: 1,
		icon: "Mountain",
	},
	{
		id: "terrainFrequency",
		label: "Terrain Frequency",
		group: "Terrain",
		min: 0.001,
		max: 0.01,
		default: 0.005,
		step: 0.001,
		icon: "Waves",
	},
	{
		id: "waterLevel",
		label: "Water Level",
		group: "Terrain",
		min: 0,
		max: 20,
		default: 5,
		step: 1,
		unit: "m",
		icon: "Droplets",
	},

	// ── Auskommentiert: interne Details, extern wenig sinnvoll ──
	// { id: "minClearance", label: "Min Clearance", group: "Flight", min: 1, max: 30, default: 8, step: 1, icon: "Shield" },
	// { id: "viewRadius", label: "View Radius", group: "Terrain", min: 1, max: 4, default: 2, step: 1, icon: "Scan" },
	// { id: "ringCountPerChunk", label: "Rings per Chunk", group: "Terrain", min: 0, max: 8, default: 2, step: 1, icon: "Circle" },
	// { id: "treeDensity", label: "Tree Density", group: "Terrain", min: 0, max: 60, default: 25, step: 5, icon: "TreePine" },
];

export const manifest: ExperienceManifest = {
	// Identity
	id: "mountain-flight",
	name: "Mountain Flight",
	description: "Fly through procedurally generated mountains, collect rings",
	version: "1.0.0",
	author: "ICAROS Lab",
	thumbnail: "/experiences/mountain-flight/preview.webp",

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
