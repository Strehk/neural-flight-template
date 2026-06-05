/**
 * decoration-data.ts — pure-data version of the per-chunk decoration
 * scatter previously baked inline in `DecorationPlacer.place()`. Same
 * 17 placement passes byte-for-byte, but writes into `Float32Array`s
 * instead of mutating `THREE.InstancedMesh` / `THREE.Object3D` / `THREE.Color`.
 *
 * The 16 entries can be fed directly into an InstancedMesh's
 * `instanceMatrix.array` / `instanceColor.array` on the main thread.
 * Because there are no THREE imports, this module is also the worker
 * entry point for decoration generation.
 */

import { seededRandom2D } from "../random";

export interface RGBLike {
	r: number;
	g: number;
	b: number;
}

export interface WorldDecorationSample {
	height: number;
	forestWeight: number;
	grasslandWeight: number;
	mountainWeight: number;
	snowWeight: number;
	desertWeight: number;
	barrensWeight: number;
	vegetationFactor: number;
	treeCluster: number;
	grassCluster: number;
	rockCluster: number;
	clearingWeight: number;
	midAltitudeFactor: number;
	alpineFactor: number;
	cliffiness: number;
	altitudeFactor: number;
	isWater?: boolean;
}

export type DecorationColorizer<TSample extends WorldDecorationSample> = (
	outColor: RGBLike,
	sample: TSample,
) => void;

export type ForestSectionSampler = (x: number, z: number) => number;

export type DecorationName =
  | "pineTrees"
  | "commonTrees"
  | "birchTrees"
  | "willowTrees"
  | "deadTrees"
  | "snowTrees"
  | "palmTrees"
  | "cacti"
  | "rocks"
  | "mossRocks"
  | "snowRocks"
  | "snowPlants"
  | "grass"
  | "bushes"
  | "flowers"
  | "forestProps";

export interface DecorationBucket {
  /** Allocated capacity (Float32Array sized for `capacity` instances). */
  capacity: number;
  /** Instances actually written. `count <= capacity`. */
  count: number;
  /** `capacity * 16` floats, column-major 4x4 matrices. */
  matrices: Float32Array;
  /** `capacity * 3` floats (rgb per instance). `null` when no colour tint. */
  colors: Float32Array | null;
}

export type DecorationData = Record<DecorationName, DecorationBucket>;

export interface DecorationDataSettings {
  chunkSize: number;
  treeDensity: number;
  grassDensity: number;
  mountainHeight: number;
}

export interface ComputeDecorationDataOptions<
	TSample extends WorldDecorationSample = WorldDecorationSample,
> {
  settings: DecorationDataSettings;
  /** Worker-safe world surface lookup. */
  sample: (x: number, z: number) => TSample;
  /** Renderer/experience-specific base tint. */
  colorizeSample?: DecorationColorizer<TSample>;
  /** Optional section noise for forest clumping. */
  forestSection?: ForestSectionSampler;
}

// ----------------------------------------------------------------------------
// Decoration palette — RGB literals derived from the THREE.Color hex constants
// that used to live in decoration-placer.ts. Each value is `byte / 255` with
// no colour-space conversion — matches `new THREE.Color('#rrggbb').r/g/b`.
// ----------------------------------------------------------------------------

const PINE_CROWN_COLOR:    RGBLike = rgbHex(0xb8, 0xff, 0xf0);
const COMMON_CROWN_COLOR:  RGBLike = rgbHex(0xd8, 0xf4, 0xd4);
const BIRCH_CROWN_COLOR:   RGBLike = rgbHex(0xe4, 0xf1, 0xcf);
const WILLOW_CROWN_COLOR:  RGBLike = rgbHex(0xc7, 0xe5, 0xb0);
const DEAD_TREE_COLOR:     RGBLike = rgbHex(0xdd, 0xd4, 0xbe);
const SNOW_TREE_COLOR:     RGBLike = rgbHex(0xef, 0xf7, 0xff);
const PALM_COLOR:          RGBLike = rgbHex(0x3f, 0x7b, 0x38);
const CACTUS_COLOR:        RGBLike = rgbHex(0x6c, 0xa3, 0x5a);
const ROCK_COLOR:          RGBLike = rgbHex(0xd8, 0xe0, 0xeb);
const ROCK_HIGHLIGHT:      RGBLike = rgbHex(0xf4, 0xf1, 0xe5);
const MOSS_ROCK_COLOR:     RGBLike = rgbHex(0x9f, 0xb4, 0x8a);
const SNOW_ROCK_COLOR:     RGBLike = rgbHex(0xee, 0xf4, 0xfb);
const GRASS_COLOR:         RGBLike = rgbHex(0xd7, 0xf0, 0xb4);
const BUSH_COLOR:          RGBLike = rgbHex(0x9f, 0xd0, 0x7e);
const FLOWER_COLOR:        RGBLike = rgbHex(0xff, 0xd5, 0xdc);
const FOREST_PROP_COLOR:   RGBLike = rgbHex(0x9f, 0x8c, 0x70);
const SNOW_COLOR:          RGBLike = rgbHex(0xf2, 0xf7, 0xff);
const DESERT_DAY:          RGBLike = rgbHex(0xd8, 0xb6, 0x6f);
const HIGH_MOUNTAIN_GRAY:  RGBLike = rgbHex(0x8a, 0x8f, 0x92);

function rgbHex(r: number, g: number, b: number): RGBLike {
  return { r: r / 255, g: g / 255, b: b / 255 };
}

function saturate(value: number): number {
	return Math.min(1, Math.max(0, value));
}

function remapNoise(value: number): number {
	return saturate(value * 0.5 + 0.5);
}

function smoothPeak(value: number, center: number, width: number): number {
	if (width <= 0) return value === center ? 1 : 0;
	return saturate(1 - Math.abs(value - center) / width);
}

function suppressWaterDecorationSample<TSample extends WorldDecorationSample>(
	sample: TSample,
): TSample {
	if (sample.isWater !== true) return sample;
	return {
		...sample,
		forestWeight: 0,
		grasslandWeight: 0,
		mountainWeight: 0,
		snowWeight: 0,
		desertWeight: 0,
		barrensWeight: 0,
		vegetationFactor: 0,
		treeCluster: 0,
		grassCluster: 0,
		rockCluster: 0,
		clearingWeight: 0,
		midAltitudeFactor: 0,
		alpineFactor: 0,
		cliffiness: 0,
		altitudeFactor: 0,
	};
}

// In-place lerp identical to THREE.Color.lerp.
function lerpRGB(out: RGBLike, target: RGBLike, t: number): void {
  out.r += (target.r - out.r) * t;
  out.g += (target.g - out.g) * t;
  out.b += (target.b - out.b) * t;
}

function copyRGB(out: RGBLike, src: RGBLike): void {
  out.r = src.r;
  out.g = src.g;
  out.b = src.b;
}

/**
 * Write a column-major 4x4 transform matrix into `out[offset..offset+16]`,
 * matching THREE's `Object3D.updateMatrix` for an XYZ-Euler rotation
 * (the default order). Composition is `T * R * S`.
 */
function composeMatrix(
  out: Float32Array,
  offset: number,
  px: number, py: number, pz: number,
  rx: number, ry: number, rz: number,
  sx: number, sy: number, sz: number,
): void {
  // Euler 'XYZ' → quaternion (THREE.Quaternion.setFromEuler).
  const c1 = Math.cos(rx * 0.5);
  const c2 = Math.cos(ry * 0.5);
  const c3 = Math.cos(rz * 0.5);
  const s1 = Math.sin(rx * 0.5);
  const s2 = Math.sin(ry * 0.5);
  const s3 = Math.sin(rz * 0.5);
  const qx = s1 * c2 * c3 + c1 * s2 * s3;
  const qy = c1 * s2 * c3 - s1 * c2 * s3;
  const qz = c1 * c2 * s3 + s1 * s2 * c3;
  const qw = c1 * c2 * c3 - s1 * s2 * s3;
  // Compose (THREE.Matrix4.compose).
  const x2 = qx + qx, y2 = qy + qy, z2 = qz + qz;
  const xx = qx * x2, xy = qx * y2, xz = qx * z2;
  const yy = qy * y2, yz = qy * z2, zz = qz * z2;
  const wx = qw * x2, wy = qw * y2, wz = qw * z2;
  out[offset + 0]  = (1 - (yy + zz)) * sx;
  out[offset + 1]  = (xy + wz) * sx;
  out[offset + 2]  = (xz - wy) * sx;
  out[offset + 3]  = 0;
  out[offset + 4]  = (xy - wz) * sy;
  out[offset + 5]  = (1 - (xx + zz)) * sy;
  out[offset + 6]  = (yz + wx) * sy;
  out[offset + 7]  = 0;
  out[offset + 8]  = (xz + wy) * sz;
  out[offset + 9]  = (yz - wx) * sz;
  out[offset + 10] = (1 - (xx + yy)) * sz;
  out[offset + 11] = 0;
  out[offset + 12] = px;
  out[offset + 13] = py;
  out[offset + 14] = pz;
  out[offset + 15] = 1;
}

function writeMatrix(bucket: DecorationBucket, index: number,
  px: number, py: number, pz: number,
  rx: number, ry: number, rz: number,
  sx: number, sy: number, sz: number,
): void {
  composeMatrix(bucket.matrices, index * 16, px, py, pz, rx, ry, rz, sx, sy, sz);
}

function writeColor(bucket: DecorationBucket, index: number, c: RGBLike): void {
  if (!bucket.colors) return;
  const o = index * 3;
  bucket.colors[o]     = c.r;
  bucket.colors[o + 1] = c.g;
  bucket.colors[o + 2] = c.b;
}

function emptyBucket(capacity: number, withColor: boolean): DecorationBucket {
  return {
    capacity,
    count: 0,
    matrices: new Float32Array(capacity * 16),
    colors: withColor ? new Float32Array(capacity * 3) : null,
  };
}

/**
 * Build the full DecorationData payload for a chunk. Pure function;
 * deterministic given the same noise stack + sampler + settings.
 */
export function computeDecorationData<TSample extends WorldDecorationSample>(
  gridX: number,
  gridZ: number,
  opts: ComputeDecorationDataOptions<TSample>,
): DecorationData {
  const { settings, sample, colorizeSample, forestSection } = opts;
  const size = settings.chunkSize;
  const baseSeed = gridX * 73856093 + gridZ * 19349663;

  // Capacities — respect zero settings (treeDensity/grassDensity=0 → no placement).
  // The Math.max floor only applies when density > 0 to preserve minimum visual
  // quality at low-but-nonzero settings.
  const td = settings.treeDensity;
  const gd = settings.grassDensity;
  const pineCapacity        = td <= 0 ? 0 : Math.max(34,  Math.round(td  * 4.7));
  const commonCapacity      = td <= 0 ? 0 : Math.max(32,  Math.round(td  * 4.4));
  const birchCapacity       = td <= 0 ? 0 : Math.max(24,  Math.round(td  * 3.2));
  const willowCapacity      = td <= 0 ? 0 : Math.max(18,  Math.round(td  * 2.3));
  const deadCapacity        = td <= 0 ? 0 : Math.max(4,   Math.round(td  * 0.42));
  const snowCapacity        = td <= 0 ? 0 : Math.max(8,   Math.round(td  * 0.95));
  const palmCapacity        = td <= 0 ? 0 : Math.max(2,   Math.round(td  * 0.16));
  const cactusCapacity      = gd <= 0 ? 0 : Math.max(4,   Math.round(gd  * 0.2));
  const grassCapacity       = gd <= 0 ? 0 : Math.max(260, Math.round(gd  * 24));
  const bushCapacity        = gd <= 0 ? 0 : Math.max(26,  Math.round(gd  * 2.4));
  const flowerCapacity      = gd <= 0 ? 0 : Math.max(36,  Math.round(gd  * 3.6));
  const forestPropCapacity  = td <= 0 ? 0 : Math.max(10,  Math.round(td  * 0.9));
  const snowPlantCapacity   = gd <= 0 ? 0 : Math.max(8,   Math.round(gd  * 0.8));
  const rockCapacity        = Math.max(10,  Math.round(14 + settings.mountainHeight * 0.22));
  const snowRockCapacity    = Math.max(8,   Math.round(10 + settings.mountainHeight * 0.16));
  const mossRockCapacity    = td <= 0 ? 0 : Math.max(8,   Math.round(7  + td  * 0.72));

  const data: DecorationData = {
    pineTrees:    emptyBucket(pineCapacity, true),
    commonTrees:  emptyBucket(commonCapacity, true),
    birchTrees:   emptyBucket(birchCapacity, true),
    willowTrees:  emptyBucket(willowCapacity, true),
    deadTrees:    emptyBucket(deadCapacity, true),
    snowTrees:    emptyBucket(snowCapacity, true),
    palmTrees:    emptyBucket(palmCapacity, true),
    cacti:        emptyBucket(cactusCapacity, true),
    rocks:        emptyBucket(rockCapacity, true),
    mossRocks:    emptyBucket(mossRockCapacity, true),
    snowRocks:    emptyBucket(snowRockCapacity, true),
    snowPlants:   emptyBucket(snowPlantCapacity, true),
    grass:        emptyBucket(grassCapacity, true),
    bushes:       emptyBucket(bushCapacity, true),
    flowers:      emptyBucket(flowerCapacity, true),
    forestProps:  emptyBucket(forestPropCapacity, true),
  };

  // Scratch RGB reused across every decoration body.
  const tempColor: RGBLike = { r: 0, g: 0, b: 0 };
  const tintColor: RGBLike = { r: 0, g: 0, b: 0 };

  // -- helpers ------------------------------------------------------------
  function sampleTerrainPoint(
    x: number,
    z: number,
    outColor: RGBLike,
  ): TSample {
    const s = suppressWaterDecorationSample(sample(x, z));
    if (colorizeSample) {
      colorizeSample(outColor, s);
    } else {
      copyRGB(outColor, GRASS_COLOR);
    }
    return s;
  }

  function sampleForestSection(x: number, z: number): number {
    return forestSection ? remapNoise(forestSection(x, z)) : 0.5;
  }

  // -- pineTrees ----------------------------------------------------------
  for (let i = 0; i < pineCapacity * 8 && data.pineTrees.count < pineCapacity; i++) {
    const lx = (seededRandom2D(baseSeed + i, 17) - 0.5) * size;
    const lz = (seededRandom2D(baseSeed + i, 31) - 0.5) * size;
    const wx = lx + gridX * size;
    const wz = lz + gridZ * size;
    const point = sampleTerrainPoint(wx, wz, tempColor);
    if (point.snowWeight > 0.38 || point.mountainWeight > 0.42 || point.desertWeight > 0.35) continue;
    const section = sampleForestSection(wx, wz);
    const sectionFavor = smoothPeak(section, 0.13, 0.19);
    const pineChance = saturate(
      (point.forestWeight * (0.88 + sectionFavor * 1.85) +
        point.treeCluster * point.forestWeight * 0.78) *
        point.vegetationFactor +
        point.forestWeight * 0.22 -
        point.grasslandWeight * 0.62 -
        point.clearingWeight * 1.42 -
        point.mountainWeight * 0.68 -
        point.alpineFactor * 1.16 -
        point.snowWeight * 1.18 -
        point.desertWeight * 1.1 -
        point.cliffiness * 0.36 -
        point.barrensWeight * 0.62,
    );
    if (seededRandom2D(baseSeed + i, 53) > pineChance) continue;

    const scale = 0.9 + seededRandom2D(baseSeed + i, 61) * 2.5 + point.mountainWeight * 0.25;
    copyRGB(tintColor, tempColor);
    lerpRGB(tintColor, PINE_CROWN_COLOR, 0.55 + point.forestWeight * 0.18);

    const idx = data.pineTrees.count++;
    writeMatrix(data.pineTrees, idx, lx, point.height + 2.2 * scale, lz,
      0, seededRandom2D(baseSeed + i, 67) * Math.PI, 0,
      scale * 0.72, scale, scale * 0.72);
    writeColor(data.pineTrees, idx, tintColor);
  }

  // -- commonTrees --------------------------------------------------------
  for (let i = 0; i < commonCapacity * 8 && data.commonTrees.count < commonCapacity; i++) {
    const lx = (seededRandom2D(baseSeed + i, 89) - 0.5) * size;
    const lz = (seededRandom2D(baseSeed + i, 97) - 0.5) * size;
    const wx = lx + gridX * size;
    const wz = lz + gridZ * size;
    const point = sampleTerrainPoint(wx, wz, tempColor);
    if (point.snowWeight > 0.38 || point.mountainWeight > 0.42 || point.desertWeight > 0.35) continue;
    const section = sampleForestSection(wx, wz);
    const sectionFavor = smoothPeak(section, 0.39, 0.2);
    const commonChance = saturate(
      (point.forestWeight * (0.9 + sectionFavor * 1.65) +
        point.treeCluster * point.forestWeight * 0.66) *
        point.vegetationFactor +
        point.forestWeight * 0.18 -
        point.grasslandWeight * 0.72 -
        point.clearingWeight * 1.28 -
        point.mountainWeight * 0.56 -
        point.alpineFactor -
        point.snowWeight * 1.12 -
        point.desertWeight * 1.08 -
        point.barrensWeight * 0.46 -
        point.cliffiness * 0.3,
    );
    if (seededRandom2D(baseSeed + i, 109) > commonChance) continue;

    const scale = 0.88 + seededRandom2D(baseSeed + i, 127) * 1.9;
    copyRGB(tintColor, tempColor);
    lerpRGB(tintColor, COMMON_CROWN_COLOR, 0.54);

    const idx = data.commonTrees.count++;
    writeMatrix(data.commonTrees, idx, lx, point.height + 2.08 * scale, lz,
      seededRandom2D(baseSeed + i, 137) * 0.18,
      seededRandom2D(baseSeed + i, 149) * Math.PI,
      seededRandom2D(baseSeed + i, 151) * 0.18,
      scale * 0.92, scale, scale * 0.92);
    writeColor(data.commonTrees, idx, tintColor);
  }

  // -- birchTrees ---------------------------------------------------------
  for (let i = 0; i < birchCapacity * 8 && data.birchTrees.count < birchCapacity; i++) {
    const lx = (seededRandom2D(baseSeed + i, 563) - 0.5) * size;
    const lz = (seededRandom2D(baseSeed + i, 569) - 0.5) * size;
    const wx = lx + gridX * size;
    const wz = lz + gridZ * size;
    const point = sampleTerrainPoint(wx, wz, tempColor);
    if (point.snowWeight > 0.38 || point.mountainWeight > 0.42 || point.desertWeight > 0.35) continue;
    const section = sampleForestSection(wx, wz);
    const sectionFavor = smoothPeak(section, 0.62, 0.18);
    const birchChance = saturate(
      (point.forestWeight * (0.72 + sectionFavor * 1.7) +
        point.treeCluster * point.forestWeight * 0.52 +
        point.clearingWeight * 0.16) *
        point.vegetationFactor -
        point.grasslandWeight * 0.66 -
        point.clearingWeight * 0.96 -
        point.mountainWeight * 0.62 -
        point.alpineFactor * 1.02 -
        point.snowWeight * 1.08 -
        point.desertWeight * 1.04 -
        point.barrensWeight * 0.44 -
        point.cliffiness * 0.3,
    );
    if (seededRandom2D(baseSeed + i, 571) > birchChance) continue;

    const scale = 0.72 + seededRandom2D(baseSeed + i, 577) * 1.5;
    copyRGB(tintColor, tempColor);
    lerpRGB(tintColor, BIRCH_CROWN_COLOR, 0.58);

    const idx = data.birchTrees.count++;
    writeMatrix(data.birchTrees, idx, lx, point.height + 2.02 * scale, lz,
      seededRandom2D(baseSeed + i, 587) * 0.14,
      seededRandom2D(baseSeed + i, 593) * Math.PI,
      seededRandom2D(baseSeed + i, 599) * 0.14,
      scale * 0.78, scale * 0.96, scale * 0.78);
    writeColor(data.birchTrees, idx, tintColor);
  }

  // -- willowTrees --------------------------------------------------------
  for (let i = 0; i < willowCapacity * 9 && data.willowTrees.count < willowCapacity; i++) {
    const lx = (seededRandom2D(baseSeed + i, 521) - 0.5) * size;
    const lz = (seededRandom2D(baseSeed + i, 523) - 0.5) * size;
    const wx = lx + gridX * size;
    const wz = lz + gridZ * size;
    const point = sampleTerrainPoint(wx, wz, tempColor);
    if (point.snowWeight > 0.38 || point.mountainWeight > 0.42 || point.desertWeight > 0.35) continue;
    const section = sampleForestSection(wx, wz);
    const sectionFavor = smoothPeak(section, 0.84, 0.17);
    const willowChance = saturate(
      (point.forestWeight * (0.58 + sectionFavor * 1.7) +
        point.treeCluster * point.forestWeight * 0.38) *
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
    copyRGB(tintColor, tempColor);
    lerpRGB(tintColor, WILLOW_CROWN_COLOR, 0.6);

    const idx = data.willowTrees.count++;
    writeMatrix(data.willowTrees, idx, lx, point.height + 1.92 * scale, lz,
      seededRandom2D(baseSeed + i, 557) * 0.14,
      seededRandom2D(baseSeed + i, 559) * Math.PI,
      seededRandom2D(baseSeed + i, 561) * 0.14,
      scale * 0.86, scale * 0.9, scale * 0.86);
    writeColor(data.willowTrees, idx, tintColor);
  }

  // -- deadTrees ----------------------------------------------------------
  for (let i = 0; i < deadCapacity * 6 && data.deadTrees.count < deadCapacity; i++) {
    const lx = (seededRandom2D(baseSeed + i, 173) - 0.5) * size;
    const lz = (seededRandom2D(baseSeed + i, 181) - 0.5) * size;
    const wx = lx + gridX * size;
    const wz = lz + gridZ * size;
    const point = sampleTerrainPoint(wx, wz, tempColor);
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

    const scale = 0.75 + seededRandom2D(baseSeed + i, 197) * 1.8 + point.barrensWeight * 0.32 + point.midAltitudeFactor * 0.28;
    copyRGB(tintColor, DEAD_TREE_COLOR);
    lerpRGB(tintColor, ROCK_HIGHLIGHT, 0.18);

    const idx = data.deadTrees.count++;
    writeMatrix(data.deadTrees, idx, lx, point.height + 1.55 * scale, lz,
      seededRandom2D(baseSeed + i, 211) * 0.14,
      seededRandom2D(baseSeed + i, 223) * Math.PI,
      seededRandom2D(baseSeed + i, 227) * 0.16,
      scale * 0.86, scale, scale * 0.86);
    writeColor(data.deadTrees, idx, tintColor);
  }

  // -- snowTrees ----------------------------------------------------------
  for (let i = 0; i < snowCapacity * 6 && data.snowTrees.count < snowCapacity; i++) {
    const lx = (seededRandom2D(baseSeed + i, 311) - 0.5) * size;
    const lz = (seededRandom2D(baseSeed + i, 317) - 0.5) * size;
    const wx = lx + gridX * size;
    const wz = lz + gridZ * size;
    const point = sampleTerrainPoint(wx, wz, tempColor);
    const snowChance = saturate(
      (point.snowWeight * 1.18 + point.treeCluster * 0.48 + point.mountainWeight * 0.12) *
        (1 - point.alpineFactor * 0.74) -
        point.cliffiness * 0.38 -
        point.desertWeight * 0.34,
    );
    if (seededRandom2D(baseSeed + i, 331) > snowChance) continue;

    const scale = 0.82 + seededRandom2D(baseSeed + i, 337) * 1.75 + point.snowWeight * 0.35;
    copyRGB(tintColor, SNOW_TREE_COLOR);
    lerpRGB(tintColor, SNOW_COLOR, 0.22);

    const idx = data.snowTrees.count++;
    writeMatrix(data.snowTrees, idx, lx, point.height + 2.15 * scale, lz,
      seededRandom2D(baseSeed + i, 347) * 0.08,
      seededRandom2D(baseSeed + i, 349) * Math.PI,
      seededRandom2D(baseSeed + i, 353) * 0.08,
      scale * 0.82, scale, scale * 0.82);
    writeColor(data.snowTrees, idx, tintColor);
  }

  // -- palmTrees ----------------------------------------------------------
  for (let i = 0; i < palmCapacity * 6 && data.palmTrees.count < palmCapacity; i++) {
    const lx = (seededRandom2D(baseSeed + i, 401) - 0.5) * size;
    const lz = (seededRandom2D(baseSeed + i, 409) - 0.5) * size;
    const wx = lx + gridX * size;
    const wz = lz + gridZ * size;
    const point = sampleTerrainPoint(wx, wz, tempColor);
    if (point.snowWeight > 0.25 || point.forestWeight > 0.25 || point.grasslandWeight > 0.35 || point.mountainWeight > 0.35) continue;
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

    const scale = 0.78 + seededRandom2D(baseSeed + i, 421) * 1.55 + point.desertWeight * 0.36;
    copyRGB(tintColor, PALM_COLOR);
    lerpRGB(tintColor, DESERT_DAY, 0.18);

    const idx = data.palmTrees.count++;
    writeMatrix(data.palmTrees, idx, lx, point.height + 2.4 * scale, lz,
      seededRandom2D(baseSeed + i, 431) * 0.08,
      seededRandom2D(baseSeed + i, 433) * Math.PI,
      seededRandom2D(baseSeed + i, 439) * 0.08,
      scale * 0.88, scale, scale * 0.88);
    writeColor(data.palmTrees, idx, tintColor);
  }

  // -- cacti --------------------------------------------------------------
  for (let i = 0; i < cactusCapacity * 6 && data.cacti.count < cactusCapacity; i++) {
    const lx = (seededRandom2D(baseSeed + i, 443) - 0.5) * size;
    const lz = (seededRandom2D(baseSeed + i, 449) - 0.5) * size;
    const wx = lx + gridX * size;
    const wz = lz + gridZ * size;
    const point = sampleTerrainPoint(wx, wz, tempColor);
    if (point.snowWeight > 0.25 || point.forestWeight > 0.25 || point.grasslandWeight > 0.35 || point.mountainWeight > 0.35) continue;
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

    const scale = 0.7 + seededRandom2D(baseSeed + i, 461) * 1.35 + point.desertWeight * 0.28;
    copyRGB(tintColor, CACTUS_COLOR);
    lerpRGB(tintColor, DESERT_DAY, 0.12);

    const idx = data.cacti.count++;
    writeMatrix(data.cacti, idx, lx, point.height + 0.85 * scale, lz,
      0,
      seededRandom2D(baseSeed + i, 463) * Math.PI,
      seededRandom2D(baseSeed + i, 467) * 0.06,
      scale * 0.8, scale, scale * 0.8);
    writeColor(data.cacti, idx, tintColor);
  }

  // -- rocks --------------------------------------------------------------
  for (let i = 0; i < rockCapacity * 5 && data.rocks.count < rockCapacity; i++) {
    const lx = (seededRandom2D(baseSeed + i, 233) - 0.5) * size;
    const lz = (seededRandom2D(baseSeed + i, 239) - 0.5) * size;
    const wx = lx + gridX * size;
    const wz = lz + gridZ * size;
    const point = sampleTerrainPoint(wx, wz, tempColor);
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

    const scale = 0.55 + seededRandom2D(baseSeed + i, 251) * 2.4 + point.cliffiness * 0.8 + point.alpineFactor * 0.55;
    copyRGB(tintColor, ROCK_COLOR);
    lerpRGB(tintColor, ROCK_HIGHLIGHT, 0.24 + point.mountainWeight * 0.16);
    lerpRGB(tintColor, HIGH_MOUNTAIN_GRAY, point.altitudeFactor * 0.32);

    const idx = data.rocks.count++;
    writeMatrix(data.rocks, idx, lx, point.height - 0.18, lz,
      seededRandom2D(baseSeed + i, 257) * Math.PI,
      seededRandom2D(baseSeed + i, 263) * Math.PI,
      0,
      scale, scale * (0.82 + point.cliffiness * 0.25), scale * 1.1);
    writeColor(data.rocks, idx, tintColor);
  }

  // -- mossRocks ----------------------------------------------------------
  for (let i = 0; i < mossRockCapacity * 7 && data.mossRocks.count < mossRockCapacity; i++) {
    const lx = (seededRandom2D(baseSeed + i, 647) - 0.5) * size;
    const lz = (seededRandom2D(baseSeed + i, 653) - 0.5) * size;
    const wx = lx + gridX * size;
    const wz = lz + gridZ * size;
    const point = sampleTerrainPoint(wx, wz, tempColor);
    if (point.snowWeight > 0.28 || point.desertWeight > 0.22 || point.mountainWeight > 0.35) continue;
    const mossChance = saturate(
      point.forestWeight * 0.52 +
        point.clearingWeight * 0.18 +
        point.rockCluster * 0.28 -
        point.grasslandWeight * 0.24 -
        point.mountainWeight * 0.18 -
        point.snowWeight * 1.1 -
        point.desertWeight * 1.0 -
        point.barrensWeight * 0.48,
    );
    if (seededRandom2D(baseSeed + i, 659) > mossChance) continue;

    const scale = 0.48 + seededRandom2D(baseSeed + i, 661) * 1.25;
    copyRGB(tintColor, MOSS_ROCK_COLOR);
    lerpRGB(tintColor, ROCK_HIGHLIGHT, 0.16);

    const idx = data.mossRocks.count++;
    writeMatrix(data.mossRocks, idx, lx, point.height - 0.08, lz,
      seededRandom2D(baseSeed + i, 673) * Math.PI,
      seededRandom2D(baseSeed + i, 677) * Math.PI,
      0,
      scale * 1.15, scale * 0.74, scale);
    writeColor(data.mossRocks, idx, tintColor);
  }

  // -- snowRocks ----------------------------------------------------------
  for (let i = 0; i < snowRockCapacity * 5 && data.snowRocks.count < snowRockCapacity; i++) {
    const lx = (seededRandom2D(baseSeed + i, 359) - 0.5) * size;
    const lz = (seededRandom2D(baseSeed + i, 367) - 0.5) * size;
    const wx = lx + gridX * size;
    const wz = lz + gridZ * size;
    const point = sampleTerrainPoint(wx, wz, tempColor);
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

    const scale = 0.5 + seededRandom2D(baseSeed + i, 379) * 1.95 + point.cliffiness * 0.5;
    copyRGB(tintColor, SNOW_ROCK_COLOR);
    lerpRGB(tintColor, ROCK_HIGHLIGHT, 0.2);

    const idx = data.snowRocks.count++;
    writeMatrix(data.snowRocks, idx, lx, point.height + 0.22 * scale, lz,
      seededRandom2D(baseSeed + i, 383) * Math.PI,
      seededRandom2D(baseSeed + i, 389) * Math.PI,
      0,
      scale, scale * (0.78 + point.cliffiness * 0.2), scale * 1.08);
    writeColor(data.snowRocks, idx, tintColor);
  }

  // -- snowPlants ---------------------------------------------------------
  for (let i = 0; i < snowPlantCapacity * 5 && data.snowPlants.count < snowPlantCapacity; i++) {
    const lx = (seededRandom2D(baseSeed + i, 479) - 0.5) * size;
    const lz = (seededRandom2D(baseSeed + i, 487) - 0.5) * size;
    const wx = lx + gridX * size;
    const wz = lz + gridZ * size;
    const point = sampleTerrainPoint(wx, wz, tempColor);
    const snowPlantChance = saturate(
      point.snowWeight * 0.72 +
        point.grassCluster * 0.22 -
        point.alpineFactor * 0.62 -
        point.cliffiness * 0.36 -
        point.desertWeight * 1.1,
    );
    if (seededRandom2D(baseSeed + i, 491) > snowPlantChance) continue;

    const scale = 0.42 + seededRandom2D(baseSeed + i, 499) * 1.12;
    copyRGB(tintColor, SNOW_TREE_COLOR);
    lerpRGB(tintColor, SNOW_COLOR, 0.3);

    const idx = data.snowPlants.count++;
    writeMatrix(data.snowPlants, idx, lx, point.height + 0.28 * scale, lz,
      0,
      seededRandom2D(baseSeed + i, 503) * Math.PI,
      seededRandom2D(baseSeed + i, 509) * 0.1,
      scale, scale, scale);
    writeColor(data.snowPlants, idx, tintColor);
  }

  // -- grass --------------------------------------------------------------
  // Legacy tint chain: tempColor.copy(GRASS_COLOR).lerp(sampleColorB.copy(tempColor), 0.28)
  // sampleColorB is a copy of the *current* tempColor (echo-blended), so this
  // is equivalent to lerp(GRASS_COLOR, echoColor, 0.28). The lerp result is
  // (1-t)*GRASS_COLOR + t*echoColor, so we reconstruct that explicitly.
  for (let i = 0; i < grassCapacity * 4 && data.grass.count < grassCapacity; i++) {
    const lx = (seededRandom2D(baseSeed + i, 271) - 0.5) * size;
    const lz = (seededRandom2D(baseSeed + i, 277) - 0.5) * size;
    const wx = lx + gridX * size;
    const wz = lz + gridZ * size;
    const point = sampleTerrainPoint(wx, wz, tempColor);
    if (point.snowWeight > 0.25 || point.desertWeight > 0.35 || point.mountainWeight > 0.35) continue;
    const grassChance = saturate(
      (point.grasslandWeight * 3.8 +
        point.forestWeight * point.clearingWeight * 2.1 +
        point.grassCluster * 1.55 +
        point.clearingWeight * 1.25) *
        point.vegetationFactor +
        point.grasslandWeight * 0.92 -
        point.forestWeight * 0.28 -
        point.mountainWeight * 0.68 -
        point.alpineFactor * 1.18 -
        point.snowWeight * 1.08 -
        point.desertWeight * 1.02 -
        point.barrensWeight * 0.42 -
        point.cliffiness * 0.72,
    );
    if (seededRandom2D(baseSeed + i, 281) > grassChance) continue;

    const scale = 0.5 + seededRandom2D(baseSeed + i, 283) * 1.35 + point.grasslandWeight * 0.55 + point.clearingWeight * 0.45;
    copyRGB(tintColor, GRASS_COLOR);
    lerpRGB(tintColor, tempColor, 0.28);

    const idx = data.grass.count++;
    writeMatrix(data.grass, idx, lx, point.height + 0.3, lz,
      0,
      seededRandom2D(baseSeed + i, 293) * Math.PI,
      seededRandom2D(baseSeed + i, 307) * 0.18,
      scale * 0.18, scale, scale * 0.18);
    writeColor(data.grass, idx, tintColor);
  }

  // -- bushes -------------------------------------------------------------
  for (let i = 0; i < bushCapacity * 7 && data.bushes.count < bushCapacity; i++) {
    const lx = (seededRandom2D(baseSeed + i, 701) - 0.5) * size;
    const lz = (seededRandom2D(baseSeed + i, 709) - 0.5) * size;
    const wx = lx + gridX * size;
    const wz = lz + gridZ * size;
    const point = sampleTerrainPoint(wx, wz, tempColor);
    if (point.snowWeight > 0.25 || point.desertWeight > 0.3 || point.mountainWeight > 0.35) continue;
    const bushChance = saturate(
      (point.forestWeight * 0.74 +
        point.grasslandWeight * 0.38 +
        point.clearingWeight * 0.58 +
        point.grassCluster * 0.32) *
        point.vegetationFactor -
        point.mountainWeight * 0.64 -
        point.alpineFactor -
        point.snowWeight * 1.1 -
        point.desertWeight * 1.12 -
        point.barrensWeight * 0.56 -
        point.cliffiness * 0.58,
    );
    if (seededRandom2D(baseSeed + i, 719) > bushChance) continue;

    const scale = 0.58 + seededRandom2D(baseSeed + i, 727) * 1.05 + point.forestWeight * 0.22;
    copyRGB(tintColor, BUSH_COLOR);
    lerpRGB(tintColor, tempColor, 0.24);

    const idx = data.bushes.count++;
    writeMatrix(data.bushes, idx, lx, point.height + 0.62 * scale, lz,
      0,
      seededRandom2D(baseSeed + i, 733) * Math.PI,
      seededRandom2D(baseSeed + i, 739) * 0.12,
      scale * 0.86, scale * 0.72, scale * 0.86);
    writeColor(data.bushes, idx, tintColor);
  }

  // -- flowers ------------------------------------------------------------
  for (let i = 0; i < flowerCapacity * 6 && data.flowers.count < flowerCapacity; i++) {
    const lx = (seededRandom2D(baseSeed + i, 751) - 0.5) * size;
    const lz = (seededRandom2D(baseSeed + i, 757) - 0.5) * size;
    const wx = lx + gridX * size;
    const wz = lz + gridZ * size;
    const point = sampleTerrainPoint(wx, wz, tempColor);
    if (point.snowWeight > 0.25 || point.desertWeight > 0.3 || point.mountainWeight > 0.35) continue;
    const flowerChance = saturate(
      (point.grasslandWeight * 1.22 +
        point.forestWeight * point.clearingWeight * 0.64 +
        point.grassCluster * 0.66) *
        point.vegetationFactor -
        point.forestWeight * 0.24 -
        point.mountainWeight * 0.74 -
        point.alpineFactor * 1.08 -
        point.snowWeight * 1.08 -
        point.desertWeight * 1.12 -
        point.barrensWeight * 0.56 -
        point.cliffiness * 0.64,
    );
    if (seededRandom2D(baseSeed + i, 761) > flowerChance) continue;

    const scale = 0.46 + seededRandom2D(baseSeed + i, 769) * 0.84 + point.grasslandWeight * 0.18;
    copyRGB(tintColor, FLOWER_COLOR);
    lerpRGB(tintColor, GRASS_COLOR, seededRandom2D(baseSeed + i, 797) * 0.34);

    const idx = data.flowers.count++;
    writeMatrix(data.flowers, idx, lx, point.height + 0.34 * scale, lz,
      0,
      seededRandom2D(baseSeed + i, 773) * Math.PI,
      seededRandom2D(baseSeed + i, 787) * 0.16,
      scale * 0.54, scale, scale * 0.54);
    writeColor(data.flowers, idx, tintColor);
  }

  // -- forestProps --------------------------------------------------------
  for (let i = 0; i < forestPropCapacity * 7 && data.forestProps.count < forestPropCapacity; i++) {
    const lx = (seededRandom2D(baseSeed + i, 811) - 0.5) * size;
    const lz = (seededRandom2D(baseSeed + i, 821) - 0.5) * size;
    const wx = lx + gridX * size;
    const wz = lz + gridZ * size;
    const point = sampleTerrainPoint(wx, wz, tempColor);
    if (point.snowWeight > 0.34 || point.desertWeight > 0.35) continue;
    const propChance = saturate(
      point.forestWeight * 0.46 +
        point.clearingWeight * 0.28 +
        point.midAltitudeFactor * 0.2 +
        point.mountainWeight * 0.12 -
        point.grasslandWeight * 0.42 -
        point.alpineFactor * 0.72 -
        point.snowWeight * 1.04 -
        point.desertWeight * 1.04 -
        point.barrensWeight * 0.24,
    );
    if (seededRandom2D(baseSeed + i, 827) > propChance) continue;

    const scale = 0.58 + seededRandom2D(baseSeed + i, 829) * 1.18 + point.midAltitudeFactor * 0.18;
    copyRGB(tintColor, FOREST_PROP_COLOR);
    lerpRGB(tintColor, MOSS_ROCK_COLOR, point.forestWeight * 0.22);

    const idx = data.forestProps.count++;
    writeMatrix(data.forestProps, idx, lx, point.height + 0.42 * scale, lz,
      seededRandom2D(baseSeed + i, 839) * 0.12,
      seededRandom2D(baseSeed + i, 853) * Math.PI,
      seededRandom2D(baseSeed + i, 857) * 0.12,
      scale * 0.88, scale * 0.72, scale * 0.88);
    writeColor(data.forestProps, idx, tintColor);
  }
  return data;
}
