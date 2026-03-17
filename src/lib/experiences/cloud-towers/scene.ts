import * as THREE from "three";
import { FlightPlayer } from "$lib/three/player";
import {
	createPostFXPipeline,
	type PostFXPipeline,
} from "$lib/three/postfx-pipeline";
import { seededRandom } from "$lib/three/random";
import { createStarfield, updateStarfield } from "$lib/three/starfield";
import type { ExperienceState, SetupContext, TickContext } from "../types";

// @ts-ignore — raw GLSL imports
import towerVert from "./shaders/tower-points.vert?raw";
// @ts-ignore — raw GLSL imports
import towerFrag from "./shaders/tower-points.frag?raw";

// ── Constants ────────────────────────────────────────────────────────────

const CHUNK_SIZE = 80;
const GRID_CELLS = 10;
const CELL_SIZE = CHUNK_SIZE / GRID_CELLS;
const VIEW_RADIUS = 2;
const MAX_POINTS = 80_000;
const DENSITY = 0.6;
const SEED = 7;

const MIN_HEIGHT = 20;
const MAX_HEIGHT_DEFAULT = 120;
const MIN_WIDTH = 4;
const MAX_WIDTH = 12;
const POINTS_PER_BUILDING_DEFAULT = 50;

// ── Types ────────────────────────────────────────────────────────────────

interface BuildingDef {
	x: number;
	z: number;
	width: number;
	depth: number;
	height: number;
}

interface ChunkData {
	buildings: BuildingDef[];
	birthTime: number;
}

interface CityChunkManager {
	active: Map<string, ChunkData>;
	lastCX: number;
	lastCZ: number;
	dirty: boolean;
}

export interface CloudTowersState extends ExperienceState {
	player: FlightPlayer;
	camera: THREE.PerspectiveCamera;
	points: THREE.Points;
	geometry: THREE.BufferGeometry;
	material: THREE.ShaderMaterial;
	starfield: THREE.Points;
	postfx: PostFXPipeline;
	chunks: CityChunkManager;
	activePointCount: number;
	growthSpeed: number;
	pointDensity: number;
	buildingMaxHeight: number;
}

// ── Chunk Key ────────────────────────────────────────────────────────────

function chunkKey(cx: number, cz: number): string {
	return `${cx},${cz}`;
}

// ── Building Generation ──────────────────────────────────────────────────

function generateChunkBuildings(
	cx: number,
	cz: number,
	maxHeight: number,
	birthTime: number,
): ChunkData {
	const baseX = cx * CHUNK_SIZE;
	const baseZ = cz * CHUNK_SIZE;
	const buildings: BuildingDef[] = [];

	for (let gx = 0; gx < GRID_CELLS; gx++) {
		for (let gz = 0; gz < GRID_CELLS; gz++) {
			const cellSeed = SEED + cx * 7919 + cz * 6271 + gx * 131 + gz * 97;
			const r = seededRandom(cellSeed);

			if (r > DENSITY) continue;

			const width = MIN_WIDTH + seededRandom(cellSeed + 1) * (MAX_WIDTH - MIN_WIDTH);
			const depth = MIN_WIDTH + seededRandom(cellSeed + 2) * (MAX_WIDTH - MIN_WIDTH);
			const heightFactor = seededRandom(cellSeed + 3);
			const height = MIN_HEIGHT + heightFactor * heightFactor * (maxHeight - MIN_HEIGHT);

			const offsetX = (seededRandom(cellSeed + 4) - 0.5) * (CELL_SIZE - width);
			const offsetZ = (seededRandom(cellSeed + 5) - 0.5) * (CELL_SIZE - depth);

			buildings.push({
				x: baseX + (gx + 0.5) * CELL_SIZE + offsetX,
				z: baseZ + (gz + 0.5) * CELL_SIZE + offsetZ,
				width,
				depth,
				height,
			});
		}
	}

	return { buildings, birthTime };
}

// ── Building → Point Cloud ───────────────────────────────────────────────

/**
 * Convert a building's surfaces to point positions.
 *
 * TODO: David implements the point distribution logic here.
 * This placeholder distributes points uniformly on walls + roof.
 */
function generateBuildingPoints(
	building: BuildingDef,
	pointCount: number,
	seedOffset: number,
	outPositions: Float32Array,
	outFinalY: Float32Array,
	startIdx: number,
): number {
	const { x, z, width, depth, height } = building;
	const halfW = width / 2;
	const halfD = depth / 2;

	// Surface areas for proportional distribution
	const wallFront = width * height;
	const wallSide = depth * height;
	const roof = width * depth;
	const totalArea = 2 * wallFront + 2 * wallSide + roof;

	let written = 0;

	for (let i = 0; i < pointCount; i++) {
		if (startIdx + written >= MAX_POINTS) break;

		const r = seededRandom(seedOffset + i);
		const area = r * totalArea;
		const idx = (startIdx + written) * 3;

		// Edge bias: pow(rng, 0.5) pushes values toward edges
		const u = seededRandom(seedOffset + i * 3 + 1);
		const v = seededRandom(seedOffset + i * 3 + 2);
		const eu = Math.pow(u, 0.5) * (seededRandom(seedOffset + i * 5) > 0.5 ? 1 : -1) * 0.5 + 0.5;
		const ev = Math.pow(v, 0.5) * (seededRandom(seedOffset + i * 5 + 1) > 0.5 ? 1 : -1) * 0.5 + 0.5;

		const py = ev * height;

		if (area < wallFront) {
			// Front wall (+Z)
			outPositions[idx] = x + (eu - 0.5) * width;
			outPositions[idx + 1] = py;
			outPositions[idx + 2] = z + halfD;
		} else if (area < wallFront + wallSide) {
			// Right wall (+X)
			outPositions[idx] = x + halfW;
			outPositions[idx + 1] = py;
			outPositions[idx + 2] = z + (eu - 0.5) * depth;
		} else if (area < 2 * wallFront + wallSide) {
			// Back wall (-Z)
			outPositions[idx] = x + (eu - 0.5) * width;
			outPositions[idx + 1] = py;
			outPositions[idx + 2] = z - halfD;
		} else if (area < 2 * wallFront + 2 * wallSide) {
			// Left wall (-X)
			outPositions[idx] = x - halfW;
			outPositions[idx + 1] = py;
			outPositions[idx + 2] = z + (eu - 0.5) * depth;
		} else {
			// Roof
			outPositions[idx] = x + (eu - 0.5) * width;
			outPositions[idx + 1] = height;
			outPositions[idx + 2] = z + (ev - 0.5) * depth;
		}

		outFinalY[startIdx + written] = outPositions[idx + 1];
		written++;
	}

	return written;
}

// ── Chunk Manager ────────────────────────────────────────────────────────

function createCityChunkManager(): CityChunkManager {
	return {
		active: new Map(),
		lastCX: Number.NaN,
		lastCZ: Number.NaN,
		dirty: true,
	};
}

function updateCityChunks(
	mgr: CityChunkManager,
	playerX: number,
	playerZ: number,
	maxHeight: number,
	elapsed: number,
): void {
	const cx = Math.floor(playerX / CHUNK_SIZE);
	const cz = Math.floor(playerZ / CHUNK_SIZE);

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
					generateChunkBuildings(cx + dx, cz + dz, maxHeight, elapsed),
				);
				mgr.dirty = true;
			}
		}
	}
}

// ── Rebuild Point Buffer ─────────────────────────────────────────────────

function rebuildPointBuffer(
	mgr: CityChunkManager,
	geometry: THREE.BufferGeometry,
	pointDensity: number,
): number {
	if (!mgr.dirty) return -1;
	mgr.dirty = false;

	const positions = geometry.attributes.position.array as Float32Array;
	const finalY = geometry.attributes.aFinalY.array as Float32Array;
	const birthTimes = geometry.attributes.aBirthTime.array as Float32Array;

	let offset = 0;

	for (const [key, chunk] of mgr.active) {
		const parts = key.split(",");
		const chunkSeed = SEED + Number.parseInt(parts[0]) * 9973 + Number.parseInt(parts[1]) * 8191;

		for (let b = 0; b < chunk.buildings.length; b++) {
			if (offset >= MAX_POINTS) break;

			const count = generateBuildingPoints(
				chunk.buildings[b],
				Math.round(pointDensity),
				chunkSeed + b * 500,
				positions,
				finalY,
				offset,
			);

			for (let i = 0; i < count; i++) {
				birthTimes[offset + i] = chunk.birthTime;
			}
			offset += count;
		}
		if (offset >= MAX_POINTS) break;
	}

	// Zero out remaining points (hide them)
	for (let i = offset; i < MAX_POINTS; i++) {
		positions[i * 3] = 0;
		positions[i * 3 + 1] = -9999;
		positions[i * 3 + 2] = 0;
		finalY[i] = -9999;
		birthTimes[i] = 99999;
	}

	geometry.attributes.position.needsUpdate = true;
	geometry.attributes.aFinalY.needsUpdate = true;
	geometry.attributes.aBirthTime.needsUpdate = true;

	return offset;
}

// ── Setup ────────────────────────────────────────────────────────────────

export async function setup(ctx: SetupContext): Promise<CloudTowersState> {
	const fogColor = new THREE.Color(0x050508);

	const player = new FlightPlayer({
		fov: 75,
		near: 0.1,
		far: 800,
		spawnPosition: { x: 0, y: 90, z: 0 },
		baseSpeed: 10,
	});
	player.lerpAlpha = 0.1;
	player.rollYawMultiplier = 0.8;
	player.minClearance = -Infinity;
	ctx.scene.add(player.rig);

	// Pre-allocate point buffer
	const positions = new Float32Array(MAX_POINTS * 3);
	const finalY = new Float32Array(MAX_POINTS);
	const birthTimes = new Float32Array(MAX_POINTS).fill(99999);

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
	geometry.setAttribute("aFinalY", new THREE.BufferAttribute(finalY, 1));
	geometry.setAttribute("aBirthTime", new THREE.BufferAttribute(birthTimes, 1));

	const material = new THREE.ShaderMaterial({
		vertexShader: towerVert,
		fragmentShader: towerFrag,
		uniforms: {
			uTime: { value: 0 },
			uGrowthSpeed: { value: 0.8 },
			uPointSize: { value: 2.0 },
			uFogNear: { value: 40 },
			uFogFar: { value: 200 },
			uFogColor: { value: fogColor },
			uBrightness: { value: 1.0 },
		},
		transparent: true,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
	});

	const points = new THREE.Points(geometry, material);
	points.frustumCulled = false;
	ctx.scene.add(points);

	// Starfield background
	const starfield = createStarfield({
		count: 2000,
		radius: 500,
		minSize: 0.3,
		maxSize: 1.5,
		color: 0xffffff,
		twinkleSpeed: 0.5,
	});
	ctx.scene.add(starfield);

	// PostFX
	const postfx = createPostFXPipeline(ctx.renderer, ctx.scene, player.camera, {
		bloom: {
			intensity: 1.5,
			luminanceThreshold: 0.2,
			luminanceSmoothing: 0.5,
		},
		filmGrain: { opacity: 0.08 },
		vignette: { offset: 0.3, darkness: 0.6 },
	});

	// ChunkManager
	const chunks = createCityChunkManager();
	updateCityChunks(chunks, 0, 0, MAX_HEIGHT_DEFAULT, 0);

	const activePointCount = rebuildPointBuffer(chunks, geometry, POINTS_PER_BUILDING_DEFAULT);

	return {
		player,
		camera: player.camera,
		points,
		geometry,
		material,
		starfield,
		postfx,
		chunks,
		activePointCount: activePointCount >= 0 ? activePointCount : 0,
		growthSpeed: 0.8,
		pointDensity: POINTS_PER_BUILDING_DEFAULT,
		buildingMaxHeight: MAX_HEIGHT_DEFAULT,
	};
}

// ── Tick ──────────────────────────────────────────────────────────────────

export function tick(
	state: ExperienceState,
	ctx: TickContext,
): { state: ExperienceState; outputs?: Record<string, number> } {
	const s = state as CloudTowersState;

	s.player.tick(ctx.delta);

	const pos = s.player.rig.position;

	// Update chunks based on player XZ position
	updateCityChunks(s.chunks, pos.x, pos.z, s.buildingMaxHeight, ctx.elapsed);
	const count = rebuildPointBuffer(s.chunks, s.geometry, s.pointDensity);
	if (count >= 0) s.activePointCount = count;

	// Update shader uniforms
	s.material.uniforms.uTime.value = ctx.elapsed;

	// Move starfield with player (stays surrounding)
	s.starfield.position.copy(pos);
	updateStarfield(s.starfield, ctx.elapsed);

	return { state: s };
}

// ── Dispose ──────────────────────────────────────────────────────────────

export function dispose(state: ExperienceState, scene: THREE.Scene): void {
	const s = state as CloudTowersState;

	scene.remove(s.points);
	scene.remove(s.starfield);
	scene.remove(s.player.rig);

	s.geometry.dispose();
	s.material.dispose();
	s.starfield.geometry.dispose();
	(s.starfield.material as THREE.Material).dispose();
	s.postfx.dispose();
}
