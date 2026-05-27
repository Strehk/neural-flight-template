/**
 * Renderers — owns sinneswandler's shader materials + shared echo
 * uniforms, plus the per-frame `applyEnvironment` / `renderEcho`
 * plumbing. Lifted out of `BatWorld` (refactor step 9b).
 *
 * Today this is one cohesive class; step 10's Multi-Perception-
 * Rendering work splits it further into a `TerrainRenderer` /
 * `DecorationRenderer` / `EchoUniformRouter` triad and plugs the
 * material set into `MaterialOverrideRegistry`. For now the focus is
 * isolating the rendering surface so BatWorld can shrink to a facade.
 *
 * Material set: terrain, trunk, crown, rock, grass, moth (all echo-
 * reveal shaders), pond (basic transparent water).
 *
 * `applyEnvironment(env)` writes fog / visibility / reveal / wire-
 * thickness uniforms in one place. `renderEcho(pulses, elapsed)`
 * forwards pulse state via `syncEchoUniforms`.
 */

import * as THREE from "three";
import { BAT_FOG_DISTANCE, BAT_MOTH_DEFAULTS, BAT_SCENE } from "./config";
import {
  createInstancedRevealMaterial,
  createSharedEchoUniforms,
  createTerrainRevealMaterial,
  syncEchoUniforms,
  type EchoPulseRenderState,
  type SharedEchoUniforms,
} from "./shaders";

const WATER_COLOR = new THREE.Color("#4f8fa7");

/** Settings slice needed by `applyEnvironment`. Structural — `BatWorldSettings` fits. */
export interface RendererEnvironment {
  fogIntensity: number;
  baseVisibility: number;
  revealIntensity: number;
  wireThickness: number;
}

export class Renderers {
  readonly sharedUniforms: SharedEchoUniforms;

  /** Terrain mesh — heightmap with `color` + `dayColor` vertex attributes. */
  readonly terrainMaterial: THREE.ShaderMaterial;
  /** Tree trunks + forest props. */
  readonly trunkMaterial: THREE.ShaderMaterial;
  /** Tree crowns (pine / common / birch / willow / snow / palm). */
  readonly crownMaterial: THREE.ShaderMaterial;
  /** All three rock variants. */
  readonly rockMaterial: THREE.ShaderMaterial;
  /** Grass + bushes + flowers + cacti + snow plants. */
  readonly grassMaterial: THREE.ShaderMaterial;
  /** Moth swarm — extra trail/pulse boost. */
  readonly mothMaterial: THREE.ShaderMaterial;
  /** Pond surface — opaque water disc. */
  readonly pondMaterial: THREE.MeshBasicMaterial;

  constructor() {
    this.sharedUniforms = createSharedEchoUniforms();
    this.terrainMaterial = createTerrainRevealMaterial(this.sharedUniforms);

    this.trunkMaterial = createInstancedRevealMaterial(this.sharedUniforms, {
      tintColor: "#f4f0df",
      daylightTintColor: "#6b4a28", // brown wood
      fillStrength: 0.08,
      edgeStrength: 1.18,
      silhouetteStrength: 0.9,
      baseVisibilityBoost: 0.74,
    });
    this.crownMaterial = createInstancedRevealMaterial(this.sharedUniforms, {
      tintColor: "#effff8",
      daylightTintColor: "#2e6828", // forest green
      fillStrength: 0.1,
      edgeStrength: 1.55,
      silhouetteStrength: 1.05,
      baseVisibilityBoost: 0.56,
    });
    this.rockMaterial = createInstancedRevealMaterial(this.sharedUniforms, {
      tintColor: "#f0f7ff",
      daylightTintColor: "#808890", // gray rock
      fillStrength: 0.1,
      edgeStrength: 1.72,
      silhouetteStrength: 0.96,
      baseVisibilityBoost: 0.86,
    });
    this.grassMaterial = createInstancedRevealMaterial(this.sharedUniforms, {
      tintColor: "#efffd6",
      daylightTintColor: "#74c038", // light meadow green
      fillStrength: 0.06,
      edgeStrength: 1.04,
      silhouetteStrength: 0.46,
      baseVisibilityBoost: 0.3,
      doubleSided: true,
    });
    this.mothMaterial = createInstancedRevealMaterial(this.sharedUniforms, {
      tintColor: "#ff3649",
      daylightTintColor: "#ff3649", // keep red in both modes — moths must stand out
      fillStrength: 0,
      edgeStrength: 6.2,
      silhouetteStrength: 0,
      baseVisibilityBoost: 0,
      trailBoost: BAT_MOTH_DEFAULTS.echoTrailBoost,
      pulseBoost: BAT_MOTH_DEFAULTS.echoPulseBoost,
      doubleSided: true,
    });
    this.pondMaterial = new THREE.MeshBasicMaterial({
      color: WATER_COLOR,
      transparent: true,
      opacity: 0.76,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true,
    });
  }

  /**
   * Push fog distance + visibility uniforms from a settings slice.
   * Called whenever the user adjusts a steerable parameter that
   * affects the echo-reveal shaders.
   */
  applyEnvironment(env: RendererEnvironment): void {
    const far = THREE.MathUtils.lerp(
      BAT_FOG_DISTANCE.farMax,
      BAT_FOG_DISTANCE.farMin,
      env.fogIntensity,
    );
    this.sharedUniforms.uFogNear.value = BAT_FOG_DISTANCE.near;
    this.sharedUniforms.uFogFar.value = far;
    this.sharedUniforms.uFogColor.value.set(BAT_SCENE.fogColor);
    this.sharedUniforms.uBaseVisibility.value = env.baseVisibility;
    this.sharedUniforms.uRevealIntensity.value = env.revealIntensity;
    this.sharedUniforms.uWireThickness.value = env.wireThickness;
  }

  /** Forward echo-pulse render state to the shared uniforms. */
  renderEcho(pulses: EchoPulseRenderState[], elapsed: number): void {
    syncEchoUniforms(this.sharedUniforms, pulses, elapsed);
  }

  /** Dispose every owned material. Geometries are owned by the caller. */
  dispose(): void {
    this.terrainMaterial.dispose();
    this.trunkMaterial.dispose();
    this.crownMaterial.dispose();
    this.rockMaterial.dispose();
    this.grassMaterial.dispose();
    this.mothMaterial.dispose();
    this.pondMaterial.dispose();
  }
}
