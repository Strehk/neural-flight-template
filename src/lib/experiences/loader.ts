import * as THREE from "three";
import { DEFAULT_EXPERIENCE_ID, getExperience } from "./catalog";
import type {
	CameraConfig,
	ExperienceManifest,
	ExperienceState,
	SceneConfig,
	SetupContext,
} from "./types";

// ── Active Experience ──

export interface ActiveExperience {
	manifest: ExperienceManifest;
	state: ExperienceState;
	lights: { ambient: THREE.AmbientLight; sun: THREE.DirectionalLight };
}

let active: ActiveExperience | null = null;

// ── Public API ──

/**
 * Load an experience:
 * 1. Unload previous if active
 * 2. Apply scene defaults (fog, lights, background)
 * 3. Setup camera from manifest
 * 4. Call manifest.setup() → get initial state
 * 5. Initialize runtimeValues from parameter defaults
 */
export async function loadExperience(
	id: string,
	ctx: SetupContext,
): Promise<ActiveExperience> {
	if (active) {
		unloadExperience(ctx.scene);
	}

	const manifest = getExperience(id);

	const lights = applySceneDefaults(manifest.scene, ctx.scene);
	setupCamera(manifest.camera, ctx.camera);

	const state = await manifest.setup(ctx);

	active = { manifest, state, lights };
	return active;
}

/** Unload: call dispose(), remove lights, clear state */
export function unloadExperience(scene: THREE.Scene): void {
	if (!active) return;
	active.manifest.dispose(active.state, scene);
	scene.remove(active.lights.ambient);
	scene.remove(active.lights.sun);
	active = null;
}

/** Get the currently active experience */
export function getActiveExperience(): ActiveExperience | null {
	return active;
}

// ── Cross-Route Persistence (localStorage) ──
//
// The user picks an experience on the Landing Page (/), then navigates to /vr.
// Since these are different SvelteKit routes, we persist the chosen ID in
// localStorage so the VR shell knows which experience to load.

const STORAGE_KEY = "active-experience";

export function setActiveExperienceId(id: string): void {
	localStorage.setItem(STORAGE_KEY, id);
}

export function getActiveExperienceId(): string {
	// SSR guard — localStorage is undefined during server-side rendering
	if (typeof localStorage === "undefined") return DEFAULT_EXPERIENCE_ID;
	return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_EXPERIENCE_ID;
}

// ── Internal Helpers ──

function applySceneDefaults(
	config: SceneConfig,
	scene: THREE.Scene,
): { ambient: THREE.AmbientLight; sun: THREE.DirectionalLight } {
	scene.background = new THREE.Color(config.background);

	// fogNear = 0 means "no fog" — only create fog when a positive distance is set
	if (config.fogNear > 0) {
		scene.fog = new THREE.Fog(config.fogColor, config.fogNear, config.fogFar);
	}

	const ambient = new THREE.AmbientLight(0xffffff, config.ambientIntensity);
	scene.add(ambient);

	const sun = new THREE.DirectionalLight(config.sunColor, config.sunIntensity);
	sun.position.set(
		config.sunPosition.x,
		config.sunPosition.y,
		config.sunPosition.z,
	);
	scene.add(sun);

	return { ambient, sun };
}

function setupCamera(
	config: CameraConfig,
	camera: THREE.PerspectiveCamera,
): void {
	camera.fov = config.fov;
	camera.near = config.near;
	camera.far = config.far;
	camera.updateProjectionMatrix();
}
