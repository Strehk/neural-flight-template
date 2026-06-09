#!/usr/bin/env bun
/**
 * River-network invariant check.
 *
 * Locks the three guarantees the infinite river system depends on:
 *
 *   1. DOWNHILL (Rule 1): every segment's water surface falls from its
 *      upstream to its downstream end — water never flows visibly uphill.
 *
 *   2. DETERMINISM: two networks built with identical windows are
 *      byte-identical. The graph is a pure function of (seed, config,
 *      macroHeight), so a disposed region regenerates exactly.
 *
 *   3. BORDER SEAM (Rule 12): two networks built over DIFFERENT but
 *      overlapping windows agree on every shared segment's centreline and
 *      water elevation. This is what stops rivers breaking or jumping at
 *      region / chunk borders. (Discharge may differ slightly near a window
 *      edge — that only nudges width, not position or surface — so it is
 *      reported, not asserted.)
 *
 * Run with:   bun scripts/check-river-monotonic.ts
 */

import { NoiseStack } from "../src/lib/three/world/NoiseStack";
import { BAT_NOISE_DEFAULTS, BAT_MASTER_SEED } from "../src/lib/worldgen/noise-config";
import { TERRAIN_WORLD_DEFAULTS } from "../src/lib/worldgen/terrain/world-config";
import { RiverNetwork, type RiverSegment } from "../src/lib/worldgen/terrain/river/RiverNetwork";
import { BAT_RIVER_DEFAULTS } from "../src/lib/worldgen/terrain/river/river-config";

const noise = new NoiseStack(BAT_NOISE_DEFAULTS, BAT_MASTER_SEED);
const config = BAT_RIVER_DEFAULTS;
const biomeScale = TERRAIN_WORLD_DEFAULTS.biomeScale;
const mountainHeight = TERRAIN_WORLD_DEFAULTS.mountainHeight;
const seed = BAT_MASTER_SEED;

function build(minX: number, minZ: number, maxX: number, maxZ: number): RiverNetwork {
	return new RiverNetwork({ noise, config, biomeScale, mountainHeight, seed, minX, minZ, maxX, maxZ });
}

function fail(message: string): never {
	console.error(`FAIL  ${message}`);
	process.exit(1);
}

const R = config.regionSize;
const margin = config.regionMargin;

// Network over region (0,0) + margin.
const netA = build(-margin, -margin, R + margin, R + margin);

// ── 1. Downhill invariant ──────────────────────────────────────────────────
let worstUphill = 0;
for (const seg of netA.segments) {
	const drop = seg.aWater - seg.bWater;
	if (drop < worstUphill) worstUphill = drop;
}
if (worstUphill < -1e-6) {
	fail(`water flows uphill on some segment (worst rise = ${(-worstUphill).toFixed(4)} wu).`);
}

// ── 2. Determinism (identical window ⇒ identical graph) ─────────────────────
const netA2 = build(-margin, -margin, R + margin, R + margin);
if (netA.segments.length !== netA2.segments.length) {
	fail(`segment count differs across identical builds: ${netA.segments.length} vs ${netA2.segments.length}.`);
}
const round = (v: number) => Math.round(v * 1e6);
const segKey = (s: RiverSegment) =>
	`${round(s.ax)},${round(s.az)},${round(s.bx)},${round(s.bz)}`;
const segFull = (s: RiverSegment) =>
	`${segKey(s)}|${round(s.aWater)},${round(s.bWater)},${round(s.q)},${s.order},${s.isWaterfall}`;
for (let i = 0; i < netA.segments.length; i++) {
	if (segFull(netA.segments[i]) !== segFull(netA2.segments[i])) {
		fail(`segment ${i} differs across identical builds — graph is not pure.`);
	}
}

// ── 3. Border-seam consistency (different overlapping windows) ───────────────
// Network over the neighbouring region (1,0) + margin. Overlaps netA in x∈[0,2R].
const netB = build(R - margin, -margin, 2 * R + margin, R + margin);

const aByCentre = new Map<string, RiverSegment>();
for (const seg of netA.segments) aByCentre.set(segKey(seg), seg);

let shared = 0;
let worstQDelta = 0;
for (const seg of netB.segments) {
	const match = aByCentre.get(segKey(seg));
	if (!match) continue;
	shared++;
	if (round(match.aWater) !== round(seg.aWater) || round(match.bWater) !== round(seg.bWater)) {
		fail("shared segment has a different water surface across windows — borders would seam.");
	}
	worstQDelta = Math.max(worstQDelta, Math.abs(match.q - seg.q));
}
if (shared === 0) {
	fail("no shared segments between overlapping windows — seam test is vacuous (check window math).");
}

// ── Stats ───────────────────────────────────────────────────────────────────
const total = netA.segments.length;
const withWater = netA.segments.filter((s) => s.q >= config.waterMinQ).length;
const maxOrder = netA.segments.reduce((m, s) => Math.max(m, s.order), 0);
const waterfalls = netA.segments.filter((s) => s.isWaterfall).length;

console.log("OK  river invariants passed.");
console.log(`    region ${R}wu + margin ${margin}wu: ${total} segments, ${withWater} carry water, max Strahler order ${maxOrder}, ${waterfalls} waterfalls.`);
console.log(`    border seam: ${shared} shared segments, identical centreline + water surface (worst discharge delta ${worstQDelta.toFixed(3)}).`);
