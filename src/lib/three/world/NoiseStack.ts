/**
 * NoiseStack — reusable bank of seeded 2D noise generators driven by a
 * `NoiseStackConfig`. Replaces the 14 hand-rolled `makeNoise(...)` instance
 * fields in sinneswandler's BatWorld (world.ts:337–350) and centralises the
 * FBM / ridge / remap sample logic that was scattered across
 * `sampleTerrainPoint` (world.ts:2401–2681).
 *
 * Determinism: each seeded layer gets its noise from either
 * `layer.seed` (legacy migration override) or `streamSeed(masterSeed,
 * layer.name)`. Layers that set `sourceLayer` reuse the same underlying
 * Simplex instance — useful when one set of seed values feeds multiple
 * sample recipes (continent / rolling, treeCluster / clearing).
 *
 * The class lives in `lib/three/world/` so any future experience can adopt
 * the same noise bank without depending on sinneswandler.
 */

import { createNoise2D } from "simplex-noise";
import { seededRandom } from "$lib/three/random";
import {
  streamSeed,
  type NoiseLayerConfig,
  type NoiseStackConfig,
} from "$lib/worldgen/noise-config";

export type Noise2DFn = (x: number, z: number) => number;

/**
 * Build a deterministic noise generator from an integer seed. Mirrors the
 * `makeNoise` helper formerly defined inside `world.ts` so the produced
 * Simplex instance is bit-identical to the pre-refactor world.
 */
function makeNoise(seed: number): Noise2DFn {
  let offset = 0;
  return createNoise2D(() => seededRandom(seed + offset++ * 17));
}

export class NoiseStack {
  readonly config: NoiseStackConfig;
  readonly masterSeed: number;

  /** One Simplex instance per *seeded* layer (sourceLayer entries reuse these). */
  private readonly noises = new Map<string, Noise2DFn>();

  constructor(config: NoiseStackConfig, masterSeed: number) {
    this.config = config;
    this.masterSeed = masterSeed;

    // First pass: allocate noise instances for every layer without a sourceLayer.
    for (const layer of Object.values(config.layers)) {
      if (layer.sourceLayer) continue;
      const seed = layer.seed ?? streamSeed(masterSeed, layer.name);
      this.noises.set(layer.name, makeNoise(seed));
    }

    // Second pass: validate sourceLayer references.
    for (const layer of Object.values(config.layers)) {
      if (layer.sourceLayer && !this.noises.has(layer.sourceLayer)) {
        throw new Error(
          `NoiseStack: layer "${layer.name}" references unknown sourceLayer "${layer.sourceLayer}".`,
        );
      }
    }
  }

  /** Coordinate-warp amplitude from the config. */
  get warpAmount(): number {
    return this.config.warpAmount;
  }

  /** Look up a layer recipe by name. Throws on missing key — recipes should never silently default. */
  layer(name: string): NoiseLayerConfig {
    const layer = this.config.layers[name];
    if (!layer) {
      throw new Error(`NoiseStack: no layer named "${name}".`);
    }
    return layer;
  }

  /**
   * Return the raw `(x, z) => number` Simplex function for a layer (following
   * any `sourceLayer` alias). Use this when the caller wants to drive FBM /
   * ridge / etc. itself — e.g. the legacy `sampleTerrainPoint` code path
   * that still uses the module-level `fbm()` helper in world.ts.
   */
  getNoise(name: string): Noise2DFn {
    const layer = this.layer(name);
    const seededName = layer.sourceLayer ?? layer.name;
    const noise = this.noises.get(seededName);
    if (!noise) {
      throw new Error(`NoiseStack: missing noise instance for "${seededName}".`);
    }
    return noise;
  }

  /**
   * Full recipe evaluation: applies scaling (relative to `biomeScale` unless
   * `absolute`), phase offset, FBM accumulation, optional ridge transform,
   * optional [0,1] remap, and optional power exponent.
   *
   * Use this when the caller wants the layer's *output*. Existing call sites
   * that still hand-roll the FBM call should switch to this in step 3.
   */
  sample(name: string, x: number, z: number, biomeScale: number): number {
    const layer = this.layer(name);
    const noise = this.getNoise(name);

    const scale = layer.absolute ? layer.scale : layer.scale * biomeScale;
    const wx = x * scale + (layer.phaseX ?? 0);
    const wz = z * scale + (layer.phaseZ ?? 0);

    let value: number;
    if (layer.octaves <= 1) {
      value = noise(wx, wz);
    } else {
      value = fbm(noise, wx, wz, layer.octaves, layer.lacunarity, layer.gain);
    }

    if (layer.ridge) value = 1 - Math.abs(value);
    if (!layer.signed) value = value * 0.5 + 0.5;
    if (layer.exponent !== undefined) value = Math.pow(value, layer.exponent);
    return value;
  }
}

/**
 * Standalone FBM helper — kept as a free function so step 2 callers can keep
 * the inline FBM expressions in `sampleTerrainPoint` working unchanged while
 * the recipe-driven `NoiseStack.sample()` is introduced in step 3.
 */
export function fbm(
  noise: Noise2DFn,
  x: number,
  z: number,
  octaves: number,
  lacunarity: number,
  gain: number,
): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let totalAmplitude = 0;

  for (let i = 0; i < octaves; i++) {
    value += noise(x * frequency, z * frequency) * amplitude;
    totalAmplitude += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }

  return totalAmplitude > 0 ? value / totalAmplitude : 0;
}

/** Ridge transform — kept here so callers don't reach into world.ts internals. */
export function ridge(value: number): number {
  return 1 - Math.abs(value);
}

/** [-1,1] → [0,1] remap, matching `remapNoise` in the legacy world. */
export function remapNoise(value: number): number {
  return value * 0.5 + 0.5;
}
