/**
 * MothSwarm — sinneswandler's moth target swarm.
 *
 * Refactor step 9a: lifted out of `BatWorld` (updateMoths +
 * buildMothCandidate + buildEscortMothCandidate + sampleMothColor in
 * world.ts:689–960) into its own module. Owns the moth InstancedMesh,
 * the per-chunk natural-spawn loop, the player-relative escort
 * fallback, the catch-radius collection bookkeeping, and the active-
 * targets list the echo probe reads for bonus hits.
 *
 * Determinism: per-chunk natural spawns key off
 * `seededRandom2D(gridX * 73856093 + gridZ * 19349663 + 7919, …)`;
 * escort spawns key off a 48-unit player grid. Both streams produce
 * byte-identical positions across rebuilds, so disposing/regenerating
 * a chunk produces the same moths in the same places.
 */

import * as THREE from "three";
import { seededRandom2D } from "$lib/three/random";
import { saturate } from "$lib/three/world/math";
import { finalizeInstancedMesh } from "$lib/three/world/geometry-helpers";
import { BAT_MOTH_DEFAULTS, type BatBiomeId } from "./config";
import type { TerrainSampler } from "./terrain-sampler";

// ---------------------------------------------------------------------------
// Moth tint palette
// ---------------------------------------------------------------------------
// Same colour values as the module-level constants in legacy world.ts.

const MOTH_CORE_COLOR      = new THREE.Color("#ffb0b0");
const MOTH_FOREST_COLOR    = new THREE.Color("#ff4b57");
const MOTH_DESERT_COLOR    = new THREE.Color("#ff9f55");
const MOTH_GRASSLAND_COLOR = new THREE.Color("#ff5f4d");
const MOTH_BARRENS_COLOR   = new THREE.Color("#ff7a63");
const MOTH_MOUNTAIN_COLOR  = new THREE.Color("#ff6f7f");
const MOTH_SNOW_COLOR      = new THREE.Color("#ff9fb8");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Frame-by-frame summary returned to the caller. Matches `BatWorldFrameEvents`. */
export interface MothFrameEvents {
  collectedMoths: THREE.Vector3[];
  activeMoths: number;
  nearestMothDistance: number | null;
}

/** Echo probe reads this list for bonus hits. Same shape as `EchoMothTarget`. */
export interface ActiveMothTarget {
  position: THREE.Vector3;
  biome: BatBiomeId;
}

/** Per-candidate scratch state — not exported; used inside `update()`. */
interface MothRenderState {
  key: string;
  position: THREE.Vector3;
  distanceToPlayer: number;
  heading: number;
  bank: number;
  scale: number;
  biome: BatBiomeId;
  tint: number;
}

// ---------------------------------------------------------------------------
// Construction surface
// ---------------------------------------------------------------------------

export interface MothSwarmOptions {
  /** Active chunk size — needed by per-chunk seed derivation. */
  chunkSize: number;
  /** Cached terrain sampler — biome + height lookups for natural spawns. */
  terrainSampler: TerrainSampler;
  /** Geometry for the moth InstancedMesh (already barycentric-attributed). */
  geometry: THREE.BufferGeometry;
  /** Material for the moth InstancedMesh (e.g. the echo-reveal material). */
  material: THREE.Material;
}

// ---------------------------------------------------------------------------
// MothSwarm
// ---------------------------------------------------------------------------

export class MothSwarm {
  /** InstancedMesh that callers add to a scene; lives across the swarm's lifetime. */
  readonly mothMesh: THREE.InstancedMesh;

  /** Scratch — reused per moth so we don't allocate per frame. */
  private readonly mothDummy = new THREE.Object3D();
  /** Scratch colour reused inside `sampleMothColor` (the legacy `sampleColorB`). */
  private readonly sampleColorB = new THREE.Color();

  /** Per-instance state. */
  private readonly collectedMothKeys = new Set<string>();
  private collectedMothCount = 0;
  private activeMothTargets: ActiveMothTarget[] = [];
  private mothScaleFactor = 1;

  private readonly settings: { chunkSize: number };
  private readonly terrainSampler: TerrainSampler;

  constructor(opts: MothSwarmOptions) {
    this.settings = { chunkSize: opts.chunkSize };
    this.terrainSampler = opts.terrainSampler;

    this.mothMesh = new THREE.InstancedMesh(
      opts.geometry,
      opts.material,
      BAT_MOTH_DEFAULTS.maxActive,
    );
    this.mothMesh.userData.echoSurface = "moth";
    this.mothMesh.frustumCulled = false;
    this.mothMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    finalizeInstancedMesh(this.mothMesh, 0);
  }

  // -- public API ---------------------------------------------------------

  /** Visual scale multiplier (echo mode scales moths up for visibility). */
  setScale(factor: number): void {
    this.mothScaleFactor = factor;
  }

  /** Cumulative caught-moth count since construction. */
  get collected(): number {
    return this.collectedMothCount;
  }

  /** Snapshot of this frame's active moth targets (echo probe bonus list). */
  get activeTargets(): readonly ActiveMothTarget[] {
    return this.activeMothTargets;
  }

  update(playerPosition: THREE.Vector3, chunks: Iterable<{ gridX: number; gridZ: number }>): MothFrameEvents {
    const candidates: MothRenderState[] = [];
    const collectedMoths: THREE.Vector3[] = [];

    for (const chunk of chunks) {
      for (let i = 0; i < BAT_MOTH_DEFAULTS.spawnAttemptsPerChunk; i++) {
        const candidate = this.buildMothCandidate(
          chunk.gridX,
          chunk.gridZ,
          i,
          playerPosition,
        );
        if (candidate) {
          candidates.push(candidate);
        }
      }
    }

    const nearbyNaturalCount = candidates.filter(
      (candidate) =>
        candidate.distanceToPlayer <= BAT_MOTH_DEFAULTS.activeRadius,
    ).length;
    const naturalNearestDistance = candidates.reduce(
      (nearest, candidate) => Math.min(nearest, candidate.distanceToPlayer),
      Infinity,
    );
    if (
      nearbyNaturalCount < BAT_MOTH_DEFAULTS.escortCount ||
      naturalNearestDistance > BAT_MOTH_DEFAULTS.escortRadiusMax
    ) {
      for (let i = 0; i < BAT_MOTH_DEFAULTS.escortCount; i++) {
        const escort = this.buildEscortMothCandidate(playerPosition, i);
        if (escort) {
          candidates.push(escort);
        }
      }
    }

    candidates.sort((a, b) => a.distanceToPlayer - b.distanceToPlayer);
    const nearestMothDistance = candidates[0]?.distanceToPlayer ?? null;
    const activeCandidates =
      candidates.filter(
        (candidate) =>
          candidate.distanceToPlayer <= BAT_MOTH_DEFAULTS.activeRadius,
      ).length >= 8
        ? candidates.filter(
            (candidate) =>
              candidate.distanceToPlayer <= BAT_MOTH_DEFAULTS.activeRadius,
          )
        : candidates;

    let mothIndex = 0;
    this.activeMothTargets = [];

    for (const candidate of activeCandidates) {
      if (candidate.distanceToPlayer <= BAT_MOTH_DEFAULTS.catchRadius) {
        if (!this.collectedMothKeys.has(candidate.key)) {
          this.collectedMothKeys.add(candidate.key);
          this.collectedMothCount += 1;
          collectedMoths.push(candidate.position.clone());
        }
        continue;
      }

      if (mothIndex >= BAT_MOTH_DEFAULTS.maxActive) break;

      this.mothDummy.position.copy(candidate.position);
      this.mothDummy.rotation.set(0, candidate.heading, candidate.bank);
      this.mothDummy.scale.setScalar(candidate.scale * 0.64 * this.mothScaleFactor);
      this.mothDummy.updateMatrix();
      this.mothMesh.setMatrixAt(mothIndex, this.mothDummy.matrix);
      this.mothMesh.setColorAt(
        mothIndex,
        this.sampleMothColor(candidate.biome, candidate.tint),
      );
      this.activeMothTargets.push({
        position: candidate.position.clone(),
        biome: candidate.biome,
      });
      mothIndex += 1;
    }

    finalizeInstancedMesh(this.mothMesh, mothIndex);
    return {
      collectedMoths,
      activeMoths: mothIndex,
      nearestMothDistance,
    };
  }

  private buildMothCandidate(
    gridX: number,
    gridZ: number,
    index: number,
    playerPosition: THREE.Vector3,
  ): MothRenderState | null {
    const size = this.settings.chunkSize;
    const baseSeed = gridX * 73856093 + gridZ * 19349663 + 7919;
    const key = `${gridX},${gridZ}:moth:${index}`;
    if (this.collectedMothKeys.has(key)) return null;

    const lx = (seededRandom2D(baseSeed + index, 307) - 0.5) * size;
    const lz = (seededRandom2D(baseSeed + index, 313) - 0.5) * size;
    const wx = lx + gridX * size;
    const wz = lz + gridZ * size;
    const point = this.terrainSampler.sample(wx, wz);
    const spawnChance = saturate(
      point.forestWeight * 0.66 +
        point.desertWeight * 0.76 +
        point.grasslandWeight * 0.42 +
        point.treeCluster * 0.34 +
        point.grassCluster * 0.18 -
        point.mountainWeight * 0.38 -
        point.barrensWeight * 0.32 -
        point.cliffiness * 0.48,
    );
    if (seededRandom2D(baseSeed + index, 331) > spawnChance) {
      return null;
    }

    const orbitRadius =
      BAT_MOTH_DEFAULTS.orbitRadius *
      (0.54 +
        seededRandom2D(baseSeed + index, 347) * 0.78 +
        point.treeCluster * 0.14);
    const driftRadius =
      BAT_MOTH_DEFAULTS.driftRadius *
      (0.46 +
        seededRandom2D(baseSeed + index, 353) * 0.82 +
        point.desertWeight * 0.18);
    const hoverHeight = THREE.MathUtils.lerp(
      BAT_MOTH_DEFAULTS.minHoverHeight,
      BAT_MOTH_DEFAULTS.maxHoverHeight,
      saturate(
        0.18 +
          point.treeCluster * 0.32 +
          point.grassCluster * 0.18 +
          point.desertWeight * 0.2 +
          seededRandom2D(baseSeed + index, 367) * 0.24,
      ),
    );
    const phaseA = seededRandom2D(baseSeed + index, 373) * Math.PI * 2;
    const phaseB = seededRandom2D(baseSeed + index, 379) * Math.PI * 2;
    const phaseC = seededRandom2D(baseSeed + index, 383) * Math.PI * 2;
    const phaseD = seededRandom2D(baseSeed + index, 389) * Math.PI * 2;
    const orbitA = phaseA;
    const orbitB = phaseB;
    const flutter = phaseC;
    const x =
      wx +
      Math.sin(orbitA) * orbitRadius +
      Math.cos(orbitB * 1.26 + phaseD) * driftRadius;
    const z =
      wz +
      Math.cos(orbitA * 0.92 + phaseB) * orbitRadius * 0.84 +
      Math.sin(orbitB * 1.18 + phaseA) * driftRadius * 0.92;
    const groundHeight = this.terrainSampler.sampleHeight(x, z);
    const y =
      groundHeight +
      hoverHeight +
      Math.sin(orbitB * 0.74 + phaseD) * 0.28 +
      Math.sin(flutter) * 0.12;
    const distanceToPlayer = Math.hypot(
      x - playerPosition.x,
      y - playerPosition.y,
      z - playerPosition.z,
    );
    if (distanceToPlayer > BAT_MOTH_DEFAULTS.activeRadius * 1.65) {
      return null;
    }
    const proximityBoost = saturate(
      1 - distanceToPlayer / BAT_MOTH_DEFAULTS.activeRadius,
    );

    return {
      key,
      position: new THREE.Vector3(x, y, z),
      distanceToPlayer,
      heading: phaseA,
      bank: Math.sin(flutter * 0.52 + phaseA) * 0.05,
      scale:
        (0.34 +
          seededRandom2D(baseSeed + index, 397) * 0.14 +
          point.desertWeight * 0.04) *
        (0.92 + proximityBoost * 0.18),
      biome: point.dominantBiome,
      tint: seededRandom2D(baseSeed + index, 401),
    };
  }

  private buildEscortMothCandidate(
    playerPosition: THREE.Vector3,
    index: number,
  ): MothRenderState | null {
    const escortCellX = Math.floor(playerPosition.x / 48);
    const escortCellZ = Math.floor(playerPosition.z / 48);
    const baseSeed =
      escortCellX * 92821 + escortCellZ * 68917 + index * 1013 + 4177;
    const key = `escort:${escortCellX},${escortCellZ}:${index}`;
    if (this.collectedMothKeys.has(key)) return null;

    const radius = THREE.MathUtils.lerp(
      BAT_MOTH_DEFAULTS.escortRadiusMin,
      BAT_MOTH_DEFAULTS.escortRadiusMax,
      seededRandom2D(baseSeed, 421),
    );
    const phaseA = seededRandom2D(baseSeed, 431) * Math.PI * 2;
    const phaseB = seededRandom2D(baseSeed, 439) * Math.PI * 2;
    const escortOriginX = escortCellX * 48 + 24;
    const escortOriginZ = escortCellZ * 48 + 24;
    const angle = phaseA + index * 1.17;
    const wobble = phaseB;
    const x =
      escortOriginX +
      Math.cos(angle) * radius +
      Math.sin(wobble * 1.2) * (0.9 + index * 0.12);
    const z =
      escortOriginZ +
      Math.sin(angle) * radius * 0.86 +
      Math.cos(wobble) * (1 + index * 0.1);
    const point = this.terrainSampler.sample(x, z);
    const groundHeight = this.terrainSampler.sampleHeight(x, z);
    const hoverHeight = THREE.MathUtils.lerp(
      BAT_MOTH_DEFAULTS.minHoverHeight,
      BAT_MOTH_DEFAULTS.maxHoverHeight,
      0.32 + seededRandom2D(baseSeed, 457) * 0.32,
    );
    const y = groundHeight + hoverHeight + Math.sin(wobble * 2.2) * 0.18;
    const distanceToPlayer = Math.hypot(
      x - playerPosition.x,
      y - playerPosition.y,
      z - playerPosition.z,
    );
    const proximityBoost = saturate(
      1 - distanceToPlayer / BAT_MOTH_DEFAULTS.escortRadiusMax,
    );

    return {
      key,
      position: new THREE.Vector3(x, y, z),
      distanceToPlayer,
      heading: angle,
      bank: Math.sin(wobble * 0.7 + phaseA) * 0.06,
      scale:
        (0.36 +
          seededRandom2D(baseSeed, 467) * 0.16 +
          point.desertWeight * 0.04) *
        (0.94 + proximityBoost * 0.14),
      biome: point.dominantBiome,
      tint: seededRandom2D(baseSeed, 479),
    };
  }

  private sampleMothColor(biome: BatBiomeId, tint: number): THREE.Color {
    const biomeColor =
      biome === "forest"
        ? MOTH_FOREST_COLOR
        : biome === "desert"
          ? MOTH_DESERT_COLOR
          : biome === "grassland"
          ? MOTH_GRASSLAND_COLOR
          : biome === "barrens"
            ? MOTH_BARRENS_COLOR
            : biome === "snow"
              ? MOTH_SNOW_COLOR
              : MOTH_MOUNTAIN_COLOR;

    return this.sampleColorB
      .copy(biomeColor)
      .lerp(MOTH_CORE_COLOR, 0.4 + tint * 0.35);
  }

}
