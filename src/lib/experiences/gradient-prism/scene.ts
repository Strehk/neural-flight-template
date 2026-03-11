import * as THREE from "three";
import { createGradientSky, updateGradientSky } from "$lib/three/gradient-sky";
import { FlightPlayer } from "$lib/three/player";
import {
	createPostFXPipeline,
	type PostFXPipeline,
} from "$lib/three/postfx-pipeline";
import { seededRandom } from "$lib/three/random";
import { createReflectiveGround } from "$lib/three/reflective-ground";
import type { ExperienceState, SetupContext, TickContext } from "../types";
import { createDarkCubeMaterial, createGradientCubeMaterial } from "./shaders";

// ── Types ───────────────────────────────────────────────────────────────

interface OrbitalLight {
	light: THREE.PointLight;
	orbitRadius: number;
	orbitSpeed: number;
	phaseOffset: number;
	yAmplitude: number;
	ySpeed: number;
}

export interface GradientPrismState extends ExperienceState {
	player: FlightPlayer;
	camera: THREE.PerspectiveCamera;
	darkMesh: THREE.InstancedMesh;
	darkMaterial: THREE.ShaderMaterial;
	gradMesh: THREE.InstancedMesh;
	gradMaterial: THREE.ShaderMaterial;
	gradGeo: THREE.BoxGeometry;
	darkGeo: THREE.BoxGeometry;
	sky: THREE.Mesh;
	ground: THREE.Mesh;
	postfx: PostFXPipeline;
	chunks: ChunkManager;
	orbitalLights: OrbitalLight[];
}

// ── Palette ─────────────────────────────────────────────────────────────

const PALETTE = [
	new THREE.Color(0xff6b9d), // hot pink
	new THREE.Color(0xff8c42), // orange
	new THREE.Color(0xffa07a), // salmon
	new THREE.Color(0x4a90d9), // blue
	new THREE.Color(0x2dd4bf), // teal
	new THREE.Color(0xa855f7), // purple
	new THREE.Color(0x38bdf8), // sky blue
	new THREE.Color(0xf472b6), // pink
	new THREE.Color(0x34d399), // emerald
	new THREE.Color(0xfbbf24), // amber
];

// ── Gyroid Architecture Constants ──────────────────────────────────────

const CELL_SIZE = 20;
const WALL_THICKNESS = 0.8;
const Y_LAYERS = 8;
const Y_HALF = 4; // layers above + below player center
const FREQ_1 = 0.15;
const FREQ_2 = 0.04;
const THRESHOLD_1 = 0.1;
const THRESHOLD_2 = -0.3;
const CHUNK_SIZE = 60;
const VIEW_RADIUS = 3;
const MAX_INSTANCES = 8000;
const SEED = 42;

// ── Reusable temporaries ────────────────────────────────────────────────

const _matrix = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();

// ── Gyroid Function ────────────────────────────────────────────────────

function gyroid(x: number, y: number, z: number): number {
	return (
		Math.cos(x) * Math.sin(z) +
		Math.cos(y) * Math.sin(x) +
		Math.cos(z) * Math.sin(y)
	);
}

function wallPresent(
	wx: number,
	wy: number,
	wz: number,
	freq1: number,
	freq2: number,
	thresh1: number,
	thresh2: number,
): boolean {
	const g1 = gyroid(wx * freq1, wy * freq1, wz * freq1);
	const g2 = gyroid(wx * freq2, wy * freq2, wz * freq2);
	return g1 > thresh1 && g2 > thresh2;
}

function gyroidCoverage(
	wx: number,
	wy: number,
	wz: number,
	freq1: number,
): number {
	const g1 = gyroid(wx * freq1, wy * freq1, wz * freq1);
	return Math.min(Math.max(g1 * 2.5, 0.3), 1.0);
}

// ── Chunk Data ──────────────────────────────────────────────────────────

interface CubeData {
	x: number;
	y: number;
	z: number;
	w: number;
	h: number;
	d: number;
}

interface ChunkData {
	dark: CubeData[];
	grad: {
		cubes: CubeData[];
		colorAIdx: number[];
		colorBIdx: number[];
		angles: number[];
		brightness: number[];
	};
}

function chunkKey(cx: number, cz: number): string {
	return `${cx},${cz}`;
}

// ── Wall Axes ──────────────────────────────────────────────────────────

enum WallAxis {
	POS_X = 0,
	NEG_X = 1,
	POS_Y = 2,
	NEG_Y = 3,
	POS_Z = 4,
	NEG_Z = 5,
}

interface WallPanel {
	x: number;
	y: number;
	z: number;
	w: number;
	h: number;
	d: number;
}

function createWallPanel(
	cellCenterX: number,
	cellCenterY: number,
	cellCenterZ: number,
	axis: WallAxis,
	cellSize: number,
	wallThickness: number,
	coverage: number,
): WallPanel {
	const half = cellSize / 2;
	const panelSize = cellSize * coverage;

	switch (axis) {
		case WallAxis.POS_X:
		case WallAxis.NEG_X: {
			const offsetX = axis === WallAxis.POS_X ? half : -half;
			return {
				x: cellCenterX + offsetX,
				y: cellCenterY,
				z: cellCenterZ,
				w: wallThickness,
				h: panelSize,
				d: cellSize,
			};
		}
		case WallAxis.POS_Y:
		case WallAxis.NEG_Y: {
			const offsetY = axis === WallAxis.POS_Y ? half : -half;
			return {
				x: cellCenterX,
				y: cellCenterY + offsetY,
				z: cellCenterZ,
				w: cellSize,
				h: wallThickness,
				d: cellSize,
			};
		}
		case WallAxis.POS_Z:
		case WallAxis.NEG_Z: {
			const offsetZ = axis === WallAxis.POS_Z ? half : -half;
			return {
				x: cellCenterX,
				y: cellCenterY,
				z: cellCenterZ + offsetZ,
				w: cellSize,
				h: panelSize,
				d: wallThickness,
			};
		}
	}
}

// ── Architecture Generator ─────────────────────────────────────────────

function generateChunk(
	cx: number,
	cz: number,
	yCenter: number,
	freq1: number,
	freq2: number,
	thresh1: number,
	thresh2: number,
	cellSize: number,
): ChunkData {
	const baseX = cx * CHUNK_SIZE;
	const baseZ = cz * CHUNK_SIZE;
	const cells = Math.floor(CHUNK_SIZE / cellSize);
	const halfChunk = CHUNK_SIZE / 2;

	const dark: CubeData[] = [];
	const gradCubes: CubeData[] = [];
	const colorAIdx: number[] = [];
	const colorBIdx: number[] = [];
	const angles: number[] = [];
	const brightness: number[] = [];

	for (let lx = 0; lx < cells; lx++) {
		for (let ly = 0; ly < Y_LAYERS; ly++) {
			for (let lz = 0; lz < cells; lz++) {
				const cellX = baseX - halfChunk + (lx + 0.5) * cellSize;
				const cellY = (yCenter - Y_HALF + ly + 0.5) * cellSize;
				const cellZ = baseZ - halfChunk + (lz + 0.5) * cellSize;

				// Evaluate 6 faces
				for (let axis = 0; axis < 6; axis++) {
					// Wall center = cell center + half offset along axis
					let wx = cellX;
					let wy = cellY;
					let wz = cellZ;
					const half = cellSize / 2;

					switch (axis) {
						case WallAxis.POS_X:
							wx += half;
							break;
						case WallAxis.NEG_X:
							wx -= half;
							break;
						case WallAxis.POS_Y:
							wy += half;
							break;
						case WallAxis.NEG_Y:
							wy -= half;
							break;
						case WallAxis.POS_Z:
							wz += half;
							break;
						case WallAxis.NEG_Z:
							wz -= half;
							break;
					}

					if (!wallPresent(wx, wy, wz, freq1, freq2, thresh1, thresh2)) {
						continue;
					}

					const coverage = gyroidCoverage(wx, wy, wz, freq1);
					const panel = createWallPanel(
						cellX,
						cellY,
						cellZ,
						axis as WallAxis,
						cellSize,
						WALL_THICKNESS,
						coverage,
					);

					// Deterministic gradient/dark decision
					const wallSeed =
						SEED +
						Math.floor(wx * 7.3) +
						Math.floor(wy * 13.7) +
						Math.floor(wz * 19.1) +
						axis * 37;
					const r = seededRandom(wallSeed);

					if (r > 0.6) {
						// Gradient wall (40%)
						gradCubes.push(panel);
						const r1 = seededRandom(wallSeed + 1);
						const r2 = seededRandom(wallSeed + 2);
						const r3 = seededRandom(wallSeed + 3);
						const r4 = seededRandom(wallSeed + 4);
						const aIdx = Math.floor(r1 * PALETTE.length);
						let bIdx = Math.floor(r2 * (PALETTE.length - 1));
						if (bIdx >= aIdx) bIdx++;
						colorAIdx.push(aIdx);
						colorBIdx.push(bIdx);
						angles.push(r3 * Math.PI);
						brightness.push(1.2 + r4 * 0.8);
					} else {
						// Dark wall (60%)
						dark.push(panel);
					}
				}
			}
		}
	}

	return {
		dark,
		grad: { cubes: gradCubes, colorAIdx, colorBIdx, angles, brightness },
	};
}

// ── Chunk Manager ───────────────────────────────────────────────────────

interface ChunkManager {
	active: Map<string, ChunkData>;
	lastCX: number;
	lastCZ: number;
	lastCY: number;
	freq1: number;
	freq2: number;
	thresh1: number;
	thresh2: number;
	cellSize: number;
	dirty: boolean;
}

function createChunkManager(
	freq1: number,
	freq2: number,
	thresh1: number,
	thresh2: number,
	cellSize: number,
): ChunkManager {
	return {
		active: new Map(),
		lastCX: Number.NaN,
		lastCZ: Number.NaN,
		lastCY: Number.NaN,
		freq1,
		freq2,
		thresh1,
		thresh2,
		cellSize,
		dirty: true,
	};
}

function updateChunks(
	mgr: ChunkManager,
	playerX: number,
	playerY: number,
	playerZ: number,
): void {
	const cx = Math.floor(playerX / CHUNK_SIZE);
	const cz = Math.floor(playerZ / CHUNK_SIZE);
	const cy = Math.floor(playerY / mgr.cellSize);

	// Y-layer shift → full invalidation (all chunks regenerated with new Y center)
	if (cy !== mgr.lastCY) {
		mgr.active.clear();
		mgr.lastCX = Number.NaN;
		mgr.lastCZ = Number.NaN;
		mgr.lastCY = cy;
		mgr.dirty = true;
	}

	if (cx === mgr.lastCX && cz === mgr.lastCZ) return;
	mgr.lastCX = cx;
	mgr.lastCZ = cz;

	const needed = new Set<string>();
	for (let dx = -VIEW_RADIUS; dx <= VIEW_RADIUS; dx++) {
		for (let dz = -VIEW_RADIUS; dz <= VIEW_RADIUS; dz++) {
			needed.add(chunkKey(cx + dx, cz + dz));
		}
	}

	for (const key of mgr.active.keys()) {
		if (!needed.has(key)) {
			mgr.active.delete(key);
			mgr.dirty = true;
		}
	}

	for (let dx = -VIEW_RADIUS; dx <= VIEW_RADIUS; dx++) {
		for (let dz = -VIEW_RADIUS; dz <= VIEW_RADIUS; dz++) {
			const key = chunkKey(cx + dx, cz + dz);
			if (!mgr.active.has(key)) {
				mgr.active.set(
					key,
					generateChunk(
						cx + dx,
						cz + dz,
						cy,
						mgr.freq1,
						mgr.freq2,
						mgr.thresh1,
						mgr.thresh2,
						mgr.cellSize,
					),
				);
				mgr.dirty = true;
			}
		}
	}
}

// ── Rebuild InstancedMesh Buffers ───────────────────────────────────────

function rebuildBuffers(
	mgr: ChunkManager,
	darkMesh: THREE.InstancedMesh,
	gradMesh: THREE.InstancedMesh,
	gradGeo: THREE.BoxGeometry,
): void {
	if (!mgr.dirty) return;
	mgr.dirty = false;

	let darkIdx = 0;
	let gradIdx = 0;

	for (const chunk of mgr.active.values()) {
		darkIdx += chunk.dark.length;
		gradIdx += chunk.grad.cubes.length;
	}

	const totalDark = Math.min(darkIdx, MAX_INSTANCES);
	const totalGrad = Math.min(gradIdx, MAX_INSTANCES);

	const colorAArr = new Float32Array(totalGrad * 3);
	const colorBArr = new Float32Array(totalGrad * 3);
	const angleArr = new Float32Array(totalGrad);
	const brightnessArr = new Float32Array(totalGrad);

	darkIdx = 0;
	gradIdx = 0;

	for (const chunk of mgr.active.values()) {
		for (const c of chunk.dark) {
			if (darkIdx >= MAX_INSTANCES) break;
			_pos.set(c.x, c.y, c.z);
			_scale.set(c.w, c.h, c.d);
			_matrix.compose(_pos, _quat, _scale);
			darkMesh.setMatrixAt(darkIdx, _matrix);
			darkIdx++;
		}

		const gc = chunk.grad;
		for (let i = 0; i < gc.cubes.length; i++) {
			if (gradIdx >= MAX_INSTANCES) break;
			const c = gc.cubes[i];
			_pos.set(c.x, c.y, c.z);
			_scale.set(c.w, c.h, c.d);
			_matrix.compose(_pos, _quat, _scale);
			gradMesh.setMatrixAt(gradIdx, _matrix);

			const colA = PALETTE[gc.colorAIdx[i] % PALETTE.length];
			const colB = PALETTE[gc.colorBIdx[i] % PALETTE.length];
			colorAArr[gradIdx * 3] = colA.r;
			colorAArr[gradIdx * 3 + 1] = colA.g;
			colorAArr[gradIdx * 3 + 2] = colA.b;
			colorBArr[gradIdx * 3] = colB.r;
			colorBArr[gradIdx * 3 + 1] = colB.g;
			colorBArr[gradIdx * 3 + 2] = colB.b;
			angleArr[gradIdx] = gc.angles[i];
			brightnessArr[gradIdx] = gc.brightness[i];
			gradIdx++;
		}
	}

	darkMesh.count = darkIdx;
	darkMesh.instanceMatrix.needsUpdate = true;

	gradMesh.count = gradIdx;
	gradMesh.instanceMatrix.needsUpdate = true;

	gradGeo.setAttribute(
		"aColorA",
		new THREE.InstancedBufferAttribute(colorAArr, 3),
	);
	gradGeo.setAttribute(
		"aColorB",
		new THREE.InstancedBufferAttribute(colorBArr, 3),
	);
	gradGeo.setAttribute(
		"aGradientAngle",
		new THREE.InstancedBufferAttribute(angleArr, 1),
	);
	gradGeo.setAttribute(
		"aBrightness",
		new THREE.InstancedBufferAttribute(brightnessArr, 1),
	);
}

// ── Setup ───────────────────────────────────────────────────────────────

export async function setup(ctx: SetupContext): Promise<GradientPrismState> {
	const fogColor = new THREE.Color(0x1e1050);
	const fogNear = 20;
	const fogFar = 220;

	const player = new FlightPlayer({
		fov: 75,
		near: 0.1,
		far: 800,
		spawnPosition: { x: 0, y: 10, z: 0 },
		baseSpeed: 5,
	});
	player.lerpAlpha = 0.08;
	player.rollYawMultiplier = 1.0;
	player.minClearance = -Infinity;
	ctx.scene.add(player.rig);

	const sky = createGradientSky({
		colors: [0x0a0020, 0x2a1060, 0x4a90d9, 0xff6b9d, 0xffa07a, 0xffeedd],
		radius: 500,
		animationSpeed: 0.005,
	});
	ctx.scene.add(sky);

	const ground = createReflectiveGround({
		size: 600,
		color: 0x151525,
		roughness: 0.2,
		metalness: 0.95,
		opacity: 0.85,
		yPosition: -10,
	});
	ctx.scene.add(ground);

	const gradMaterial = createGradientCubeMaterial(fogNear, fogFar, fogColor);
	const darkMaterial = createDarkCubeMaterial(fogNear, fogFar, fogColor);

	const darkGeo = new THREE.BoxGeometry(1, 1, 1);
	const gradGeo = new THREE.BoxGeometry(1, 1, 1);

	const darkMesh = new THREE.InstancedMesh(
		darkGeo,
		darkMaterial,
		MAX_INSTANCES,
	);
	darkMesh.count = 0;
	const gradMesh = new THREE.InstancedMesh(
		gradGeo,
		gradMaterial,
		MAX_INSTANCES,
	);
	gradMesh.count = 0;

	ctx.scene.add(darkMesh);
	ctx.scene.add(gradMesh);

	const chunks = createChunkManager(
		FREQ_1,
		FREQ_2,
		THRESHOLD_1,
		THRESHOLD_2,
		CELL_SIZE,
	);
	updateChunks(chunks, 0, 10, 0);
	rebuildBuffers(chunks, darkMesh, gradMesh, gradGeo);

	// Animated colored point lights orbiting around player
	const lightColors = [
		0xff6b9d, // hot pink
		0x4a90d9, // blue
		0xa855f7, // purple
		0x2dd4bf, // teal
		0xff8c42, // orange
		0x38bdf8, // sky blue
	];
	const orbitalLights: OrbitalLight[] = lightColors.map((color, i) => {
		const light = new THREE.PointLight(color, 5.0, 80, 1.2);
		ctx.scene.add(light);
		return {
			light,
			orbitRadius: 15 + i * 5,
			orbitSpeed: 0.15 + i * 0.04,
			phaseOffset: (i * Math.PI * 2) / lightColors.length,
			yAmplitude: 8 + i * 3,
			ySpeed: 0.2 + i * 0.05,
		};
	});

	const postfx = createPostFXPipeline(ctx.renderer, ctx.scene, player.camera, {
		bloom: {
			intensity: 2.5,
			luminanceThreshold: 0.3,
			luminanceSmoothing: 0.6,
		},
		filmGrain: { opacity: 0.15 },
		vignette: { offset: 0.3, darkness: 0.75 },
		chromatic: { offset: 0.0015 },
		depthOfField: { focusDistance: 0.35, focalLength: 0.08, bokehScale: 0.015 },
	});

	return {
		player,
		camera: player.camera,
		darkMesh,
		darkMaterial,
		gradMesh,
		gradMaterial,
		gradGeo,
		darkGeo,
		sky,
		ground,
		postfx,
		chunks,
		orbitalLights,
	};
}

// ── Tick ─────────────────────────────────────────────────────────────────

export function tick(
	state: ExperienceState,
	ctx: TickContext,
): { state: ExperienceState; outputs?: Record<string, number> } {
	const s = state as GradientPrismState;

	s.player.tick(ctx.delta);

	const pos = s.player.rig.position;
	updateChunks(s.chunks, pos.x, pos.y, pos.z);
	rebuildBuffers(s.chunks, s.darkMesh, s.gradMesh, s.gradGeo);

	s.ground.position.x = pos.x;
	s.ground.position.y = pos.y - 30;
	s.ground.position.z = pos.z;

	s.gradMaterial.uniforms.uTime.value = ctx.elapsed;
	s.gradMaterial.uniforms.uPlayerY.value = pos.y;
	s.darkMaterial.uniforms.uTime.value = ctx.elapsed;
	s.darkMaterial.uniforms.uPlayerY.value = pos.y;

	// Animate orbital lights around player
	for (const orb of s.orbitalLights) {
		const angle = ctx.elapsed * orb.orbitSpeed + orb.phaseOffset;
		orb.light.position.set(
			pos.x + Math.cos(angle) * orb.orbitRadius,
			pos.y +
				Math.sin(ctx.elapsed * orb.ySpeed + orb.phaseOffset) * orb.yAmplitude,
			pos.z + Math.sin(angle) * orb.orbitRadius,
		);
	}

	updateGradientSky(s.sky, ctx.elapsed);

	return { state: s };
}

// ── Dispose ─────────────────────────────────────────────────────────────

export function dispose(state: ExperienceState, scene: THREE.Scene): void {
	const s = state as GradientPrismState;

	scene.remove(s.darkMesh);
	scene.remove(s.gradMesh);
	scene.remove(s.sky);
	scene.remove(s.ground);
	scene.remove(s.player.rig);
	for (const orb of s.orbitalLights) {
		scene.remove(orb.light);
		orb.light.dispose();
	}

	s.darkGeo.dispose();
	s.darkMaterial.dispose();
	s.gradGeo.dispose();
	s.gradMaterial.dispose();
	s.sky.geometry.dispose();
	(s.sky.material as THREE.Material).dispose();
	s.ground.geometry.dispose();
	(s.ground.material as THREE.Material).dispose();
	s.postfx.dispose();
}
