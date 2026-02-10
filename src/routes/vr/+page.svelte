<script lang="ts">
import { Trophy } from "lucide-svelte";
import { onDestroy, onMount } from "svelte";
import * as THREE from "three";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
import {
	CAMERA,
	CLOUDS,
	FLIGHT,
	SCENE,
	SKY,
	TERRAIN,
	applySettings,
	runtimeConfig,
} from "$lib/config/flight";
import { createClouds, disposeClouds, updateClouds } from "$lib/three/clouds";
import { FlightPlayer } from "$lib/three/player";
import { createFlightScene } from "$lib/three/scene";
import { createSky, updateSkyColors } from "$lib/three/sky";
import { TerrainManager } from "$lib/three/terrain/manager";
import { createWater } from "$lib/three/terrain/water";
import { createWebSocketClient } from "$lib/ws/client.svelte";
import {
	isOrientationData,
	isSettingsUpdate,
	isSpeedCommand,
} from "$lib/ws/protocol";

let canvas: HTMLCanvasElement;
let renderer: THREE.WebGLRenderer;
let terrainManager: TerrainManager;
let vrButton: HTMLElement;
let score = $state(0);
let lastProcessedTimestamp = 0;
const ws = createWebSocketClient();
const clock = new THREE.Clock();

onMount(() => {
	const scene = createFlightScene({
		skyColor: SCENE.SKY_COLOR,
		fogNear: SCENE.FOG_NEAR,
		fogFar: SCENE.FOG_FAR,
		ambientIntensity: SCENE.AMBIENT_INTENSITY,
		sunIntensity: SCENE.SUN_INTENSITY,
		sunColor: SCENE.SUN_COLOR,
		sunPosition: SCENE.SUN_POSITION,
	});
	const player = new FlightPlayer({
		fov: CAMERA.FOV,
		near: CAMERA.NEAR,
		far: CAMERA.FAR,
		spawnPosition: FLIGHT.SPAWN_POSITION,
		baseSpeed: FLIGHT.BASE_SPEED,
		terrainSlowdown: FLIGHT.TERRAIN_SLOWDOWN,
	});
	scene.add(player.rig);

	terrainManager = new TerrainManager({
		chunkSize: TERRAIN.CHUNK_SIZE,
		maxPool: TERRAIN.MAX_POOL,
	});
	scene.add(terrainManager.group);
	scene.add(terrainManager.ringGroup);
	terrainManager.update(player.rig.position);

	const water = createWater({
		size: TERRAIN.WATER_SIZE,
		color: TERRAIN.WATER_COLOR,
		opacity: TERRAIN.WATER_OPACITY,
		y: TERRAIN.WATER_Y,
	});
	scene.add(water);
	const skyMesh = createSky({
		radius: SKY.RADIUS,
		detail: SKY.DETAIL,
		colorTop: SKY.COLOR_TOP,
		colorHorizon: SKY.COLOR_HORIZON,
		colorBottom: SKY.COLOR_BOTTOM,
	});
	scene.add(skyMesh);
	let clouds = createClouds({
		count: CLOUDS.COUNT,
		spread: CLOUDS.SPREAD,
		heightMin: CLOUDS.HEIGHT_MIN,
		heightMax: CLOUDS.HEIGHT_MAX,
		blobCount: CLOUDS.BLOB_COUNT,
		blobRadius: CLOUDS.BLOB_RADIUS,
		color: CLOUDS.COLOR,
		opacity: CLOUDS.OPACITY,
		driftSpeed: CLOUDS.DRIFT_SPEED,
		driftDirection: CLOUDS.DRIFT_DIRECTION,
	});
	scene.add(clouds);

	let cloudRebuildTimer: ReturnType<typeof setTimeout> | null = null;

	renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.xr.enabled = true;
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;

	vrButton = VRButton.createButton(renderer);
	document.body.appendChild(vrButton);

	function onResize(): void {
		player.camera.aspect = window.innerWidth / window.innerHeight;
		player.camera.updateProjectionMatrix();
		renderer.setSize(window.innerWidth, window.innerHeight);
	}
	window.addEventListener("resize", onResize);

	const sun = scene.children.find(
		(c): c is THREE.DirectionalLight => c instanceof THREE.DirectionalLight,
	);

	renderer.setAnimationLoop(() => {
		const delta = clock.getDelta();

		const msg = ws.lastMessage;
		if (msg && msg.timestamp > lastProcessedTimestamp) {
			lastProcessedTimestamp = msg.timestamp;

			if (isOrientationData(msg)) player.updateOrientation(msg);
			if (isSpeedCommand(msg)) player.updateSpeed(msg);
			if (isSettingsUpdate(msg)) {
				applySettings(msg.settings);
				const s = msg.settings;

				// Fog
				if (scene.fog instanceof THREE.Fog) {
					scene.fog.near = runtimeConfig.fogNear;
					scene.fog.far = runtimeConfig.fogFar;
					if (s.fogColor !== undefined)
						scene.fog.color.set(runtimeConfig.fogColor);
				}

				// Sun
				if (sun) {
					sun.intensity = runtimeConfig.sunIntensity;
					if (s.sunElevation !== undefined) {
						const elevRad = (runtimeConfig.sunElevation * Math.PI) / 180;
						const dist = 170;
						sun.position.set(
							80,
							Math.sin(elevRad) * dist,
							Math.cos(elevRad) * dist,
						);
					}
				}

				// Sky colors
				if (
					s.skyColorTop !== undefined ||
					s.skyColorHorizon !== undefined ||
					s.skyColorBottom !== undefined
				) {
					updateSkyColors(
						skyMesh,
						runtimeConfig.skyColorTop,
						runtimeConfig.skyColorHorizon,
						runtimeConfig.skyColorBottom,
					);
				}

				// Ring colors
				if (s.ringColor !== undefined) {
					terrainManager.updateRingColors(runtimeConfig.ringColor);
				}

				// Water level
				if (s.waterLevel !== undefined) {
					water.position.y = runtimeConfig.waterLevel;
				}

				// Terrain rebuild (amplitude/frequency changed)
				if (
					s.terrainAmplitude !== undefined ||
					s.terrainFrequency !== undefined
				) {
					terrainManager.rebuildAllChunks();
				}

				// Cloud opacity
				if (s.cloudOpacity !== undefined) {
					clouds.traverse((child) => {
						if (
							child instanceof THREE.Mesh &&
							child.material instanceof THREE.MeshStandardMaterial
						) {
							child.material.opacity = runtimeConfig.cloudOpacity;
						}
					});
				}

				// Cloud rebuild (debounced)
				if (s.cloudCount !== undefined || s.cloudHeight !== undefined) {
					if (cloudRebuildTimer) clearTimeout(cloudRebuildTimer);
					cloudRebuildTimer = setTimeout(() => {
						disposeClouds(clouds);
						scene.remove(clouds);
						clouds = createClouds({
							count: runtimeConfig.cloudCount,
							heightMin: runtimeConfig.cloudHeight - 50,
							heightMax: runtimeConfig.cloudHeight + 50,
						});
						scene.add(clouds);
						cloudRebuildTimer = null;
					}, 500);
				}
			}
		}

		player.tick(delta);
		if (runtimeConfig.cloudDriftEnabled) {
			updateClouds(clouds, delta, player.rig.position, runtimeConfig.windSpeed);
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
