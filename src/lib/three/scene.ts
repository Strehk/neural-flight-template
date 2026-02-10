/**
 * ⚠️ TEMPORARY DEFAULTS — Will move to experience manifest (Step 2).
 * These values currently mirror config/flight.ts SCENE constants.
 * After migration: each experience passes its own config, no defaults here.
 */
import * as THREE from "three";

export interface FlightSceneConfig {
	skyColor?: number;
	fogNear?: number;
	fogFar?: number;
	ambientIntensity?: number;
	sunIntensity?: number;
	sunColor?: number;
	sunPosition?: { x: number; y: number; z: number };
}

const DEFAULTS: Required<FlightSceneConfig> = {
	skyColor: 0x87ceeb,
	fogNear: 100,
	fogFar: 500,
	ambientIntensity: 0.3,
	sunIntensity: 3.0,
	sunColor: 0xfff4e0,
	sunPosition: { x: 80, y: 150, z: 40 },
};

/** Create the flight scene with lighting, fog, and sky color. */
export function createFlightScene(config?: FlightSceneConfig): THREE.Scene {
	const c = { ...DEFAULTS, ...config };

	const scene = new THREE.Scene();
	scene.background = new THREE.Color(c.skyColor);
	scene.fog = new THREE.Fog(c.skyColor, c.fogNear, c.fogFar);

	const ambient = new THREE.AmbientLight(0xffffff, c.ambientIntensity);
	scene.add(ambient);

	const sun = new THREE.DirectionalLight(c.sunColor, c.sunIntensity);
	sun.position.set(c.sunPosition.x, c.sunPosition.y, c.sunPosition.z);
	sun.castShadow = true;
	sun.shadow.mapSize.set(1024, 1024);
	sun.shadow.camera.left = -150;
	sun.shadow.camera.right = 150;
	sun.shadow.camera.top = 150;
	sun.shadow.camera.bottom = -150;
	sun.shadow.camera.near = 0.5;
	sun.shadow.camera.far = 500;
	scene.add(sun);

	return scene;
}
