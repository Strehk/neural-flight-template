import type { ExperienceManifest, ParameterDef } from "../types";
import { updatePlayer } from "./player";
import { dispose, setup, tick } from "./scene";
import { applySettings } from "./settings";

const parameters: ParameterDef[] = [
	{
		id: "tileSize",
		label: "Tile Size",
		group: "Floor",
		min: 0.5,
		max: 4,
		default: 1.35,
		step: 0.05,
		unit: "m",
		icon: "Hexagon",
	},
	{
		id: "tileGap",
		label: "Tile Gap",
		group: "Floor",
		min: 0,
		max: 0.6,
		default: 0.12,
		step: 0.01,
		unit: "m",
		icon: "MoveHorizontal",
	},
	{
		id: "tileHeight",
		label: "Tile Height",
		group: "Floor",
		min: 0.05,
		max: 0.8,
		default: 0.18,
		step: 0.01,
		unit: "m",
		icon: "ArrowUpDown",
	},
	{
		id: "floorColor",
		label: "Floor Color",
		group: "Floor",
		type: "color",
		min: 0,
		max: 1,
		default: "#7a7a7a",
		step: 1,
		icon: "Palette",
	},
];

export const manifest: ExperienceManifest = {
	id: "visio-technologica",
	name: "Visio Technologica",
	description: "Work in Progress Level Prototype for Visio Technologica",
	version: "0.1.0",
	author: "Lennard Lev & Julius Wenk",
	parameters,
	outputs: [],
	interfaces: { orientation: true, speed: false },
	camera: { fov: 68, near: 0.1, far: 600 },
	scene: {
		background: "#d9dfe5",
		fogNear: 45,
		fogFar: 260,
		fogColor: "#eef2f5",
		ambientIntensity: 0.8,
		sunIntensity: 0.9,
		sunColor: "#fff7ed",
		sunPosition: { x: 30, y: 60, z: 20 },
	},
	spawn: { position: { x: 0, y: 4, z: 8 } },
	setup,
	tick,
	applySettings,
	updatePlayer,
	dispose,
};
