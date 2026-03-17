import * as THREE from "three";
import type { ExperienceState } from "../types";
import type { CloudTowersState } from "./scene";

export function applySettings(
	id: string,
	value: number | boolean | string,
	state: ExperienceState,
	scene: THREE.Scene,
): void {
	const s = state as CloudTowersState;

	switch (id) {
		// ── Flight ──────────────────────────────────────
		case "flightSpeed":
			s.player.baseSpeed = value as number;
			break;

		case "smoothing":
			s.player.lerpAlpha = value as number;
			break;

		case "turnSensitivity":
			s.player.rollYawMultiplier = value as number;
			break;

		// ── City ────────────────────────────────────────
		case "pointDensity":
			s.pointDensity = value as number;
			s.chunks.lastCX = Number.NaN;
			s.chunks.lastCZ = Number.NaN;
			s.chunks.active.clear();
			s.chunks.dirty = true;
			break;

		case "buildingMaxHeight":
			s.buildingMaxHeight = value as number;
			s.chunks.lastCX = Number.NaN;
			s.chunks.lastCZ = Number.NaN;
			s.chunks.active.clear();
			s.chunks.dirty = true;
			break;

		case "growthSpeed":
			s.growthSpeed = value as number;
			s.material.uniforms.uGrowthSpeed.value = value as number;
			break;

		// ── Visual ──────────────────────────────────────
		case "pointSize":
			s.material.uniforms.uPointSize.value = value as number;
			break;

		case "pointBrightness":
			s.material.uniforms.uBrightness.value = value as number;
			break;

		case "fogDistance": {
			const far = value as number;
			const near = far * 0.2;
			s.material.uniforms.uFogNear.value = near;
			s.material.uniforms.uFogFar.value = far;
			if (scene.fog instanceof THREE.Fog) {
				scene.fog.near = near;
				scene.fog.far = far;
			}
			break;
		}

		// ── PostFX ──────────────────────────────────────
		case "bloomIntensity":
			s.postfx.setBloomIntensity(value as number);
			break;

		case "grainIntensity":
			s.postfx.setGrainOpacity(value as number);
			break;

		case "vignetteIntensity":
			break;

		default:
			break;
	}
}
