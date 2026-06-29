// ── Becoming Many — WorldGen Worker ────────────────────────────
//
// Runs the WHOLE WolrdGen3 pipeline on the CPU, off the main thread: per-region
// WFC + hydrology (cached in a long-lived RegionManager) → per-chunk field/
// drainage/biome maps → a detail layer baked into per-vertex arrays. A SINGLE
// dedicated worker (not a pool) so the region LRU cache stays warm — a pool would
// regenerate each region per worker.
//
// Builds are serialized through a promise chain so the shared RegionManager /
// detail generator never see interleaved config. The config travels on each build
// request; when its signature changes we clear the region cache (= a live seed /
// amplitude / frequency switch). Imports NOTHING from three — the main thread
// wraps the returned arrays in a BufferGeometry.

import type { TerrainConfig } from "../provider";
import { configToParams } from "../providers/worldgen/gen-params";
import type { GenParams } from "../providers/worldgen/generation/mapTypes";
import { WorldMapGenerator } from "../providers/worldgen/generation/WorldMapGenerator";
import { TerrainDetailGenerator } from "../providers/worldgen/terrain3d/TerrainDetailGenerator";
import { buildChunkArrays } from "../providers/worldgen/terrain3d/mesh";
import { TerrainSampler } from "../providers/worldgen/terrain3d/TerrainSampler";
import { buildWaterArrays } from "../providers/worldgen/water/water-mesh";
import type {
	WorldgenBuildRequest,
	WorldgenBuildResult,
	WorldgenInbound,
} from "./worldgen-protocol";

const post = (self as unknown as Worker).postMessage.bind(self);

const gen = new WorldMapGenerator();
const INITIAL_CFG: TerrainConfig = { seed: 1337, amplitude: 1, frequency: 1, octaves: 4 };
let params: GenParams = configToParams(INITIAL_CFG);
let detail = new TerrainDetailGenerator(params);
let sig = JSON.stringify({ cfg: INITIAL_CFG, params: undefined });

/** Apply a (possibly new) config + GUI param overlay, clearing the region cache
 *  only when something changed. The overlay wins over configToParams. */
function ensureConfig(cfg: TerrainConfig, override?: Record<string, number>): void {
	const next = JSON.stringify({ cfg, params: override });
	if (next === sig) return;
	sig = next;
	params = { ...configToParams(cfg), ...(override ?? {}) } as GenParams;
	detail = new TerrainDetailGenerator(params);
	gen.clearCaches();
}

async function build(msg: WorldgenBuildRequest): Promise<void> {
	try {
		ensureConfig(msg.cfg, msg.params);
		const chunk = await gen.generateChunk(msg.gridX, msg.gridZ, params);
		const sampler = new TerrainSampler(chunk);
		const { positions, normals, biome, heightGrid } = buildChunkArrays(
			sampler,
			detail,
			msg.segments,
		);
		const water = buildWaterArrays(sampler, detail, params, msg.segments);
		const result: WorldgenBuildResult = {
			type: "built",
			id: msg.id,
			gridX: msg.gridX,
			gridZ: msg.gridZ,
			positions,
			normals,
			biome,
			heightGrid,
			waterPositions: water?.positions,
			waterColors: water?.colors,
		};
		const transfer: Transferable[] = [
			positions.buffer,
			normals.buffer,
			biome.buffer,
			heightGrid.buffer,
		];
		if (water) transfer.push(water.positions.buffer, water.colors.buffer);
		post(result, transfer);
	} catch (err) {
		post({
			type: "error",
			id: msg.id,
			message: err instanceof Error ? err.message : String(err),
		});
	}
}

// Surface anything the per-build try/catch misses (module-level throws, rejected
// microtasks) — otherwise the worker would go silent and the world couldn't rebuild.
self.addEventListener("error", (e) => console.error("[worldgen worker] error:", e.message));
self.addEventListener("unhandledrejection", (e) =>
	console.error("[worldgen worker] unhandledrejection:", (e as PromiseRejectionEvent).reason),
);

// Serialize builds: each waits for the previous so the shared generator/cache is
// never re-entered concurrently. `.catch` keeps the chain from wedging if a build
// ever rejects (a rejected chain would silently drop all later builds).
let chain: Promise<void> = Promise.resolve();
self.onmessage = (event: MessageEvent<WorldgenInbound>): void => {
	const msg = event.data;
	if (msg.type !== "build") return;
	chain = chain.then(() => build(msg)).catch((e) => console.error("[worldgen worker] chain:", e));
};
