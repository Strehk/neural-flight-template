import * as THREE from "three";
import type { VisioTechnologicaState } from "./scene";

export const HEX_RADIUS = 8;

const _tileMatrix = new THREE.Matrix4();
const _tilePosition = new THREE.Vector3();
const _tileQuaternion = new THREE.Quaternion();
const _tileScale = new THREE.Vector3(1, 1, 1);

function axialToWorld(
	q: number,
	r: number,
	hexSize: number,
): { x: number; z: number } {
	const x = hexSize * Math.sqrt(3) * (q + r / 2);
	const z = hexSize * 1.5 * r;
	return { x, z };
}

function getHexSpacing(tileSize: number, tileGap: number): number {
	return tileSize + tileGap * 0.5;
}

export function createHexFloor(
	radius: number,
	tileSize: number,
	tileGap: number,
	tileHeight: number,
	material: THREE.MeshStandardMaterial,
): THREE.InstancedMesh {
	const spacing = getHexSpacing(tileSize, tileGap);
	const positions: Array<{ x: number; z: number }> = [];

	for (let q = -radius; q <= radius; q++) {
		const rMin = Math.max(-radius, -q - radius);
		const rMax = Math.min(radius, -q + radius);

		for (let r = rMin; r <= rMax; r++) {
			positions.push(axialToWorld(q, r, spacing));
		}
	}

	const geometry = new THREE.CylinderGeometry(
		tileSize,
		tileSize,
		tileHeight,
		6,
		1,
		false,
	);
	geometry.rotateY(Math.PI / 6);

	const tiles = new THREE.InstancedMesh(geometry, material, positions.length);
	tiles.receiveShadow = true;
	tiles.castShadow = false;

	for (let index = 0; index < positions.length; index++) {
		const tile = positions[index];
		_tilePosition.set(tile.x, -tileHeight / 2, tile.z);
		_tileMatrix.compose(_tilePosition, _tileQuaternion, _tileScale);
		tiles.setMatrixAt(index, _tileMatrix);
	}

	tiles.instanceMatrix.needsUpdate = true;

	return tiles;
}

export function disposeHexFloor(
	tiles: THREE.InstancedMesh,
	scene: THREE.Scene,
): void {
	tiles.geometry.dispose();
	scene.remove(tiles);
}

export function rebuildHexFloor(
	state: VisioTechnologicaState,
	scene: THREE.Scene,
): void {
	disposeHexFloor(state.tiles, scene);
	state.tiles = createHexFloor(
		HEX_RADIUS,
		state.tileSize,
		state.tileGap,
		state.tileHeight,
		state.tileMaterial,
	);
	scene.add(state.tiles);
}
