import type * as THREE from "three";
import type { ExperienceState } from "../types";
import { type BecomingManyState, SENSE_COUNT } from "./scene";
import { listTerrainProviders } from "./terrain/providers";

// ── Settings ───────────────────────────────────────────────────
// Called when a parameter changes (Settings Sidebar slider / Node Editor signal).
// Each `case` matches a ParameterDef id from manifest.ts.
//
// The senses own the material-kit uniforms now, so settings drive the sense
// state machine rather than individual uniforms: pick the active sense (also
// reachable via keys 1–7) and tune the transition duration. The Flight group
// tunes the controller's cruise/boost speed; the Terrain group swaps the
// pluggable generation provider + its seed/amplitude (rebuilds the streamed world).

export function applySettings(
	id: string,
	value: number | boolean | string,
	state: ExperienceState,
	_scene: THREE.Scene,
): void {
	const s = state as BecomingManyState;

	switch (id) {
		case "sense": {
			const i = Math.round(value as number);
			s.senses.switchToIndex(Math.min(Math.max(i, 0), SENSE_COUNT - 1));
			break;
		}

		case "transitionTime":
			s.senses.duration = value as number;
			break;

		case "timeScale":
			s.clock.timeScale = value as number;
			break;

		case "masterVolume":
			s.director.setMasterGain(value as number);
			break;

		case "cruiseSpeed":
			s.flight.cruiseSpeed = value as number;
			break;

		case "boostSpeed":
			s.flight.boostSpeed = value as number;
			break;

		case "terrainProvider": {
			const providers = listTerrainProviders();
			const i = Math.min(Math.max(Math.round(value as number), 0), providers.length - 1);
			s.world.setProvider(providers[i].id);
			break;
		}

		case "worldSeed":
			s.world.setConfig({ seed: Math.round(value as number) });
			break;

		case "terrainAmplitude":
			s.world.setConfig({ amplitude: value as number });
			break;

		default:
			break;
	}
}
