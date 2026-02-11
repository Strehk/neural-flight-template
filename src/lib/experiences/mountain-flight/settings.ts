import * as THREE from "three";
import { createClouds, disposeClouds } from "$lib/three/clouds";
import { updateSkyColors } from "$lib/three/sky";
import type { ExperienceState } from "../types";
import type { MountainFlightState } from "./scene";

/**
 * Map a parameter change to scene object updates.
 *
 * Each case receives the new `value` directly — no global runtimeConfig.
 * For multi-key parameters (sky colors) we read current values from
 * the scene objects themselves so only the changed key needs to arrive.
 */
export function applySettings(
	id: string,
	value: number | boolean | string,
	state: ExperienceState,
	scene: THREE.Scene,
): void {
	const s = state as MountainFlightState;

	const sun = scene.children.find(
		(c): c is THREE.DirectionalLight => c instanceof THREE.DirectionalLight,
	);

	switch (id) {
		// ── Flight ──────────────────────────────────────
		// These mutate FlightPlayer properties directly — tick() reads them each frame
		case "baseSpeed":
			s.player.baseSpeed = value as number;
			break;

		case "rollYawMultiplier":
			s.player.rollYawMultiplier = value as number;
			break;

		case "lerpAlpha":
			s.player.lerpAlpha = value as number;
			break;

		// ── Fog ──────────────────────────────────────────
		case "fogNear":
			if (scene.fog instanceof THREE.Fog) scene.fog.near = value as number;
			break;

		case "fogFar":
			if (scene.fog instanceof THREE.Fog) scene.fog.far = value as number;
			break;

		case "fogColor":
			if (scene.fog instanceof THREE.Fog) {
				scene.fog.color.set(value as string);
			}
			break;

		// ── Sun ──────────────────────────────────────────
		case "sunIntensity":
			if (sun) sun.intensity = value as number;
			break;

		case "sunElevation":
			if (sun) {
				// Convert elevation angle (degrees) to radians, then place the sun
				// on a circular arc at distance 170 units. x=80 offsets the sun sideways.
				const elevRad = ((value as number) * Math.PI) / 180;
				const dist = 170;
				sun.position.set(80, Math.sin(elevRad) * dist, Math.cos(elevRad) * dist);
			}
			break;

		// ── Sky colors ──────────────────────────────────
		// Sky has 3 coupled colors. We read current colors from the mesh's
		// userData and only override the one that changed.
		case "skyColorTop":
		case "skyColorHorizon":
		case "skyColorBottom": {
			const ud = s.skyMesh.userData;
			if (id === "skyColorTop") ud.skyColorTop = value;
			if (id === "skyColorHorizon") ud.skyColorHorizon = value;
			if (id === "skyColorBottom") ud.skyColorBottom = value;
			updateSkyColors(
				s.skyMesh,
				(ud.skyColorTop as string) ?? "#1a6fc4",
				(ud.skyColorHorizon as string) ?? "#ffeebb",
				(ud.skyColorBottom as string) ?? "#87ceeb",
			);
			break;
		}

		// ── Ring colors ─────────────────────────────────
		case "ringColor":
			s.terrain.updateRingColors(value as string);
			break;

		// ── Water level ─────────────────────────────────
		case "waterLevel":
			s.water.position.y = value as number;
			break;

		// ── Terrain rebuild ─────────────────────────────
		case "terrainAmplitude":
		case "terrainFrequency":
			s.terrain.rebuildAllChunks();
			break;

		// ── Cloud opacity ───────────────────────────────
		case "cloudOpacity":
			s.clouds.traverse((child) => {
				if (
					child instanceof THREE.Mesh &&
					child.material instanceof THREE.MeshStandardMaterial
				) {
					child.material.opacity = value as number;
				}
			});
			break;

		// ── Cloud rebuild (debounced 500ms) ────────────────
		// Cloud count/height changes require a full rebuild (dispose + recreate).
		// Debounced to 500ms so rapid slider drags don't spam GPU allocations.
		// We stash the latest values in userData as a mini-store between ticks.
		case "cloudCount":
		case "cloudHeight": {
			if (id === "cloudCount") s.clouds.userData.count = value;
			if (id === "cloudHeight") s.clouds.userData.height = value;
			if (s.cloudRebuildTimer) clearTimeout(s.cloudRebuildTimer);
			s.cloudRebuildTimer = setTimeout(() => {
				const count = (s.clouds.userData.count as number) ?? 40;
				const height = (s.clouds.userData.height as number) ?? 200;
				disposeClouds(s.clouds);
				scene.remove(s.clouds);
				s.clouds = createClouds({
					count,
					heightMin: height - 50,
					heightMax: height + 50,
				});
				scene.add(s.clouds);
				s.cloudRebuildTimer = null;
			}, 500);
			break;
		}

		// ── Cloud drift toggle ──────────────────────────
		case "cloudDriftEnabled":
			s.cloudDriftEnabled = value as boolean;
			break;

		// ── Wind speed (read by tick via state) ─────────
		case "windSpeed":
			s.windSpeed = value as number;
			break;

		default:
			break;
	}
}
