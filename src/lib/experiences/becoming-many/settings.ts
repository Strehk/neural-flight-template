import type * as THREE from "three";
import type { ExperienceState } from "../types";
import type { BecomingManyState } from "./scene";

// ── Settings ───────────────────────────────────────────────────
// Called when a parameter changes (Settings Sidebar slider / Node Editor signal).
// Each `case` matches a ParameterDef id from manifest.ts.
//
// These map straight onto live TSL uniforms (`uniform().value = …`): the change
// is picked up by the GPU compute kernel on the very next frame — no rebuild,
// no buffer reallocation. This is the cheapest possible steering path.

export function applySettings(
	id: string,
	value: number | boolean | string,
	state: ExperienceState,
	_scene: THREE.Scene,
): void {
	const s = state as BecomingManyState;

	switch (id) {
		case "swarmSpeed":
			s.uSpeed.value = value as number;
			break;

		case "turbulence":
			s.uTurbulence.value = value as number;
			break;

		case "attraction":
			s.uAttraction.value = value as number;
			break;

		case "pointSize":
			s.uPointSize.value = value as number;
			break;

		case "running":
			s.running = value as boolean;
			break;

		default:
			break;
	}
}
