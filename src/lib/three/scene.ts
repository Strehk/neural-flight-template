import * as THREE from "three";
import { SCENE } from "$lib/config/flight";

/** Create the flight scene with lighting, fog, and sky color. */
export function createFlightScene(): THREE.Scene {
	const scene = new THREE.Scene();
	scene.background = new THREE.Color(SCENE.SKY_COLOR);
	scene.fog = new THREE.Fog(SCENE.SKY_COLOR, SCENE.FOG_NEAR, SCENE.FOG_FAR);

	const ambient = new THREE.AmbientLight(0xffffff, SCENE.AMBIENT_INTENSITY);
	scene.add(ambient);

	const sun = new THREE.DirectionalLight(SCENE.SUN_COLOR, SCENE.SUN_INTENSITY);
	sun.position.set(SCENE.SUN_POSITION.x, SCENE.SUN_POSITION.y, SCENE.SUN_POSITION.z);
	scene.add(sun);

	return scene;
}
