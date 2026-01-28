<script lang="ts">
import { onDestroy, onMount } from "svelte";
import * as THREE from "three";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
import { FlightPlayer } from "$lib/three/player";
import { createFlightScene } from "$lib/three/scene";
import { TerrainManager } from "$lib/three/terrain/manager";
import { createWater } from "$lib/three/terrain/water";
import { createSky } from "$lib/three/sky";
import { createClouds, updateClouds } from "$lib/three/clouds";
import { Trophy } from "lucide-svelte";
import { createWebSocketClient } from "$lib/ws/client.svelte";
import { isOrientationData, isSettingsUpdate, isSpeedCommand } from "$lib/ws/protocol";
import { applySettings, runtimeConfig } from "$lib/config/flight";

let canvas: HTMLCanvasElement;
let renderer: THREE.WebGLRenderer;
let terrainManager: TerrainManager;
let score = $state(0);
const ws = createWebSocketClient();
const clock = new THREE.Clock();

onMount(() => {
	const scene = createFlightScene();
	const player = new FlightPlayer();
	scene.add(player.rig);

	terrainManager = new TerrainManager();
	scene.add(terrainManager.group);
	scene.add(terrainManager.ringGroup);
	terrainManager.update(player.rig.position);

	scene.add(createWater());
	scene.add(createSky());
	const clouds = createClouds();
	scene.add(clouds);

	renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.xr.enabled = true;

	document.body.appendChild(VRButton.createButton(renderer));

	function onResize(): void {
		player.camera.aspect = window.innerWidth / window.innerHeight;
		player.camera.updateProjectionMatrix();
		renderer.setSize(window.innerWidth, window.innerHeight);
	}
	window.addEventListener("resize", onResize);

	const sun = scene.children.find((c): c is THREE.DirectionalLight => c instanceof THREE.DirectionalLight);

	renderer.setAnimationLoop(() => {
		const delta = clock.getDelta();

		const msg = ws.lastMessage;
		if (msg) {
			if (isOrientationData(msg)) player.updateOrientation(msg);
			if (isSpeedCommand(msg)) player.updateSpeed(msg);
			if (isSettingsUpdate(msg)) {
				applySettings(msg.settings);
				if (scene.fog instanceof THREE.Fog) {
					scene.fog.near = runtimeConfig.fogNear;
					scene.fog.far = runtimeConfig.fogFar;
				}
				if (sun) sun.intensity = runtimeConfig.sunIntensity;
			}
		}

		player.tick(delta);
		if (runtimeConfig.cloudDriftEnabled) {
			updateClouds(clouds, delta, player.rig.position);
		}
		score += terrainManager.update(player.rig.position);
		renderer.render(scene, player.camera);
	});

	return () => {
		window.removeEventListener("resize", onResize);
	};
});

onDestroy(() => {
	renderer?.setAnimationLoop(null);
	renderer?.dispose();
	terrainManager?.dispose();
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
