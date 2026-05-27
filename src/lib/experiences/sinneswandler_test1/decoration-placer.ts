/**
 * DecorationPlacer — sinneswandler's per-chunk InstancedMesh scatter
 * for 17 decoration types (pine / common / birch / willow / dead /
 * snow / palm trees, cactus, three rock variants, grass / bush /
 * flower / forestProp / snowPlant, ponds).
 *
 * Refactor step 8b: lifted verbatim out of `BatWorld.createDecorations`
 * (world.ts:980–1976) into its own module. The per-type placement
 * formulas — biome weights, scale ranges, color tints, Poisson
 * acceptance probabilities — are unchanged byte-for-byte; only the
 * surrounding plumbing differs. Sets `mesh.userData.echoSurface` once
 * at mesh creation so `EchoProbe.readEchoSurface` keeps working.
 *
 * Config-driven dispatch (one loop over 17 typed recipes from
 * `DecorationConfig`) is a future cleanup — this step is a clean
 * code move with zero behaviour change.
 *
 * Construction takes every dependency it needs (settings, 17
 * geometries, 5 materials, sampler, noise stack, echo palette) so
 * `BatWorld` doesn't have to pass world state around.
 */

import * as THREE from "three";
import { seededRandom2D } from "$lib/three/random";
import { fbm, type NoiseStack } from "$lib/three/world/NoiseStack";
import { remapNoise, saturate, smoothPeak } from "$lib/three/world/math";
import { finalizeInstancedMesh as finalizeInstancedMeshHelper } from "$lib/three/world/geometry-helpers";
import {
  applyTerrainEchoColor,
  type TerrainEchoPalette,
} from "./derived-field-sampler";
import type { TerrainSample, TerrainSampler } from "./terrain-sampler";

// ---------------------------------------------------------------------------
// Decoration colour palette
// ---------------------------------------------------------------------------
// These 17 constants were module-level in world.ts and used only by the
// per-type placement blocks below. Moved here so `world.ts` no longer
// carries them.

const PINE_CROWN_COLOR    = new THREE.Color("#b8fff0");
const COMMON_CROWN_COLOR  = new THREE.Color("#d8f4d4");
const BIRCH_CROWN_COLOR   = new THREE.Color("#e4f1cf");
const WILLOW_CROWN_COLOR  = new THREE.Color("#c7e5b0");
const DEAD_TREE_COLOR     = new THREE.Color("#ddd4be");
const SNOW_TREE_COLOR     = new THREE.Color("#eff7ff");
const PALM_COLOR          = new THREE.Color("#3f7b38");
const CACTUS_COLOR        = new THREE.Color("#6ca35a");
const ROCK_COLOR          = new THREE.Color("#d8e0eb");
const ROCK_HIGHLIGHT      = new THREE.Color("#f4f1e5");
const MOSS_ROCK_COLOR     = new THREE.Color("#9fb48a");
const SNOW_ROCK_COLOR     = new THREE.Color("#eef4fb");
const GRASS_COLOR         = new THREE.Color("#d7f0b4");
const BUSH_COLOR          = new THREE.Color("#9fd07e");
const FLOWER_COLOR        = new THREE.Color("#ffd5dc");
const FOREST_PROP_COLOR   = new THREE.Color("#9f8c70");
const SNOW_COLOR          = new THREE.Color("#f2f7ff");
const DESERT_DAY          = new THREE.Color("#d8b66f");  // day-mode tint, reused for cactus/palm
const HIGH_MOUNTAIN_GRAY  = new THREE.Color("#8a8f92");  // rock tinting at altitude

// Pond grid radius bounds — mirror DerivedFieldConfig.pondRadiusMin/Max.
// Kept as local constants so the legacy `THREE.MathUtils.lerp(MIN, MAX, t)`
// call site inside `place()` stays verbatim.
const POND_RADIUS_MIN = 7;
const POND_RADIUS_MAX = 16;

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
  pond:        THREE.BufferGeometry;
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
  /** Water pond plane. */
  pond:  THREE.Material;
}

export interface DecorationPlacerOptions {
  settings: DecorationPlacerSettings;
  geometries: DecorationGeometries;
  materials: DecorationMaterials;
  terrainSampler: TerrainSampler;
  noiseStack: NoiseStack;
  echoPalette: TerrainEchoPalette;
}

// ---------------------------------------------------------------------------
// Placer
// ---------------------------------------------------------------------------

export class DecorationPlacer {
  private readonly settings: DecorationPlacerSettings;
  private readonly terrainSampler: TerrainSampler;
  private readonly noiseStack: NoiseStack;
  private readonly echoPalette: TerrainEchoPalette;

  // Geometries — names match the legacy fields on BatWorld so the
  // placement body below stays byte-identical with the original code.
  private readonly pineTreeGeometry:    THREE.BufferGeometry;
  private readonly commonTreeGeometry:  THREE.BufferGeometry;
  private readonly birchTreeGeometry:   THREE.BufferGeometry;
  private readonly willowTreeGeometry:  THREE.BufferGeometry;
  private readonly deadTreeGeometry:    THREE.BufferGeometry;
  private readonly snowTreeGeometry:    THREE.BufferGeometry;
  private readonly palmTreeGeometry:    THREE.BufferGeometry;
  private readonly cactusGeometry:      THREE.BufferGeometry;
  private readonly rockGeometry:        THREE.BufferGeometry;
  private readonly mossRockGeometry:    THREE.BufferGeometry;
  private readonly snowRockGeometry:    THREE.BufferGeometry;
  private readonly grassGeometry:       THREE.BufferGeometry;
  private readonly bushGeometry:        THREE.BufferGeometry;
  private readonly flowerGeometry:      THREE.BufferGeometry;
  private readonly forestPropGeometry:  THREE.BufferGeometry;
  private readonly snowPlantGeometry:   THREE.BufferGeometry;
  private readonly pondGeometry:        THREE.BufferGeometry;

  // Materials — same naming convention.
  private readonly crownMaterial: THREE.Material;
  private readonly trunkMaterial: THREE.Material;
  private readonly rockMaterial:  THREE.Material;
  private readonly grassMaterial: THREE.Material;
  private readonly pondMaterial:  THREE.Material;

  /** Scratch colour reused across per-decoration tint blends. Matches the legacy field. */
  private readonly sampleColorB = new THREE.Color();

  constructor(opts: DecorationPlacerOptions) {
    this.settings = opts.settings;
    this.terrainSampler = opts.terrainSampler;
    this.noiseStack = opts.noiseStack;
    this.echoPalette = opts.echoPalette;

    this.pineTreeGeometry    = opts.geometries.pineTree;
    this.commonTreeGeometry  = opts.geometries.commonTree;
    this.birchTreeGeometry   = opts.geometries.birchTree;
    this.willowTreeGeometry  = opts.geometries.willowTree;
    this.deadTreeGeometry    = opts.geometries.deadTree;
    this.snowTreeGeometry    = opts.geometries.snowTree;
    this.palmTreeGeometry    = opts.geometries.palmTree;
    this.cactusGeometry      = opts.geometries.cactus;
    this.rockGeometry        = opts.geometries.rock;
    this.mossRockGeometry    = opts.geometries.mossRock;
    this.snowRockGeometry    = opts.geometries.snowRock;
    this.grassGeometry       = opts.geometries.grass;
    this.bushGeometry        = opts.geometries.bush;
    this.flowerGeometry      = opts.geometries.flower;
    this.forestPropGeometry  = opts.geometries.forestProp;
    this.snowPlantGeometry   = opts.geometries.snowPlant;
    this.pondGeometry        = opts.geometries.pond;

    this.crownMaterial = opts.materials.crown;
    this.trunkMaterial = opts.materials.trunk;
    this.rockMaterial  = opts.materials.rock;
    this.grassMaterial = opts.materials.grass;
    this.pondMaterial  = opts.materials.pond;
  }

  // ---- helpers (preserve legacy method signatures) ----------------------

  /**
   * Wrapper preserving the legacy `sampleTerrainPoint(x, z, outColor)`
   * contract so the placement body below can stay byte-identical.
   * Delegates to the cached TerrainSampler + the shared
   * `applyTerrainEchoColor`.
   */
  private sampleTerrainPoint(
    x: number,
    z: number,
    outColor: THREE.Color,
  ): TerrainSample {
    const sample = this.terrainSampler.sample(x, z);
    applyTerrainEchoColor(outColor, sample, this.echoPalette);
    return sample;
  }

  /**
   * Forest-section noise sampler — drives the `sectionFavor` bell
   * curves that segregate pine / common / birch / willow into
   * different forest sub-zones. Verbatim from world.ts:974–978.
   */
  private sampleForestSection(x: number, z: number): number {
    return remapNoise(
      fbm(this.noiseStack.getNoise("treeCluster"), x * 0.0024 + 41, z * 0.0024 - 29, 3, 2.05, 0.52),
    );
  }

  /** Thin shim to the imported helper so the legacy body call sites are unchanged. */
  private finalizeInstancedMesh(mesh: THREE.InstancedMesh, count: number): void {
    finalizeInstancedMeshHelper(mesh, count);
  }

  // ---- placement body (verbatim from world.ts:980–1976) ----------------

  place(gridX: number, gridZ: number): THREE.Group {
    const group = new THREE.Group();
    const size = this.settings.chunkSize;
    const baseSeed = gridX * 73856093 + gridZ * 19349663;
    const pineCapacity = Math.max(
      34,
      Math.round(this.settings.treeDensity * 4.7),
    );
    const commonCapacity = Math.max(
      32,
      Math.round(this.settings.treeDensity * 4.4),
    );
    const birchCapacity = Math.max(
      24,
      Math.round(this.settings.treeDensity * 3.2),
    );
    const willowCapacity = Math.max(
      18,
      Math.round(this.settings.treeDensity * 2.3),
    );
    const deadCapacity = Math.max(
      4,
      Math.round(this.settings.treeDensity * 0.42),
    );
    const snowCapacity = Math.max(
      8,
      Math.round(this.settings.treeDensity * 0.95),
    );
    const palmCapacity = Math.max(
      2,
      Math.round(this.settings.treeDensity * 0.16),
    );
    const cactusCapacity = Math.max(
      4,
      Math.round(this.settings.grassDensity * 0.2),
    );
    const grassCapacity = Math.max(
      260,
      Math.round(this.settings.grassDensity * 24),
    );
    const bushCapacity = Math.max(
      26,
      Math.round(this.settings.grassDensity * 2.4),
    );
    const flowerCapacity = Math.max(
      36,
      Math.round(this.settings.grassDensity * 3.6),
    );
    const forestPropCapacity = Math.max(
      10,
      Math.round(this.settings.treeDensity * 0.9),
    );
    const snowPlantCapacity = Math.max(
      8,
      Math.round(this.settings.grassDensity * 0.8),
    );
    const rockCapacity = Math.max(
      10,
      Math.round(14 + this.settings.mountainHeight * 0.22),
    );
    const snowRockCapacity = Math.max(
      8,
      Math.round(10 + this.settings.mountainHeight * 0.16),
    );
    const mossRockCapacity = Math.max(
      8,
      Math.round(7 + this.settings.treeDensity * 0.72),
    );
    const pondCapacity = 5;

    const pineTrees = new THREE.InstancedMesh(
      this.pineTreeGeometry,
      this.crownMaterial,
      pineCapacity,
    );
    const commonTrees = new THREE.InstancedMesh(
      this.commonTreeGeometry,
      this.crownMaterial,
      commonCapacity,
    );
    const birchTrees = new THREE.InstancedMesh(
      this.birchTreeGeometry,
      this.crownMaterial,
      birchCapacity,
    );
    const willowTrees = new THREE.InstancedMesh(
      this.willowTreeGeometry,
      this.crownMaterial,
      willowCapacity,
    );
    const deadTrees = new THREE.InstancedMesh(
      this.deadTreeGeometry,
      this.trunkMaterial,
      deadCapacity,
    );
    const snowTrees = new THREE.InstancedMesh(
      this.snowTreeGeometry,
      this.crownMaterial,
      snowCapacity,
    );
    const palmTrees = new THREE.InstancedMesh(
      this.palmTreeGeometry,
      this.crownMaterial,
      palmCapacity,
    );
    const cacti = new THREE.InstancedMesh(
      this.cactusGeometry,
      this.grassMaterial,
      cactusCapacity,
    );
    const rocks = new THREE.InstancedMesh(
      this.rockGeometry,
      this.rockMaterial,
      rockCapacity,
    );
    const mossRocks = new THREE.InstancedMesh(
      this.mossRockGeometry,
      this.rockMaterial,
      mossRockCapacity,
    );
    const snowRocks = new THREE.InstancedMesh(
      this.snowRockGeometry,
      this.rockMaterial,
      snowRockCapacity,
    );
    const grass = new THREE.InstancedMesh(
      this.grassGeometry,
      this.grassMaterial,
      grassCapacity,
    );
    const bushes = new THREE.InstancedMesh(
      this.bushGeometry,
      this.grassMaterial,
      bushCapacity,
    );
    const flowers = new THREE.InstancedMesh(
      this.flowerGeometry,
      this.grassMaterial,
      flowerCapacity,
    );
    const forestProps = new THREE.InstancedMesh(
      this.forestPropGeometry,
      this.trunkMaterial,
      forestPropCapacity,
    );
    const snowPlants = new THREE.InstancedMesh(
      this.snowPlantGeometry,
      this.grassMaterial,
      snowPlantCapacity,
    );
    const ponds = new THREE.InstancedMesh(
      this.pondGeometry,
      this.pondMaterial,
      pondCapacity,
    );
    pineTrees.userData.echoSurface = "tree";
    commonTrees.userData.echoSurface = "tree";
    birchTrees.userData.echoSurface = "tree";
    willowTrees.userData.echoSurface = "tree";
    deadTrees.userData.echoSurface = "tree";
    snowTrees.userData.echoSurface = "tree";
    palmTrees.userData.echoSurface = "tree";
    cacti.userData.echoSurface = "grass";
    rocks.userData.echoSurface = "rock";
    mossRocks.userData.echoSurface = "rock";
    snowRocks.userData.echoSurface = "rock";
    grass.userData.echoSurface = "grass";
    bushes.userData.echoSurface = "grass";
    flowers.userData.echoSurface = "grass";
    forestProps.userData.echoSurface = "tree";
    snowPlants.userData.echoSurface = "grass";
    ponds.userData.echoSurface = "terrain";
    ponds.renderOrder = 2;

    const dummy = new THREE.Object3D();
    const tempColor = new THREE.Color();
    let pineIndex = 0;
    let commonIndex = 0;
    let birchIndex = 0;
    let willowIndex = 0;
    let deadIndex = 0;
    let snowIndex = 0;
    let palmIndex = 0;
    let cactusIndex = 0;
    let rockIndex = 0;
    let mossRockIndex = 0;
    let snowRockIndex = 0;
    let grassIndex = 0;
    let bushIndex = 0;
    let flowerIndex = 0;
    let forestPropIndex = 0;
    let snowPlantIndex = 0;
    let pondIndex = 0;

    for (let i = 0; i < pineCapacity * 8 && pineIndex < pineCapacity; i++) {
      const lx = (seededRandom2D(baseSeed + i, 17) - 0.5) * size;
      const lz = (seededRandom2D(baseSeed + i, 31) - 0.5) * size;
      const wx = lx + gridX * size;
      const wz = lz + gridZ * size;
      const point = this.sampleTerrainPoint(wx, wz, tempColor);
      if (
        point.snowWeight > 0.38 ||
        point.mountainWeight > 0.42 ||
        point.desertWeight > 0.35
      ) {
        continue;
      }
      const section = this.sampleForestSection(wx, wz);
      const sectionFavor = smoothPeak(section, 0.13, 0.19);
      const pineChance = saturate(
        (point.forestWeight * (0.88 + sectionFavor * 1.85) +
          point.treeCluster * point.forestWeight * 0.78) *
          point.vegetationFactor +
          point.forestWeight * 0.22 -
          point.grasslandWeight * 0.62 -
          point.clearingWeight * 1.42 -
          point.pondWeight * 1.24 -
          point.mountainWeight * 0.68 -
          point.alpineFactor * 1.16 -
          point.snowWeight * 1.18 -
          point.desertWeight * 1.1 -
          point.cliffiness * 0.36 -
          point.barrensWeight * 0.62,
      );
      if (seededRandom2D(baseSeed + i, 53) > pineChance) continue;

      const scale =
        0.9 +
        seededRandom2D(baseSeed + i, 61) * 2.5 +
        point.mountainWeight * 0.25;
      const crownColor = this.sampleColorB
        .copy(tempColor)
        .lerp(PINE_CROWN_COLOR, 0.55 + point.forestWeight * 0.18);

      dummy.position.set(lx, point.height + 2.2 * scale, lz);
      dummy.scale.set(scale * 0.72, scale, scale * 0.72);
      dummy.rotation.set(0, seededRandom2D(baseSeed + i, 67) * Math.PI, 0);
      dummy.updateMatrix();
      pineTrees.setMatrixAt(pineIndex, dummy.matrix);
      pineTrees.setColorAt(pineIndex, crownColor);
      pineIndex++;
    }

    for (let i = 0; i < commonCapacity * 8 && commonIndex < commonCapacity; i++) {
      const lx = (seededRandom2D(baseSeed + i, 89) - 0.5) * size;
      const lz = (seededRandom2D(baseSeed + i, 97) - 0.5) * size;
      const wx = lx + gridX * size;
      const wz = lz + gridZ * size;
      const point = this.sampleTerrainPoint(wx, wz, tempColor);
      if (
        point.snowWeight > 0.38 ||
        point.mountainWeight > 0.42 ||
        point.desertWeight > 0.35
      ) {
        continue;
      }
      const section = this.sampleForestSection(wx, wz);
      const sectionFavor = smoothPeak(section, 0.39, 0.2);
      const commonChance = saturate(
        (point.forestWeight * (0.9 + sectionFavor * 1.65) +
          point.treeCluster * point.forestWeight * 0.66) *
          point.vegetationFactor +
          point.forestWeight * 0.18 -
          point.grasslandWeight * 0.72 -
          point.clearingWeight * 1.28 -
          point.pondWeight * 1.12 -
          point.mountainWeight * 0.56 -
          point.alpineFactor -
          point.snowWeight * 1.12 -
          point.desertWeight * 1.08 -
          point.barrensWeight * 0.46 -
          point.cliffiness * 0.3,
      );
      if (seededRandom2D(baseSeed + i, 109) > commonChance) continue;

      const scale = 0.88 + seededRandom2D(baseSeed + i, 127) * 1.9;
      const crownColor = this.sampleColorB
        .copy(tempColor)
        .lerp(COMMON_CROWN_COLOR, 0.54);

      dummy.position.set(lx, point.height + 2.08 * scale, lz);
      dummy.scale.set(scale * 0.92, scale, scale * 0.92);
      dummy.rotation.set(
        seededRandom2D(baseSeed + i, 137) * 0.18,
        seededRandom2D(baseSeed + i, 149) * Math.PI,
        seededRandom2D(baseSeed + i, 151) * 0.18,
      );
      dummy.updateMatrix();
      commonTrees.setMatrixAt(commonIndex, dummy.matrix);
      commonTrees.setColorAt(commonIndex, crownColor);
      commonIndex++;
    }

    for (let i = 0; i < birchCapacity * 8 && birchIndex < birchCapacity; i++) {
      const lx = (seededRandom2D(baseSeed + i, 563) - 0.5) * size;
      const lz = (seededRandom2D(baseSeed + i, 569) - 0.5) * size;
      const wx = lx + gridX * size;
      const wz = lz + gridZ * size;
      const point = this.sampleTerrainPoint(wx, wz, tempColor);
      if (
        point.snowWeight > 0.38 ||
        point.mountainWeight > 0.42 ||
        point.desertWeight > 0.35
      ) {
        continue;
      }
      const section = this.sampleForestSection(wx, wz);
      const sectionFavor = smoothPeak(section, 0.62, 0.18);
      const birchChance = saturate(
        (point.forestWeight * (0.72 + sectionFavor * 1.7) +
          point.treeCluster * point.forestWeight * 0.52 +
          point.clearingWeight * 0.16) *
          point.vegetationFactor -
          point.grasslandWeight * 0.66 -
          point.clearingWeight * 0.96 -
          point.pondWeight * 1.16 -
          point.mountainWeight * 0.62 -
          point.alpineFactor * 1.02 -
          point.snowWeight * 1.08 -
          point.desertWeight * 1.04 -
          point.barrensWeight * 0.44 -
          point.cliffiness * 0.3,
      );
      if (seededRandom2D(baseSeed + i, 571) > birchChance) continue;

      const scale = 0.72 + seededRandom2D(baseSeed + i, 577) * 1.5;
      const crownColor = this.sampleColorB
        .copy(tempColor)
        .lerp(BIRCH_CROWN_COLOR, 0.58);

      dummy.position.set(lx, point.height + 2.02 * scale, lz);
      dummy.scale.set(scale * 0.78, scale * 0.96, scale * 0.78);
      dummy.rotation.set(
        seededRandom2D(baseSeed + i, 587) * 0.14,
        seededRandom2D(baseSeed + i, 593) * Math.PI,
        seededRandom2D(baseSeed + i, 599) * 0.14,
      );
      dummy.updateMatrix();
      birchTrees.setMatrixAt(birchIndex, dummy.matrix);
      birchTrees.setColorAt(birchIndex, crownColor);
      birchIndex++;
    }

    for (let i = 0; i < willowCapacity * 9 && willowIndex < willowCapacity; i++) {
      const lx = (seededRandom2D(baseSeed + i, 521) - 0.5) * size;
      const lz = (seededRandom2D(baseSeed + i, 523) - 0.5) * size;
      const wx = lx + gridX * size;
      const wz = lz + gridZ * size;
      const point = this.sampleTerrainPoint(wx, wz, tempColor);
      if (
        point.snowWeight > 0.38 ||
        point.mountainWeight > 0.42 ||
        point.desertWeight > 0.35
      ) {
        continue;
      }
      const section = this.sampleForestSection(wx, wz);
      const sectionFavor = smoothPeak(section, 0.84, 0.17);
      const willowChance = saturate(
        (point.forestWeight * (0.58 + sectionFavor * 1.7) +
          point.treeCluster * point.forestWeight * 0.38 +
          point.pondWeight * 0.34) *
          point.vegetationFactor -
          point.grasslandWeight * 0.64 -
          point.clearingWeight * 1.0 -
          point.mountainWeight * 0.66 -
          point.alpineFactor -
          point.snowWeight * 1.08 -
          point.desertWeight * 1.08 -
          point.barrensWeight * 0.52 -
          point.cliffiness * 0.34,
      );
      if (seededRandom2D(baseSeed + i, 541) > willowChance) continue;

      const scale = 0.72 + seededRandom2D(baseSeed + i, 547) * 1.45;
      const crownColor = this.sampleColorB
        .copy(tempColor)
        .lerp(WILLOW_CROWN_COLOR, 0.6);

      dummy.position.set(lx, point.height + 1.92 * scale, lz);
      dummy.scale.set(scale * 0.86, scale * 0.9, scale * 0.86);
      dummy.rotation.set(
        seededRandom2D(baseSeed + i, 557) * 0.14,
        seededRandom2D(baseSeed + i, 559) * Math.PI,
        seededRandom2D(baseSeed + i, 561) * 0.14,
      );
      dummy.updateMatrix();
      willowTrees.setMatrixAt(willowIndex, dummy.matrix);
      willowTrees.setColorAt(willowIndex, crownColor);
      willowIndex++;
    }

    for (let i = 0; i < deadCapacity * 6 && deadIndex < deadCapacity; i++) {
      const lx = (seededRandom2D(baseSeed + i, 173) - 0.5) * size;
      const lz = (seededRandom2D(baseSeed + i, 181) - 0.5) * size;
      const wx = lx + gridX * size;
      const wz = lz + gridZ * size;
      const point = this.sampleTerrainPoint(wx, wz, tempColor);
      if (point.snowWeight > 0.42 || point.grasslandWeight > 0.5) continue;
      const deadChance = saturate(
        point.midAltitudeFactor * 0.95 +
          point.barrensWeight * 0.74 +
          point.mountainWeight * 0.34 +
          point.cliffiness * 0.18 +
          point.rockCluster * 0.2 -
          point.grasslandWeight * 0.46 -
          point.alpineFactor * 0.5 -
          point.forestWeight * 0.24 -
          point.snowWeight * 0.72 -
          point.desertWeight * 0.56,
      );
      if (seededRandom2D(baseSeed + i, 191) > deadChance) continue;

      const scale =
        0.75 +
        seededRandom2D(baseSeed + i, 197) * 1.8 +
        point.barrensWeight * 0.32 +
        point.midAltitudeFactor * 0.28;
      dummy.position.set(lx, point.height + 1.55 * scale, lz);
      dummy.scale.set(scale * 0.86, scale, scale * 0.86);
      dummy.rotation.set(
        seededRandom2D(baseSeed + i, 211) * 0.14,
        seededRandom2D(baseSeed + i, 223) * Math.PI,
        seededRandom2D(baseSeed + i, 227) * 0.16,
      );
      dummy.updateMatrix();
      deadTrees.setMatrixAt(deadIndex, dummy.matrix);
      deadTrees.setColorAt(
        deadIndex,
        tempColor.copy(DEAD_TREE_COLOR).lerp(ROCK_HIGHLIGHT, 0.18),
      );
      deadIndex++;
    }

    for (let i = 0; i < snowCapacity * 6 && snowIndex < snowCapacity; i++) {
      const lx = (seededRandom2D(baseSeed + i, 311) - 0.5) * size;
      const lz = (seededRandom2D(baseSeed + i, 317) - 0.5) * size;
      const wx = lx + gridX * size;
      const wz = lz + gridZ * size;
      const point = this.sampleTerrainPoint(wx, wz, tempColor);
      const snowChance = saturate(
        (point.snowWeight * 1.18 +
          point.treeCluster * 0.48 +
          point.mountainWeight * 0.12) *
          (1 - point.alpineFactor * 0.74) -
          point.cliffiness * 0.38 -
          point.desertWeight * 0.34,
      );
      if (seededRandom2D(baseSeed + i, 331) > snowChance) continue;

      const scale =
        0.82 +
        seededRandom2D(baseSeed + i, 337) * 1.75 +
        point.snowWeight * 0.35;
      dummy.position.set(lx, point.height + 2.15 * scale, lz);
      dummy.scale.set(scale * 0.82, scale, scale * 0.82);
      dummy.rotation.set(
        seededRandom2D(baseSeed + i, 347) * 0.08,
        seededRandom2D(baseSeed + i, 349) * Math.PI,
        seededRandom2D(baseSeed + i, 353) * 0.08,
      );
      dummy.updateMatrix();
      snowTrees.setMatrixAt(snowIndex, dummy.matrix);
      snowTrees.setColorAt(
        snowIndex,
        tempColor.copy(SNOW_TREE_COLOR).lerp(SNOW_COLOR, 0.22),
      );
      snowIndex++;
    }

    for (let i = 0; i < palmCapacity * 6 && palmIndex < palmCapacity; i++) {
      const lx = (seededRandom2D(baseSeed + i, 401) - 0.5) * size;
      const lz = (seededRandom2D(baseSeed + i, 409) - 0.5) * size;
      const wx = lx + gridX * size;
      const wz = lz + gridZ * size;
      const point = this.sampleTerrainPoint(wx, wz, tempColor);
      if (
        point.snowWeight > 0.25 ||
        point.forestWeight > 0.25 ||
        point.grasslandWeight > 0.35 ||
        point.mountainWeight > 0.35
      ) {
        continue;
      }
      const palmChance = saturate(
        point.desertWeight * 0.34 +
          point.treeCluster * 0.06 -
          point.forestWeight * 1.2 -
          point.grasslandWeight * 0.92 -
          point.snowWeight * 1.2 -
          point.mountainWeight * 0.34 -
          point.alpineFactor * 0.9 -
          point.cliffiness * 0.42,
      );
      if (seededRandom2D(baseSeed + i, 419) > palmChance) continue;

      const scale =
        0.78 +
        seededRandom2D(baseSeed + i, 421) * 1.55 +
        point.desertWeight * 0.36;
      dummy.position.set(lx, point.height + 2.4 * scale, lz);
      dummy.scale.set(scale * 0.88, scale, scale * 0.88);
      dummy.rotation.set(
        seededRandom2D(baseSeed + i, 431) * 0.08,
        seededRandom2D(baseSeed + i, 433) * Math.PI,
        seededRandom2D(baseSeed + i, 439) * 0.08,
      );
      dummy.updateMatrix();
      palmTrees.setMatrixAt(palmIndex, dummy.matrix);
      palmTrees.setColorAt(
        palmIndex,
        tempColor.copy(PALM_COLOR).lerp(DESERT_DAY, 0.18),
      );
      palmIndex++;
    }

    for (let i = 0; i < cactusCapacity * 6 && cactusIndex < cactusCapacity; i++) {
      const lx = (seededRandom2D(baseSeed + i, 443) - 0.5) * size;
      const lz = (seededRandom2D(baseSeed + i, 449) - 0.5) * size;
      const wx = lx + gridX * size;
      const wz = lz + gridZ * size;
      const point = this.sampleTerrainPoint(wx, wz, tempColor);
      if (
        point.snowWeight > 0.25 ||
        point.forestWeight > 0.25 ||
        point.grasslandWeight > 0.35 ||
        point.mountainWeight > 0.35
      ) {
        continue;
      }
      const cactusChance = saturate(
        point.desertWeight * 0.42 +
          point.grassCluster * 0.08 +
          point.rockCluster * 0.12 -
          point.forestWeight * 1.2 -
          point.grasslandWeight * 0.9 -
          point.snowWeight * 1.2 -
          point.mountainWeight * 0.28 -
          point.alpineFactor * 0.72 -
          point.cliffiness * 0.34,
      );
      if (seededRandom2D(baseSeed + i, 457) > cactusChance) continue;

      const scale =
        0.7 +
        seededRandom2D(baseSeed + i, 461) * 1.35 +
        point.desertWeight * 0.28;
      dummy.position.set(lx, point.height + 0.85 * scale, lz);
      dummy.scale.set(scale * 0.8, scale, scale * 0.8);
      dummy.rotation.set(
        0,
        seededRandom2D(baseSeed + i, 463) * Math.PI,
        seededRandom2D(baseSeed + i, 467) * 0.06,
      );
      dummy.updateMatrix();
      cacti.setMatrixAt(cactusIndex, dummy.matrix);
      cacti.setColorAt(
        cactusIndex,
        tempColor.copy(CACTUS_COLOR).lerp(DESERT_DAY, 0.12),
      );
      cactusIndex++;
    }

    for (let i = 0; i < rockCapacity * 5 && rockIndex < rockCapacity; i++) {
      const lx = (seededRandom2D(baseSeed + i, 233) - 0.5) * size;
      const lz = (seededRandom2D(baseSeed + i, 239) - 0.5) * size;
      const wx = lx + gridX * size;
      const wz = lz + gridZ * size;
      const point = this.sampleTerrainPoint(wx, wz, tempColor);
      if (point.snowWeight > 0.42) continue;
      const rockChance = saturate(
        0.08 +
          point.mountainWeight * 1.08 +
          point.barrensWeight * 0.68 +
          point.midAltitudeFactor * 0.48 +
          point.alpineFactor * 1.06 +
          point.cliffiness * 0.82 +
          point.rockCluster * 0.34 -
          point.snowWeight * 0.52 -
          point.desertWeight * 0.5,
      );
      if (seededRandom2D(baseSeed + i, 241) > rockChance) continue;

      const scale =
        0.55 +
        seededRandom2D(baseSeed + i, 251) * 2.4 +
        point.cliffiness * 0.8 +
        point.alpineFactor * 0.55;
      dummy.position.set(lx, point.height - 0.18, lz);
      dummy.scale.set(
        scale,
        scale * (0.82 + point.cliffiness * 0.25),
        scale * 1.1,
      );
      dummy.rotation.set(
        seededRandom2D(baseSeed + i, 257) * Math.PI,
        seededRandom2D(baseSeed + i, 263) * Math.PI,
        0,
      );
      dummy.updateMatrix();
      rocks.setMatrixAt(rockIndex, dummy.matrix);
      rocks.setColorAt(
        rockIndex,
        tempColor
          .copy(ROCK_COLOR)
          .lerp(ROCK_HIGHLIGHT, 0.24 + point.mountainWeight * 0.16)
          .lerp(HIGH_MOUNTAIN_GRAY, point.altitudeFactor * 0.32),
      );
      rockIndex++;
    }

    for (let i = 0; i < mossRockCapacity * 7 && mossRockIndex < mossRockCapacity; i++) {
      const lx = (seededRandom2D(baseSeed + i, 647) - 0.5) * size;
      const lz = (seededRandom2D(baseSeed + i, 653) - 0.5) * size;
      const wx = lx + gridX * size;
      const wz = lz + gridZ * size;
      const point = this.sampleTerrainPoint(wx, wz, tempColor);
      if (
        point.snowWeight > 0.28 ||
        point.desertWeight > 0.22 ||
        point.mountainWeight > 0.35
      ) {
        continue;
      }
      const mossChance = saturate(
        point.forestWeight * 0.52 +
          point.clearingWeight * 0.18 +
          point.pondWeight * 0.26 +
          point.rockCluster * 0.28 -
          point.grasslandWeight * 0.24 -
          point.mountainWeight * 0.18 -
          point.snowWeight * 1.1 -
          point.desertWeight * 1.0 -
          point.barrensWeight * 0.48,
      );
      if (seededRandom2D(baseSeed + i, 659) > mossChance) continue;

      const scale = 0.48 + seededRandom2D(baseSeed + i, 661) * 1.25;
      dummy.position.set(lx, point.height - 0.08, lz);
      dummy.scale.set(scale * 1.15, scale * 0.74, scale);
      dummy.rotation.set(
        seededRandom2D(baseSeed + i, 673) * Math.PI,
        seededRandom2D(baseSeed + i, 677) * Math.PI,
        0,
      );
      dummy.updateMatrix();
      mossRocks.setMatrixAt(mossRockIndex, dummy.matrix);
      mossRocks.setColorAt(
        mossRockIndex,
        tempColor.copy(MOSS_ROCK_COLOR).lerp(ROCK_HIGHLIGHT, 0.16),
      );
      mossRockIndex++;
    }

    for (
      let i = 0;
      i < snowRockCapacity * 5 && snowRockIndex < snowRockCapacity;
      i++
    ) {
      const lx = (seededRandom2D(baseSeed + i, 359) - 0.5) * size;
      const lz = (seededRandom2D(baseSeed + i, 367) - 0.5) * size;
      const wx = lx + gridX * size;
      const wz = lz + gridZ * size;
      const point = this.sampleTerrainPoint(wx, wz, tempColor);
      const snowRockChance = saturate(
        0.04 +
          point.snowWeight * 1.05 +
          point.mountainWeight * 0.42 +
          point.alpineFactor * 0.72 +
          point.cliffiness * 0.42 +
          point.rockCluster * 0.34 -
          point.desertWeight * 0.38,
      );
      if (seededRandom2D(baseSeed + i, 373) > snowRockChance) continue;

      const scale =
        0.5 +
        seededRandom2D(baseSeed + i, 379) * 1.95 +
        point.cliffiness * 0.5;
      dummy.position.set(lx, point.height + 0.22 * scale, lz);
      dummy.scale.set(
        scale,
        scale * (0.78 + point.cliffiness * 0.2),
        scale * 1.08,
      );
      dummy.rotation.set(
        seededRandom2D(baseSeed + i, 383) * Math.PI,
        seededRandom2D(baseSeed + i, 389) * Math.PI,
        0,
      );
      dummy.updateMatrix();
      snowRocks.setMatrixAt(snowRockIndex, dummy.matrix);
      snowRocks.setColorAt(
        snowRockIndex,
        tempColor.copy(SNOW_ROCK_COLOR).lerp(ROCK_HIGHLIGHT, 0.2),
      );
      snowRockIndex++;
    }

    for (
      let i = 0;
      i < snowPlantCapacity * 5 && snowPlantIndex < snowPlantCapacity;
      i++
    ) {
      const lx = (seededRandom2D(baseSeed + i, 479) - 0.5) * size;
      const lz = (seededRandom2D(baseSeed + i, 487) - 0.5) * size;
      const wx = lx + gridX * size;
      const wz = lz + gridZ * size;
      const point = this.sampleTerrainPoint(wx, wz, tempColor);
      const snowPlantChance = saturate(
        point.snowWeight * 0.72 +
          point.grassCluster * 0.22 -
          point.alpineFactor * 0.62 -
          point.cliffiness * 0.36 -
          point.desertWeight * 1.1,
      );
      if (seededRandom2D(baseSeed + i, 491) > snowPlantChance) continue;

      const scale = 0.42 + seededRandom2D(baseSeed + i, 499) * 1.12;
      dummy.position.set(lx, point.height + 0.28 * scale, lz);
      dummy.scale.set(scale, scale, scale);
      dummy.rotation.set(
        0,
        seededRandom2D(baseSeed + i, 503) * Math.PI,
        seededRandom2D(baseSeed + i, 509) * 0.1,
      );
      dummy.updateMatrix();
      snowPlants.setMatrixAt(snowPlantIndex, dummy.matrix);
      snowPlants.setColorAt(
        snowPlantIndex,
        tempColor.copy(SNOW_TREE_COLOR).lerp(SNOW_COLOR, 0.3),
      );
      snowPlantIndex++;
    }

    for (let i = 0; i < grassCapacity * 4 && grassIndex < grassCapacity; i++) {
      const lx = (seededRandom2D(baseSeed + i, 271) - 0.5) * size;
      const lz = (seededRandom2D(baseSeed + i, 277) - 0.5) * size;
      const wx = lx + gridX * size;
      const wz = lz + gridZ * size;
      const point = this.sampleTerrainPoint(wx, wz, tempColor);
      if (
        point.snowWeight > 0.25 ||
        point.desertWeight > 0.35 ||
        point.mountainWeight > 0.35
      ) {
        continue;
      }
      const grassChance = saturate(
        (point.grasslandWeight * 3.8 +
          point.forestWeight * point.clearingWeight * 2.1 +
          point.grassCluster * 1.55 +
          point.clearingWeight * 1.25) *
          point.vegetationFactor +
          point.grasslandWeight * 0.92 -
          point.pondWeight * 0.76 -
          point.forestWeight * 0.28 -
          point.mountainWeight * 0.68 -
          point.alpineFactor * 1.18 -
          point.snowWeight * 1.08 -
          point.desertWeight * 1.02 -
          point.barrensWeight * 0.42 -
          point.cliffiness * 0.72,
      );
      if (seededRandom2D(baseSeed + i, 281) > grassChance) continue;

      const scale =
        0.5 +
        seededRandom2D(baseSeed + i, 283) * 1.35 +
        point.grasslandWeight * 0.55 +
        point.clearingWeight * 0.45;
      dummy.position.set(lx, point.height + 0.3, lz);
      dummy.scale.set(
        scale * 0.18,
        scale,
        scale * 0.18,
      );
      dummy.rotation.set(
        0,
        seededRandom2D(baseSeed + i, 293) * Math.PI,
        seededRandom2D(baseSeed + i, 307) * 0.18,
      );
      dummy.updateMatrix();
      grass.setMatrixAt(grassIndex, dummy.matrix);
      grass.setColorAt(
        grassIndex,
        tempColor
          .copy(GRASS_COLOR)
          .lerp(this.sampleColorB.copy(tempColor), 0.28),
      );
      grassIndex++;
    }

    for (let i = 0; i < bushCapacity * 7 && bushIndex < bushCapacity; i++) {
      const lx = (seededRandom2D(baseSeed + i, 701) - 0.5) * size;
      const lz = (seededRandom2D(baseSeed + i, 709) - 0.5) * size;
      const wx = lx + gridX * size;
      const wz = lz + gridZ * size;
      const point = this.sampleTerrainPoint(wx, wz, tempColor);
      if (
        point.snowWeight > 0.25 ||
        point.desertWeight > 0.3 ||
        point.mountainWeight > 0.35
      ) {
        continue;
      }
      const bushChance = saturate(
        (point.forestWeight * 0.74 +
          point.grasslandWeight * 0.38 +
          point.clearingWeight * 0.58 +
          point.grassCluster * 0.32) *
          point.vegetationFactor -
          point.pondWeight * 0.76 -
          point.mountainWeight * 0.64 -
          point.alpineFactor -
          point.snowWeight * 1.1 -
          point.desertWeight * 1.12 -
          point.barrensWeight * 0.56 -
          point.cliffiness * 0.58,
      );
      if (seededRandom2D(baseSeed + i, 719) > bushChance) continue;

      const scale =
        0.58 +
        seededRandom2D(baseSeed + i, 727) * 1.05 +
        point.forestWeight * 0.22;
      dummy.position.set(lx, point.height + 0.62 * scale, lz);
      dummy.scale.set(scale * 0.86, scale * 0.72, scale * 0.86);
      dummy.rotation.set(
        0,
        seededRandom2D(baseSeed + i, 733) * Math.PI,
        seededRandom2D(baseSeed + i, 739) * 0.12,
      );
      dummy.updateMatrix();
      bushes.setMatrixAt(bushIndex, dummy.matrix);
      bushes.setColorAt(
        bushIndex,
        tempColor.copy(BUSH_COLOR).lerp(this.sampleColorB.copy(tempColor), 0.24),
      );
      bushIndex++;
    }

    for (let i = 0; i < flowerCapacity * 6 && flowerIndex < flowerCapacity; i++) {
      const lx = (seededRandom2D(baseSeed + i, 751) - 0.5) * size;
      const lz = (seededRandom2D(baseSeed + i, 757) - 0.5) * size;
      const wx = lx + gridX * size;
      const wz = lz + gridZ * size;
      const point = this.sampleTerrainPoint(wx, wz, tempColor);
      if (
        point.snowWeight > 0.25 ||
        point.desertWeight > 0.3 ||
        point.mountainWeight > 0.35
      ) {
        continue;
      }
      const flowerChance = saturate(
        (point.grasslandWeight * 1.22 +
          point.forestWeight * point.clearingWeight * 0.64 +
          point.grassCluster * 0.66) *
          point.vegetationFactor -
          point.pondWeight * 0.86 -
          point.forestWeight * 0.24 -
          point.mountainWeight * 0.74 -
          point.alpineFactor * 1.08 -
          point.snowWeight * 1.08 -
          point.desertWeight * 1.12 -
          point.barrensWeight * 0.56 -
          point.cliffiness * 0.64,
      );
      if (seededRandom2D(baseSeed + i, 761) > flowerChance) continue;

      const scale =
        0.46 +
        seededRandom2D(baseSeed + i, 769) * 0.84 +
        point.grasslandWeight * 0.18;
      dummy.position.set(lx, point.height + 0.34 * scale, lz);
      dummy.scale.set(scale * 0.54, scale, scale * 0.54);
      dummy.rotation.set(
        0,
        seededRandom2D(baseSeed + i, 773) * Math.PI,
        seededRandom2D(baseSeed + i, 787) * 0.16,
      );
      dummy.updateMatrix();
      flowers.setMatrixAt(flowerIndex, dummy.matrix);
      flowers.setColorAt(
        flowerIndex,
        tempColor.copy(FLOWER_COLOR).lerp(GRASS_COLOR, seededRandom2D(baseSeed + i, 797) * 0.34),
      );
      flowerIndex++;
    }

    for (
      let i = 0;
      i < forestPropCapacity * 7 && forestPropIndex < forestPropCapacity;
      i++
    ) {
      const lx = (seededRandom2D(baseSeed + i, 811) - 0.5) * size;
      const lz = (seededRandom2D(baseSeed + i, 821) - 0.5) * size;
      const wx = lx + gridX * size;
      const wz = lz + gridZ * size;
      const point = this.sampleTerrainPoint(wx, wz, tempColor);
      if (point.snowWeight > 0.34 || point.desertWeight > 0.35) continue;
      const propChance = saturate(
        point.forestWeight * 0.46 +
          point.clearingWeight * 0.28 +
          point.midAltitudeFactor * 0.2 +
          point.mountainWeight * 0.12 -
          point.grasslandWeight * 0.42 -
          point.pondWeight * 0.74 -
          point.alpineFactor * 0.72 -
          point.snowWeight * 1.04 -
          point.desertWeight * 1.04 -
          point.barrensWeight * 0.24,
      );
      if (seededRandom2D(baseSeed + i, 827) > propChance) continue;

      const scale =
        0.58 +
        seededRandom2D(baseSeed + i, 829) * 1.18 +
        point.midAltitudeFactor * 0.18;
      dummy.position.set(lx, point.height + 0.42 * scale, lz);
      dummy.scale.set(scale * 0.88, scale * 0.72, scale * 0.88);
      dummy.rotation.set(
        seededRandom2D(baseSeed + i, 839) * 0.12,
        seededRandom2D(baseSeed + i, 853) * Math.PI,
        seededRandom2D(baseSeed + i, 857) * 0.12,
      );
      dummy.updateMatrix();
      forestProps.setMatrixAt(forestPropIndex, dummy.matrix);
      forestProps.setColorAt(
        forestPropIndex,
        tempColor.copy(FOREST_PROP_COLOR).lerp(MOSS_ROCK_COLOR, point.forestWeight * 0.22),
      );
      forestPropIndex++;
    }

    for (let i = 0; i < pondCapacity * 6 && pondIndex < pondCapacity; i++) {
      const lx = (seededRandom2D(baseSeed + i, 601) - 0.5) * size;
      const lz = (seededRandom2D(baseSeed + i, 607) - 0.5) * size;
      const wx = lx + gridX * size;
      const wz = lz + gridZ * size;
      const point = this.sampleTerrainPoint(wx, wz, tempColor);
      if (point.snowWeight > 0.34 || point.desertWeight > 0.28) continue;
      if (point.pondWeight < 0.42) continue;
      if (seededRandom2D(baseSeed + i, 613) > point.pondWeight) continue;

      const radius = THREE.MathUtils.lerp(
        POND_RADIUS_MIN,
        POND_RADIUS_MAX,
        saturate(point.pondWeight),
      );
      dummy.position.set(lx, point.height + 0.08, lz);
      dummy.scale.set(radius, 1, radius * (0.72 + seededRandom2D(baseSeed + i, 617) * 0.36));
      dummy.rotation.set(0, seededRandom2D(baseSeed + i, 619) * Math.PI, 0);
      dummy.updateMatrix();
      ponds.setMatrixAt(pondIndex, dummy.matrix);
      pondIndex++;
    }

    this.finalizeInstancedMesh(pineTrees, pineIndex);
    this.finalizeInstancedMesh(commonTrees, commonIndex);
    this.finalizeInstancedMesh(birchTrees, birchIndex);
    this.finalizeInstancedMesh(willowTrees, willowIndex);
    this.finalizeInstancedMesh(deadTrees, deadIndex);
    this.finalizeInstancedMesh(snowTrees, snowIndex);
    this.finalizeInstancedMesh(palmTrees, palmIndex);
    this.finalizeInstancedMesh(cacti, cactusIndex);
    this.finalizeInstancedMesh(rocks, rockIndex);
    this.finalizeInstancedMesh(mossRocks, mossRockIndex);
    this.finalizeInstancedMesh(snowRocks, snowRockIndex);
    this.finalizeInstancedMesh(grass, grassIndex);
    this.finalizeInstancedMesh(bushes, bushIndex);
    this.finalizeInstancedMesh(flowers, flowerIndex);
    this.finalizeInstancedMesh(forestProps, forestPropIndex);
    this.finalizeInstancedMesh(snowPlants, snowPlantIndex);
    this.finalizeInstancedMesh(ponds, pondIndex);
    group.add(
      pineTrees,
      commonTrees,
      birchTrees,
      willowTrees,
      deadTrees,
      snowTrees,
      palmTrees,
      cacti,
      rocks,
      mossRocks,
      snowRocks,
      grass,
      bushes,
      flowers,
      forestProps,
      snowPlants,
      ponds,
    );
    return group;
  }
}
