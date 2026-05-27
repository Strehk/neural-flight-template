/**
 * TerrainMeshBuilder — pure function that builds one terrain chunk's
 * BufferGeometry. Lifted from `BatWorld.createTerrainGeometry`
 * (world.ts:946–1013) into the shared world layer so future
 * experiences can adopt the same plane-displacement pipeline.
 *
 * Refactor step 8a.
 *
 * The function is *generic over the terrain sample shape* — caller
 * supplies a `sample(x, z)` callback returning anything with a
 * `height` field, plus an `applyEchoColor` writer and optionally an
 * `applyDayColor` writer. Sinneswandler wires both via
 * `derived-field-sampler.ts`. Other experiences can plug in their own.
 *
 * Output attributes:
 *   - `position`     — displaced by `sample(x, z).height`
 *   - `color`        — echo-mode vertex colour (always present)
 *   - `dayColor`     — day-mode vertex colour (only if dayPalette set)
 *   - `barycentric`  — for the echo-reveal wire shader
 *   - normals computed
 */

import * as THREE from "three";
import { addBarycentricAttribute } from "./geometry-helpers";

export interface TerrainShader<TSample, TPalette> {
  /** Mutating colour blend — fills `outColor` from sample + palette. */
  apply: (outColor: THREE.Color, sample: TSample, palette: TPalette) => void;
  palette: TPalette;
}

export interface TerrainMeshBuilderOptions<TSample, TEchoPalette, TDayPalette> {
  /** Chunk side length in world units. */
  chunkSize: number;
  /** PlaneGeometry segments per side. */
  segments: number;
  /** Returns one terrain sample at world coords (x, z). Typically `sampler.sample`. */
  sample: (x: number, z: number) => TSample;
  /** Echo-mode colour writer + its palette. Always written to `color` attribute. */
  echo: TerrainShader<TSample, TEchoPalette>;
  /** Day-mode colour writer + its palette. If omitted, no `dayColor` attribute is added. */
  day?: TerrainShader<TSample, TDayPalette>;
}

/**
 * Build the terrain BufferGeometry for chunk cell (gridX, gridZ).
 * Caller is responsible for attaching the resulting mesh to a scene
 * and disposing the geometry on chunk unload.
 */
export function buildTerrainGeometry<
  TSample extends { height: number },
  TEchoPalette,
  TDayPalette,
>(
  gridX: number,
  gridZ: number,
  opts: TerrainMeshBuilderOptions<TSample, TEchoPalette, TDayPalette>,
): THREE.BufferGeometry {
  const { chunkSize, segments, sample, echo, day } = opts;

  const geometry = addBarycentricAttribute(
    new THREE.PlaneGeometry(chunkSize, chunkSize, segments, segments),
  );
  geometry.rotateX(-Math.PI / 2);

  const positions = geometry.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(positions.count * 3);
  const dayColors = day ? new Float32Array(positions.count * 3) : null;
  const tempEcho = new THREE.Color();
  const tempDay = new THREE.Color();

  for (let i = 0; i < positions.count; i++) {
    const wx = positions.getX(i) + gridX * chunkSize;
    const wz = positions.getZ(i) + gridZ * chunkSize;
    const point = sample(wx, wz);
    positions.setY(i, point.height);

    echo.apply(tempEcho, point, echo.palette);
    colors[i * 3] = tempEcho.r;
    colors[i * 3 + 1] = tempEcho.g;
    colors[i * 3 + 2] = tempEcho.b;

    if (dayColors && day) {
      day.apply(tempDay, point, day.palette);
      dayColors[i * 3] = tempDay.r;
      dayColors[i * 3 + 1] = tempDay.g;
      dayColors[i * 3 + 2] = tempDay.b;
    }
  }

  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  if (dayColors) {
    geometry.setAttribute("dayColor", new THREE.BufferAttribute(dayColors, 3));
  }
  geometry.computeVertexNormals();
  return geometry;
}
