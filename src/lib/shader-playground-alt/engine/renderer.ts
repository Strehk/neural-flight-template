/**
 * Shader Playground Renderer — Three.js preview with hot-reloadable ShaderMaterial.
 *
 * Factory pattern following metaballs.ts conventions:
 * createPlaygroundRenderer(canvas) → { updateShader, updateUniform, setGeometry, dispose }
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import DEFAULT_FRAGMENT from "../shaders/defaults/default.frag?raw";
import DEFAULT_VERTEX from "../shaders/defaults/default.vert?raw";
import type { GeometryType, PlaygroundRenderer, ShaderError } from "../types";
import { testCompileFragment, testCompileVertex } from "./compiler";

export { DEFAULT_FRAGMENT, DEFAULT_VERTEX };

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

export function createPlaygroundRenderer(
	canvas: HTMLCanvasElement,
): PlaygroundRenderer {
	const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

	const scene = new THREE.Scene();
	scene.background = new THREE.Color(0x111111);

	const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
	camera.position.set(0, 0, 3);
	camera.lookAt(0, 0, 0);

	// OrbitControls — user can rotate/zoom/pan
	const controls = new OrbitControls(camera, canvas);
	controls.enableDamping = true;
	controls.dampingFactor = 0.08;
	controls.autoRotate = true;
	controls.autoRotateSpeed = 1.0;

	const clock = new THREE.Clock();

	// Lighting system uniforms
	const LIGHT_DIR = new THREE.Vector3(0.5, 0.8, 0.6).normalize();
	let lightingEnabled = true;

	// System uniforms (always available)
	const systemUniforms: Record<string, THREE.IUniform> = {
		uTime: { value: 0 },
		uResolution: { value: new THREE.Vector2(1, 1) },
		uMouse: { value: new THREE.Vector2(0, 0) },
		uLightDir: { value: LIGHT_DIR.clone() },
		uLightIntensity: { value: 0.8 },
		uAmbient: { value: 0.3 },
	};

	// User uniforms (from shader code)
	const userUniforms: Record<string, THREE.IUniform> = {};

	let material = new THREE.ShaderMaterial({
		vertexShader: DEFAULT_VERTEX,
		fragmentShader: DEFAULT_FRAGMENT,
		uniforms: { ...systemUniforms },
	});

	let currentGeometryType: GeometryType = "sphere";
	let geometry = createGeometry(currentGeometryType);
	let mesh = new THREE.Mesh(geometry, material);
	scene.add(mesh);

	// Mouse tracking
	canvas.addEventListener("mousemove", (e) => {
		const rect = canvas.getBoundingClientRect();
		systemUniforms.uMouse.value.set(
			(e.clientX - rect.left) / rect.width,
			1.0 - (e.clientY - rect.top) / rect.height,
		);
	});

	// Per-frame callback (for modulation bridge)
	let tickCallback: ((dt: number) => void) | null = null;
	let lastTime = 0;

	// Animation loop
	renderer.setAnimationLoop(() => {
		const elapsed = clock.getElapsedTime();
		const dt = elapsed - lastTime;
		lastTime = elapsed;
		systemUniforms.uTime.value = elapsed;
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
			systemUniforms.uResolution.value.set(w, h);
		}
	}

	function updateShader(
		fragment: string,
		vertex: string | null,
	): ShaderError[] {
		const gl = renderer.getContext();
		const errors: ShaderError[] = [];

		// Test compile fragment (with precision prefix)
		errors.push(...testCompileFragment(gl, fragment));

		// Test compile vertex (with precision + Three.js built-in prefix)
		if (vertex) {
			errors.push(...testCompileVertex(gl, vertex));
		}

		if (errors.length > 0) return errors;

		// Build merged uniforms
		const mergedUniforms: Record<string, THREE.IUniform> = {
			...systemUniforms,
		};
		for (const [key, val] of Object.entries(userUniforms)) {
			mergedUniforms[key] = val;
		}

		// Replace material
		const newMaterial = new THREE.ShaderMaterial({
			vertexShader: vertex ?? DEFAULT_VERTEX,
			fragmentShader: fragment,
			uniforms: mergedUniforms,
		});

		mesh.material = newMaterial;
		material.dispose();
		material = newMaterial;

		return [];
	}

	const SYSTEM_UNIFORM_NAMES = new Set([
		"uTime",
		"uResolution",
		"uMouse",
		"uLightDir",
		"uLightIntensity",
		"uAmbient",
	]);

	function updateUniform(
		name: string,
		value: number | number[] | boolean,
	): void {
		if (SYSTEM_UNIFORM_NAMES.has(name)) return;

		if (!userUniforms[name]) {
			// Create new uniform
			userUniforms[name] = { value: uniformValue(value) };
			// Also set on current material
			material.uniforms[name] = userUniforms[name];
		} else {
			userUniforms[name].value = uniformValue(value);
		}
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
		return systemUniforms.uTime.value as number;
	}

	function getMaterial(): THREE.ShaderMaterial {
		return material;
	}

	function onTick(callback: ((dt: number) => void) | null): void {
		tickCallback = callback;
	}

	function setRotation(enabled: boolean): void {
		controls.autoRotate = enabled;
	}

	function setLighting(enabled: boolean): void {
		lightingEnabled = enabled;
		systemUniforms.uLightIntensity.value = enabled ? 0.8 : 0.0;
		systemUniforms.uAmbient.value = enabled ? 0.3 : 1.0;
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
		updateShader,
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

// ── Helpers ──

function uniformValue(
	value: number | number[] | boolean,
): number | THREE.Vector2 | THREE.Vector3 | THREE.Vector4 | boolean {
	if (typeof value === "boolean" || typeof value === "number") return value;
	if (value.length === 2) return new THREE.Vector2(value[0], value[1]);
	if (value.length === 3)
		return new THREE.Vector3(value[0], value[1], value[2]);
	if (value.length === 4)
		return new THREE.Vector4(value[0], value[1], value[2], value[3]);
	return value[0];
}
