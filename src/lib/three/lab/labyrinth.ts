// LAB EXPERIMENT — temporary, not production code
//
// 3D Recursive Subdivision labyrinth generator ("Mondrian 3D").
// Recursively splits a bounding box along X/Y/Z, placing translucent
// gradient walls at split planes with gaps for passageways.
// Produces nested, Mondrian-like structures in all dimensions.

import * as THREE from "three";
import { createGradientMaterial } from "./gradient_material";

// ── Config ──────────────────────────────────────────────

export interface LabyrinthConfig {
	/** Max recursion depth. Default 5 */
	maxDepth?: number;
	/** Minimum cell size to stop subdividing. Default 1.5 */
	minCellSize?: number;
	/** Probability a wall is placed at each split. Default 0.55 */
	wallProbability?: number;
	/** Chance a wall is translucent. Default 0.35 */
	translucencyChance?: number;
	/** Opacity range for translucent walls. Default [0.15, 0.5] */
	opacityRange?: [number, number];
	/** Wall thickness range. Default [0.15, 0.4] */
	thicknessRange?: [number, number];
	/** Chance of a horizontal platform on Y-splits. Default 0.2 */
	platformChance?: number;
	/** Chance of emissive accent color. Default 0.12 */
	emissiveChance?: number;
	/** Chance of overlay panel on a wall. Default 0.3 */
	overlayChance?: number;
	/** Color palettes [bottom, top] hex pairs */
	palettes?: [number, number][];
	/** Per-axis weight for split probability. Default { x: 1, y: 0.5, z: 1 } */
	axisWeights?: { x: number; y: number; z: number };
	/** Base seed for deterministic randomness. Default 42 */
	seed?: number;
}

const DEFAULT_PALETTES: [number, number][] = [
	[0xd63384, 0x0dcaf0], // Hot pink → Cyan
	[0xe85d04, 0x7209b7], // Deep orange → Purple
	[0xf72585, 0x4cc9f0], // Magenta → Light blue
	[0x3a0ca3, 0x4361ee], // Deep blue → Blue
	[0xf77f00, 0x06d6a0], // Orange → Teal
	[0x9b5de5, 0xf15bb5], // Purple → Pink
	[0x00b4d8, 0xff6d00], // Cyan → Orange
	[0x1a1a2e, 0x2d2d44], // Near-black (dark)
	[0xee6c4d, 0x3d5a80], // Terracotta → Steel blue
	[0x560bad, 0xf72585], // Purple → Magenta
];

const DEFAULTS: Required<LabyrinthConfig> = {
	maxDepth: 4,
	minCellSize: 3.5,
	wallProbability: 0.45,
	translucencyChance: 0.35,
	opacityRange: [0.15, 0.5],
	thicknessRange: [0.2, 0.5],
	platformChance: 0.04,
	emissiveChance: 0.08,
	overlayChance: 0.1,
	palettes: DEFAULT_PALETTES,
	axisWeights: { x: 1.0, y: 0.5, z: 1.0 },
	seed: 42,
};

// ── Seeded PRNG (mulberry32) ────────────────────────────

function mulberry32(seed: number): () => number {
	let s = seed | 0;
	return () => {
		s = (s + 0x6d2b79f5) | 0;
		let t = Math.imul(s ^ (s >>> 15), 1 | s);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

// ── Bounding box type ───────────────────────────────────

interface Box3D {
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
	minZ: number;
	maxZ: number;
}

// ── Wall builder ────────────────────────────────────────

function buildWall(
	width: number,
	height: number,
	thickness: number,
	palette: [number, number],
	isTranslucent: boolean,
	opacity: number,
	isEmissive: boolean,
	depthLayer: number,
	direction: "x" | "y",
): THREE.Mesh {
	const geo = new THREE.BoxGeometry(width, height, thickness);
	const mat = createGradientMaterial({
		colors: [new THREE.Color(palette[0]), new THREE.Color(palette[1])],
		direction,
		opacity,
		transparent: isTranslucent,
		side: isTranslucent ? THREE.DoubleSide : THREE.FrontSide,
	});

	if (isTranslucent) {
		mat.depthWrite = false;
	}

	if (isEmissive) {
		mat.toneMapped = false;
	}

	const mesh = new THREE.Mesh(geo, mat);
	mesh.renderOrder = depthLayer;
	return mesh;
}

/** Overlay panel with polygonOffset to prevent z-fighting. */
function addOverlay(
	parent: THREE.Mesh,
	parentW: number,
	parentH: number,
	palette: [number, number],
	rand: () => number,
): void {
	const ow = parentW * (0.25 + rand() * 0.4);
	const oh = parentH * (0.25 + rand() * 0.4);
	if (ow < 0.1 || oh < 0.1) return;

	const geo = new THREE.PlaneGeometry(ow, oh);
	const mat = createGradientMaterial({
		colors: [new THREE.Color(palette[0]), new THREE.Color(palette[1])],
		direction: "y",
	});
	mat.polygonOffset = true;
	mat.polygonOffsetFactor = -1;
	mat.polygonOffsetUnits = -1;

	const child = new THREE.Mesh(geo, mat);

	const maxOffX = (parentW - ow) * 0.4;
	const maxOffY = (parentH - oh) * 0.4;
	child.position.set(
		(rand() - 0.5) * maxOffX * 2,
		(rand() - 0.5) * maxOffY * 2,
		parentW > 0 ? 0.02 : -0.02,
	);

	parent.add(child);
}

// ── Recursive subdivision ───────────────────────────────

function subdivide(
	box: Box3D,
	depth: number,
	group: THREE.Group,
	c: Required<LabyrinthConfig>,
	rand: () => number,
	pick: () => [number, number],
): void {
	const sizeX = box.maxX - box.minX;
	const sizeY = box.maxY - box.minY;
	const sizeZ = box.maxZ - box.minZ;

	// Stop conditions
	if (depth >= c.maxDepth) return;
	if (sizeX < c.minCellSize && sizeY < c.minCellSize && sizeZ < c.minCellSize)
		return;

	// Choose split axis — weighted by axisWeights config
	const wX = sizeX * c.axisWeights.x;
	const wY = sizeY * c.axisWeights.y;
	const wZ = sizeZ * c.axisWeights.z;
	const total = wX + wY + wZ;
	const r = rand() * total;
	let axis: "x" | "y" | "z";
	if (r < wX) {
		axis = "x";
	} else if (r < wX + wY) {
		axis = "y";
	} else {
		axis = "z";
	}

	// Skip if chosen dimension is too small
	const dimSize = axis === "x" ? sizeX : axis === "y" ? sizeY : sizeZ;
	if (dimSize < c.minCellSize * 2) {
		// Fallback: prefer X or Z over Y
		const fallback =
			sizeX >= sizeZ && sizeX >= c.minCellSize * 2
				? "x"
				: sizeZ >= c.minCellSize * 2
					? "z"
					: sizeY >= c.minCellSize * 2
						? "y"
						: null;
		if (!fallback) return;
		axis = fallback;
	}

	// Center-biased split position (average of two randoms)
	const bias = (rand() + rand()) * 0.5; // peaks at 0.5
	const min = axis === "x" ? box.minX : axis === "y" ? box.minY : box.minZ;
	const max = axis === "x" ? box.maxX : axis === "y" ? box.maxY : box.maxZ;
	const splitPos = min + bias * (max - min);

	// Build two sub-boxes
	const boxA: Box3D = { ...box };
	const boxB: Box3D = { ...box };

	if (axis === "x") {
		boxA.maxX = splitPos;
		boxB.minX = splitPos;
	} else if (axis === "y") {
		boxA.maxY = splitPos;
		boxB.minY = splitPos;
	} else {
		boxA.maxZ = splitPos;
		boxB.minZ = splitPos;
	}

	// Probabilistically place a wall at the split plane
	if (rand() < c.wallProbability) {
		placeWall(box, axis, splitPos, depth, group, c, rand, pick);
	}

	// Optional platform on Y-splits
	if (axis === "y" && rand() < c.platformChance) {
		placePlatform(box, splitPos, depth, group, c, rand, pick);
	}

	// Recurse
	subdivide(boxA, depth + 1, group, c, rand, pick);
	subdivide(boxB, depth + 1, group, c, rand, pick);
}

function placeWall(
	box: Box3D,
	axis: "x" | "y" | "z",
	splitPos: number,
	depth: number,
	group: THREE.Group,
	c: Required<LabyrinthConfig>,
	rand: () => number,
	pick: () => [number, number],
): void {
	const palette = pick();
	const isTranslucent = rand() < c.translucencyChance;
	const opacity = isTranslucent
		? c.opacityRange[0] + rand() * (c.opacityRange[1] - c.opacityRange[0])
		: 1.0;
	const isEmissive = rand() < c.emissiveChance;
	const thickness =
		c.thicknessRange[0] + rand() * (c.thicknessRange[1] - c.thicknessRange[0]);

	// Wall coverage depends on depth — early splits = large blocking panels
	// Depth 0-1: 60-90% coverage, depth 4+: 25-55% coverage
	const depthFactor = Math.max(0, 1.0 - depth * 0.25);
	const coverage = 0.2 + depthFactor * 0.3 + rand() * (0.2 + depthFactor * 0.2);
	// Gap position along the wall (normalized 0-1)
	const gapPos = rand();

	const MIN_WALL = 0.1;

	if (axis === "x") {
		// YZ plane wall — width = sizeZ * coverage, height = sizeY * coverage
		const wallW = (box.maxZ - box.minZ) * coverage;
		const wallH = (box.maxY - box.minY) * coverage;
		if (wallW < MIN_WALL || wallH < MIN_WALL) return;
		const wall = buildWall(
			wallW,
			wallH,
			thickness,
			palette,
			isTranslucent,
			opacity,
			isEmissive,
			depth,
			"y",
		);
		// Position: at splitPos on X, centered-ish with gap offset
		const centerZ = box.minZ + (box.maxZ - box.minZ) * (0.2 + gapPos * 0.6);
		const centerY = box.minY + (box.maxY - box.minY) * (0.2 + gapPos * 0.6);
		wall.position.set(splitPos, centerY, centerZ);
		wall.rotation.y = Math.PI / 2;

		const overlayProbX = c.overlayChance * Math.max(0.1, 1.0 - depth * 0.35);
		if (rand() < overlayProbX) addOverlay(wall, wallW, wallH, pick(), rand);
		group.add(wall);
	} else if (axis === "y") {
		// XZ plane wall (horizontal) — reduced coverage to avoid dominating the view
		const yCoverage = coverage * 0.5;
		const wallW = (box.maxX - box.minX) * yCoverage;
		const wallD = (box.maxZ - box.minZ) * yCoverage;
		if (wallW < MIN_WALL || wallD < MIN_WALL) return;
		const wall = buildWall(
			wallW,
			wallD,
			thickness,
			palette,
			isTranslucent,
			opacity,
			isEmissive,
			depth,
			"x",
		);
		const centerX = box.minX + (box.maxX - box.minX) * (0.2 + gapPos * 0.6);
		const centerZ = box.minZ + (box.maxZ - box.minZ) * (0.2 + gapPos * 0.6);
		wall.position.set(centerX, splitPos, centerZ);
		wall.rotation.x = Math.PI / 2;

		const overlayProbY = c.overlayChance * Math.max(0.1, 1.0 - depth * 0.35);
		if (rand() < overlayProbY) addOverlay(wall, wallW, wallD, pick(), rand);
		group.add(wall);
	} else {
		// XY plane wall — width = sizeX * coverage, height = sizeY * coverage
		const wallW = (box.maxX - box.minX) * coverage;
		const wallH = (box.maxY - box.minY) * coverage;
		if (wallW < MIN_WALL || wallH < MIN_WALL) return;
		const wall = buildWall(
			wallW,
			wallH,
			thickness,
			palette,
			isTranslucent,
			opacity,
			isEmissive,
			depth,
			"y",
		);
		const centerX = box.minX + (box.maxX - box.minX) * (0.2 + gapPos * 0.6);
		const centerY = box.minY + (box.maxY - box.minY) * (0.2 + gapPos * 0.6);
		wall.position.set(centerX, centerY, splitPos);

		const overlayProbZ = c.overlayChance * Math.max(0.1, 1.0 - depth * 0.35);
		if (rand() < overlayProbZ) addOverlay(wall, wallW, wallH, pick(), rand);
		group.add(wall);
	}

	// Emissive glow sphere near emissive walls
	if (isEmissive && rand() < 0.5) {
		const glowSize = 0.15 + rand() * 0.25;
		const geo = new THREE.SphereGeometry(glowSize, 8, 8);
		const emissiveColor = new THREE.Color(palette[0]).lerp(
			new THREE.Color(palette[1]),
			0.5,
		);
		emissiveColor.multiplyScalar(1.0);
		const mat = new THREE.MeshBasicMaterial({
			color: emissiveColor,
			toneMapped: false,
		});
		const sphere = new THREE.Mesh(geo, mat);
		sphere.position.set(
			axis === "x" ? splitPos : (box.minX + box.maxX) * 0.5,
			axis === "y" ? splitPos : (box.minY + box.maxY) * 0.5,
			axis === "z" ? splitPos : (box.minZ + box.maxZ) * 0.5,
		);
		group.add(sphere);
	}
}

function placePlatform(
	box: Box3D,
	yPos: number,
	depth: number,
	group: THREE.Group,
	c: Required<LabyrinthConfig>,
	rand: () => number,
	pick: () => [number, number],
): void {
	const palette = pick();
	const platW = (box.maxX - box.minX) * (0.3 + rand() * 0.4);
	const platD = (box.maxZ - box.minZ) * (0.3 + rand() * 0.4);
	if (platW < 0.1 || platD < 0.1) return;
	const platH = 0.12 + rand() * 0.2;

	const geo = new THREE.BoxGeometry(platW, platH, platD);
	const mat = createGradientMaterial({
		colors: [new THREE.Color(palette[0]), new THREE.Color(palette[1])],
		direction: "x",
	});

	const platform = new THREE.Mesh(geo, mat);
	platform.position.set(
		(box.minX + box.maxX) * 0.5 + (rand() - 0.5) * platW * 0.3,
		yPos,
		(box.minZ + box.maxZ) * 0.5 + (rand() - 0.5) * platD * 0.3,
	);
	platform.renderOrder = depth;
	group.add(platform);
}

// ── Chunk bounds ────────────────────────────────────────

export interface ChunkBounds {
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
	minZ: number;
	maxZ: number;
}

// ── Chunk generator (public API) ────────────────────────

/** Generate a labyrinth chunk for a 3D bounding box using recursive subdivision. */
export function generateLabyrinthChunk(
	bounds: ChunkBounds,
	config?: LabyrinthConfig,
): THREE.Group {
	const c = { ...DEFAULTS, ...config };
	// Unique seed from all 3 axes using distinct primes
	const chunkSeed =
		c.seed +
		Math.floor(bounds.minX * 7919) +
		Math.floor(bounds.minY * 104729) +
		Math.floor(bounds.minZ * 1299709);
	const rand = mulberry32(chunkSeed);
	const group = new THREE.Group();
	group.userData.bounds = bounds;

	const pals = c.palettes;
	const pick = (): [number, number] => pals[Math.floor(rand() * pals.length)];

	subdivide(bounds, 0, group, c, rand, pick);

	return group;
}

/** Dispose all geometries and materials in a chunk group. */
export function disposeLabyrinthChunk(chunk: THREE.Group): void {
	chunk.traverse((obj) => {
		if (obj instanceof THREE.Mesh) {
			obj.geometry.dispose();
			if (Array.isArray(obj.material)) {
				for (const m of obj.material) m.dispose();
			} else {
				obj.material.dispose();
			}
		}
	});
}
