#!/usr/bin/env bun
/**
 * Determinism check for the shared terrain TerrainSampler.
 *
 * Step 5 of the world refactor locks the bit-identity contract:
 *
 *   1. Same `masterSeed` + `WorldConfig` ⇒ identical samples across
 *      sessions, machines, and processes. (Cross-session stability.)
 *   2. `clearCache()` then re-sample ⇒ identical floats.
 *      (Cache transparency — the cache is a perf shortcut, never
 *      observable.)
 *   3. A freshly-constructed TerrainSampler ⇒ identical floats.
 *      (GC-safety: any chunk we dispose can be regenerated identically
 *      when the player returns.)
 *
 * Run with:   bun scripts/check-world-determinism.ts
 *
 * First run prints the hash to copy into `PINNED_HASH`. Subsequent runs
 * fail with exit code 1 if the world drifts — making any unintentional
 * non-determinism (or any intentional but un-reviewed world change)
 * impossible to miss in CI.
 */

import { TERRAIN_WORLD_CONFIG_DEFAULTS } from "../src/lib/worldgen/terrain/world-config";
import {
  TerrainSampler,
  type TerrainSample,
} from "../src/lib/worldgen/terrain/terrain-sampler";

// ---------------------------------------------------------------------------
// Reference points
// ---------------------------------------------------------------------------

/**
 * Coordinates chosen to span:
 *   - origin + axis-aligned points,
 *   - exact chunk seams at multiples of chunkSize = 112,
 *   - irrational offsets that won't land on any noise lattice,
 *   - mirror pairs so any sign bug surfaces.
 */
const REFERENCE_COORDS: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [50, 0], [-50, 0], [0, 50], [0, -50],
  [112, 0], [-112, 0], [0, 112], [0, -112],
  [224, 224], [-224, -224], [-224, 224], [224, -224],
  [82, 82], [-82, -82],
  [37.5, 91.2], [-37.5, -91.2], [156.25, -78.125],
  [13.0, 169.0], [-201.7, 44.3],
];

// ---------------------------------------------------------------------------
// Hashing
// ---------------------------------------------------------------------------

/** Quantisation factor — `Math.round(value * ROUND)` collapses tiny FP noise. */
const ROUND = 1e9;

/**
 * Stable string serialisation of a TerrainSample. Order is fixed; floats
 * are rounded to nanounit precision so cross-platform JS-engine drift in
 * the last ulps doesn't trip the check. The dominantBiome string and 18
 * numeric fields together cover everything the world exposes per point.
 */
function dumpSample(s: TerrainSample): string {
  const fields = [
    s.height,
    s.forestWeight, s.grasslandWeight, s.mountainWeight,
    s.snowWeight, s.desertWeight, s.barrensWeight,
    s.basinWeight, s.cliffiness,
    s.treeCluster, s.grassCluster, s.rockCluster,
    s.clearingWeight,
    s.altitudeFactor, s.vegetationFactor,
    s.midAltitudeFactor, s.alpineFactor,
  ];
  return `${s.dominantBiome}|${fields.map((f) => Math.round(f * ROUND)).join(",")}`;
}

function snapshot(sampler: TerrainSampler): string {
  return REFERENCE_COORDS
    .map(([x, z]) => `${x},${z}=${dumpSample(sampler.sample(x, z))}`)
    .join("\n");
}

/** FNV-1a 32-bit — same algorithm streamSeed uses, hex-formatted. */
function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

// ---------------------------------------------------------------------------
// Pinned baseline
// ---------------------------------------------------------------------------

/**
 * Pinned world hash at the post-step-4 baseline (legacy seeds still
 * present on `BAT_NOISE_DEFAULTS`). Update only when a deliberate world
 * change ships — and add a note in the commit explaining what changed.
 *
 * Re-pinned 2026-06-08: river system landed — terrain is now carved by the
 * graph-first hydrology (height-sampler relief refactor + river carve in
 * TerrainSampler), so heights at river-adjacent reference points changed.
 */
const PINNED_HASH = "6ed9f0f4";

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

function fail(message: string): never {
  console.error(`FAIL  ${message}`);
  process.exit(1);
}

// Test 1 — cache transparency.
const sampler = new TerrainSampler(TERRAIN_WORLD_CONFIG_DEFAULTS);
const beforeClear = snapshot(sampler);
sampler.clearCache();
const afterClear = snapshot(sampler);
if (beforeClear !== afterClear) {
  fail("snapshot changed after clearCache(); cache is observable.");
}

// Test 2 — GC-safety (fresh instance ⇒ identical floats).
const sampler2 = new TerrainSampler(TERRAIN_WORLD_CONFIG_DEFAULTS);
const rebuilt = snapshot(sampler2);
if (beforeClear !== rebuilt) {
  fail("fresh TerrainSampler differs from original — generation is not pure of construction order.");
}

// Test 3 — cross-session stability vs. the pinned baseline.
const hash = fnv1a(beforeClear);
if (PINNED_HASH === "PENDING_FIRST_RUN") {
  console.log("No baseline pinned yet. Replace `PINNED_HASH` in this file with:");
  console.log(`    const PINNED_HASH = "${hash}";`);
  console.log("\nFirst reference sample for sanity:");
  const [fx, fz] = REFERENCE_COORDS[0];
  console.log(`  (${fx}, ${fz}) → ${dumpSample(sampler.sample(fx, fz))}`);
  process.exit(0);
}

if (hash !== PINNED_HASH) {
  console.error(`FAIL  world hash ${hash} ≠ pinned ${PINNED_HASH}`);
  console.error("       If this change was intentional, audit the diff against the");
  console.error("       sampler stages and update PINNED_HASH after review.");
  process.exit(1);
}

console.log(`OK  determinism check passed — hash ${hash}`);
console.log(`    20 reference points × cache clear × fresh instance × pinned baseline.`);
