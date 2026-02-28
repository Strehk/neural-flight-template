// ============================================================================
// scene.ts — Infinite Psychedelic Shader Landscape with ICAROS Flight
//
// 5 shader layers creating an alien lava-lamp landscape:
//
//   Layer 0: FlightPlayer  — ICAROS-driven flight physics (shared lib)
//   Layer 1: Terrain        — PlaneGeometry + world-space FBM + cosine palette
//                             + Gaussian bumps that grow and pinch off
//   Layer 2: Water          — PlaneGeometry + world-space Gerstner + caustics
//   Layer 3: Bubbles        — InstancedMesh lava-lamp blobs rising from terrain
//   Layer 4: Particles      — Points with pulsing glow (follow player)
//   Layer 5: Sky            — IcosahedronGeometry dome with vertex colors
//
// HOW INFINITE TERRAIN WORKS:
//   Terrain + water meshes follow the player each frame. Both vertex shaders
//   sample noise from WORLD-SPACE coordinates (via modelMatrix), so the noise
//   pattern stays spatially stable even as the mesh moves.
//   Terrain height scrolling is inherent to this approach — not a bug.
//
// LAVA LAMP EFFECT:
//   8 bump slots on the terrain grow as Gaussian hills (GPU vertex shader).
//   When a bump's phase reaches 1.0, an InstancedMesh blob spawns at the peak
//   and rises with wobble. Bumps reset with new random position near player.
//
// Quest 3 budget:
//   Terrain:  160×160 = ~51k tris | Water: 64×64 = ~8k tris
//   Bubbles:  16 × ~320 = ~5k tris | Particles: 600 points
//   Sky:      ~320 tris | Total: ~65k — within 72fps stereo budget
// ============================================================================

import * as THREE from "three";
import { FlightPlayer } from "$lib/three/player";
import { createSky } from "$lib/three/sky";
import type { ExperienceState, SetupContext, TickContext } from "../types";
import {
	createBubbleMaterial,
	createParticleMaterial,
	createTerrainMaterial,
	createWaterMaterial,
	initSnippets,
	updateTime,
} from "./shaders";

// ── State ──────────────────────────────────────────────────────────────────

export interface ShaderDemoState extends ExperienceState {
	player: FlightPlayer;
	terrain: { mesh: THREE.Mesh; material: THREE.ShaderMaterial };
	water: { mesh: THREE.Mesh; material: THREE.ShaderMaterial };
	bubbles: {
		mesh: THREE.InstancedMesh;
		material: THREE.ShaderMaterial;
		positions: Float32Array;
		phases: Float32Array;
		speeds: Float32Array;
		scales: Float32Array;
		targetScales: Float32Array;
		active: Uint8Array;
	};
	bumps: {
		centers: Float32Array;
		phases: Float32Array;
		radii: Float32Array;
		speeds: Float32Array;
	};
	sky: THREE.Mesh;
	particles: { points: THREE.Points; material: THREE.ShaderMaterial };
	camera: THREE.PerspectiveCamera;
}

// ── Constants ────────────────────────────────────────────────────────────

const BUBBLE_COUNT = 16;
const BUBBLE_SPAWN_RADIUS = 80;
const BUBBLE_MAX_Y = 70;
const BUBBLE_MIN_SCALE = 1.5;
const BUBBLE_MAX_SCALE = 4.0;
const BUBBLE_EMERGE_SPEED = 0.67; // 1/1.5s — scale growth rate

const BUMP_COUNT = 8;
const BUMP_SPAWN_RADIUS = 60;
const BUMP_MIN_RADIUS = 8;
const BUMP_MAX_RADIUS = 20;
const BUMP_MIN_SPEED = 0.15;
const BUMP_MAX_SPEED = 0.4;

// ── Reusable matrix/vector for tick ──────────────────────────────────────

const _matrix = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _scale = new THREE.Vector3();
const _quat = new THREE.Quaternion();

// ── Helper: Initialize bump data ──────────────────────────────────────────

function initBumps(): ShaderDemoState["bumps"] {
	const centers = new Float32Array(BUMP_COUNT * 2);
	const phases = new Float32Array(BUMP_COUNT);
	const radii = new Float32Array(BUMP_COUNT);
	const speeds = new Float32Array(BUMP_COUNT);

	for (let i = 0; i < BUMP_COUNT; i++) {
		const angle = Math.random() * Math.PI * 2;
		const dist = 10 + Math.random() * BUMP_SPAWN_RADIUS;
		centers[i * 2] = Math.cos(angle) * dist;
		centers[i * 2 + 1] = Math.sin(angle) * dist;
		phases[i] = Math.random() * 0.3;
		radii[i] =
			BUMP_MIN_RADIUS + Math.random() * (BUMP_MAX_RADIUS - BUMP_MIN_RADIUS);
		speeds[i] =
			BUMP_MIN_SPEED + Math.random() * (BUMP_MAX_SPEED - BUMP_MIN_SPEED);
	}
	return { centers, phases, radii, speeds };
}

// ── Helper: Initialize bubble data (all inactive) ────────────────────────

interface BubbleArrays {
	positions: Float32Array;
	phases: Float32Array;
	speeds: Float32Array;
	scales: Float32Array;
	targetScales: Float32Array;
	active: Uint8Array;
}

function initBubbles(): BubbleArrays {
	const phases = new Float32Array(BUBBLE_COUNT);
	for (let i = 0; i < BUBBLE_COUNT; i++) {
		phases[i] = Math.random() * Math.PI * 2;
	}
	return {
		positions: new Float32Array(BUBBLE_COUNT * 3),
		phases,
		speeds: new Float32Array(BUBBLE_COUNT),
		scales: new Float32Array(BUBBLE_COUNT),
		targetScales: new Float32Array(BUBBLE_COUNT),
		active: new Uint8Array(BUBBLE_COUNT),
	};
}

// ── Helper: Activate bubble at bump peak ─────────────────────────────────

function activateBubbleAtBump(
	bubbles: ShaderDemoState["bubbles"],
	bumpX: number,
	bumpZ: number,
	bumpPhase: number,
	terrainHeight: number,
): void {
	let idx = -1;
	for (let i = 0; i < BUBBLE_COUNT; i++) {
		if (bubbles.active[i] === 0) {
			idx = i;
			break;
		}
	}
	if (idx === -1) return;

	bubbles.active[idx] = 1;
	bubbles.positions[idx * 3] = bumpX;
	// Spawn at bump peak height — base terrain + bump contribution
	const bumpPeakH = terrainHeight * 0.3 + bumpPhase * terrainHeight * 0.7;
	bubbles.positions[idx * 3 + 1] = bumpPeakH;
	bubbles.positions[idx * 3 + 2] = bumpZ;
	bubbles.speeds[idx] = 1.5 + Math.random() * 2.0;
	// Start small, grow to target — emergence effect
	bubbles.scales[idx] = 0.3;
	bubbles.targetScales[idx] =
		BUBBLE_MIN_SCALE +
		Math.random() * (BUBBLE_MAX_SCALE - BUBBLE_MIN_SCALE) * 1.3;
}

// ── Helper: Reset bump to new random position ────────────────────────────

function resetBump(
	i: number,
	bumps: ShaderDemoState["bumps"],
	playerX: number,
	playerZ: number,
): void {
	const angle = Math.random() * Math.PI * 2;
	const dist = 15 + Math.random() * BUMP_SPAWN_RADIUS;
	bumps.centers[i * 2] = playerX + Math.cos(angle) * dist;
	bumps.centers[i * 2 + 1] = playerZ + Math.sin(angle) * dist;
	bumps.phases[i] = 0;
	bumps.radii[i] =
		BUMP_MIN_RADIUS + Math.random() * (BUMP_MAX_RADIUS - BUMP_MIN_RADIUS);
	bumps.speeds[i] =
		BUMP_MIN_SPEED + Math.random() * (BUMP_MAX_SPEED - BUMP_MIN_SPEED);
}

// ── Helper: Create particle field ────────────────────────────────────────

function createParticles(count: number): {
	points: THREE.Points;
	material: THREE.ShaderMaterial;
} {
	const positions = new Float32Array(count * 3);
	const phases = new Float32Array(count);

	for (let i = 0; i < count; i++) {
		positions[i * 3] = (Math.random() - 0.5) * 200;
		positions[i * 3 + 1] = Math.random() * 50 + 15;
		positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
		phases[i] = Math.random() * Math.PI * 2;
	}

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
	geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));

	const material = createParticleMaterial();
	return { points: new THREE.Points(geometry, material), material };
}

// ── Setup ────────────────────────────────────────────────────────────────

export async function setup(ctx: SetupContext): Promise<ShaderDemoState> {
	initSnippets();

	const player = new FlightPlayer({
		fov: 75,
		near: 0.1,
		far: 1000,
		spawnPosition: { x: 0, y: 50, z: 0 },
		baseSpeed: 15,
	});
	ctx.scene.add(player.rig);

	// ── Terrain (infinite) — 160×160 for smoother bump normals ──
	const terrainGeo = new THREE.PlaneGeometry(512, 512, 160, 160);
	terrainGeo.rotateX(-Math.PI / 2);
	const terrainMat = createTerrainMaterial();
	const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
	ctx.scene.add(terrainMesh);

	// ── Water (infinite) ──
	const waterGeo = new THREE.PlaneGeometry(512, 512, 64, 64);
	waterGeo.rotateX(-Math.PI / 2);
	const waterMat = createWaterMaterial();
	const waterMesh = new THREE.Mesh(waterGeo, waterMat);
	waterMesh.position.y = 8;
	ctx.scene.add(waterMesh);

	// ── Lava Lamp Bubbles — smooth icosahedron (detail=3 → 320 faces) ──
	const bubbleGeo = new THREE.IcosahedronGeometry(1, 3);
	const bubbleMat = createBubbleMaterial();
	const bubbleMesh = new THREE.InstancedMesh(
		bubbleGeo,
		bubbleMat,
		BUBBLE_COUNT,
	);
	bubbleMesh.frustumCulled = false;
	ctx.scene.add(bubbleMesh);

	const bubbleArrays = initBubbles();
	for (let i = 0; i < BUBBLE_COUNT; i++) {
		_pos.set(0, -100, 0);
		_scale.setScalar(0);
		_matrix.compose(_pos, _quat, _scale);
		bubbleMesh.setMatrixAt(i, _matrix);
	}
	bubbleMesh.instanceMatrix.needsUpdate = true;

	// ── Sky ──
	const sky = createSky({
		radius: 800,
		detail: 3,
		colorTop: 0x3311aa,
		colorHorizon: 0xbb44ee,
		colorBottom: 0x221155,
	});
	ctx.scene.add(sky);

	// ── Particles ──
	const particles = createParticles(600);
	ctx.scene.add(particles.points);

	return {
		player,
		terrain: { mesh: terrainMesh, material: terrainMat },
		water: { mesh: waterMesh, material: waterMat },
		bubbles: {
			mesh: bubbleMesh,
			material: bubbleMat,
			positions: bubbleArrays.positions,
			phases: bubbleArrays.phases,
			speeds: bubbleArrays.speeds,
			scales: bubbleArrays.scales,
			targetScales: bubbleArrays.targetScales,
			active: bubbleArrays.active,
		},
		bumps: initBumps(),
		sky,
		particles,
		camera: player.camera,
	};
}

// ── Tick ──────────────────────────────────────────────────────────────────

export function tick(
	state: ExperienceState,
	ctx: TickContext,
): { state: ExperienceState; outputs?: Record<string, number> } {
	const s = state as ShaderDemoState;

	s.player.tick(ctx.delta);

	const px = s.player.rig.position.x;
	const pz = s.player.rig.position.z;

	// ── Infinite terrain/water: follow player ──
	s.terrain.mesh.position.x = px;
	s.terrain.mesh.position.z = pz;
	s.water.mesh.position.x = px;
	s.water.mesh.position.z = pz;
	s.particles.points.position.x = px;
	s.particles.points.position.z = pz;
	s.sky.position.x = px;
	s.sky.position.z = pz;

	// ── Bump lifecycle: grow → pinch-off → spawn blob → reset ──
	const bumpUniform = s.terrain.material.uniforms.uBumpData
		.value as THREE.Vector4[];
	const { bumps } = s;
	const terrainH = s.terrain.material.uniforms.uTerrainHeight.value as number;

	for (let i = 0; i < BUMP_COUNT; i++) {
		bumps.phases[i] += ctx.delta * bumps.speeds[i];

		if (bumps.phases[i] >= 0.85) {
			// Trigger at 0.85 — bump is still high, bubble emerges from surface
			if (bumps.phases[i] - ctx.delta * bumps.speeds[i] < 0.85) {
				activateBubbleAtBump(
					s.bubbles,
					bumps.centers[i * 2],
					bumps.centers[i * 2 + 1],
					bumps.phases[i],
					terrainH,
				);
			}

			if (bumps.phases[i] >= 1.0) {
				resetBump(i, bumps, px, pz);
			}
		}

		bumpUniform[i].set(
			bumps.centers[i * 2],
			bumps.centers[i * 2 + 1],
			bumps.phases[i],
			bumps.radii[i],
		);
	}

	// ── Animate active bubbles: rise, wobble, grow, deactivate ──
	const { positions, phases, speeds, scales, targetScales, active } =
		s.bubbles;
	for (let i = 0; i < BUBBLE_COUNT; i++) {
		if (active[i] === 0) {
			_pos.set(0, -100, 0);
			_scale.setScalar(0);
			_matrix.compose(_pos, _quat, _scale);
			s.bubbles.mesh.setMatrixAt(i, _matrix);
			continue;
		}

		// Rise
		positions[i * 3 + 1] += speeds[i] * ctx.delta;

		// Wobble sideways
		const wobbleX = Math.sin(ctx.elapsed * 1.5 + phases[i]) * 0.3;
		const wobbleZ = Math.cos(ctx.elapsed * 1.2 + phases[i] * 1.3) * 0.3;
		positions[i * 3] += wobbleX * ctx.delta;
		positions[i * 3 + 2] += wobbleZ * ctx.delta;

		// Emergence: grow from spawn scale toward target
		if (scales[i] < targetScales[i]) {
			scales[i] = Math.min(
				scales[i] + BUBBLE_EMERGE_SPEED * ctx.delta * targetScales[i],
				targetScales[i],
			);
		}

		// Deactivate when too high or too far
		const dx = positions[i * 3] - px;
		const dz = positions[i * 3 + 2] - pz;
		const distSq = dx * dx + dz * dz;
		if (
			positions[i * 3 + 1] > BUBBLE_MAX_Y ||
			distSq > BUBBLE_SPAWN_RADIUS * BUBBLE_SPAWN_RADIUS * 4
		) {
			active[i] = 0;
			scales[i] = 0;
			targetScales[i] = 0;
			_pos.set(0, -100, 0);
			_scale.setScalar(0);
			_matrix.compose(_pos, _quat, _scale);
			s.bubbles.mesh.setMatrixAt(i, _matrix);
			continue;
		}

		_pos.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
		_scale.setScalar(scales[i]);
		_matrix.compose(_pos, _quat, _scale);
		s.bubbles.mesh.setMatrixAt(i, _matrix);
	}
	s.bubbles.mesh.instanceMatrix.needsUpdate = true;

	// Animate all shaders
	updateTime(s.terrain.material, ctx.elapsed);
	updateTime(s.water.material, ctx.elapsed);
	updateTime(s.bubbles.material, ctx.elapsed);
	updateTime(s.particles.material, ctx.elapsed);

	return { state: s };
}

// ── Dispose ──────────────────────────────────────────────────────────────

export function dispose(state: ExperienceState, scene: THREE.Scene): void {
	const s = state as ShaderDemoState;

	scene.remove(s.terrain.mesh);
	scene.remove(s.water.mesh);
	scene.remove(s.bubbles.mesh);
	scene.remove(s.sky);
	scene.remove(s.particles.points);
	scene.remove(s.player.rig);

	s.terrain.mesh.geometry.dispose();
	s.terrain.material.dispose();
	s.water.mesh.geometry.dispose();
	s.water.material.dispose();
	s.bubbles.mesh.geometry.dispose();
	s.bubbles.material.dispose();
	s.sky.geometry.dispose();
	(s.sky.material as THREE.Material).dispose();
	s.particles.points.geometry.dispose();
	s.particles.material.dispose();
}
