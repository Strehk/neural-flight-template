<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as THREE from 'three';
	import { createGradientSky } from '$lib/three/lab/gradient_sky';
	import { createStarfield } from '$lib/three/lab/starfield';
	import { createPostProcessing, type PostProcessingResult } from '$lib/three/lab/post_processing';
	import { generateLabyrinthChunk, disposeLabyrinthChunk, type LabyrinthConfig } from '$lib/three/lab/labyrinth';

	let canvas: HTMLCanvasElement;
	let renderer: THREE.WebGLRenderer;
	let pp: PostProcessingResult;

	onMount(() => {
		// ── Renderer ──
		renderer = new THREE.WebGLRenderer({
			canvas,
			antialias: true,
			logarithmicDepthBuffer: true,
		});
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 0.7;

		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(
			65,
			window.innerWidth / window.innerHeight,
			0.5,
			150,
		);

		// ── Atmosphere — denser fog for depth layering ──
		scene.fog = new THREE.FogExp2(0x080412, 0.022);

		// ── Sky + Stars ──
		scene.add(
			createGradientSky({
				colorTop: new THREE.Color(0x020206),
				colorMiddle: new THREE.Color(0x6b1d4a),
				colorBottom: new THREE.Color(0x3a1a0e),
				radius: 80,
				horizonHeight: 0.38,
			}),
		);
		scene.add(createStarfield({ count: 3000, radius: 70 }));

		// ── 3D Chunk Grid — labyrinth extends in all dimensions ──
		const CHUNK = 15;
		const RADIUS = 2;
		const MAX_DIST_SQ = (RADIUS + 0.5) * (RADIUS + 0.5);
		const chunks3D = new Map<string, THREE.Group>();
		let lastCamChunk = '';

		const labConfig: LabyrinthConfig = {
			maxDepth: 3,
			minCellSize: 5.0,
			wallProbability: 0.5,
			translucencyChance: 0.4,
			overlayChance: 0.15,
			seed: 7,
		};

		function update3DChunks(cx: number, cy: number, cz: number): void {
			const ix = Math.floor(cx / CHUNK);
			const iy = Math.floor(cy / CHUNK);
			const iz = Math.floor(cz / CHUNK);
			const key = `${ix},${iy},${iz}`;
			if (key === lastCamChunk) return;
			lastCamChunk = key;

			const needed = new Set<string>();

			for (let dx = -RADIUS; dx <= RADIUS; dx++) {
				for (let dy = -RADIUS; dy <= RADIUS; dy++) {
					for (let dz = -RADIUS; dz <= RADIUS; dz++) {
						// Sphere culling — skip far corners
						if (dx * dx + dy * dy + dz * dz > MAX_DIST_SQ) continue;

						const ci = ix + dx;
						const cj = iy + dy;
						const ck = iz + dz;
						const ck3 = `${ci},${cj},${ck}`;
						needed.add(ck3);

						if (!chunks3D.has(ck3)) {
							const group = generateLabyrinthChunk(
								{
									minX: ci * CHUNK,
									maxX: (ci + 1) * CHUNK,
									minY: cj * CHUNK,
									maxY: (cj + 1) * CHUNK,
									minZ: ck * CHUNK,
									maxZ: (ck + 1) * CHUNK,
								},
								labConfig,
							);
							chunks3D.set(ck3, group);
							scene.add(group);
						}
					}
				}
			}

			// Remove chunks outside sphere
			for (const [k, group] of chunks3D) {
				if (!needed.has(k)) {
					scene.remove(group);
					disposeLabyrinthChunk(group);
					chunks3D.delete(k);
				}
			}
		}

		// ── Generative colored light sources (orbit around camera) ──
		const glowGroup = new THREE.Group();
		const glowConfigs = [
			{ color: [0.6, 0.3, 0.15], size: 0.4, radius: 8, speed: 0.15, phase: 0, yOff: 4, zOff: -30 },
			{ color: [0.3, 0.12, 0.5], size: 0.3, radius: 6, speed: 0.22, phase: 1.2, yOff: 7, zOff: -15 },
			{ color: [0.12, 0.4, 0.3], size: 0.25, radius: 10, speed: 0.12, phase: 2.5, yOff: 2, zOff: -40 },
			{ color: [0.5, 0.15, 0.35], size: 0.2, radius: 5, speed: 0.3, phase: 3.8, yOff: 9, zOff: -22 },
			{ color: [0.2, 0.5, 0.1], size: 0.2, radius: 7, speed: 0.18, phase: 5.0, yOff: 1, zOff: -35 },
		];
		const glowMeshes: THREE.Mesh[] = [];
		for (const gc of glowConfigs) {
			const geo = new THREE.SphereGeometry(gc.size, 12, 12);
			const mat = new THREE.MeshBasicMaterial({
				color: new THREE.Color(gc.color[0], gc.color[1], gc.color[2]),
				toneMapped: false,
			});
			const mesh = new THREE.Mesh(geo, mat);
			glowGroup.add(mesh);
			glowMeshes.push(mesh);
		}
		scene.add(glowGroup);
		scene.add(new THREE.AmbientLight(0x221133, 0.15));

		// ── Corridor focal light — warm glow in the depth ──
		const corridorLight = new THREE.PointLight(0xd4a070, 0.8, 40, 1.5);
		scene.add(corridorLight);

		const focalGeo = new THREE.SphereGeometry(0.6, 12, 12);
		const focalMat = new THREE.MeshBasicMaterial({
			color: new THREE.Color(0.4, 0.25, 0.12),
			toneMapped: false,
		});
		const focalMesh = new THREE.Mesh(focalGeo, focalMat);
		scene.add(focalMesh);

		// ── Post-processing ──
		pp = createPostProcessing(renderer, scene, camera, {
			bloomStrength: 0.5,
			bloomThreshold: 0.7,
			bloomRadius: 0.6,
			grainIntensity: 0.10,
			vignetteIntensity: 0.55,
			afterimageDecay: 0.96,
		});

		// ── Camera animation — infinite forward dolly + smooth collision avoidance ──
		const speed = 1.0;
		const clock = new THREE.Clock();

		// Smooth collision avoidance via raycasting
		const raycaster = new THREE.Raycaster();
		const avoidDistance = 5.0;
		const avoidStrength = 1.5;
		const smoothing = 0.8;
		const avoidOffset = new THREE.Vector3();
		const rayDirs = [
			new THREE.Vector3(1, 0, 0),
			new THREE.Vector3(-1, 0, 0),
			new THREE.Vector3(0, 1, 0),
			new THREE.Vector3(0, -1, 0),
			new THREE.Vector3(1, 0, -1).normalize(),
			new THREE.Vector3(-1, 0, -1).normalize(),
			new THREE.Vector3(0, 1, -1).normalize(),
			new THREE.Vector3(0, -1, -1).normalize(),
		];

		renderer.setAnimationLoop(() => {
			const delta = clock.getDelta();
			const t = clock.elapsedTime;

			// Forward movement
			const zPos = -(t * speed);

			// Gentle lateral + vertical drift
			const xDrift = Math.sin(t * 0.12) * 2.5;
			const yBase = 5.0;
			const yDrift = Math.sin(t * 0.08) * 1.5;

			const desiredX = xDrift;
			const desiredY = yBase + yDrift;

			// Raycast collision avoidance — quadratic falloff
			const repulsion = new THREE.Vector3();
			const camPos = camera.position;

			for (const dir of rayDirs) {
				raycaster.set(camPos, dir);
				raycaster.far = avoidDistance;
				const hits = raycaster.intersectObjects(scene.children, true);
				if (hits.length > 0) {
					const ratio = 1.0 - hits[0].distance / avoidDistance;
					const force = ratio * ratio * avoidStrength;
					repulsion.addScaledVector(dir, -force);
				}
			}

			avoidOffset.lerp(repulsion, 1.0 - Math.exp(-smoothing * delta));

			camera.position.set(
				desiredX + avoidOffset.x,
				desiredY + avoidOffset.y,
				zPos + avoidOffset.z,
			);

			// Look ahead with subtle drift
			const lookX = desiredX * 0.3 + Math.sin(t * 0.1) * 0.5;
			const lookY = yBase + Math.sin(t * 0.17) * 0.4;
			camera.lookAt(lookX, lookY, zPos - 25);

			// Animate glow spheres — each orbits independently around camera
			for (let i = 0; i < glowMeshes.length; i++) {
				const gc = glowConfigs[i];
				const angle = t * gc.speed + gc.phase;
				glowMeshes[i].position.set(
					camPos.x + Math.sin(angle) * gc.radius,
					camPos.y + gc.yOff + Math.sin(angle * 0.7) * 2.0,
					zPos + gc.zOff + Math.cos(angle) * gc.radius * 0.5,
				);
			}

			// Track corridor focal light ahead of camera
			corridorLight.position.set(desiredX * 0.5, yBase, zPos - 20);
			focalMesh.position.copy(corridorLight.position);

			// 3D chunk management — generate/dispose based on camera position
			update3DChunks(camPos.x, camPos.y, camPos.z);

			pp.update(delta);
		});

		// ── Resize ──
		const onResize = () => {
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(window.innerWidth, window.innerHeight);
			pp.composer.setSize(window.innerWidth, window.innerHeight);
		};
		window.addEventListener('resize', onResize);
	});

	onDestroy(() => {
		renderer?.setAnimationLoop(null);
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
