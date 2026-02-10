import type { ExperienceManifest, ParameterDef } from "../types";
import { updatePlayer } from "./player";
import { setup, tick, dispose } from "./scene";
import { applySettings } from "./settings";

// ── Parameter Definitions ──────────────────────────────────────
// Jeder Parameter erscheint automatisch in der Settings Sidebar (Slider/Toggle/ColorPicker)
// und im Node Editor (als Output Node, 0-1 Signal wird auf min/max remapped).
//
// Felder:
//   id       → Eindeutiger Key — wird in applySettings() als switch-case genutzt
//   label    → Anzeigename im UI
//   group    → Gruppierung in der Settings Sidebar
//   type     → "number" (Slider), "boolean" (Toggle), "color" (ColorPicker) — default: "number"
//   min/max  → Wertebereich (für boolean: 0/1, für color: ignoriert)
//   default  → Startwert
//   step     → Schrittweite im Slider
//   icon     → Lucide Icon-Name für den Node Editor Output Node
//
// Siehe Mountain Flight manifest.ts für ein umfangreiches Beispiel (~20 Parameter).

const parameters: ParameterDef[] = [
	// ── Movement ────────────────────────────────────
	{
		id: "moveSpeed",
		label: "Move Speed",
		group: "Movement",
		min: 1,
		max: 20,
		default: 5,
		step: 0.5,
		unit: "m/s",
		icon: "Gauge",
	},
	{
		id: "rotationEnabled",
		label: "Block Rotation",
		group: "Movement",
		type: "boolean",
		min: 0,
		max: 1,
		default: true,
		step: 1,
		icon: "RotateCw",
	},

	// ── Scene ───────────────────────────────────────
	{
		id: "blockCount",
		label: "Block Count",
		group: "Scene",
		min: 5,
		max: 100,
		default: 30,
		step: 1,
		icon: "Box",
	},
	{
		id: "blockColor",
		label: "Block Color",
		group: "Scene",
		type: "color",
		min: 0,
		max: 1,
		default: "#111111",
		step: 1,
		icon: "Palette",
	},
];

// ── Manifest ───────────────────────────────────────────────────
// Das Manifest ist der "Vertrag" zwischen deiner Experience und der Plattform.
// Die Plattform liest daraus: welche Parameter gibt es, wie sieht die Scene aus,
// und welche Lifecycle-Funktionen soll sie aufrufen.

export const manifest: ExperienceManifest = {
	// ── Identity ──
	// TODO: Ändere diese Felder für deine eigene Experience!
	id: "my-experience", // kebab-case, muss einzigartig sein
	name: "My Experience", // Anzeigename im Catalog
	description: "TODO: Beschreibe deine Experience in einem Satz",
	version: "0.1.0",
	author: "TODO: Dein Name",

	// ── I/O Contract ──
	parameters,
	outputs: [], // Optional: Werte die deine Experience zurückgibt (z.B. Score)
	interfaces: { orientation: true, speed: false }, // Welche Inputs brauchst du?

	// ── Scene Defaults ──
	// Diese Werte setzt der Loader bevor setup() aufgerufen wird
	camera: { fov: 70, near: 0.1, far: 500 },
	scene: {
		background: "#1a1a2e", // Dunkler Himmel
		fogNear: 20,
		fogFar: 150,
		fogColor: "#1a1a2e", // Fog-Farbe = Background für nahtlosen Übergang
		ambientIntensity: 0.4,
		sunIntensity: 1.5,
		sunColor: "#ffffff",
		sunPosition: { x: 50, y: 80, z: 30 },
	},
	spawn: { position: { x: 0, y: 2, z: 0 } },

	// ── Lifecycle ──
	// Diese Funktionen werden von der Plattform aufgerufen:
	setup, //    → Einmal beim Laden (3D-Objekte erstellen)
	tick, //     → Jeden Frame (Animation, Physik)
	applySettings, // → Wenn ein Parameter sich ändert
	updatePlayer, //  → Wenn Orientation-Daten ankommen
	dispose, //  → Beim Entladen (aufräumen!)
};
