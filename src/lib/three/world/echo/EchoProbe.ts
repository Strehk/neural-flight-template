/**
 * EchoProbe — the echolocation raycaster, lifted out of
 * `BatWorld.sampleEchoProfile` (world.ts:531–743) into the new shared
 * world layer.
 *
 * The probe casts a fan of rays around the player, classifies hits via
 * the `echoSurface` tag attached to scene objects, looks up acoustic
 * properties through a cached TerrainSampler, optionally folds in a
 * handful of moth bonus hits, and returns the same `EchoProbeProfile`
 * shape `audio.ts` already consumes.
 *
 * Construction is wired with three injected pieces:
 *   - `terrainSampler`  → cached acoustics + biome/height lookups
 *   - `target`           → THREE.Object3D the raycaster intersects
 *                          (today: BatWorld's chunk group)
 *   - `getMothTargets()` → callback that yields the moth bonus list
 *                          (today: `BatWorld.activeMothTargets`; in
 *                          step 9 it becomes `mothSwarm.activeTargets`).
 *
 * All formulas / thresholds / budgets are preserved byte-for-byte; only
 * the cache lookups for terrain sampling and the unified
 * `terrainSampler.acoustics(...)` call differ from the legacy body.
 *
 * Lives in `lib/three/world/echo/` rather than inside sinneswandler so
 * any future experience that wants sonar-style probing can adopt it.
 */

import * as THREE from "three";
import type { AcousticMaterial } from "$lib/experiences/sinneswandler_test1/world-config";
import type { TerrainSampler } from "$lib/experiences/sinneswandler_test1/terrain-sampler";
import type { EchoProbeConfig } from "$lib/experiences/sinneswandler_test1/world-config";
import type { BatBiomeId } from "$lib/experiences/sinneswandler_test1/config";
import { saturate } from "$lib/three/world/math";
import {
  readAcousticField,
  type AcousticField,
} from "$lib/three/world/AcousticFieldBaker";

/** Material tag attached to scene objects so the probe can classify a hit. */
export type EchoSurfaceType = AcousticMaterial;

/** One ray hit, ready for audio.ts to synthesise. */
export interface EchoProbeHit {
  point: THREE.Vector3;
  distance: number;
  delay: number;
  pan: number;
  elevation: number;
  material: EchoSurfaceType;
  biome: BatBiomeId;
  density: number;
  ruggedness: number;
  reflectivity: number;
}

/** Aggregated pulse summary returned to the caller. Shape unchanged. */
export interface EchoProbeProfile {
  hits: EchoProbeHit[];
  density: number;
  terrainVariance: number;
  nearWeight: number;
  midWeight: number;
  farWeight: number;
  terrainWeight: number;
  treeWeight: number;
  rockWeight: number;
  grassWeight: number;
  mothWeight: number;
}

/** Moth bonus-target shape — kept minimal so MothSwarm can adopt it later. */
export interface EchoMothTarget {
  position: THREE.Vector3;
  biome: BatBiomeId;
}

export interface EchoProbeOptions {
  /** Per-call config (elevation bands, azimuth steps, hit budgets, …). */
  config: EchoProbeConfig;
  /** Cached terrain sampler that supplies acoustics + biome / height. */
  terrainSampler: TerrainSampler;
  /** Scene object the raycaster intersects (typically the chunk group). */
  target: THREE.Object3D;
  /** Lazy provider for the moth bonus-hit list — called once per probe. */
  getMothTargets: () => readonly EchoMothTarget[];
  /** Raycaster `near` distance. Defaults to the legacy 0.6. */
  raycasterNear?: number;
  /**
   * Optional pre-baked acoustic field lookup (refactor step 11). When
   * provided, each hit asks the finder for the field covering
   * `(hit.x, hit.z)` and reads the nearest cell instead of running
   * the noise stack via the sampler. Falls back to the sampler if
   * the finder returns `null` (e.g. hit outside loaded chunks).
   */
  getAcousticField?: (x: number, z: number) => AcousticField | null;
}

/**
 * Reusable echo raycaster. Construct once and call `probe()` per pulse.
 * Internal scratch vectors are reused across calls — never allocate
 * per-hit beyond `THREE.Vector3.clone()` for the hit position (which is
 * what `audio.ts` expects).
 */
export class EchoProbe {
  readonly config: EchoProbeConfig;
  readonly target: THREE.Object3D;
  private readonly terrainSampler: TerrainSampler;
  private readonly getMothTargets: () => readonly EchoMothTarget[];
  private readonly getAcousticField:
    | ((x: number, z: number) => AcousticField | null)
    | null;

  /** Pre-built fan of unit direction vectors (5 bands × 18 azimuth = 90 by default). */
  private readonly directions: THREE.Vector3[];

  /** Scratch reused per ray / hit. */
  private readonly raycaster = new THREE.Raycaster();
  private readonly scratchDir = new THREE.Vector3();
  private readonly scratchLocal = new THREE.Vector3();
  private readonly orientationInverse = new THREE.Quaternion();

  constructor(opts: EchoProbeOptions) {
    this.config = opts.config;
    this.terrainSampler = opts.terrainSampler;
    this.target = opts.target;
    this.getMothTargets = opts.getMothTargets;
    this.getAcousticField = opts.getAcousticField ?? null;
    this.directions = buildDirectionFan(opts.config);
    this.raycaster.near = opts.raycasterNear ?? 0.6;
  }

  /**
   * Resolve a hit's TerrainSample via the pre-baked acoustic field
   * (when available) or the cached sampler (fallback). Step 11's
   * perf win: field hits skip the LRU + the noise stack entirely.
   */
  private sampleAt(x: number, z: number) {
    if (this.getAcousticField) {
      const field = this.getAcousticField(x, z);
      if (field) {
        const cell = readAcousticField(field, x, z);
        if (cell) return cell;
      }
    }
    return this.terrainSampler.sample(x, z);
  }

  /**
   * Cast the fan, gather hits + moth bonuses, aggregate. Returns the
   * same `EchoProbeProfile` shape `audio.ts` consumes.
   */
  probe(
    origin: THREE.Vector3,
    orientation: THREE.Quaternion,
    range: number,
    speed: number,
  ): EchoProbeProfile {
    const hits: EchoProbeHit[] = [];
    const config = this.config;
    const mainBudget = config.maxHits - config.mothBudget;

    let densitySum = 0;
    let terrainVarianceSum = 0;
    let nearWeight = 0;
    let midWeight = 0;
    let farWeight = 0;
    let terrainWeight = 0;
    let treeWeight = 0;
    let rockWeight = 0;
    let grassWeight = 0;
    let mothWeight = 0;

    this.orientationInverse.copy(orientation).invert();
    this.raycaster.far = range;

    rayLoop: for (const direction of this.directions) {
      this.scratchDir.copy(direction).applyQuaternion(orientation).normalize();
      this.raycaster.set(origin, this.scratchDir);

      const intersections = this.raycaster.intersectObject(this.target, true);
      let accepted = 0;
      let lastDistance = -Infinity;
      let lastMaterial: EchoSurfaceType | null = null;

      for (const intersection of intersections) {
        const material = readEchoSurface(intersection.object);
        if (!material || intersection.distance <= config.minHitDistance) continue;
        if (
          accepted > 0 &&
          material === lastMaterial &&
          intersection.distance - lastDistance < config.materialDedupeDistance
        ) {
          continue;
        }

        // Pre-baked field if available, cached sampler otherwise (step 11).
        const pointData = this.sampleAt(
          intersection.point.x,
          intersection.point.z,
        );
        const acoustics = this.terrainSampler.acoustics(
          pointData,
          material,
          origin,
          intersection.point,
          range,
        );
        const density =
          material === "moth"
            ? saturate(acoustics.density * 0.72 + 0.28)
            : acoustics.density;
        const ruggedness = acoustics.ruggedness;
        const reflectivity = acoustics.reflectivity;
        const distanceNorm = saturate(intersection.distance / Math.max(range, 1));

        this.scratchLocal
          .copy(intersection.point)
          .sub(origin)
          .normalize()
          .applyQuaternion(this.orientationInverse);

        hits.push({
          point: intersection.point.clone(),
          distance: intersection.distance,
          delay: intersection.distance / Math.max(speed, 1),
          pan: THREE.MathUtils.clamp(this.scratchLocal.x, -1, 1),
          elevation: THREE.MathUtils.clamp(this.scratchLocal.y, -1, 1),
          material,
          biome: pointData.dominantBiome,
          density,
          ruggedness,
          reflectivity,
        });

        densitySum += density;
        terrainVarianceSum += ruggedness;
        nearWeight += Math.pow(1 - distanceNorm, 2.1);
        midWeight += 1 - Math.abs(distanceNorm * 2 - 1);
        farWeight += Math.pow(distanceNorm, 1.25);

        switch (material) {
          case "terrain": terrainWeight += reflectivity; break;
          case "tree":    treeWeight    += reflectivity; break;
          case "rock":    rockWeight    += reflectivity; break;
          case "grass":   grassWeight   += reflectivity; break;
          case "moth":    mothWeight    += reflectivity; break;
        }

        accepted += 1;
        lastDistance = intersection.distance;
        lastMaterial = material;
        if (accepted >= config.hitsPerRay || hits.length >= mainBudget) {
          break;
        }
      }

      if (hits.length >= mainBudget) break rayLoop;
    }

    // ---- Moth bonus hits (up to mothBudget extra entries) -----------------
    const availableMothSlots = Math.max(
      0,
      Math.min(config.mothBudget, config.maxHits - hits.length),
    );
    if (availableMothSlots > 0) {
      const candidates = this.getMothTargets()
        .filter((t) => t.position.distanceToSquared(origin) <= range * range)
        .sort(
          (a, b) =>
            a.position.distanceToSquared(origin) -
            b.position.distanceToSquared(origin),
        )
        .slice(0, Math.min(availableMothSlots, 10));

      for (const moth of candidates) {
        const tooClose = hits.some(
          (hit) =>
            hit.material === "moth" &&
            hit.point.distanceToSquared(moth.position) < 6,
        );
        if (tooClose) continue;

        const pointData = this.sampleAt(moth.position.x, moth.position.z);
        const distance = moth.position.distanceTo(origin);
        const acoustics = this.terrainSampler.acoustics(
          pointData,
          "moth",
          origin,
          moth.position,
          range,
        );
        const density = saturate(acoustics.density * 0.72 + 0.28);
        const ruggedness = acoustics.ruggedness;
        const reflectivity = acoustics.reflectivity;
        const distanceNorm = saturate(distance / Math.max(range, 1));

        this.scratchLocal
          .copy(moth.position)
          .sub(origin)
          .normalize()
          .applyQuaternion(this.orientationInverse);

        hits.push({
          point: moth.position.clone(),
          distance,
          delay: distance / Math.max(speed, 1),
          pan: THREE.MathUtils.clamp(this.scratchLocal.x, -1, 1),
          elevation: THREE.MathUtils.clamp(this.scratchLocal.y, -1, 1),
          material: "moth",
          biome: moth.biome,
          density,
          ruggedness,
          reflectivity,
        });

        densitySum += density;
        terrainVarianceSum += ruggedness;
        nearWeight += Math.pow(1 - distanceNorm, 2.1);
        midWeight += 1 - Math.abs(distanceNorm * 2 - 1);
        farWeight += Math.pow(distanceNorm, 1.25);
        mothWeight += reflectivity;
      }
    }

    const count = Math.max(hits.length, 1);
    return {
      hits,
      density: densitySum / count,
      terrainVariance: terrainVarianceSum / count,
      nearWeight: nearWeight / count,
      midWeight: midWeight / count,
      farWeight: farWeight / count,
      terrainWeight: terrainWeight / count,
      treeWeight: treeWeight / count,
      rockWeight: rockWeight / count,
      grassWeight: grassWeight / count,
      mothWeight: mothWeight / count,
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Read the `echoSurface` tag from an object's userData. Mirrors the
 * legacy `BatWorld.getEchoSurface` (world.ts:2261–2273). Unknown /
 * missing tags return `null` so the probe skips them.
 */
export function readEchoSurface(object: THREE.Object3D): EchoSurfaceType | null {
  const surface = (object.userData as { echoSurface?: unknown }).echoSurface;
  switch (surface) {
    case "terrain":
    case "tree":
    case "rock":
    case "grass":
    case "moth":
      return surface;
    default:
      return null;
  }
}

/**
 * Build the (elevation × azimuth) fan of unit direction vectors. One
 * allocation per construction, reused for every probe call.
 */
function buildDirectionFan(config: EchoProbeConfig): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  for (const elevation of config.elevationBands) {
    const cosE = Math.cos(elevation);
    const sinE = Math.sin(elevation);
    for (let i = 0; i < config.azimuthSteps; i++) {
      const azimuth = (i / config.azimuthSteps) * Math.PI * 2;
      out.push(
        new THREE.Vector3(
          Math.cos(azimuth) * cosE,
          sinE,
          Math.sin(azimuth) * cosE,
        ).normalize(),
      );
    }
  }
  return out;
}
