import type { ExperienceState } from "../types";
import type { TemplateState } from "./scene";

// ── Player Movement ────────────────────────────────────────────
// Einfache Steuerung: pitch → vorwärts/rückwärts, roll → links/rechts.
// Direkt auf camera.position, ohne FlightPlayer-Klasse.
//
// Für komplexere Physik (Trägheit, Smoothing, Terrain-Kollision)
// siehe FlightPlayer in src/lib/three/player.ts — so macht es Mountain Flight.

export function updatePlayer(
	orientation: { pitch: number; roll: number },
	_speed: { accelerate: boolean; brake: boolean },
	state: ExperienceState,
	delta: number,
): void {
	const s = state as TemplateState;

	// pitch: Neigung nach vorne/hinten → Bewegung auf Z-Achse
	// roll: Neigung nach links/rechts → Bewegung auf X-Achse
	// Werte kommen normalisiert von -1 bis +1 (ICAROS/Gyro/Controller)
	const moveZ = -orientation.pitch * s.moveSpeed * delta;
	const moveX = orientation.roll * s.moveSpeed * delta;

	s.camera.position.x += moveX;
	s.camera.position.z += moveZ;
}
