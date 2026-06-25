/**
 * Top-level generation orchestrator.
 *
 * Per chunk it runs the CPU field passes (fine height, temperature, base
 * moisture), the slope pass, and stamps the macro tile plan (from cached
 * regions) into a per-pixel macro map, then drainage + the surface passes.
 */
import { fineHeight01, temperature01, baseMoisture01 } from './fields';
import { seedToOffset } from './rng';
import { computeSlope } from './SlopeMapGenerator';
import { MacroWorldGenerator } from './MacroWorldGenerator';
import { RegionManager } from './world/RegionManager';
import { chunkOrigin, regionKey } from './world/WorldCoords';
import { stampRivers } from './rivers/RiverCarving';
import { computeWaterDistanceAndDerived } from './WaterDistanceMapGenerator';
import { classifyChunk } from './BiomeGenerator';
import type { ChunkData, GenParams, RegionData, RiverNetwork, RiverPoint } from './mapTypes';

function emptyChunk(cx: number, cy: number, size: number): ChunkData {
  const n = size * size;
  return {
    cx,
    cy,
    size,
    heightMap: new Float32Array(n),
    moistureMap: new Float32Array(n),
    temperatureMap: new Float32Array(n),
    slopeMap: new Float32Array(n),
    biomeMap: new Uint8Array(n),
    riverMap: new Float32Array(n),
    flowAccumulationMap: new Float32Array(n),
    lakeMap: new Float32Array(n),
    waterDistanceMap: new Float32Array(n),
    shoreMap: new Float32Array(n),
    vegetationDensityMap: new Float32Array(n),
    macroMap: new Uint8Array(n),
    waterSurfaceMap: new Float32Array(n),
    waterMask: new Uint8Array(n),
    heightMapBordered: new Float32Array((size + 2) * (size + 2)),
    riverPaths: [],
  };
}

export class WorldMapGenerator {
  readonly regions: RegionManager;

  constructor() {
    this.regions = new RegionManager(new MacroWorldGenerator());
  }

  clearCaches(): void {
    this.regions.clear();
  }

  async generateChunk(cx: number, cy: number, params: GenParams): Promise<ChunkData> {
    const size = params.chunkSize;
    const origin = chunkOrigin(cx, cy, size);

    // Work on a padded buffer (apron of real neighbour data) so every CPU
    // neighbourhood op — slope, water distance, moisture boost, biome — is
    // computed against true neighbours at the chunk edges. The apron is trimmed
    // before returning, leaving seamless chunk borders.
    const A = WorldMapGenerator.APRON;
    const W = size + 2 * A;
    const pOx = origin.x - A;
    const pOy = origin.y - A;
    const pad = emptyChunk(cx, cy, W);

    // CPU field passes over the padded extent. Cell (lx,ly) samples world
    // (pOx+lx, pOy+ly) — one world px per cell at chunk resolution.
    const seedOffset = seedToOffset(params.seed);
    for (let ly = 0; ly < W; ly++) {
      for (let lx = 0; lx < W; lx++) {
        const wx = pOx + lx;
        const wy = pOy + ly;
        const i = ly * W + lx;
        pad.heightMap[i] = fineHeight01(wx, wy, seedOffset, params);
        pad.temperatureMap[i] = temperature01(wx, wy, seedOffset, params);
        pad.moistureMap[i] = baseMoisture01(wx, wy, seedOffset, params);
      }
    }

    // Macro plan + drainage substrate over the padded rect. Gather an extra
    // macro cell of regions so cross-region sampling has all 4 corners.
    const cs = params.macroCellSize;
    const regions = await this.regions.regionsForRect(
      pOx - cs,
      pOy - cs,
      pOx + W + cs,
      pOy + W + cs,
      params,
    );

    // Precompute a small local macro grid (tiles / accumulation / lake) covering
    // the padded chunk, resolving each cell across regions ONCE — then the
    // per-pixel loop only does cheap array bilinear (no per-pixel region lookups).
    const mmx0 = Math.floor(pOx / cs) - 1;
    const mmy0 = Math.floor(pOy / cs) - 1;
    const LW = Math.floor((pOx + W - 1) / cs) + 1 - mmx0 + 1;
    const LH = Math.floor((pOy + W - 1) / cs) + 1 - mmy0 + 1;
    const locTiles = new Uint8Array(LW * LH);
    const locAccum = new Float32Array(LW * LH);
    const locLake = new Float32Array(LW * LH);
    const locLakeSurf = new Float32Array(LW * LH);
    for (let ly = 0; ly < LH; ly++) {
      for (let lx = 0; lx < LW; lx++) {
        const mx = mmx0 + lx;
        const my = mmy0 + ly;
        const li = ly * LW + lx;
        locTiles[li] = this.regions.tileAt(mx, my, regions, params);
        locAccum[li] = macroCellValue(regions, mx, my, params, (r) => r.macroAccum);
        locLake[li] = macroCellValue(regions, mx, my, params, (r) => r.lakeDepth);
        locLakeSurf[li] = macroCellValue(regions, mx, my, params, (r) => r.lakeSurface);
      }
    }

    for (let py = 0; py < W; py++) {
      const fmy = (pOy + py) / cs - 0.5 - mmy0;
      const ny = Math.floor((pOy + py) / cs) - mmy0;
      for (let px = 0; px < W; px++) {
        const fmx = (pOx + px) / cs - 0.5 - mmx0;
        const nx = Math.floor((pOx + px) / cs) - mmx0;
        const i = py * W + px;
        pad.macroMap[i] = locTiles[ny * LW + nx];
        pad.flowAccumulationMap[i] = bilinearLocal(locAccum, LW, LH, fmx, fmy);
        pad.lakeMap[i] = Math.min(1, bilinearLocal(locLake, LW, LH, fmx, fmy) * 8);
      }
    }

    // Carve river polylines from every overlapping region.
    const networks: RiverNetwork[] = [];
    for (const region of regions.values()) if (region.rivers) networks.push(region.rivers);
    stampRivers(pad, pOx, pOy, networks, params);

    // Derived CPU passes on the padded buffer.
    pad.slopeMap = computeSlope(pad.heightMap, W);
    computeWaterDistanceAndDerived(pad, params);
    classifyChunk(pad, params, pOx, pOy);

    // Water surface + mask (after carving so rivers are present): ocean at sea
    // level, lakes flat at their surface, rivers follow the carved channel.
    const wl = params.waterLevel;
    for (let py = 0; py < W; py++) {
      const fmy = (pOy + py) / cs - 0.5 - mmy0;
      for (let px = 0; px < W; px++) {
        const fmx = (pOx + px) / cs - 0.5 - mmx0;
        const i = py * W + px;
        const h = pad.heightMap[i];
        if (h < wl) {
          pad.waterSurfaceMap[i] = wl;
          pad.waterMask[i] = 1;
        } else if (bilinearLocal(locLake, LW, LH, fmx, fmy) > 0.02) {
          // Lake surface must be perfectly FLAT at the basin's spill level. Take
          // the max of the surrounding macro lake-surface cells (constant across a
          // basin) instead of max(h, surf) — the latter made the surface follow
          // the bed and terrace. The 3D basin clamp keeps the bed below this.
          const surf = maxLocal2x2(locLakeSurf, LW, LH, fmx, fmy);
          pad.waterSurfaceMap[i] = surf > 0 ? surf : h;
          pad.waterMask[i] = 1;
        } else if (pad.riverMap[i] > 0.12) {
          pad.waterSurfaceMap[i] = h + 0.004;
          pad.waterMask[i] = 1;
        }
      }
    }

    // Trim the apron into the final chunk.
    const chunk = emptyChunk(cx, cy, size);
    trim(pad.heightMap, chunk.heightMap, W, A, size);
    trim(pad.waterSurfaceMap, chunk.waterSurfaceMap, W, A, size);
    trim(pad.waterMask, chunk.waterMask, W, A, size);
    // 1px-bordered height for crack-free 3D terrain meshes.
    {
      const BS = size + 2;
      for (let py = 0; py < BS; py++) {
        const srcStart = (A - 1 + py) * W + (A - 1);
        chunk.heightMapBordered.set(pad.heightMap.subarray(srcStart, srcStart + BS), py * BS);
      }
    }
    trim(pad.moistureMap, chunk.moistureMap, W, A, size);
    trim(pad.temperatureMap, chunk.temperatureMap, W, A, size);
    trim(pad.slopeMap, chunk.slopeMap, W, A, size);
    trim(pad.riverMap, chunk.riverMap, W, A, size);
    trim(pad.flowAccumulationMap, chunk.flowAccumulationMap, W, A, size);
    trim(pad.lakeMap, chunk.lakeMap, W, A, size);
    trim(pad.waterDistanceMap, chunk.waterDistanceMap, W, A, size);
    trim(pad.shoreMap, chunk.shoreMap, W, A, size);
    trim(pad.vegetationDensityMap, chunk.vegetationDensityMap, W, A, size);
    trim(pad.biomeMap, chunk.biomeMap, W, A, size);
    trim(pad.macroMap, chunk.macroMap, W, A, size);
    chunk.riverPaths = clipRiverPaths(networks, origin.x, origin.y, size);
    return chunk;
  }

  private static readonly APRON = 24;
}

/**
 * Extract contiguous river point runs that touch a chunk's footprint (+margin),
 * deduplicating segments shared by overlapping regions. Output is in world
 * coordinates; the 3D RiverMeshBuilder turns each run into a ribbon.
 */
function clipRiverPaths(
  networks: RiverNetwork[],
  ox: number,
  oy: number,
  size: number,
): RiverPoint[][] {
  const M = 6; // world px margin so ribbons meet across chunk borders
  const minX = ox - M;
  const maxX = ox + size + M;
  const minY = oy - M;
  const maxY = oy + size + M;
  const out: RiverPoint[][] = [];
  const seen = new Set<number>();
  const inside = (x: number, y: number): boolean => x >= minX && x <= maxX && y >= minY && y <= maxY;
  for (const net of networks) {
    for (const path of net.paths) {
      const pts = path.points;
      let run: RiverPoint[] = [];
      for (let i = 0; i < pts.length; i++) {
        const here = inside(pts[i].x, pts[i].y);
        const prev = i > 0 && inside(pts[i - 1].x, pts[i - 1].y);
        const next = i < pts.length - 1 && inside(pts[i + 1].x, pts[i + 1].y);
        if (here || prev || next) {
          run.push(pts[i]);
        } else if (run.length >= 2) {
          pushRun(run, out, seen);
          run = [];
        } else {
          run = [];
        }
      }
      if (run.length >= 2) pushRun(run, out, seen);
    }
  }
  return out;
}

function pushRun(
  run: RiverPoint[],
  out: RiverPoint[][],
  seen: Set<number>,
): void {
  // Dedup by the quantised key of the run's first segment — overlapping regions
  // produce identical traces, and one ribbon per physical channel is enough.
  const a = run[0];
  const b = run[1];
  const key =
    ((Math.round(a.x) & 0xffff) << 16) ^ (Math.round(a.y) & 0xffff) ^ (Math.round(b.x) * 131 + Math.round(b.y) * 977);
  if (seen.has(key)) return;
  seen.add(key);
  out.push(run);
}

/** Copy the interior (apron removed) of a W×W padded array into a size×size array. */
function trim(
  src: Float32Array | Uint8Array,
  dst: Float32Array | Uint8Array,
  W: number,
  A: number,
  size: number,
): void {
  for (let py = 0; py < size; py++) {
    const srcStart = (py + A) * W + A;
    (dst as Float32Array).set((src as Float32Array).subarray(srcStart, srcStart + size), py * size);
  }
}

/** Value of a per-region macro field at a global macro cell, looked up across regions. */
function macroCellValue(
  regions: Map<string, RegionData>,
  mx: number,
  my: number,
  params: GenParams,
  sel: (r: RegionData) => Float32Array | undefined,
): number {
  const RM = params.macroResolution;
  const rx = Math.floor(mx / RM);
  const ry = Math.floor(my / RM);
  const region = regions.get(regionKey(rx, ry));
  if (!region) return 0;
  const arr = sel(region);
  if (!arr) return 0;
  return arr[(my - ry * RM) * RM + (mx - rx * RM)];
}

/** Bilinear sample of a local macro grid (continuous, already cross-region). */
function bilinearLocal(arr: Float32Array, LW: number, LH: number, fx: number, fy: number): number {
  let x0 = Math.floor(fx);
  let y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  if (x0 < 0) x0 = 0;
  if (y0 < 0) y0 = 0;
  const x1 = x0 + 1 < LW ? x0 + 1 : LW - 1;
  const y1 = y0 + 1 < LH ? y0 + 1 : LH - 1;
  if (x0 >= LW) x0 = LW - 1;
  if (y0 >= LH) y0 = LH - 1;
  const v00 = arr[y0 * LW + x0];
  const v10 = arr[y0 * LW + x1];
  const v01 = arr[y1 * LW + x0];
  const v11 = arr[y1 * LW + x1];
  const a = v00 + (v10 - v00) * tx;
  const b = v01 + (v11 - v01) * tx;
  return a + (b - a) * ty;
}

/**
 * Max of the 2×2 macro cells around (fx,fy). Used for the flat lake surface: the
 * spill level is constant across a basin, so the max picks that level even at the
 * lake's edge (where bilinear would smear it toward 0 against dry neighbours) —
 * giving a perfectly flat surface instead of a ramped one.
 */
function maxLocal2x2(arr: Float32Array, LW: number, LH: number, fx: number, fy: number): number {
  let x0 = Math.floor(fx);
  let y0 = Math.floor(fy);
  if (x0 < 0) x0 = 0;
  else if (x0 > LW - 1) x0 = LW - 1;
  if (y0 < 0) y0 = 0;
  else if (y0 > LH - 1) y0 = LH - 1;
  const x1 = x0 + 1 < LW ? x0 + 1 : LW - 1;
  const y1 = y0 + 1 < LH ? y0 + 1 : LH - 1;
  return Math.max(arr[y0 * LW + x0], arr[y0 * LW + x1], arr[y1 * LW + x0], arr[y1 * LW + x1]);
}
