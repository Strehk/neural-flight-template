import * as THREE from "three";
import { loadGLTF } from "$lib/three/loader";
import { getHexTilePositions, HEX_RADIUS } from "./hex-floor";
import type { VisioTechnologicaState } from "./scene";

const HOCHHAUS_URL = new URL(
	"./3d assets/Tile Hochhaus.glb",
	import.meta.url,
).href;
const MIETSKASERNE_URL = new URL(
	"./3d assets/Tile Mietskaserne.glb",
	import.meta.url,
).href;
const PARK_URL = new URL("./3d assets/Tile Park.glb", import.meta.url).href;

const EMPTY_TILE_PROBABILITY = 0.5;
const TARGET_TILE_TOP_Y = 0;
const ZONE_COUNT = 3;

export interface ZoneTileAsset {
	key: "hochhaus" | "mietskaserne" | "park";
	root: THREE.Object3D;
}

async function loadZoneTileAssets(): Promise<ZoneTileAsset[]> {
	const [hochhaus, mietskaserne, park] = await Promise.all([
		loadGLTF(HOCHHAUS_URL),
		loadGLTF(MIETSKASERNE_URL),
		loadGLTF(PARK_URL),
	]);

	return [
		{ key: "hochhaus", root: hochhaus.scene },
		{ key: "mietskaserne", root: mietskaserne.scene },
		{ key: "park", root: park.scene },
	];
}

function getZoneIndex(ring: number, radius: number): number {
	const zoneSize = radius / ZONE_COUNT;

	if (ring < zoneSize) {
		return 0;
	}

	if (ring < zoneSize * 2) {
		return 1;
	}

	return 2;
}

function getAssetForRing(
	ring: number,
	radius: number,
	assets: ZoneTileAsset[],
): ZoneTileAsset {
	const zoneIndex = getZoneIndex(ring, radius);
	return assets[zoneIndex];
}

function fitObjectToHexTile(
	object: THREE.Object3D,
	tileSize: number,
): number {
	object.updateMatrixWorld(true);
	const bounds = new THREE.Box3().setFromObject(object);
	const size = bounds.getSize(new THREE.Vector3());

	if (size.x === 0 || size.z === 0) {
		return 1;
	}

	const targetWidth = tileSize * 2;
	const targetDepth = Math.sqrt(3) * tileSize;
	return Math.min(targetWidth / size.x, targetDepth / size.z);
}

function positionObjectOnTile(
	object: THREE.Object3D,
	tileX: number,
	tileZ: number,
	tileHeight: number,
): void {
	object.updateMatrixWorld(true);
	const bounds = new THREE.Box3().setFromObject(object);
	object.position.x += tileX;
	object.position.z += tileZ;
	object.position.y += TARGET_TILE_TOP_Y - bounds.min.y + tileHeight * 0.5;
}

function applyMeshShadowFlags(root: THREE.Object3D): void {
	root.traverse((child) => {
		if (child instanceof THREE.Mesh) {
			child.castShadow = true;
			child.receiveShadow = true;
		}
	});
}

function cloneTileAsset(
	asset: ZoneTileAsset,
	tileX: number,
	tileZ: number,
	tileSize: number,
	tileHeight: number,
): THREE.Object3D {
	const clone = asset.root.clone(true);
	const scale = fitObjectToHexTile(clone, tileSize);
	clone.scale.multiplyScalar(scale);
	positionObjectOnTile(clone, tileX, tileZ, tileHeight);
	applyMeshShadowFlags(clone);
	return clone;
}

export async function createZonedTiles(
	radius: number,
	tileSize: number,
	tileGap: number,
	tileHeight: number,
): Promise<{ assets: ZoneTileAsset[]; group: THREE.Group }> {
	const assets = await loadZoneTileAssets();
	const group = buildZonedTileGroup(assets, radius, tileSize, tileGap, tileHeight);
	return { assets, group };
}

export function buildZonedTileGroup(
	assets: ZoneTileAsset[],
	radius: number,
	tileSize: number,
	tileGap: number,
	tileHeight: number,
): THREE.Group {
	const group = new THREE.Group();
	group.name = "visio-technologica-zoned-tiles";

	for (const tile of getHexTilePositions(radius, tileSize, tileGap)) {
		if (tile.ring !== 0 && Math.random() < EMPTY_TILE_PROBABILITY) {
			continue;
		}

		const asset = getAssetForRing(tile.ring, radius, assets);
		const placedTile = cloneTileAsset(
			asset,
			tile.x,
			tile.z,
			tileSize,
			tileHeight,
		);
		group.add(placedTile);
	}

	return group;
}

export function disposeZonedTileGroup(
	group: THREE.Group,
	scene: THREE.Scene,
): void {
	scene.remove(group);
	group.clear();
}

export function disposeZoneTileAssets(assets: ZoneTileAsset[]): void {
	for (const asset of assets) {
		asset.root.traverse((child) => {
			if (!(child instanceof THREE.Mesh)) {
				return;
			}

			child.geometry.dispose();
			if (Array.isArray(child.material)) {
				for (const material of child.material) {
					material.dispose();
				}
			} else {
				child.material.dispose();
			}
		});
	}
}

export function rebuildZonedTiles(
	state: VisioTechnologicaState,
	scene: THREE.Scene,
): void {
	disposeZonedTileGroup(state.zonedTiles, scene);
	state.zonedTiles = buildZonedTileGroup(
		state.zoneTileAssets,
		HEX_RADIUS,
		state.tileSize,
		state.tileGap,
		state.tileHeight,
	);
	scene.add(state.zonedTiles);
}
