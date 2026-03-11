/**
 * Shader Playground Renderer v3 — TSL-based with WebGPURenderer.
 *
 * Factory pattern: createPlaygroundRenderer(canvas) → Promise<PlaygroundRenderer>
 * Uses MeshStandardNodeMaterial with colorNode/positionNode for TSL composition.
 * Scene lights replace manual GLSL lighting uniforms.
 */

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { vec4 } from "three/tsl";
import * as THREE from "three/webgpu";
import type { GeometryType, PlaygroundRenderer } from "../types";

// ── Geometry Factory ──

function createGeometry(type: GeometryType): THREE.BufferGeometry {
	switch (type) {
		case "plane":
			return new THREE.PlaneGeometry(2, 2);
		case "sphere":
			return new THREE.SphereGeometry(1, 64, 64);
		case "cube":
			return new THREE.BoxGeometry(1.5, 1.5, 1.5);
		case "torus":
			return new THREE.TorusGeometry(0.7, 0.3, 32, 64);
		case "cylinder":
			return new THREE.CylinderGeometry(0.7, 0.7, 1.5, 64);
	}
}

// ── Renderer Factory ──

export async function createPlaygroundRenderer(
	canvas: HTMLCanvasElement,
): Promise<PlaygroundRenderer> {
	const renderer = new THREE.WebGPURenderer({ canvas, antialias: true });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	await renderer.init();

	const scene = new THREE.Scene();
	scene.background = new THREE.Color(0x111111);

	const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
	camera.position.set(0, 0, 3);
	camera.lookAt(0, 0, 0);

	// Scene lighting (replaces manual GLSL uLightDir/uLightIntensity/uAmbient)
	const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
	directionalLight.position.set(0.5, 0.8, 0.6).normalize();
	scene.add(directionalLight);

	const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
	scene.add(ambientLight);

	// OrbitControls
	const controls = new OrbitControls(camera, canvas);
	controls.enableDamping = true;
	controls.dampingFactor = 0.08;
	controls.autoRotate = true;
	controls.autoRotateSpeed = 1.0;

	const clock = new THREE.Clock();

	// Default TSL material — solid purple
	let material = new THREE.MeshStandardNodeMaterial();
	material.colorNode = vec4(0.5, 0.3, 0.8, 1.0);

	let currentGeometryType: GeometryType = "sphere";
	let geometry = createGeometry(currentGeometryType);
	let mesh = new THREE.Mesh(geometry, material);
	scene.add(mesh);

	// Per-frame callback (for modulation bridge)
	let tickCallback: ((dt: number) => void) | null = null;
	let lastTime = 0;

	// Animation loop
	renderer.setAnimationLoop(() => {
		const elapsed = clock.getElapsedTime();
		const dt = elapsed - lastTime;
		lastTime = elapsed;
		tickCallback?.(dt);

		controls.update();
		renderer.render(scene, camera);
	});

	function updateSize(): void {
		const w = canvas.clientWidth;
		const h = canvas.clientHeight;
		if (canvas.width !== w || canvas.height !== h) {
			renderer.setSize(w, h, false);
			camera.aspect = w / h;
			camera.updateProjectionMatrix();
		}
	}

	function applyNodes(
		colorNode: THREE.Node | null,
		positionNode: THREE.Node | null,
	): void {
		const newMaterial = new THREE.MeshStandardNodeMaterial();
		if (colorNode) {
			newMaterial.colorNode = colorNode;
		} else {
			newMaterial.colorNode = vec4(0.5, 0.3, 0.8, 1.0);
		}
		if (positionNode) {
			newMaterial.positionNode = positionNode;
		}

		mesh.material = newMaterial;
		material.dispose();
		material = newMaterial;
	}

	function updateUniform(
		_name: string,
		_value: number | number[] | boolean,
	): void {
		// Legacy bridge — uniform updates now happen via direct ref.value in state
		// Kept for transition compatibility
	}

	function setGeometry(type: GeometryType): void {
		if (type === currentGeometryType) return;
		currentGeometryType = type;
		scene.remove(mesh);
		geometry.dispose();
		geometry = createGeometry(type);
		mesh = new THREE.Mesh(geometry, material);
		scene.add(mesh);
	}

	function resize(): void {
		updateSize();
	}

	function getTime(): number {
		return clock.getElapsedTime();
	}

	function getMaterial(): THREE.MeshStandardNodeMaterial {
		return material;
	}

	function onTick(callback: ((dt: number) => void) | null): void {
		tickCallback = callback;
	}

	function setRotation(enabled: boolean): void {
		controls.autoRotate = enabled;
	}

	function setLighting(enabled: boolean): void {
		directionalLight.intensity = enabled ? 0.8 : 0.0;
		ambientLight.intensity = enabled ? 0.3 : 1.0;
	}

	function dispose(): void {
		renderer.setAnimationLoop(null);
		controls.dispose();
		geometry.dispose();
		material.dispose();
		renderer.dispose();
	}

	// Initial size
	updateSize();

	return {
		canvas,
		applyNodes,
		updateUniform,
		setGeometry,
		setRotation,
		setLighting,
		getTime,
		getMaterial,
		onTick,
		resize,
		dispose,
	};
}
