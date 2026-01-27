<script lang="ts">
import { onDestroy, onMount } from "svelte";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { loadGLTF } from "$lib/three/loader";

interface Props {
	pitch: number;
	roll: number;
}

const { pitch, roll }: Props = $props();

let canvas: HTMLCanvasElement;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let model: THREE.Group;

const SIZE = 320;

onMount(async () => {
	const scene = new THREE.Scene();
	scene.background = new THREE.Color(0x18181b);

	const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
	camera.position.set(0, 2, -4.5);
	camera.lookAt(0, 1, 0);

	const ambient = new THREE.AmbientLight(0xffffff, 0.6);
	scene.add(ambient);
	const dir = new THREE.DirectionalLight(0xffffff, 1);
	dir.position.set(2, 3, 4);
	scene.add(dir);

	model = new THREE.Group();
	scene.add(model);

	try {
		const gltf = await loadGLTF("/models/icaros.glb");
		gltf.scene.scale.setScalar(2.5);
		model.add(gltf.scene);
	} catch {
		const placeholder = new THREE.Mesh(
			new THREE.BoxGeometry(1.2, 0.3, 0.6),
			new THREE.MeshStandardMaterial({ color: 0xa78bfa }),
		);
		placeholder.position.y = 0.5;
		model.add(placeholder);
	}

	renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
	renderer.setSize(SIZE, SIZE);
	renderer.setPixelRatio(window.devicePixelRatio);

	controls = new OrbitControls(camera, canvas);
	controls.enablePan = false;
	controls.enableZoom = false;
	controls.target.set(0, 0, 0);
	controls.minDistance = 3;
	controls.maxDistance = 8;
	controls.autoRotate = true;
	controls.update();

	renderer.setAnimationLoop(() => {
		controls.update();
		renderer.render(scene, camera);
	});
});

$effect(() => {
	if (!model) return;
	model.rotation.z = (pitch * Math.PI) / 180;
	model.rotation.x = -(roll * Math.PI) / 180;
});

onDestroy(() => {
	controls?.dispose();
	renderer?.setAnimationLoop(null);
	renderer?.dispose();
});
</script>

<canvas bind:this={canvas} width={SIZE} height={SIZE} class="preview-canvas"></canvas>

<style>
	.preview-canvas {
		border: 1px solid var(--border);
		display: block;
		margin: 0 auto;
		max-width: 100%;
		touch-action: none;
	}
</style>
