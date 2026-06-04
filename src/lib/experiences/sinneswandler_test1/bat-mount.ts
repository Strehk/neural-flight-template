import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

const BAT_OBJ_URL = new URL("./assets/Bat/VAMP_BAT.OBJ", import.meta.url).href;

const BAT_MOUNT_SCALE = 7.4;
const BAT_MOUNT_POSITION = new THREE.Vector3(0, -0.72, -1.12);
const BAT_MOUNT_ROTATION = new THREE.Euler(0.14, Math.PI, 0.02);

function createBatMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: "#151821",
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide,
    toneMapped: false,
    fog: false,
  });
}

export async function loadBatMount(): Promise<THREE.Group> {
  const loader = new OBJLoader();
  const obj = await new Promise<THREE.Group>((resolve, reject) => {
    loader.load(BAT_OBJ_URL, resolve, undefined, reject);
  });

  const box = new THREE.Box3().setFromObject(obj);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const bodyMaterial = createBatMaterial();

  obj.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    child.geometry.computeVertexNormals();
    child.material = bodyMaterial;
    child.castShadow = false;
    child.receiveShadow = false;
    child.frustumCulled = false;
  });

  obj.position.sub(center);
  obj.position.y -= size.y * 0.15;
  obj.scale.setScalar(BAT_MOUNT_SCALE);

  const mount = new THREE.Group();
  mount.name = "bat-mount";
  mount.position.copy(BAT_MOUNT_POSITION);
  mount.rotation.copy(BAT_MOUNT_ROTATION);
  mount.add(obj);
  mount.traverse((child) => {
    child.frustumCulled = false;
  });

  return mount;
}

export function disposeBatMount(group: THREE.Group | null): void {
  if (!group) return;

  group.removeFromParent();
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (Array.isArray(child.material)) {
        for (const material of child.material) {
          material.dispose();
        }
      } else {
        child.material.dispose();
      }
    }
  });
}
