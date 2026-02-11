import * as THREE from "three";
import { DECORATIONS, TERRAIN } from "$lib/config/flight";
import { seededRandom2D as seededRandom } from "../random";
import {
	DEFAULT_HEIGHTMAP,
	getHeight,
	type HeightmapConfig,
} from "./heightmap";

export interface ChunkDecorations {
	group: THREE.Group;
	dispose(): void;
}

const crownGeo = new THREE.ConeGeometry(2, 5, 6);
const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 2, 5);
const rockGeo = new THREE.DodecahedronGeometry(1.5, 0);

const crownMat = new THREE.MeshStandardMaterial({ flatShading: true });
const trunkMat = new THREE.MeshStandardMaterial({
	color: DECORATIONS.TRUNK_COLOR,
});
const rockMat = new THREE.MeshStandardMaterial({
	color: DECORATIONS.ROCK_COLOR,
	flatShading: true,
});

/** Create instanced decorations (trees + rocks) for a single terrain chunk. */
export function createChunkDecorations(
	chunkX: number,
	chunkZ: number,
	config: HeightmapConfig = DEFAULT_HEIGHTMAP,
	treesPerChunk: number = DECORATIONS.TREES_PER_CHUNK,
): ChunkDecorations {
	const group = new THREE.Group();
	const dummy = new THREE.Object3D();
	const color = new THREE.Color();
	const size = TERRAIN.CHUNK_SIZE;
	const worldX = chunkX * size;
	const worldZ = chunkZ * size;

	// Unique seed offset per chunk
	const seed = chunkX * 73856093 + chunkZ * 19349663;

	// ── Trees ──
	const crownMesh = new THREE.InstancedMesh(crownGeo, crownMat, treesPerChunk);
	const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, treesPerChunk);
	let treeIdx = 0;

	for (let i = 0; i < treesPerChunk * 2 && treeIdx < treesPerChunk; i++) {
		const lx = (seededRandom(seed + i, 0) - 0.5) * size;
		const lz = (seededRandom(seed + i, 1) - 0.5) * size;
		const wx = lx + worldX;
		const wz = lz + worldZ;
		const h = getHeight(wx, wz, config);

		if (h < 5 || h > 35) continue;

		const scale = 0.8 + seededRandom(seed + i, 2) * 0.6;

		dummy.position.set(lx, h + 2.5 * scale, lz);
		dummy.scale.setScalar(scale);
		dummy.updateMatrix();
		crownMesh.setMatrixAt(treeIdx, dummy.matrix);
		crownMesh.setColorAt(
			treeIdx,
			color.setHex(
				DECORATIONS.CROWN_COLORS[(seed + i) % DECORATIONS.CROWN_COLORS.length],
			),
		);

		dummy.position.set(lx, h + 0.5 * scale, lz);
		dummy.updateMatrix();
		trunkMesh.setMatrixAt(treeIdx, dummy.matrix);

		treeIdx++;
	}

	crownMesh.count = treeIdx;
	trunkMesh.count = treeIdx;
	crownMesh.instanceMatrix.needsUpdate = true;
	trunkMesh.instanceMatrix.needsUpdate = true;
	if (crownMesh.instanceColor) crownMesh.instanceColor.needsUpdate = true;

	// ── Rocks ──
	const rockMesh = new THREE.InstancedMesh(
		rockGeo,
		rockMat,
		DECORATIONS.ROCKS_PER_CHUNK,
	);
	let rockIdx = 0;

	for (
		let i = 0;
		i < DECORATIONS.ROCKS_PER_CHUNK * 2 &&
		rockIdx < DECORATIONS.ROCKS_PER_CHUNK;
		i++
	) {
		const lx = (seededRandom(seed + i + 5000, 0) - 0.5) * size;
		const lz = (seededRandom(seed + i + 5000, 1) - 0.5) * size;
		const wx = lx + worldX;
		const wz = lz + worldZ;
		const h = getHeight(wx, wz, config);

		if (h < 3 || h > 50) continue;

		const scale = 0.5 + seededRandom(seed + i + 5000, 2) * 1.0;
		dummy.position.set(lx, h - 0.3, lz);
		dummy.scale.setScalar(scale);
		dummy.rotation.set(
			seededRandom(seed + i + 5000, 3) * Math.PI,
			seededRandom(seed + i + 5000, 4) * Math.PI,
			0,
		);
		dummy.updateMatrix();
		rockMesh.setMatrixAt(rockIdx, dummy.matrix);
		rockIdx++;
	}

	rockMesh.count = rockIdx;
	rockMesh.instanceMatrix.needsUpdate = true;

	crownMesh.castShadow = true;
	trunkMesh.castShadow = true;
	rockMesh.castShadow = true;

	// Position group at chunk world offset
	group.position.set(worldX, 0, worldZ);
	group.add(crownMesh, trunkMesh, rockMesh);

	return {
		group,
		dispose() {
			crownMesh.dispose();
			trunkMesh.dispose();
			rockMesh.dispose();
		},
	};
}
