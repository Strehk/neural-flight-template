/**
 * PerceptionRouter — host for Multi-Perception-Rendering plugins.
 *
 * Refactor step 10a primitive. The router holds a registry of
 * `Perception` instances (echolocation / daylight / chemosense / …),
 * activates one at a time, and cross-fades between two by ramping a
 * `weight` parameter perceptions can use to blend their own uniforms.
 *
 * Responsibilities:
 *   - **Registry**: register / unregister perceptions by id.
 *   - **Activation**: `activate(id, fadeMs?)` starts a transition.
 *   - **Update**: `update(delta, ctx)` advances any in-flight
 *     transition and fires `onTick(ctx, weight)` for the active
 *     (and incoming) perception(s).
 *   - **Camera layers**: pushes the active perception's `layerMask`
 *     onto a supplied camera (via `applyLayerMask`). During a fade
 *     the OUTGOING perception's mask is OR-ed in so both sets of
 *     objects keep rendering until the fade completes.
 *   - **Material overrides + post-fx**: delegates to the registry +
 *     stack supplied at construction; on activation it restores the
 *     outgoing perception's stash and applies the incoming one.
 *
 * The router does NOT subscribe to ChunkScheduler / MothSwarm events
 * itself — the host (e.g. BatWorld) wires those callbacks to
 * `applyOverridesToSubtree(subtree)` when new objects appear after
 * activation. Keeping the router agnostic to the world it serves is
 * what lets future experiences plug in.
 */

import type * as THREE from "three";
import type { Perception, PerceptionContext } from "./types";
import { applyLayerMask, BASE_MASK } from "./LayerMask";
import { MaterialOverrideRegistry } from "./MaterialOverrideRegistry";
import { PostProcessingStack } from "./PostProcessingStack";

/** Default cross-fade in milliseconds when `activate()` is called without one. */
const DEFAULT_FADE_MS = 600;

export interface PerceptionRouterOptions {
  /** Scene the router walks for material overrides + layer rendering. */
  scene: THREE.Scene;
  /** Camera that receives the perception's layer mask. */
  camera: THREE.Camera;
  /** Optional post-processing stack — required if any perception uses `postFx`. */
  postProcessing?: PostProcessingStack;
  /** Optional override registry; one is created if not supplied. */
  overrideRegistry?: MaterialOverrideRegistry;
}

interface Transition {
  from: Perception;
  to: Perception;
  /** Elapsed milliseconds since transition started. */
  elapsedMs: number;
  durationMs: number;
}

export class PerceptionRouter {
  readonly scene: THREE.Scene;
  readonly overrides: MaterialOverrideRegistry;
  readonly postProcessing: PostProcessingStack | null;

  private camera: THREE.Camera;
  private readonly perceptions = new Map<string, Perception>();

  private active: Perception | null = null;
  private transition: Transition | null = null;

  constructor(opts: PerceptionRouterOptions) {
    this.scene = opts.scene;
    this.camera = opts.camera;
    this.overrides = opts.overrideRegistry ?? new MaterialOverrideRegistry();
    this.postProcessing = opts.postProcessing ?? null;
  }

  // ---- registry ---------------------------------------------------------

  register(perception: Perception): void {
    if (this.perceptions.has(perception.id)) {
      throw new Error(
        `PerceptionRouter: perception id "${perception.id}" already registered.`,
      );
    }
    this.perceptions.set(perception.id, perception);
  }

  unregister(id: string): void {
    if (this.active?.id === id) this.active = null;
    this.perceptions.delete(id);
  }

  has(id: string): boolean {
    return this.perceptions.has(id);
  }

  list(): readonly Perception[] {
    return Array.from(this.perceptions.values());
  }

  // ---- camera -----------------------------------------------------------

  setCamera(camera: THREE.Camera): void {
    if (camera === this.camera) return;
    this.camera = camera;
    this.postProcessing?.setCamera(camera);
    this.applyCameraMask();
  }

  // ---- activation -------------------------------------------------------

  /** Current active perception (the one fully visible after the last fade). */
  current(): Perception | null {
    return this.active;
  }

  /** Active transition info (null when nothing is fading). */
  inTransition(): Readonly<Transition> | null {
    return this.transition;
  }

  /**
   * Switch to perception `id`, optionally fading from the currently-
   * active one over `fadeMs`. A `fadeMs` of 0 snaps instantly.
   *
   * Re-activating the same perception is a no-op unless a transition
   * is in flight (in which case it cancels the transition to the
   * targeted perception).
   */
  activate(id: string, ctx: PerceptionContext = {}, fadeMs = DEFAULT_FADE_MS): void {
    const target = this.perceptions.get(id);
    if (!target) {
      throw new Error(`PerceptionRouter: no perception registered for id "${id}".`);
    }
    if (this.active === target && !this.transition) return;

    // Restore the outgoing perception's overrides + tear down its post-fx
    // BEFORE applying the new ones, so material/post-fx state is clean.
    if (this.active?.overrides && this.active !== target) {
      this.overrides.restoreAll(this.scene);
    }

    if (fadeMs <= 0 || !this.active) {
      // Snap.
      this.active?.onDeactivate?.(ctx);
      this.active = target;
      this.transition = null;
      this.applyActivePerception(ctx);
      target.onActivate?.(ctx);
      return;
    }

    // Begin a cross-fade. `update()` advances elapsedMs until it
    // exceeds durationMs, at which point we commit to `target`.
    this.transition = {
      from: this.active,
      to: target,
      elapsedMs: 0,
      durationMs: fadeMs,
    };
    // Materials and post-fx snap to the incoming perception's set —
    // perception authors blend via per-frame uniform tweens.
    this.applyOverridesForPerception(target);
    this.postProcessing?.setRecipe(target.postFx ?? null);
    this.applyCameraMask();
    target.onActivate?.(ctx);
  }

  // ---- per-frame --------------------------------------------------------

  /**
   * Advance any in-flight transition and call `onTick(ctx, weight)`
   * for the active perception (and the outgoing one while it fades).
   */
  update(delta: number, ctx: PerceptionContext = {}): void {
    const dtMs = delta * 1000;

    if (this.transition) {
      this.transition.elapsedMs += dtMs;
      const t = Math.min(1, this.transition.elapsedMs / this.transition.durationMs);
      const fromWeight = 1 - t;
      const toWeight = t;

      this.transition.from.onTick?.(ctx, fromWeight);
      this.transition.to.onTick?.(ctx, toWeight);

      if (t >= 1) {
        this.transition.from.onDeactivate?.(ctx);
        this.active = this.transition.to;
        this.transition = null;
      }
      return;
    }

    if (this.active) {
      this.active.onTick?.(ctx, 1);
    }
  }

  /**
   * Apply the active perception's material overrides to a freshly-
   * added subtree. Wire this to `ChunkScheduler.onChunkBuilt` /
   * `MothSwarm.onSpawn` so late-added objects get the perception's
   * skin without restarting the whole walk.
   */
  applyOverridesToSubtree(subtree: THREE.Object3D): void {
    const perception = this.active ?? this.transition?.to;
    if (!perception?.overrides) return;
    this.overrides.applyToSubtree(subtree, perception.overrides);
  }

  // ---- private ----------------------------------------------------------

  private applyActivePerception(_ctx: PerceptionContext): void {
    if (!this.active) {
      this.overrides.restoreAll(this.scene);
      this.postProcessing?.setRecipe(null);
      applyLayerMask(this.camera, BASE_MASK);
      return;
    }
    this.applyOverridesForPerception(this.active);
    this.postProcessing?.setRecipe(this.active.postFx ?? null);
    this.applyCameraMask();
  }

  private applyOverridesForPerception(perception: Perception): void {
    if (!perception.overrides || perception.overrides.length === 0) {
      this.overrides.restoreAll(this.scene);
      return;
    }
    this.overrides.applyAll(this.scene, perception.overrides);
  }

  private applyCameraMask(): void {
    const incoming = this.transition?.to ?? this.active;
    if (!incoming) {
      applyLayerMask(this.camera, BASE_MASK);
      return;
    }
    // During a fade the outgoing perception keeps rendering — OR its
    // mask so both sets of objects stay visible until the fade completes.
    const outgoing = this.transition?.from;
    const mask = outgoing ? incoming.layerMask | outgoing.layerMask : incoming.layerMask;
    applyLayerMask(this.camera, mask);
  }
}
