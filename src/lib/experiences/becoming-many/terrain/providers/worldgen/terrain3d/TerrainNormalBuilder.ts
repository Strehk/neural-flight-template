/**
 * Per-vertex normals for a chunk terrain grid.
 *
 * Normals are computed analytically from an EXTENDED height grid that carries a
 * one-vertex apron of real neighbour heights on every side. Because those apron
 * heights are evaluated at the true world positions just outside the chunk — the
 * same positions the adjacent chunk evaluates as its own interior — the resulting
 * edge normals match across chunk borders exactly. No lighting seams.
 */

/**
 * @param extY   (res+3)² extended height grid (world Y). ext index
 *               (ej*(res+3)+ei), where ei/ej ∈ [0,res+2] map to vertex i/j = ei-1.
 * @param res    grid segments per chunk edge (verts per edge = res+1).
 * @param step   world-units between adjacent vertices.
 * @returns      Float32Array of (res+1)² × 3 normals, row-major by vertex (i,j).
 */
export function computeGridNormals(extY: Float32Array, res: number, step: number): Float32Array {
  const vpe = res + 1; // verts per edge
  const ew = res + 3; // extended width
  const out = new Float32Array(vpe * vpe * 3);
  const inv2 = 1 / (2 * step);
  for (let j = 0; j <= res; j++) {
    const ej = j + 1;
    for (let i = 0; i <= res; i++) {
      const ei = i + 1;
      const yL = extY[ej * ew + (ei - 1)];
      const yR = extY[ej * ew + (ei + 1)];
      const yD = extY[(ej - 1) * ew + ei];
      const yU = extY[(ej + 1) * ew + ei];
      // Gradient of the height field; normal = normalize(-dY/dx, 1, -dY/dz).
      const gx = (yR - yL) * inv2;
      const gz = (yU - yD) * inv2;
      let nx = -gx;
      const ny = 1;
      let nz = -gz;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      nx /= len;
      nz /= len;
      const o = (j * vpe + i) * 3;
      out[o] = nx;
      out[o + 1] = ny / len;
      out[o + 2] = nz;
    }
  }
  return out;
}
