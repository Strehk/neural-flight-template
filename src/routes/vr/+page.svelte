<script lang="ts">
import { onDestroy, onMount } from "svelte";
import * as THREE from "three";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
import { FlightPlayer } from "$lib/three/player";
import { createFlightScene } from "$lib/three/scene";
import { TerrainManager } from "$lib/three/terrain/manager";
import { createWater } from "$lib/three/terrain/water";
import { createSky } from "$lib/three/sky";
import { createClouds } from "$lib/three/clouds";
import { createWebSocketClient } from "$lib/ws/client.svelte";
import { isOrientationData, isSpeedCommand } from "$lib/ws/protocol";

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
	scene.add(createClouds());

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

	renderer.setAnimationLoop(() => {
		const delta = clock.getDelta();

		const msg = ws.lastMessage;
		if (msg) {
			if (isOrientationData(msg)) player.updateOrientation(msg);
			if (isSpeedCommand(msg)) player.updateSpeed(msg);
		}

		player.tick(delta);
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
	🏆 {score}
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
