// ── Becoming Many — Terrain Generation Worker ──────────────────
//
// Builds a chunk's vertex data off the main thread: for each grid vertex it
// samples the active provider's height (world coords), writes chunk-local
// position (lx, h, lz), and computes the surface normal from a height gradient
// (central differences). Pure CPU math — importing ../providers registers the
// built-in providers into this worker's bundle. Results are transferred back.
//
// No three imports here: the worker only produces typed arrays; the main thread
// wraps them in a BufferGeometry (terrain/chunk.ts).

import { getTerrainProvider } from "../providers";
import type { TerrainBuildResult, WorkerInbound } from "./protocol";

// `self` is the worker global; cast to `Worker` for postMessage (the
// DedicatedWorkerGlobalScope lib type isn't in this tsconfig's libs).
const post = (self as unknown as Worker).postMessage.bind(self);

self.onmessage = (event: MessageEvent<WorkerInbound>): void => {
	const msg = event.data;
	if (msg.type !== "build") return;

	try {
		const { providerId, cfg, gridX, gridZ, chunkSize, segments } = msg;
		const provider = getTerrainProvider(providerId);

		const seg1 = segments + 1;
		const count = seg1 * seg1;
		const positions = new Float32Array(count * 3);
		const normals = new Float32Array(count * 3);

		const centerX = gridX * chunkSize + chunkSize / 2;
		const centerZ = gridZ * chunkSize + chunkSize / 2;
		const e = chunkSize / segments; // finite-difference step (one cell)

		for (let iz = 0; iz < seg1; iz++) {
			for (let ix = 0; ix < seg1; ix++) {
				const i = iz * seg1 + ix;
				const lx = (ix / segments - 0.5) * chunkSize;
				const lz = (iz / segments - 0.5) * chunkSize;
				const wx = centerX + lx;
				const wz = centerZ + lz;

				const h = provider.height(wx, wz, cfg);
				positions[i * 3] = lx;
				positions[i * 3 + 1] = h;
				positions[i * 3 + 2] = lz;

				// normal = normalize(hL - hR, 2e, hD - hU)
				const hL = provider.height(wx - e, wz, cfg);
				const hR = provider.height(wx + e, wz, cfg);
				const hD = provider.height(wx, wz - e, cfg);
				const hU = provider.height(wx, wz + e, cfg);
				let nx = hL - hR;
				let ny = 2 * e;
				let nz = hD - hU;
				const len = Math.hypot(nx, ny, nz) || 1;
				nx /= len;
				ny /= len;
				nz /= len;
				normals[i * 3] = nx;
				normals[i * 3 + 1] = ny;
				normals[i * 3 + 2] = nz;
			}
		}

		const result: TerrainBuildResult = {
			type: "built",
			id: msg.id,
			gridX,
			gridZ,
			positions,
			normals,
		};
		post(result, [positions.buffer, normals.buffer]);
	} catch (err) {
		post({
			type: "error",
			id: msg.id,
			message: err instanceof Error ? err.message : String(err),
		});
	}
};
