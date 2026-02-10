import * as THREE from "three";
import { runtimeConfig } from "$lib/config/flight";
import { createClouds, disposeClouds } from "$lib/three/clouds";
import { updateSkyColors } from "$lib/three/sky";
import type { ExperienceState } from "../types";
import type { MountainFlightState } from "./scene";

/**
 * Map a parameter change to scene object updates.
 * runtimeConfig is already mutated by +page.svelte before this runs (D6).
 */
export function applySettings(
	id: string,
	value: number,
	state: ExperienceState,
	scene: THREE.Scene,
): void {
	const s = state as MountainFlightState;

	const sun = scene.children.find(
		(c): c is THREE.DirectionalLight => c instanceof THREE.DirectionalLight,
	);

	switch (id) {
		// Fog
		case "fogNear":
		case "fogFar":
			if (scene.fog instanceof THREE.Fog) {
				scene.fog.near = runtimeConfig.fogNear;
				scene.fog.far = runtimeConfig.fogFar;
			}
			break;

		case "fogColor":
			if (scene.fog instanceof THREE.Fog) {
				scene.fog.color.set(runtimeConfig.fogColor);
			}
			break;

		// Sun
		case "sunIntensity":
			if (sun) sun.intensity = runtimeConfig.sunIntensity;
			break;

		case "sunElevation":
			if (sun) {
				const elevRad = (runtimeConfig.sunElevation * Math.PI) / 180;
				const dist = 170;
				sun.position.set(80, Math.sin(elevRad) * dist, Math.cos(elevRad) * dist);
			}
			break;

		// Sky colors
		case "skyColorTop":
		case "skyColorHorizon":
		case "skyColorBottom":
			updateSkyColors(
				s.skyMesh,
				runtimeConfig.skyColorTop,
				runtimeConfig.skyColorHorizon,
				runtimeConfig.skyColorBottom,
			);
			break;

		// Ring colors
		case "ringColor":
			s.terrain.updateRingColors(runtimeConfig.ringColor);
			break;

		// Water level
		case "waterLevel":
			s.water.position.y = runtimeConfig.waterLevel;
			break;

		// Terrain rebuild
		case "terrainAmplitude":
		case "terrainFrequency":
			s.terrain.rebuildAllChunks();
			break;

		// Cloud opacity
		case "cloudOpacity":
			s.clouds.traverse((child) => {
				if (
					child instanceof THREE.Mesh &&
					child.material instanceof THREE.MeshStandardMaterial
				) {
					child.material.opacity = runtimeConfig.cloudOpacity;
				}
			});
			break;

		// Cloud rebuild (debounced)
		case "cloudCount":
		case "cloudHeight": {
			if (s.cloudRebuildTimer) clearTimeout(s.cloudRebuildTimer);
			s.cloudRebuildTimer = setTimeout(() => {
				disposeClouds(s.clouds);
				scene.remove(s.clouds);
				s.clouds = createClouds({
					count: runtimeConfig.cloudCount,
					heightMin: runtimeConfig.cloudHeight - 50,
					heightMax: runtimeConfig.cloudHeight + 50,
				});
				scene.add(s.clouds);
				s.cloudRebuildTimer = null;
			}, 500);
			break;
		}

		// windSpeed: no-op — read by tick() via runtimeConfig
		default:
			break;
	}
}
