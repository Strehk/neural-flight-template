import type * as THREE from "three";
import type { ExperienceState } from "../types";
import type { BecomingManyState } from "./scene";

// ── Settings ───────────────────────────────────────────────────
// Called when a parameter changes (Settings Sidebar slider / Node Editor signal).
// Each `case` matches a ParameterDef id from manifest.ts.
//
// These map straight onto the live TSL uniforms in scene.ts: the change is picked
// up by the material on the very next frame — no rebuild, no reallocation.

export function applySettings(
	id: string,
	value: number | boolean | string,
	state: ExperienceState,
	_scene: THREE.Scene,
): void {
	const s = state as BecomingManyState;
	const u = s.uniforms;

	switch (id) {
		case "depthLevels":
			u.depthLevels.value = value as number;
			break;

		case "viewRadius":
			u.viewRadius.value = value as number;
			break;

		case "revealSoftness":
			u.revealSoftness.value = value as number;
			break;

		case "fogNear":
			u.fogNear.value = value as number;
			break;

		case "fogFar":
			u.fogFar.value = value as number;
			break;

		case "rimPower":
			u.rimPower.value = value as number;
			break;

		case "rimStrength":
			u.rimStrength.value = value as number;
			break;

		default:
			break;
	}
}
