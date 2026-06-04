/**
 * PostProcessingStack — dynamic post-processing recipe wrapper for
 * Multi-Perception-Rendering (refactor step 10a).
 *
 * Each `Perception` may declare an optional `PostFXConfig` recipe.
 * When the router activates a perception, the stack tears down the
 * current `PostFXPipeline` and builds a fresh one with the new
 * recipe. The render loop calls `stack.render(delta)` each frame
 * instead of `renderer.render(scene, camera)` directly.
 *
 * A null recipe (perception has no `postFx`) falls through to the
 * default Three.js render path — `stack.render` just calls
 * `renderer.render(scene, camera)` directly.
 *
 * Cross-fade between two recipes is intentionally minimal in this
 * step: the stack snaps to the new pipeline on activation. A
 * future enhancement can blend two pipelines via a `MixPass` once
 * the user wants cinematic transitions.
 */

import type * as THREE from "three";
import {
  createPostFXPipeline,
  type PostFXConfig,
  type PostFXPipeline,
} from "$lib/three/postfx-pipeline";

export interface PostProcessingStackOptions {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.Camera;
}

export class PostProcessingStack {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private camera: THREE.Camera;

  /** Current pipeline (null when no perception contributes post-fx). */
  private pipeline: PostFXPipeline | null = null;
  /** Last recipe — reused to detect no-op activations. */
  private activeRecipe: PostFXConfig | null = null;

  constructor(opts: PostProcessingStackOptions) {
    this.renderer = opts.renderer;
    this.scene = opts.scene;
    this.camera = opts.camera;
  }

  /**
   * Swap to a new post-fx recipe. Passing `null` (or no `postFx` on the
   * perception) clears the stack so the renderer's default render path
   * runs.
   *
   * Cheap if the recipe is the same reference as the active one.
   */
  setRecipe(recipe: PostFXConfig | null): void {
    if (recipe === this.activeRecipe) return;
    this.disposePipeline();
    this.activeRecipe = recipe;
    if (recipe) {
      this.pipeline = createPostFXPipeline(
        this.renderer,
        this.scene,
        this.camera,
        recipe,
      );
    }
  }

  /**
   * Update the camera the pipeline renders through. Useful when the
   * host swaps between left/right XR cameras — in that case the
   * pipeline needs rebuilding (postprocessing's RenderPass binds to a
   * specific camera at construction).
   */
  setCamera(camera: THREE.Camera): void {
    if (camera === this.camera) return;
    this.camera = camera;
    if (this.activeRecipe) {
      this.disposePipeline();
      this.pipeline = createPostFXPipeline(
        this.renderer,
        this.scene,
        camera,
        this.activeRecipe,
      );
    }
  }

  /** Mirror the renderer's drawing-buffer size to the pipeline. */
  setSize(width: number, height: number): void {
    this.pipeline?.resize(width, height);
  }

  /**
   * Render this frame. If a pipeline is active, delegate to it;
   * otherwise fall through to the default renderer.render path.
   */
  render(delta: number): void {
    if (this.pipeline) {
      this.pipeline.render(delta);
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /** Dispose any active pipeline. Idempotent. */
  dispose(): void {
    this.disposePipeline();
    this.activeRecipe = null;
  }

  private disposePipeline(): void {
    this.pipeline?.dispose();
    this.pipeline = null;
  }
}
