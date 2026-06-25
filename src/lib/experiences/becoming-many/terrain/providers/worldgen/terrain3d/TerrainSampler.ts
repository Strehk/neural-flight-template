/**
 * Reads the Stage 1 maps of a single chunk in normalised chunk-local UV space
 * (u,v ∈ [0,1]) or in world coordinates. This is the bridge between the macro 2D
 * maps (the source of truth) and the 3D detail layer: every 3D height / colour /
 * placement query goes through here so nothing in 3D invents world data.
 *
 * Seamlessness rule:
 *   - sampleHeight() reads the 1px-bordered height, so adjacent chunks return the
 *     SAME value at a shared edge → crack-free geometry.
 *   - slopeAt() is derived from that bordered height, so the high-amplitude
 *     geometry detail (ridges/cliffs) it drives is also seam-free.
 *   - The remaining per-pixel maps (moisture, temperature, river, lake, …) have
 *     no border; they only feed gentle, low-frequency shaping and the material,
 *     where a sub-pixel edge mismatch is invisible.
 */
import { Biome, type ChunkData } from '../generation/mapTypes';

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** Bilinear sample of a row-major size×size array at fractional pixel (fx,fy). */
function bilinear(arr: Float32Array, size: number, fx: number, fy: number): number {
  let x0 = Math.floor(fx);
  let y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  if (x0 < 0) x0 = 0;
  else if (x0 > size - 1) x0 = size - 1;
  if (y0 < 0) y0 = 0;
  else if (y0 > size - 1) y0 = size - 1;
  const x1 = x0 + 1 < size ? x0 + 1 : size - 1;
  const y1 = y0 + 1 < size ? y0 + 1 : size - 1;
  const v00 = arr[y0 * size + x0];
  const v10 = arr[y0 * size + x1];
  const v01 = arr[y1 * size + x0];
  const v11 = arr[y1 * size + x1];
  const a = v00 + (v10 - v00) * tx;
  const b = v01 + (v11 - v01) * tx;
  return a + (b - a) * ty;
}

export class TerrainSampler {
  readonly data: ChunkData;
  readonly size: number;
  /** World coordinate of the chunk's min (top-left) cell origin. */
  readonly originX: number;
  readonly originY: number;
  private bs: number; // bordered side length

  constructor(data: ChunkData) {
    this.data = data;
    this.size = data.size;
    this.originX = data.cx * data.size;
    this.originY = data.cy * data.size;
    this.bs = data.size + 2;
  }

  // ---- UV helpers (u,v in [0,1] over the chunk footprint) ----

  private uvToPixel(u: number, v: number): { fx: number; fy: number } {
    // Pixel centres sit at +0.5; u=0 → first cell centre, u=1 → last cell centre.
    return { fx: u * this.size - 0.5, fy: v * this.size - 0.5 };
  }

  /** Seamless height (0..1) from the bordered map. u,v over the chunk footprint. */
  sampleHeight(u: number, v: number): number {
    // Bordered map: index (u*size + 1) maps the footprint into [1, size+1].
    const fx = u * this.size + 0.5; // border offset (1px) minus half-pixel centre
    const fy = v * this.size + 0.5;
    return bilinear(this.data.heightMapBordered, this.bs, fx, fy);
  }

  /** Seamless slope (0..1) derived from the bordered height (central diff). */
  slopeAt(u: number, v: number, strength = 90): number {
    const e = 1 / this.size; // one footprint pixel in uv
    const hL = this.sampleHeight(u - e, v);
    const hR = this.sampleHeight(u + e, v);
    const hD = this.sampleHeight(u, v - e);
    const hU = this.sampleHeight(u, v + e);
    const dx = (hR - hL) * 0.5;
    const dy = (hU - hD) * 0.5;
    return clamp01(Math.sqrt(dx * dx + dy * dy) * strength);
  }

  sampleSlope(u: number, v: number): number {
    const { fx, fy } = this.uvToPixel(u, v);
    return bilinear(this.data.slopeMap, this.size, fx, fy);
  }

  sampleMoisture(u: number, v: number): number {
    const { fx, fy } = this.uvToPixel(u, v);
    return bilinear(this.data.moistureMap, this.size, fx, fy);
  }

  sampleTemperature(u: number, v: number): number {
    const { fx, fy } = this.uvToPixel(u, v);
    return bilinear(this.data.temperatureMap, this.size, fx, fy);
  }

  sampleRiver(u: number, v: number): number {
    const { fx, fy } = this.uvToPixel(u, v);
    return bilinear(this.data.riverMap, this.size, fx, fy);
  }

  sampleFlow(u: number, v: number): number {
    const { fx, fy } = this.uvToPixel(u, v);
    return bilinear(this.data.flowAccumulationMap, this.size, fx, fy);
  }

  sampleLake(u: number, v: number): number {
    const { fx, fy } = this.uvToPixel(u, v);
    return bilinear(this.data.lakeMap, this.size, fx, fy);
  }

  sampleWaterDistance(u: number, v: number): number {
    const { fx, fy } = this.uvToPixel(u, v);
    return bilinear(this.data.waterDistanceMap, this.size, fx, fy);
  }

  sampleShore(u: number, v: number): number {
    const { fx, fy } = this.uvToPixel(u, v);
    return bilinear(this.data.shoreMap, this.size, fx, fy);
  }

  sampleVegetationDensity(u: number, v: number): number {
    const { fx, fy } = this.uvToPixel(u, v);
    return bilinear(this.data.vegetationDensityMap, this.size, fx, fy);
  }

  sampleWaterSurface(u: number, v: number): number {
    const { fx, fy } = this.uvToPixel(u, v);
    return bilinear(this.data.waterSurfaceMap, this.size, fx, fy);
  }

  /** Nearest biome id (discrete; used for colour + placement, not geometry). */
  sampleBiome(u: number, v: number): Biome {
    const px = Math.min(this.size - 1, Math.max(0, Math.round(u * this.size - 0.5)));
    const py = Math.min(this.size - 1, Math.max(0, Math.round(v * this.size - 0.5)));
    return this.data.biomeMap[py * this.size + px] as Biome;
  }

  /** 1 where a water surface should render at this cell, else 0 (nearest). */
  waterMaskAt(u: number, v: number): number {
    const px = Math.min(this.size - 1, Math.max(0, Math.round(u * this.size - 0.5)));
    const py = Math.min(this.size - 1, Math.max(0, Math.round(v * this.size - 0.5)));
    return this.data.waterMask[py * this.size + px];
  }

  // ---- World-space variants ----

  worldToUv(wx: number, wy: number): { u: number; v: number } {
    return { u: (wx - this.originX) / this.size, v: (wy - this.originY) / this.size };
  }
}
