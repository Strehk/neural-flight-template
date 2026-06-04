import * as THREE from "three";
import type { VisioTechnologicaState } from "./scene";

export const HEX_RADIUS = 32;

const _tileMatrix = new THREE.Matrix4();
const _tilePosition = new THREE.Vector3();
const _tileQuaternion = new THREE.Quaternion();
const _tileScale = new THREE.Vector3(1, 1, 1);

function getHexPlacementRadius(tileSize: number, tileGap: number): number {
  return tileSize + tileGap / Math.sqrt(3);
}

export interface HexTilePosition {
  x: number;
  z: number;
  distanceToCenter: number;
  ring: number;
}

function axialToWorld(
  q: number,
  r: number,
  hexRadius: number,
): { x: number; z: number } {
  return {
    x: hexRadius * 1.5 * q,
    z: hexRadius * Math.sqrt(3) * (r + q / 2),
  };
}

function getHexRing(q: number, r: number): number {
  const s = -q - r;
  return Math.max(Math.abs(q), Math.abs(r), Math.abs(s));
}

function createHexTilePositions(
  radius: number,
  hexRadius: number,
): HexTilePosition[] {
  const positions: HexTilePosition[] = [];

  for (let q = -radius; q <= radius; q++) {
    const rMin = Math.max(-radius, -q - radius);
    const rMax = Math.min(radius, -q + radius);

    for (let r = rMin; r <= rMax; r++) {
      const world = axialToWorld(q, r, hexRadius);
      positions.push({
        x: world.x,
        z: world.z,
        distanceToCenter: Math.hypot(world.x, world.z),
        ring: getHexRing(q, r),
      });
    }
  }

  positions.sort((a, b) => {
    if (a.ring !== b.ring) {
      return a.ring - b.ring;
    }

    return a.distanceToCenter - b.distanceToCenter;
  });

  return positions;
}

export function getHexTilePositions(
  radius: number,
  tileSize: number,
  tileGap: number,
): HexTilePosition[] {
  const placementRadius = getHexPlacementRadius(tileSize, tileGap);
  return createHexTilePositions(radius, placementRadius);
}

export function createHexFloor(
  radius: number,
  tileSize: number,
  tileGap: number,
  tileHeight: number,
  material: THREE.MeshStandardMaterial,
): THREE.InstancedMesh {
  const positions = getHexTilePositions(radius, tileSize, tileGap);

  const geometry = new THREE.CylinderGeometry(
    tileSize,
    tileSize,
    tileHeight,
    6,
    1,
    false,
  );

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
