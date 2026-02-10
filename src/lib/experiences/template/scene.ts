import * as THREE from "three";
import type { ExperienceState, SetupContext, TickContext } from "../types";
// ── Shared Library ─────────────────────────────────────────────
// Die Plattform hat fertige Building Blocks in src/lib/three/ die du nutzen kannst:
//   import { createClouds, disposeClouds, updateClouds } from "$lib/three/clouds";
//   import { createSky } from "$lib/three/sky";
//   import { createWater } from "$lib/three/terrain/water";
// Siehe Mountain Flight scene.ts für Beispiele wie man sie einsetzt.

// ── State ──────────────────────────────────────────────────────
// Dein State-Interface hält alle Three.js-Objekte die du in tick() oder
// applySettings() wieder brauchst. Alles was du in setup() erstellst und
// später referenzieren willst, gehört hier rein.

export interface TemplateState extends ExperienceState {
	blocks: THREE.Group;
	ground: THREE.Mesh;
	blockMaterial: THREE.MeshStandardMaterial;
	camera: THREE.PerspectiveCamera;
	moveSpeed: number;
	rotationEnabled: boolean;
}

// ── Helpers ────────────────────────────────────────────────────

/** Erstellt N zufällig verteilte Blöcke und gibt sie als Group zurück */
function createBlocks(
	count: number,
	material: THREE.MeshStandardMaterial,
): THREE.Group {
	const group = new THREE.Group();
	const geometry = new THREE.BoxGeometry(1, 1, 1);

	for (let i = 0; i < count; i++) {
		const mesh = new THREE.Mesh(geometry, material);
		// Zufällige Position auf dem Boden
		mesh.position.set(
			(Math.random() - 0.5) * 80, // x: -40 bis +40
			0.5 + Math.random() * 2, //     y: knapp über dem Boden
			(Math.random() - 0.5) * 80, // z: -40 bis +40
		);
		// Zufällige Größe für Variation
		const scale = 0.5 + Math.random() * 1.5;
		mesh.scale.set(scale, scale, scale);
		mesh.castShadow = true;
		group.add(mesh);
	}

	return group;
}

// ── Lifecycle: setup() ─────────────────────────────────────────
// Wird einmal aufgerufen wenn die Experience geladen wird.
// Hier erstellst du alle 3D-Objekte und fügst sie zur Scene hinzu.

export async function setup(ctx: SetupContext): Promise<TemplateState> {
	// Boden — ein flaches Plane, grey
	const groundGeometry = new THREE.PlaneGeometry(200, 200);
	const groundMaterial = new THREE.MeshStandardMaterial({ color: "#333333" });
	const ground = new THREE.Mesh(groundGeometry, groundMaterial);
	ground.rotation.x = -Math.PI / 2; // Horizontal drehen
	ground.receiveShadow = true;
	ctx.scene.add(ground);

	// Block-Material — geteilt für alle Blöcke (effizient + Color-Change einfach)
	const blockMaterial = new THREE.MeshStandardMaterial({ color: "#111111" });

	// Blöcke — zufällig verteilt
	const blocks = createBlocks(30, blockMaterial);
	ctx.scene.add(blocks);

	// ╔══════════════════════════════════════════════════════════╗
	// ║  Hier eigene 3D-Objekte hinzufügen!                     ║
	// ║  z.B. Kugeln, importierte GLTF-Modelle, Partikel...    ║
	// ╚══════════════════════════════════════════════════════════╝

	// Beispiel: Shared Library Building Blocks nutzen
	// const clouds = createClouds({ count: 20, spread: 100, heightMin: 30, heightMax: 50 });
	// ctx.scene.add(clouds);

	return {
		blocks,
		ground,
		blockMaterial,
		camera: ctx.camera,
		moveSpeed: 5,
		rotationEnabled: true,
	};
}

// ── Lifecycle: tick() ──────────────────────────────────────────
// Wird jeden Frame aufgerufen (60x pro Sekunde).
// Hier laufen Animationen, Physik, Kollisionen.
// delta = Zeit seit letztem Frame in Sekunden (typisch ~0.016)

export function tick(
	state: ExperienceState,
	_ctx: TickContext,
): { state: ExperienceState; outputs?: Record<string, number> } {
	const s = state as TemplateState;

	// Blöcke langsam rotieren lassen (als Animation-Beispiel)
	if (s.rotationEnabled) {
		for (const child of s.blocks.children) {
			child.rotation.y += 0.005;
			child.rotation.x += 0.002;
		}
	}

	return { state: s };
}

// ── Lifecycle: dispose() ───────────────────────────────────────
// Wird aufgerufen wenn die Experience entladen wird.
// WICHTIG: Alle Geometries, Materials und Textures disposen!
// Sonst gibt es Memory Leaks (besonders auf Quest).

export function dispose(state: ExperienceState, scene: THREE.Scene): void {
	const s = state as TemplateState;

	// Blöcke aufräumen
	for (const child of s.blocks.children) {
		if (child instanceof THREE.Mesh) {
			child.geometry.dispose();
		}
	}
	s.blockMaterial.dispose();
	scene.remove(s.blocks);

	// Boden aufräumen
	if (s.ground.geometry) s.ground.geometry.dispose();
	if (s.ground.material instanceof THREE.Material) s.ground.material.dispose();
	scene.remove(s.ground);
}
