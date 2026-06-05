/**
 * DecorationPlacer — assembles the 16 InstancedMesh objects for one
 * chunk from a pre-computed `DecorationData` payload (typed arrays of
 * matrices + colours per decoration type).
 *
 * The placement RNG + sampling pipeline lives in `decoration-data.ts`
 * so it can run inside a Web Worker. This module owns only the
 * main-thread side: geometry + material wiring, scene attachment,
 * `userData.echoSurface` tagging, and `finalizeInstancedMesh` bookkeeping.
 */

import * as THREE from "three";
import { fbm, type NoiseStack } from "$lib/three/world/NoiseStack";
import { finalizeInstancedMesh as finalizeInstancedMeshHelper } from "$lib/three/world/geometry-helpers";
import {
  computeDecorationData,
  type DecorationBucket,
  type DecorationData,
  type DecorationName,
} from "$lib/worldgen/vegetation/decoration-data";
import {
  applyTerrainEchoColor,
  type TerrainEchoPalette,
} from "./derived-field-sampler";
import type { TerrainSampler } from "./terrain-sampler";

// ---------------------------------------------------------------------------
// Construction surface
// ---------------------------------------------------------------------------

export interface DecorationPlacerSettings {
  chunkSize: number;
  treeDensity: number;
  grassDensity: number;
  mountainHeight: number;
}

export interface DecorationGeometries {
  pineTree:    THREE.BufferGeometry;
  commonTree:  THREE.BufferGeometry;
  birchTree:   THREE.BufferGeometry;
  willowTree:  THREE.BufferGeometry;
  deadTree:    THREE.BufferGeometry;
  snowTree:    THREE.BufferGeometry;
  palmTree:    THREE.BufferGeometry;
  cactus:      THREE.BufferGeometry;
  rock:        THREE.BufferGeometry;
  mossRock:    THREE.BufferGeometry;
  snowRock:    THREE.BufferGeometry;
  grass:       THREE.BufferGeometry;
  bush:        THREE.BufferGeometry;
  flower:      THREE.BufferGeometry;
  forestProp:  THREE.BufferGeometry;
  snowPlant:   THREE.BufferGeometry;
}

export interface DecorationMaterials {
  /** Tree crowns (pine / common / birch / willow / snow / palm). */
  crown: THREE.Material;
  /** Tree trunks (dead tree, forest prop). */
  trunk: THREE.Material;
  /** All three rock variants. */
  rock:  THREE.Material;
  /** Grass + bushes + flowers + cacti + snow plants. */
  grass: THREE.Material;
}

export interface DecorationPlacerOptions {
  settings: DecorationPlacerSettings;
  geometries: DecorationGeometries;
  materials: DecorationMaterials;
  terrainSampler: TerrainSampler;
  noiseStack: NoiseStack;
  echoPalette: TerrainEchoPalette;
}

type EchoSurfaceTag = "tree" | "grass" | "rock" | "terrain";

interface DecorationMeta {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  echoSurface: EchoSurfaceTag;
  renderOrder?: number;
}

// ---------------------------------------------------------------------------
// Placer
// ---------------------------------------------------------------------------

export class DecorationPlacer {
  private readonly settings: DecorationPlacerSettings;
  private readonly terrainSampler: TerrainSampler;
  private readonly noiseStack: NoiseStack;
  private readonly echoPalette: TerrainEchoPalette;
  private readonly metaByName: Record<DecorationName, DecorationMeta>;

  constructor(opts: DecorationPlacerOptions) {
    this.settings = opts.settings;
    this.terrainSampler = opts.terrainSampler;
    this.noiseStack = opts.noiseStack;
    this.echoPalette = opts.echoPalette;

    this.metaByName = {
      pineTrees:   { geometry: opts.geometries.pineTree,    material: opts.materials.crown, echoSurface: "tree" },
      commonTrees: { geometry: opts.geometries.commonTree,  material: opts.materials.crown, echoSurface: "tree" },
      birchTrees:  { geometry: opts.geometries.birchTree,   material: opts.materials.crown, echoSurface: "tree" },
      willowTrees: { geometry: opts.geometries.willowTree,  material: opts.materials.crown, echoSurface: "tree" },
      deadTrees:   { geometry: opts.geometries.deadTree,    material: opts.materials.trunk, echoSurface: "tree" },
      snowTrees:   { geometry: opts.geometries.snowTree,    material: opts.materials.crown, echoSurface: "tree" },
      palmTrees:   { geometry: opts.geometries.palmTree,    material: opts.materials.crown, echoSurface: "tree" },
      cacti:       { geometry: opts.geometries.cactus,      material: opts.materials.grass, echoSurface: "grass" },
      rocks:       { geometry: opts.geometries.rock,        material: opts.materials.rock,  echoSurface: "rock" },
      mossRocks:   { geometry: opts.geometries.mossRock,    material: opts.materials.rock,  echoSurface: "rock" },
      snowRocks:   { geometry: opts.geometries.snowRock,    material: opts.materials.rock,  echoSurface: "rock" },
      snowPlants:  { geometry: opts.geometries.snowPlant,   material: opts.materials.grass, echoSurface: "grass" },
      grass:       { geometry: opts.geometries.grass,       material: opts.materials.grass, echoSurface: "grass" },
      bushes:      { geometry: opts.geometries.bush,        material: opts.materials.grass, echoSurface: "grass" },
      flowers:     { geometry: opts.geometries.flower,      material: opts.materials.grass, echoSurface: "grass" },
      forestProps: { geometry: opts.geometries.forestProp,  material: opts.materials.trunk, echoSurface: "tree" },
    };
  }

  /**
   * Synchronous build path (fallback / non-worker). Runs the pure-data
   * pipeline on the main thread, then assembles the InstancedMeshes.
   */
  place(gridX: number, gridZ: number): THREE.Group {
    const data = computeDecorationData(gridX, gridZ, {
      settings: this.settings,
      sample: (x, z) => this.terrainSampler.sample(x, z),
      colorizeSample: (outColor, sample) =>
        applyTerrainEchoColor(outColor, sample, this.echoPalette),
      forestSection: (x, z) =>
        fbm(
          this.noiseStack.getNoise("treeCluster"),
          x * 0.0024 + 41,
          z * 0.0024 - 29,
          3,
          2.05,
          0.52,
        ),
    });
    return this.applyData(data);
  }

  /**
   * Worker-fed build path. Wraps a `DecorationData` payload (typed
   * arrays of matrices + colours) into 16 InstancedMeshes. The float
   * arrays are *adopted* into the mesh attributes — caller must not
   * mutate them after handing them to applyData.
   */
  applyData(data: DecorationData): THREE.Group {
    const group = new THREE.Group();
    const names = Object.keys(this.metaByName) as DecorationName[];
    for (const name of names) {
      const meta = this.metaByName[name];
      const bucket = data[name];
      const mesh = buildInstancedMesh(meta, bucket);
      group.add(mesh);
    }
    return group;
  }
}

function buildInstancedMesh(
  meta: DecorationMeta,
  bucket: DecorationBucket,
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(meta.geometry, meta.material, bucket.capacity);
  mesh.userData.echoSurface = meta.echoSurface;
  if (meta.renderOrder !== undefined) {
    mesh.renderOrder = meta.renderOrder;
  }

  // Bulk-copy the column-major 4x4 matrices into the instanceMatrix buffer.
  // Sizes match because both arrays are capacity * 16 floats.
  (mesh.instanceMatrix.array as Float32Array).set(bucket.matrices);

  if (bucket.colors) {
    // Adopt the colour Float32Array directly as an InstancedBufferAttribute.
    // No extra copy: bucket.colors becomes the attribute's backing buffer.
    mesh.instanceColor = new THREE.InstancedBufferAttribute(bucket.colors, 3);
  }
  finalizeInstancedMeshHelper(mesh, bucket.count);
  return mesh;
}
