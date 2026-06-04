import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const BASE_URL = "/sinneswandler_test1/models";

export interface WorldModelGeometries {
  pineTree: THREE.BufferGeometry | null;
  commonTree: THREE.BufferGeometry | null;
  birchTree: THREE.BufferGeometry | null;
  willowTree: THREE.BufferGeometry | null;
  deadTree: THREE.BufferGeometry | null;
  snowTree: THREE.BufferGeometry | null;
  palmTree: THREE.BufferGeometry | null;
  cactus: THREE.BufferGeometry | null;
  rock: THREE.BufferGeometry | null;
  mossRock: THREE.BufferGeometry | null;
  snowRock: THREE.BufferGeometry | null;
  grass: THREE.BufferGeometry | null;
  bush: THREE.BufferGeometry | null;
  flower: THREE.BufferGeometry | null;
  forestProp: THREE.BufferGeometry | null;
  snowPlant: THREE.BufferGeometry | null;
}

type WorldModelKey = keyof WorldModelGeometries;

// Files are relative to static/sinneswandler_test1/models/.
// Multiple entries keep the world varied by picking one model per category at load time.
export const MODEL_PATHS: Record<WorldModelKey, string[]> = {
  pineTree: [
    "trees/pine/PineTree_1.obj",
    "trees/pine/PineTree_2.obj",
    "trees/pine/PineTree_3.obj",
    "trees/pine/PineTree_4.obj",
    "trees/pine/PineTree_5.obj",
  ],
  commonTree: [
    "trees/common/CommonTree_1.obj",
    "trees/common/CommonTree_2.obj",
    "trees/common/CommonTree_3.obj",
    "trees/common/CommonTree_4.obj",
    "trees/common/CommonTree_5.obj",
  ],
  birchTree: [
    "trees/birch/BirchTree_1.obj",
    "trees/birch/BirchTree_2.obj",
    "trees/birch/BirchTree_3.obj",
    "trees/birch/BirchTree_4.obj",
    "trees/birch/BirchTree_5.obj",
  ],
  willowTree: [
    "trees/willow/Willow_1.obj",
    "trees/willow/Willow_2.obj",
    "trees/willow/Willow_3.obj",
    "trees/willow/Willow_4.obj",
    "trees/willow/Willow_5.obj",
  ],
  deadTree: [
    "trees/dead/CommonTree_Dead_1.obj",
    "trees/dead/CommonTree_Dead_2.obj",
    "trees/dead/BirchTree_Dead_1.obj",
    "trees/dead/Willow_Dead_1.obj",
    "props/TreeStump.obj",
  ],
  snowTree: [
    "trees/snow/PineTree_Snow_1.obj",
    "trees/snow/PineTree_Snow_2.obj",
    "trees/snow/CommonTree_Dead_Snow_1.obj",
    "trees/snow/BirchTree_Dead_Snow_1.obj",
    "trees/snow/CommonTree_Snow_1.obj",
    "trees/snow/CommonTree_Snow_2.obj",
    "trees/snow/BirchTree_Snow_1.obj",
    "trees/snow/Willow_Snow_1.obj",
  ],
  palmTree: [
    "trees/palm/PalmTree_1.obj",
    "trees/palm/PalmTree_2.obj",
    "trees/palm/PalmTree_3.obj",
    "trees/palm/PalmTree_4.obj",
  ],
  cactus: [
    "cacti/Cactus_1.obj",
    "cacti/Cactus_2.obj",
    "cacti/Cactus_3.obj",
    "cacti/Cactus_4.obj",
    "cacti/CactusFlowers_2.obj",
  ],
  rock: [
    "rocks/regular/Rock_1.obj",
    "rocks/regular/Rock_2.obj",
    "rocks/regular/Rock_3.obj",
  ],
  mossRock: [
    "rocks/moss/Rock_Moss_1.obj",
    "rocks/moss/Rock_Moss_2.obj",
    "rocks/moss/Rock_Moss_3.obj",
    "rocks/moss/Rock_Moss_4.obj",
  ],
  snowRock: [
    "rocks/snow/Rock_Snow_1.obj",
    "rocks/snow/Rock_Snow_2.obj",
    "rocks/snow/Rock_Snow_3.obj",
  ],
  grass: [
    "grass/Grass.obj",
    "grass/Grass_2.obj",
    "grass/Grass_Short.obj",
    "grass/Wheat.obj",
  ],
  bush: [
    "plants/Bush_1.obj",
    "plants/Bush_2.obj",
    "plants/BushBerries_1.obj",
    "plants/BushBerries_2.obj",
    "plants/Plant_3.obj",
  ],
  flower: [
    "plants/Flowers.obj",
    "plants/Plant_1.obj",
    "plants/Plant_2.obj",
  ],
  forestProp: [
    "props/TreeStump.obj",
    "props/TreeStump_Moss.obj",
    "props/WoodLog.obj",
    "props/WoodLog_Moss.obj",
  ],
  snowPlant: [
    "plants/Bush_Snow_1.obj",
    "plants/Bush_Snow_2.obj",
    "props/TreeStump_Snow.obj",
    "props/WoodLog_Snow.obj",
  ],
};

const TARGET_SIZE: Record<WorldModelKey, number> = {
  pineTree: 4.4,
  commonTree: 4.2,
  birchTree: 4.3,
  willowTree: 4.1,
  deadTree: 3.1,
  snowTree: 4.3,
  palmTree: 4.8,
  cactus: 1.7,
  rock: 1.45,
  mossRock: 1.35,
  snowRock: 1.45,
  grass: 1.0,
  bush: 1.35,
  flower: 0.8,
  forestProp: 1.25,
  snowPlant: 1.0,
};

export async function loadWorldModels(): Promise<WorldModelGeometries> {
  const result: WorldModelGeometries = {
    pineTree: null,
    commonTree: null,
    birchTree: null,
    willowTree: null,
    deadTree: null,
    snowTree: null,
    palmTree: null,
    cactus: null,
    rock: null,
    mossRock: null,
    snowRock: null,
    grass: null,
    bush: null,
    flower: null,
    forestProp: null,
    snowPlant: null,
  };

  const keys = Object.keys(MODEL_PATHS) as WorldModelKey[];

  await Promise.all(
    keys.map(async (key) => {
      const files = MODEL_PATHS[key];
      if (files.length === 0) return;

      const file = files[Math.floor(Math.random() * files.length)];
      const url = `${BASE_URL}/${file}`;

      try {
        const geo = await loadGeometry(url);
        normalizeGeometry(geo, TARGET_SIZE[key]);
        result[key] = geo;
      } catch (err) {
        console.warn(
          `[world-models] Failed to load "${url}", using procedural fallback.`,
          err,
        );
      }
    }),
  );

  return result;
}

async function loadGeometry(url: string): Promise<THREE.BufferGeometry> {
  const ext = url.split(".").pop()?.toLowerCase();

  if (ext === "glb" || ext === "gltf") {
    return loadGLTFGeometry(url);
  }
  if (ext === "obj") {
    return loadOBJGeometry(url);
  }
  throw new Error(`Unsupported format: .${ext}`);
}

async function loadGLTFGeometry(url: string): Promise<THREE.BufferGeometry> {
  const loader = new GLTFLoader();
  const gltf = await new Promise<
    import("three/examples/jsm/loaders/GLTFLoader.js").GLTF
  >((resolve, reject) => loader.load(url, resolve, undefined, reject));

  const geometries: THREE.BufferGeometry[] = [];
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const geo = child.geometry.clone() as THREE.BufferGeometry;
    geo.applyMatrix4(child.matrixWorld);
    geo.deleteAttribute("uv");
    geo.deleteAttribute("uv1");
    geometries.push(geo);
  });

  return mergeAndClean(geometries, url);
}

async function loadOBJGeometry(url: string): Promise<THREE.BufferGeometry> {
  const loader = new OBJLoader();
  const obj = await new Promise<THREE.Group>((resolve, reject) =>
    loader.load(url, resolve, undefined, reject),
  );

  const geometries: THREE.BufferGeometry[] = [];
  obj.updateMatrixWorld(true);
  obj.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const geo = child.geometry.clone() as THREE.BufferGeometry;
    geo.applyMatrix4(child.matrixWorld);
    geo.deleteAttribute("uv");
    geometries.push(geo);
  });

  return mergeAndClean(geometries, url);
}

function mergeAndClean(
  geometries: THREE.BufferGeometry[],
  url: string,
): THREE.BufferGeometry {
  if (geometries.length === 0) {
    throw new Error(`No mesh geometry found in: ${url}`);
  }

  const merged =
    geometries.length === 1
      ? geometries[0]
      : (mergeGeometries(geometries, false) ??
        (() => {
          throw new Error(`Merge failed: ${url}`);
        })());

  if (geometries.length > 1) {
    geometries.forEach((g) => g.dispose());
  }

  merged.center();
  merged.computeVertexNormals();
  return merged;
}

function normalizeGeometry(
  geo: THREE.BufferGeometry,
  targetSize: number,
): void {
  const size = new THREE.Box3()
    .setFromBufferAttribute(geo.attributes.position as THREE.BufferAttribute)
    .getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 1e-4);
  const scale = targetSize / maxDim;
  geo.scale(scale, scale, scale);
}
