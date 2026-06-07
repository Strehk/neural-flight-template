#!/usr/bin/env bun
/**
 * Streaming hysteresis regression check.
 *
 * Step 7 of the world refactor introduced anchor + dual-radius streaming
 * (buildRadius + keepRadius). The promise: once the world is loaded,
 * a player oscillating back and forth across a chunk boundary should
 * trigger **zero** rebuilds — the keep-set ring covers both anchor
 * positions, so chunks are never disposed only to be re-created.
 *
 * This script:
 *   1. Builds a ChunkScheduler with a no-op chunk factory.
 *   2. Plants the player at the origin and ticks until the build set
 *      is fully realised.
 *   3. Moves the player one chunk along +X and ticks again until
 *      stable. (Anchor advances; new ring is built.)
 *   4. Resets the lifetime counters.
 *   5. Oscillates the player back and forth across that boundary
 *      `OSCILLATIONS` times, ticking once per side.
 *   6. Asserts `totalBuilt == 0 && totalDisposed == 0`.
 *
 * Failing the assertion means the hysteresis ring is too narrow (or
 * absent) for the current build / keep config — a regression in either
 * the StreamingConfig defaults or the scheduler logic.
 *
 * Run with:  bun scripts/check-streaming-hysteresis.ts
 */

import { ChunkScheduler, type ChunkLike } from "../src/lib/three/world/ChunkScheduler";
import { BAT_STREAMING_DEFAULTS } from "../src/lib/worldgen/noise-config";

const OSCILLATIONS = 20;

class FakeChunk implements ChunkLike {
  readonly gridX: number;
  readonly gridZ: number;
  constructor(gridX: number, gridZ: number) {
    this.gridX = gridX;
    this.gridZ = gridZ;
  }
  dispose(): void {
    // no resources
  }
}

function fail(msg: string): never {
  console.error(`FAIL  ${msg}`);
  process.exit(1);
}

const scheduler = new ChunkScheduler<FakeChunk>({
  config: BAT_STREAMING_DEFAULTS,
  buildChunk: (gx, gz) => new FakeChunk(gx, gz),
});

/** Tick until no chunks are pending. Caps at 100 iterations to avoid infinite loops. */
function tickToStable(x: number, z: number): void {
  for (let i = 0; i < 100; i++) {
    const stats = scheduler.update(x, z);
    if (stats.pending === 0 && stats.built === 0) return;
  }
  fail(`tickToStable(${x}, ${z}) never settled`);
}

const cs = BAT_STREAMING_DEFAULTS.chunkSize;

// --- Phase 1: initial fill at origin ---------------------------------------
tickToStable(cs * 0.5, 0); // player in the middle of cell (0,0)

// --- Phase 2: advance anchor by one cell along +X --------------------------
tickToStable(cs * 1.5, 0); // player in cell (1,0)

// --- Phase 3: lock counters, oscillate -------------------------------------
scheduler.resetCounters();

// Pick two points each well inside a different cell but adjacent to the
// boundary. With anchorStepCells = 1 (default), the anchor toggles
// between (0,0) and (1,0) on every crossing.
const positionA = cs * 0.5 + 1; // inside cell (0,0), 1 unit from the boundary
const positionB = cs * 1.5 - 1; // inside cell (1,0), 1 unit from the boundary

for (let i = 0; i < OSCILLATIONS; i++) {
  scheduler.update(positionA, 0);
  scheduler.update(positionB, 0);
}

if (scheduler.totalBuilt !== 0 || scheduler.totalDisposed !== 0) {
  fail(
    `hysteresis ring leaked: after ${OSCILLATIONS} oscillations ` +
      `built=${scheduler.totalBuilt}, disposed=${scheduler.totalDisposed}; expected 0/0. ` +
      `Check StreamingConfig.keepRadius (${BAT_STREAMING_DEFAULTS.keepRadius}) vs. buildRadius (${BAT_STREAMING_DEFAULTS.buildRadius}).`,
  );
}

const anchor = scheduler.getAnchor();
console.log(`OK  hysteresis check passed — ${OSCILLATIONS} oscillations, 0 builds, 0 disposes.`);
console.log(`    final anchor=(${anchor?.x}, ${anchor?.z}), active=${scheduler.size} chunks.`);
