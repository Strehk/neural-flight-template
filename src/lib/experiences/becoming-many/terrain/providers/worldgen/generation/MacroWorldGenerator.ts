/**
 * Builds the macro plan + drainage substrate for one region.
 *
 * 1. Samples band-limited base height on a 3×3-region block (GPU) so drainage
 *    sees a full ring of neighbours — this is the "stitching": rivers entering a
 *    region from its neighbours are captured and flow/lakes are near-exact across
 *    seams.
 * 2. Runs WFC over the region interior (priors from the continuous fields, border
 *    ring pinned deterministically) for the macro tile plan.
 * 3. Priority-flood + flow accumulation + lake/river extraction on the block,
 *    storing the interior fields and the river polylines that pass through it.
 *
 * Fields are sampled on the CPU (was a GPU compute pass) so the whole pipeline
 * runs inside the worldgen Web Worker.
 */
import { baseHeight01, temperature01, baseMoisture01 } from './fields';
import { WfcSolver } from './wfc/WfcSolver';
import { tilePriors, argmaxTile, uplandSourceAllowed } from './wfc/constraints';
import { priorityFlood } from './lakes/BasinDetection';
import { flowAccumulation } from './rivers/FlowAccumulation';
import { detectLakes } from './lakes/LakeGenerator';
import { traceRivers } from './rivers/RiverTracing';
import { MACRO_TILE_COUNT, type GenParams, type RegionData } from './mapTypes';
import { mulberry32, deriveSeed, seedToOffset } from './rng';

export class MacroWorldGenerator {
  private solver = new WfcSolver();

  // Kept async (CPU now, no await) so RegionManager's promise-cache path is
  // unchanged — region generation could move back off the critical path later.
  async generate(rx: number, ry: number, params: GenParams): Promise<RegionData> {
    const RM = params.macroResolution;
    const cs = params.macroCellSize;
    const seaLevel = params.waterLevel;
    const BW = 3 * RM; // block width/height (region + 1-ring of neighbours)
    const blockOriginMx = (rx - 1) * RM;
    const blockOriginMy = (ry - 1) * RM;

    // CPU samples: height/temp/moisture over the whole 3×3 block (so the upland
    // source mask is consistent across seams); the interior is extracted for WFC.
    // Macro cell (lx,ly) samples world ((blockOriginMx+lx+0.5)*cs, …).
    const seedOffset = seedToOffset(params.seed);
    const blockHeight = new Float32Array(BW * BW);
    const blockTemp = new Float32Array(BW * BW);
    const blockMoist = new Float32Array(BW * BW);
    for (let ly = 0; ly < BW; ly++) {
      for (let lx = 0; lx < BW; lx++) {
        const wx = (blockOriginMx + lx + 0.5) * cs;
        const wy = (blockOriginMy + ly + 0.5) * cs;
        const i = ly * BW + lx;
        blockHeight[i] = baseHeight01(wx, wy, seedOffset, params);
        blockTemp[i] = temperature01(wx, wy, seedOffset, params);
        blockMoist[i] = baseMoisture01(wx, wy, seedOffset, params);
      }
    }

    // Per-block upland-source mask (WFC riverSource hint as a pure function).
    const srcAllowed = new Uint8Array(BW * BW);
    for (let i = 0; i < srcAllowed.length; i++) {
      srcAllowed[i] = uplandSourceAllowed(blockHeight[i], blockTemp[i], blockMoist[i]) ? 1 : 0;
    }

    // Extract the region interior (RM×RM) for WFC priors + storage.
    const macroHeight = new Float32Array(RM * RM);
    const macroTemp = new Float32Array(RM * RM);
    const macroMoisture = new Float32Array(RM * RM);
    for (let ly = 0; ly < RM; ly++) {
      for (let lx = 0; lx < RM; lx++) {
        const bi = (RM + ly) * BW + (RM + lx);
        const i = ly * RM + lx;
        macroHeight[i] = blockHeight[bi];
        macroTemp[i] = blockTemp[bi];
        macroMoisture[i] = blockMoist[bi];
      }
    }

    // ---- WFC macro plan ----
    const n = RM * RM;
    const priors = new Float32Array(n * MACRO_TILE_COUNT);
    const pinned = new Int16Array(n).fill(-1);
    for (let ly = 0; ly < RM; ly++) {
      for (let lx = 0; lx < RM; lx++) {
        const i = ly * RM + lx;
        const h = macroHeight[i];
        const t = macroTemp[i];
        const m = macroMoisture[i];
        priors.set(tilePriors(h, t, m), i * MACRO_TILE_COUNT);
        if (lx === 0 || ly === 0 || lx === RM - 1 || ly === RM - 1) {
          pinned[i] = argmaxTile(h, t, m);
        }
      }
    }
    const rng = mulberry32(deriveSeed(params.seed, rx, ry, 0x5fc));
    const macroTiles = this.solver.solve({ w: RM, h: RM, priors, pinned, rng });

    // ---- Drainage on the block ----
    const NB = BW * BW;
    const { filled, receiver } = priorityFlood(blockHeight, BW, BW);
    const accum = flowAccumulation(filled, receiver, NB);
    const lakes = detectLakes(
      blockHeight,
      filled,
      receiver,
      NB,
      seaLevel,
      params.lakeSpillTolerance,
      params.lakeFrequency,
      params.lakeMaxHeight,
    );
    const lakeMask = new Uint8Array(NB);
    for (let i = 0; i < NB; i++) lakeMask[i] = lakes.lakeDepth[i] > 0 ? 1 : 0;

    const rectMinX = rx * RM * cs;
    const rectMinY = ry * RM * cs;
    const rectMaxX = (rx + 1) * RM * cs;
    const rectMaxY = (ry + 1) * RM * cs;
    const rivers = traceRivers({
      filled,
      receiver,
      accum,
      lakeMask,
      srcAllowed,
      W: BW,
      H: BW,
      blockOriginMx,
      blockOriginMy,
      cs,
      seaLevel,
      rectMinX,
      rectMinY,
      rectMaxX,
      rectMaxY,
      params,
      seed: deriveSeed(params.seed, rx, ry, 0x917) >>> 0,
    });

    // Extract interior drainage fields + normalise accumulation (log scale).
    const macroFilled = new Float32Array(n);
    const macroAccum = new Float32Array(n);
    const lakeDepth = new Float32Array(n);
    const lakeSurface = new Float32Array(n);
    let maxA = 1;
    for (let ly = 0; ly < RM; ly++) {
      for (let lx = 0; lx < RM; lx++) {
        const a = accum[(RM + ly) * BW + (RM + lx)];
        if (a > maxA) maxA = a;
      }
    }
    const logMax = Math.log(1 + maxA);
    for (let ly = 0; ly < RM; ly++) {
      for (let lx = 0; lx < RM; lx++) {
        const bi = (RM + ly) * BW + (RM + lx);
        const i = ly * RM + lx;
        macroFilled[i] = filled[bi];
        macroAccum[i] = Math.log(1 + accum[bi]) / logMax;
        lakeDepth[i] = lakes.lakeDepth[bi];
        lakeSurface[i] = lakes.lakeSurface[bi];
      }
    }

    const spillPoints: { x: number; y: number }[] = [];
    for (const bi of lakes.spillIdx) {
      const gx = bi % BW;
      const gy = (bi / BW) | 0;
      const wx = (blockOriginMx + gx + 0.5) * cs;
      const wy = (blockOriginMy + gy + 0.5) * cs;
      if (wx >= rectMinX && wx < rectMaxX && wy >= rectMinY && wy < rectMaxY) {
        spillPoints.push({ x: wx, y: wy });
      }
    }

    return {
      rx,
      ry,
      macroW: RM,
      macroH: RM,
      macroCellSize: cs,
      macroTiles,
      macroHeight,
      macroTemp,
      macroMoisture,
      macroFilled,
      macroAccum,
      lakeDepth,
      lakeSurface,
      rivers,
      spillPoints,
    };
  }
}
