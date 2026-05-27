/**
 * Acoustic surface estimators — pure functions lifted from
 * `BatWorld.estimateAcousticDensity / Ruggedness / Reflectivity /
 * Slope` (world.ts:2250–2326) so the echo system can call them without
 * a BatWorld instance.
 *
 * Refactor step 4: estimators move next to TerrainSampler so the
 * sampler can expose them as one composite `acoustics()` call backed by
 * the cache. The numeric coefficients are inlined verbatim — they live
 * here rather than in `AcousticConfig` (world-config.ts) because the
 * legacy formulas have richer per-biome cross-terms than the simple
 * `base + biomeMod` shape the placeholder config exposes. Step 9 (or
 * whenever someone wants to retune them via a UI) can lift them into a
 * richer config.
 */

import type * as THREE from "three";
import { saturate } from "$lib/three/world/math";
import type { AcousticMaterial } from "./world-config";
import type { DerivedContext } from "./derived-field-sampler";

export type EchoMaterial = AcousticMaterial; // re-export alias for callers

export interface AcousticReading {
  density: number;
  ruggedness: number;
  reflectivity: number;
}

/**
 * Cluster-weighted density estimate. Matches the legacy formula at
 * world.ts:2250–2258 byte-for-byte.
 */
export function estimateAcousticDensity(point: DerivedContext): number {
  return saturate(
    point.treeCluster * (0.3 + point.forestWeight * 0.55) +
      point.grassCluster *
        (0.14 + point.grasslandWeight * 0.32 + point.desertWeight * 0.28) +
      point.rockCluster *
        (0.12 + point.mountainWeight * 0.42 + point.barrensWeight * 0.26) +
      point.basinWeight * 0.08,
  );
}

/**
 * Slope × cliffiness × mountain × verticalOffset blend. Matches
 * world.ts:2261–2275 byte-for-byte.
 *
 * `slope` is now an injected scalar so the caller decides whether to
 * compute it via TerrainSampler (cached) or via batch heightmap
 * lookups (step 11's `AcousticFieldBaker`).
 */
export function estimateAcousticRuggedness(
  origin: THREE.Vector3,
  hit: THREE.Vector3,
  terrainPoint: DerivedContext,
  range: number,
  slope: number,
): number {
  const verticalOffset = Math.abs(hit.y - origin.y) / Math.max(range, 1);
  return saturate(
    slope * 0.52 +
      terrainPoint.cliffiness * 0.7 +
      terrainPoint.mountainWeight * 0.24 +
      verticalOffset * 0.44,
  );
}

/**
 * Material-keyed reflectivity. Matches world.ts:2277–2315 byte-for-byte.
 */
export function estimateReflectivity(
  material: EchoMaterial,
  terrainPoint: DerivedContext,
): number {
  switch (material) {
    case "tree":
      return (
        0.42 +
        terrainPoint.forestWeight * 0.18 -
        terrainPoint.desertWeight * 0.06
      );
    case "rock":
      return (
        0.84 +
        terrainPoint.mountainWeight * 0.16 +
        terrainPoint.barrensWeight * 0.08
      );
    case "grass":
      return (
        0.28 +
        terrainPoint.grasslandWeight * 0.1 +
        terrainPoint.desertWeight * 0.06
      );
    case "moth":
      return (
        0.92 +
        terrainPoint.forestWeight * 0.06 +
        terrainPoint.desertWeight * 0.08 +
        terrainPoint.grasslandWeight * 0.04
      );
    case "terrain":
    default:
      return (
        0.6 +
        terrainPoint.mountainWeight * 0.12 +
        terrainPoint.barrensWeight * 0.06
      );
  }
}
