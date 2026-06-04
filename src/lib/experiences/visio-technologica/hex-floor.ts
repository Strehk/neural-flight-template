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

function offsetRowToWorld(
  column: number,
  row: number,
  hexRadius: number,
): { x: number; z: number } {
  const horizontalSpacing = Math.sqrt(3) * hexRadius;
  const verticalSpacing = 1.5 * hexRadius;
  const rowOffset = (row & 1) === 0 ? 0 : horizontalSpacing / 2;

  return {
    x: column * horizontalSpacing + rowOffset,
    z: row * verticalSpacing,
  };
}

export function createHexFloor(
  radius: number,
  tileSize: number,
  tileGap: number,
  tileHeight: number,
  material: THREE.MeshStandardMaterial,
): THREE.InstancedMesh {
  const placementRadius = getHexPlacementRadius(tileSize, tileGap);
  const positions: Array<{ x: number; z: number }> = [];

  for (let row = -radius; row <= radius; row++) {
    for (let column = -radius; column <= radius; column++) {
      positions.push(offsetRowToWorld(column, row, placementRadius));
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
