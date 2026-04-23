import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const FLY_OBJ_URL = new URL(
  "./assets/Fly/19912_Horse_fly_V1_.obj",
  import.meta.url,
).href;
const FLY_TARGET_SIZE = 0.34;

export async function loadFlyGeometry(): Promise<THREE.BufferGeometry> {
  const loader = new OBJLoader();
  const obj = await new Promise<THREE.Group>((resolve, reject) => {
    loader.load(FLY_OBJ_URL, resolve, undefined, reject);
  });

  obj.updateMatrixWorld(true);
  const meshGeometries: THREE.BufferGeometry[] = [];

  obj.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    const geometry = child.geometry.clone();
    geometry.applyMatrix4(child.matrixWorld);
    geometry.deleteAttribute("uv");
    meshGeometries.push(geometry);
  });

  if (meshGeometries.length === 0) {
    throw new Error("Fly OBJ did not contain any mesh geometry");
  }

  const merged = mergeGeometries(meshGeometries, false);
  for (const geometry of meshGeometries) {
    geometry.dispose();
  }
  if (!merged) {
    throw new Error("Failed to merge fly mesh geometries");
  }

  merged.rotateX(Math.PI / 2);
  merged.rotateZ(Math.PI);
  merged.center();

  const size = new THREE.Box3()
    .setFromBufferAttribute(merged.attributes.position as THREE.BufferAttribute)
    .getSize(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z, 1e-4);
  merged.scale(
    FLY_TARGET_SIZE / maxDimension,
    FLY_TARGET_SIZE / maxDimension,
    FLY_TARGET_SIZE / maxDimension,
  );
  merged.computeVertexNormals();
  return merged;
}
