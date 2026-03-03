import * as THREE from "three";
import type { ExperienceState } from "../types";
import type { GradientPrismState } from "./scene";

export function applySettings(
	id: string,
	value: number | boolean | string,
	state: ExperienceState,
	scene: THREE.Scene,
): void {
	const s = state as GradientPrismState;

	switch (id) {
		// ── Flight ──────────────────────────────────────
		case "moveSpeed":
			s.player.baseSpeed = value as number;
			break;

		case "smoothing":
			s.player.lerpAlpha = value as number;
			break;

		// ── World (Gyroid Architecture) ─────────────────
		case "cellSize":
			s.chunks.cellSize = value as number;
			s.chunks.lastCX = Number.NaN;
			s.chunks.lastCY = Number.NaN;
			s.chunks.active.clear();
			s.chunks.dirty = true;
			break;

		case "gyroidFreq":
			s.chunks.freq1 = value as number;
			s.chunks.lastCX = Number.NaN;
			s.chunks.lastCY = Number.NaN;
			s.chunks.active.clear();
			s.chunks.dirty = true;
			break;

		case "wallThreshold":
			s.chunks.thresh1 = value as number;
			s.chunks.lastCX = Number.NaN;
			s.chunks.lastCY = Number.NaN;
			s.chunks.active.clear();
			s.chunks.dirty = true;
			break;

		case "hueShift":
			s.gradMaterial.uniforms.uHueShift.value = value as number;
			break;

		// ── Atmosphere ──────────────────────────────────
		case "fogDistance": {
			const far = value as number;
			const near = far * 0.1;
			s.gradMaterial.uniforms.uFogNear.value = near;
			s.gradMaterial.uniforms.uFogFar.value = far;
			s.darkMaterial.uniforms.uFogNear.value = near;
			s.darkMaterial.uniforms.uFogFar.value = far;
			if (scene.fog instanceof THREE.Fog) {
				scene.fog.near = near;
				scene.fog.far = far;
			}
			break;
		}

		case "skySpeed": {
			const skyMat = s.sky.material as THREE.ShaderMaterial;
			if (skyMat.uniforms.uAnimSpeed) {
				skyMat.uniforms.uAnimSpeed.value = value as number;
			}
			break;
		}

		case "sunElevation": {
			const sun = scene.children.find(
				(c): c is THREE.DirectionalLight =>
					c instanceof THREE.DirectionalLight,
			);
			if (sun) {
				const elevRad = ((value as number) * Math.PI) / 180;
				const dist = 100;
				sun.position.set(
					60,
					Math.sin(elevRad) * dist,
					Math.cos(elevRad) * dist * -0.3,
				);
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

		case "chromaticAberration":
			s.postfx.setChromaticOffset(value as number);
			break;

		default:
			break;
	}
}
