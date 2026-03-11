<script lang="ts">
import { onDestroy, onMount } from "svelte";
import * as THREE from "three/webgpu";
import { createGradientSky } from "$lib/three/gradient-sky";
import {
	createMetaballs,
	type MetaballsResult,
} from "$lib/three/lab/metaballs";
import {
	createPostProcessing,
	type PostProcessingResult,
} from "$lib/three/lab/post_processing";
import {
	createReflectiveWater,
	type ReflectiveWaterResult,
} from "$lib/three/lab/reflective_water";
import { createStarfield } from "$lib/three/starfield";

let canvas: HTMLCanvasElement;
let renderer: THREE.WebGPURenderer;
let pp: PostProcessingResult;
let metaballs: MetaballsResult;
let water: ReflectiveWaterResult;

onMount(async () => {
	// ── Renderer ──
	renderer = new THREE.WebGPURenderer({ canvas, antialias: true });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 0.9;
	await renderer.init();

	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(
		55,
		window.innerWidth / window.innerHeight,
		0.1,
		200,
	);
	camera.position.set(0, 5, 20);
	camera.lookAt(0, 3, 0);

	// ── Sky — near-black dome ──
	scene.add(
		createGradientSky({
			colors: [0x080820, 0x050518, 0x010108],
			radius: 80,
		}),
	);

	// ── Stars — subtle backdrop ──
	scene.add(
		createStarfield({ count: 3000, radius: 70, minSize: 0.1, maxSize: 0.5 }),
	);

	// ── Lights — reduced ambient for PBR (env-map provides fill) ──
	scene.add(new THREE.AmbientLight(0xffffff, 0.6));

	const dirLight = new THREE.DirectionalLight(0xccccff, 0.4);
	dirLight.position.set(5, 10, 5);
	scene.add(dirLight);

	const neonPoint = new THREE.PointLight(0x00ffff, 1.2, 30);
	neonPoint.position.set(0, 5, 0);
	scene.add(neonPoint);

	const neonPoint2 = new THREE.PointLight(0xff00ff, 1.0, 30);
	neonPoint2.position.set(-3, 4, 2);
	scene.add(neonPoint2);

	const neonPoint3 = new THREE.PointLight(0xffff00, 0.8, 25);
	neonPoint3.position.set(2, 6, -1);
	scene.add(neonPoint3);

	// ── Environment map — capture sky + neon lights for PBR reflections ──
	const pmremGenerator = new THREE.PMREMGenerator(renderer);
	const envMap = pmremGenerator.fromScene(scene).texture;
	scene.environment = envMap;
	pmremGenerator.dispose();

	// ── Metaballs — floating above water ──
	metaballs = createMetaballs({ resolution: 48, scale: 10, envMap });
	metaballs.mesh.position.set(0, 3, 0);
	scene.add(metaballs.mesh);

	// ── Reflective water — dark mirror at y=0 ──
	water = createReflectiveWater({
		size: 80,
		waveSpeed: 0.3,
		waveScale: 8.0,
		tintColor: new THREE.Color(0x030315),
	});
	water.mesh.position.y = 0;
	scene.add(water.mesh);

	// ── Post-processing — strong bloom for neon glow ──
	pp = createPostProcessing(renderer, scene, camera, {
		bloomStrength: 1.8,
		bloomThreshold: 0.25,
		bloomRadius: 1.0,
		grainIntensity: 0.04,
		vignetteIntensity: 0.3,
	});

	// ── Animation loop ──
	const clock = new THREE.Clock();

	renderer.setAnimationLoop(() => {
		const delta = clock.getDelta();
		const t = clock.elapsedTime;
		const slow = t * 0.25;

		metaballs.update(slow);
		water.update(slow);

		camera.position.x = Math.sin(slow * 0.4) * 1.0;
		camera.position.y = 5 + Math.sin(slow * 0.5) * 0.3;
		camera.lookAt(0, 3, 0);

		neonPoint.position.set(
			Math.sin(slow * 0.6) * 3,
			5 + Math.sin(slow * 0.8) * 1,
			Math.cos(slow * 0.5) * 3,
		);
		neonPoint2.position.set(
			Math.cos(slow * 0.7) * 3.5,
			4 + Math.cos(slow * 0.6) * 1,
			Math.sin(slow * 0.55) * 3.5,
		);
		neonPoint3.position.set(
			Math.sin(slow * 0.45) * 2,
			6 + Math.sin(slow * 0.5) * 0.8,
			Math.cos(slow * 0.6) * 2,
		);

		pp.update(delta);
	});

	// ── Resize ──
	const onResize = () => {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		renderer.setSize(window.innerWidth, window.innerHeight);
	};
	window.addEventListener("resize", onResize);
});

onDestroy(() => {
	renderer?.setAnimationLoop(null);
	metaballs?.dispose();
	water?.dispose();
	pp?.dispose();
	renderer?.dispose();
});
</script>

<canvas bind:this={canvas}></canvas>

<style>
	canvas {
		display: block;
		width: 100vw;
		height: 100vh;
	}

	:global(body) {
		margin: 0;
		overflow: hidden;
	}
</style>
