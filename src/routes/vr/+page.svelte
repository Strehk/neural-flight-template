<script lang="ts">
import { Trophy } from "lucide-svelte";
import { onDestroy, onMount } from "svelte";
import * as THREE from "three";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
import { applySettings as applyRuntimeSettings } from "$lib/config/flight";
import { loadExperience, unloadExperience } from "$lib/experiences/loader";
import type { ActiveExperience } from "$lib/experiences/loader";
import { createWebSocketClient } from "$lib/ws/client.svelte";
import {
	isOrientationData,
	isSettingsUpdate,
	isSpeedCommand,
} from "$lib/ws/protocol";

let canvas: HTMLCanvasElement;
let renderer: THREE.WebGLRenderer;
let scene: THREE.Scene;
let vrButton: HTMLElement;
let score = $state(0);
let lastProcessedTimestamp = 0;
const ws = createWebSocketClient();
const clock = new THREE.Clock();

let lastOrientation = { pitch: 0, roll: 0 };
let lastSpeed = { accelerate: false, brake: false };
let removeResizeListener: (() => void) | null = null;

onMount(() => {
	scene = new THREE.Scene();
	const dummyCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);

	renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.xr.enabled = true;
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;

	vrButton = VRButton.createButton(renderer);
	document.body.appendChild(vrButton);

	loadExperience("mountain-flight", { scene, camera: dummyCamera, renderer }).then(
		(exp: ActiveExperience) => {
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
						applyRuntimeSettings(msg.settings);
						for (const key of Object.keys(msg.settings)) {
							exp.manifest.applySettings(
								key,
								msg.settings[key] as number,
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

				renderer.render(scene, renderCamera);
			});
		},
	);

	return () => {
		removeResizeListener?.();
	};
});

onDestroy(() => {
	renderer?.setAnimationLoop(null);
	if (scene) unloadExperience(scene);
	renderer?.dispose();
	vrButton?.remove();
	ws.disconnect();
});
</script>

<svelte:head>
	<title>ICAROS VR Flight</title>
</svelte:head>

<canvas bind:this={canvas} class="vr-canvas"></canvas>

<div class="score-overlay">
	<Trophy size={20} /> {score}
</div>

<style>
	.vr-canvas {
		display: block;
		width: 100vw;
		height: 100dvh;
	}
	.score-overlay {
		position: fixed;
		top: 1rem;
		right: 1rem;
		background: rgba(0, 0, 0, 0.7);
		color: #f1c40f;
		font-size: 1.5rem;
		font-weight: bold;
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		pointer-events: none;
		z-index: 10;
		font-family: monospace;
	}
</style>
