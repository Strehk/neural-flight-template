<script lang="ts">
import { Trophy } from "lucide-svelte";
import { onDestroy, onMount } from "svelte";
import * as THREE from "three";
import type { Inspector } from "three/addons/inspector/Inspector.js";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
import type { WebGPURenderer } from "three/webgpu";
import {
	registerRenderer,
	unregisterRenderer,
} from "$lib/dev-console/registry.svelte";
import { getExperience } from "$lib/experiences/catalog";
import type { ActiveExperience } from "$lib/experiences/loader";
import {
	getActiveExperienceId,
	loadExperience,
	unloadExperience,
} from "$lib/experiences/loader";
import { currentBiomeStore } from "$lib/experiences/sinneswandler_test1/biome-store";
import { createWebSocketClient } from "$lib/ws/client.svelte";
import {
	isOrientationData,
	isSettingsUpdate,
	isSpeedCommand,
} from "$lib/ws/protocol";

let canvas: HTMLCanvasElement;
let renderer: THREE.WebGLRenderer | WebGPURenderer;
// three.js WebGPU dev panel — only on the WebGPU path; null otherwise.
let inspector: Inspector | null = null;
let scene: THREE.Scene;
let vrButton: HTMLElement;
let score = $state(0);
let experienceName = $state("ICAROS VR");
let hasOutputs = $state(false);
let lastProcessedTimestamp = 0;
const ws = createWebSocketClient();
const clock = new THREE.Clock();

let lastOrientation = { pitch: 0, roll: 0 };
let lastSpeed = { accelerate: false, brake: false };
let removeResizeListener: (() => void) | null = null;

onMount(() => {
	scene = new THREE.Scene();
	const dummyCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);

	// Load whichever experience is selected (persisted in localStorage). Its
	// manifest tells us which renderer backend to spin up.
	const experienceId = getActiveExperienceId();
	const wantsWebGPU = getExperience(experienceId).renderer === "webgpu";

	void (async () => {
		if (wantsWebGPU) {
			// Fresh WebGPU path — three/webgpu renderer (+ TSL + WebXR).
			// Dynamic import so the WebGL bundle stays untouched.
			const { WebGPURenderer } = await import("three/webgpu");
			// trackTimestamp: true enables GPU-Frame-Timing in der Dev-Konsole,
			// sofern Gerät/Browser das `timestamp-query`-Feature unterstützen.
			const r = new WebGPURenderer({
				canvas,
				antialias: true,
				trackTimestamp: true,
			});
			// three.js WebGPU dev panel (Inspector), as used in the official
			// webgpu_compute_particles_fluid example. Gives Performance (incl. GPU
			// frame timing via `trackTimestamp`), Console, Parameters and Viewer
			// tabs. WebGPU-only. MUST be assigned BEFORE `r.init()`: the panel's
			// DOM is mounted from inside the renderer's own init (it calls
			// `this._inspector.init()`), so assigning it afterwards would never
			// mount the panel. It self-mounts next to the canvas and ships its own
			// toggle button, so no manual DOM wiring is needed.
			const { Inspector } = await import(
				"three/addons/inspector/Inspector.js"
			);
			r.inspector = inspector = new Inspector();

			await r.init();

			renderer = r;
		} else {
			// Classic WebGL path used by every other experience.
			const r = new THREE.WebGLRenderer({ canvas, antialias: true });
			r.shadowMap.enabled = true;
			r.shadowMap.type = THREE.PCFSoftShadowMap;
			renderer = r;
		}

		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.xr.enabled = true;

		// Renderer der Dev-Konsole (Taste "C") melden — für beide Backends.
		// GPU-Timing gibt es nur unter WebGL; bei WebGPU bleibt nur GPU-ms "n/a".
		registerRenderer(renderer, "ICAROS VR");

		vrButton = VRButton.createButton(renderer as THREE.WebGLRenderer);
		document.body.appendChild(vrButton);

		const exp: ActiveExperience = await loadExperience(experienceId, {
			scene,
			camera: dummyCamera,
			renderer,
		});

		experienceName = exp.manifest.name;
		registerRenderer(renderer, exp.manifest.name);
		hasOutputs = (exp.manifest.outputs?.length ?? 0) > 0;
		const renderCamera = exp.state.camera as THREE.PerspectiveCamera;

		function onResize(): void {
			renderCamera.aspect = window.innerWidth / window.innerHeight;
			renderCamera.updateProjectionMatrix();
			renderer.setSize(window.innerWidth, window.innerHeight);
		}
		window.addEventListener("resize", onResize);
		removeResizeListener = () => window.removeEventListener("resize", onResize);

		renderer.setAnimationLoop(() => {
			const delta = clock.getDelta();

			const msg = ws.lastMessage;
			if (msg && msg.timestamp > lastProcessedTimestamp) {
				lastProcessedTimestamp = msg.timestamp;

				if (isOrientationData(msg)) {
					lastOrientation = { pitch: msg.pitch, roll: msg.roll };
				}
				if (isSpeedCommand(msg)) {
					lastSpeed = {
						accelerate: msg.action === "accelerate" && msg.active,
						brake: msg.action === "brake" && msg.active,
					};
				}
				if (isSettingsUpdate(msg)) {
					for (const key of Object.keys(msg.settings)) {
						exp.manifest.applySettings(
							key,
							msg.settings[key] as number | boolean | string,
							exp.state,
							scene,
						);
					}
				}
			}

			exp.manifest.updatePlayer(lastOrientation, lastSpeed, exp.state, delta);
			const result = exp.manifest.tick(exp.state, {
				delta,
				elapsed: clock.elapsedTime,
				camera: renderCamera,
				playerPosition: renderCamera.parent?.position ?? new THREE.Vector3(),
				playerRotation: renderCamera.parent?.rotation ?? new THREE.Euler(),
			});
			exp.state = result.state;
			if (result.outputs?.score !== undefined) {
				score = result.outputs.score as number;
			}

			if (exp.manifest.render) {
				exp.manifest.render(exp.state, {
					scene,
					renderer,
					camera: renderCamera,
					delta,
					elapsed: clock.elapsedTime,
				});
			} else {
				renderer.render(scene, renderCamera);
			}
		});
	})();

	return () => {
		removeResizeListener?.();
	};
});

onDestroy(() => {
	renderer?.setAnimationLoop(null);
	unregisterRenderer(renderer);
	if (scene) unloadExperience(scene);
	renderer?.dispose();
	inspector?.domElement.remove();
	inspector = null;
	vrButton?.remove();
	ws.disconnect();
});
</script>

<svelte:head>
	<title>{experienceName} | ICAROS VR</title>
</svelte:head>

<canvas bind:this={canvas} class="vr-canvas"></canvas>

{#if hasOutputs}
	<div class="score-overlay">
		<Trophy size={20} /> {score}
	</div>
{/if}

<div class="biome-overlay">{$currentBiomeStore ?? '—'}</div>
