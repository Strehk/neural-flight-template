/**
 * TerrainMeshBuilder — main-thread assembly of a chunk's terrain mesh.
 *
 * Two entry points:
 *   - `buildTerrainGeometry` (original sync path): samples on the main
 *     thread and assembles the geometry. Used when no worker pool is
 *     available.
 *   - `assembleTerrainGeometry`: wraps pre-computed Float32Arrays
 *     (heights + per-vertex colours) into a `THREE.BufferGeometry`.
 *     The worker pool feeds this directly.
 *
 * Pure data computation lives in `TerrainDataBuilder.ts`.
 */

import * as THREE from "three";
import { addBarycentricAttribute } from "./geometry-helpers";
import {
  computeTerrainData,
  computeTerrainPlaneLayout,
  type TerrainData,
  type TerrainPlaneLayout,
  type TerrainColorShader,
} from "./TerrainDataBuilder";

export type TerrainShader<TSample, TPalette> = TerrainColorShader<TSample, TPalette>;

export interface TerrainMeshBuilderOptions<TSample, TEchoPalette, TDayPalette> {
  chunkSize: number;
  segments: number;
  sample: (x: number, z: number) => TSample;
  echo: TerrainShader<TSample, TEchoPalette>;
  day: TerrainShader<TSample, TDayPalette>;
}

/**
 * Build a chunk's terrain BufferGeometry in one synchronous call.
 * Convenience wrapper for callers that don't use the worker pool.
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
  const layout = computeTerrainPlaneLayout(opts.chunkSize, opts.segments);
  const data = computeTerrainData<TSample, TEchoPalette, TDayPalette>(gridX, gridZ, {
    chunkSize: opts.chunkSize,
    layout,
    sample: opts.sample,
    echo: opts.echo,
    day: opts.day,
  });
  return assembleTerrainGeometry(opts.chunkSize, opts.segments, data);
}

/**
 * Wrap pre-computed terrain data (heights + per-vertex colour
 * Float32Arrays) into a `THREE.BufferGeometry`. The caller is
 * responsible for disposing the geometry.
 *
 * Output attributes:
 *   - `position`     — displaced by the height array
 *   - `color`        — echo-mode vertex colour
 *   - `dayColor`     — day-mode vertex colour
 *   - `barycentric`  — for the echo-reveal wire shader
 */
export function assembleTerrainGeometry(
  chunkSize: number,
  segments: number,
  data: TerrainData,
): THREE.BufferGeometry {
  const geometry = addBarycentricAttribute(
    new THREE.PlaneGeometry(chunkSize, chunkSize, segments, segments),
  );
  geometry.rotateX(-Math.PI / 2);

  const positions = geometry.attributes.position as THREE.BufferAttribute;
  const positionsArray = positions.array as Float32Array;
  const { heights, echoColors, dayColors } = data;

  if (positions.count !== heights.length) {
    throw new Error(
      `assembleTerrainGeometry: vertex count mismatch — geometry=${positions.count}, heights=${heights.length}`,
    );
  }

  for (let i = 0; i < heights.length; i++) {
    positionsArray[i * 3 + 1] = heights[i];
  }
  positions.needsUpdate = true;

  geometry.setAttribute("color", new THREE.BufferAttribute(echoColors, 3));
  geometry.setAttribute("dayColor", new THREE.BufferAttribute(dayColors, 3));
  geometry.computeVertexNormals();
  // Explicit: don't rely on THREE's lazy compute. We mutated positions
  // after the original geometry was constructed; if anything peeked at
  // boundingSphere before the height pass (e.g. an off-screen frustum
  // test) it would have locked in the flat-plane sphere and the mesh
  // would get culled even when on-screen.
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * Build the water-surface geometry for a chunk from the per-vertex
 * `waterHeights` + `waterMask`. Emits only the triangles whose three vertices
 * are all under water, so the surface stays inside the carved channel and
 * never overhangs the banks (Rule 15). Returns `null` for a dry chunk.
 *
 * The water surface Y is the smooth, gently-falling profile from the river
 * carve, so it reads as calm and level — it does not follow terrain bumps.
 */
export function assembleWaterGeometry(
  chunkSize: number,
  segments: number,
  data: TerrainData,
): THREE.BufferGeometry | null {
  const layout = computeTerrainPlaneLayout(chunkSize, segments);
  const { waterHeights, waterMask } = data;
  if (layout.count !== waterHeights.length || layout.count !== waterMask.length) {
    throw new Error(
      `assembleWaterGeometry: vertex count mismatch — layout=${layout.count}, water=${waterHeights.length}, mask=${waterMask.length}`,
    );
  }

  const positions: number[] = [];
  for (let i = 0; i < layout.count; i += 3) {
    if (waterMask[i] === 0 || waterMask[i + 1] === 0 || waterMask[i + 2] === 0) {
      continue;
    }
    for (let j = 0; j < 3; j++) {
      const index = i + j;
      positions.push(layout.localX[index], waterHeights[index] + 0.035, layout.localZ[index]);
    }
  }

  if (positions.length === 0) return null;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(positions), 3),
  );
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

