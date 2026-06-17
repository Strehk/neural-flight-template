import type * as THREE from "three";
import type { ExperienceState } from "../types";
import type { BecomingManyState } from "./scene";

// ── Settings ───────────────────────────────────────────────────
// Called when a parameter changes (Settings Sidebar slider / Node Editor signal).
// Each `case` matches a ParameterDef id from manifest.ts.
//
// Both scaffold parameters use the "Simple State" pattern (RULES.md): store the
// value, let tick() read it next frame. No GPU rebuilds needed yet.

export function applySettings(
	id: string,
	value: number | boolean | string,
	state: ExperienceState,
	_scene: THREE.Scene,
): void {
	const s = state as BecomingManyState;

	switch (id) {
		case "rotationSpeed":
			s.rotationSpeed = value as number;
			break;

		case "spin":
			s.spin = value as boolean;
			break;

		default:
			break;
	}
}
