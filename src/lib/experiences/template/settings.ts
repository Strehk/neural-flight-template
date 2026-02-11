import * as THREE from "three";
import type { ExperienceState } from "../types";
import type { TemplateState } from "./scene";

// ── Settings ───────────────────────────────────────────────────
// Wird aufgerufen wenn ein Parameter sich ändert (Sidebar Slider, Node Editor Signal).
// Jeder case matched eine Parameter-ID aus manifest.ts.
//
// Pattern:
//   Einfache Werte → State-Property setzen (wird in tick() gelesen)
//   Visuelle Änderungen → Material/Fog/Licht direkt updaten
//   Strukturelle Änderungen → Objekte neu generieren (rebuild)

export function applySettings(
	id: string,
	value: number | boolean | string,
	state: ExperienceState,
	scene: THREE.Scene,
): void {
	const s = state as TemplateState;

	switch (id) {
		// ── moveSpeed ──────────────────────────────────
		// Einfachster Fall: Wert im State speichern.
		// updatePlayer() liest s.moveSpeed jeden Frame.
		case "moveSpeed":
			s.moveSpeed = value as number;
			break;

		// ── rotationEnabled ────────────────────────────
		// Boolean Toggle: tick() prüft diesen Wert.
		case "rotationEnabled":
			s.rotationEnabled = value as boolean;
			break;

		// ── blockCount ─────────────────────────────────
		// Strukturelle Änderung: Alte Blöcke entfernen, neue generieren.
		// Das ist das "Rebuild-Pattern" — nötig wenn sich die Anzahl ändert.
		//
		// ⚠️ WICHTIG: Immer alte Geometries disposen bevor neue erstellt werden!
		// Ohne dispose() bleibt GPU-Speicher belegt → Memory Leak (besonders auf Quest).
		case "blockCount": {
			const count = value as number;
			// Alte Blöcke disposen
			for (const child of s.blocks.children) {
				if (child instanceof THREE.Mesh) {
					child.geometry.dispose();
				}
			}
			scene.remove(s.blocks);

			// Neue Blöcke generieren mit aktuellem Material
			const geometry = new THREE.BoxGeometry(1, 1, 1);
			const group = new THREE.Group();
			for (let i = 0; i < count; i++) {
				const mesh = new THREE.Mesh(geometry, s.blockMaterial);
				mesh.position.set(
					(Math.random() - 0.5) * 80,
					0.5 + Math.random() * 2,
					(Math.random() - 0.5) * 80,
				);
				const scale = 0.5 + Math.random() * 1.5;
				mesh.scale.set(scale, scale, scale);
				mesh.castShadow = true;
				group.add(mesh);
			}
			s.blocks = group;
			scene.add(s.blocks);
			break;
		}

		// ── blockColor ─────────────────────────────────
		// Material-Update: Alle Blöcke teilen sich ein Material,
		// daher reicht ein einziger color.set() Call.
		case "blockColor":
			s.blockMaterial.color.set(value as string);
			break;

		default:
			break;
	}
}
