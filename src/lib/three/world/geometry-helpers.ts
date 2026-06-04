/**
 * Small geometry helpers used by world-gen consumers. Lifted from
 * sinneswandler's `world.ts` so anything in `lib/three/world/` (and
 * future experiences) can reach for them without depending on the
 * sinneswandler module graph.
 */

import * as THREE from "three";

/**
 * Convert a geometry to non-indexed form and add a `barycentric`
 * attribute (`[1,0,0]`, `[0,1,0]`, `[0,0,1]` per triangle corner).
 * Used by the echo-reveal shader's wire-frame edge detection.
 *
 * Returns a NEW geometry; the input is left untouched.
 *
 * Pre-refactor location: `addBarycentricAttribute` in world.ts.
 */
export function addBarycentricAttribute(
  geometry: THREE.BufferGeometry,
): THREE.BufferGeometry {
  const base = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  const count = base.attributes.position.count;
  const barycentric = new Float32Array(count * 3);

  for (let i = 0; i < count; i += 3) {
    barycentric.set([1, 0, 0], i * 3);
    barycentric.set([0, 1, 0], (i + 1) * 3);
    barycentric.set([0, 0, 1], (i + 2) * 3);
  }

  base.setAttribute("barycentric", new THREE.BufferAttribute(barycentric, 3));
  return base;
}

/**
 * Fallback colour used by `finalizeInstancedMesh` when a placement
 * loop never called `setColorAt`. Matches the legacy
 * `DEFAULT_INSTANCE_COLOR = #ffffff` in world.ts.
 */
const FALLBACK_INSTANCE_COLOR = new THREE.Color(1, 1, 1);

/**
 * Finalise an InstancedMesh after a placement loop has written
 * `count` matrices (and possibly colours) into it. Sets `mesh.count`,
 * flags the matrix attribute dirty, flags the colour attribute dirty
 * if present, ensures at least one colour entry exists so WebGL
 * doesn't complain, and recomputes the bounding sphere for culling.
 *
 * Pre-refactor location: `BatWorld.finalizeInstancedMesh`
 * (world.ts:1978–1991). Lifted so DecorationPlacer + MothSwarm
 * can share one implementation.
 */
export function finalizeInstancedMesh(
  mesh: THREE.InstancedMesh,
  count: number,
): void {
  if (!mesh.instanceColor) {
    mesh.setColorAt(0, FALLBACK_INSTANCE_COLOR);
  }
  mesh.count = count;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }
  mesh.computeBoundingSphere();
}
