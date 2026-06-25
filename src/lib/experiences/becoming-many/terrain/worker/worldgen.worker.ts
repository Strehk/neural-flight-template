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
import type {
	WorldgenBuildRequest,
	WorldgenBuildResult,
	WorldgenInbound,
} from "./worldgen-protocol";

const post = (self as unknown as Worker).postMessage.bind(self);

const gen = new WorldMapGenerator();
let params: GenParams = configToParams({ seed: 1337, amplitude: 1, frequency: 1, octaves: 4 });
let detail = new TerrainDetailGenerator(params);
let sig = JSON.stringify({ seed: 1337, amplitude: 1, frequency: 1, octaves: 4 });

/** Apply a (possibly new) config, clearing the region cache only when it changed. */
function ensureConfig(cfg: TerrainConfig): void {
	const next = JSON.stringify(cfg);
	if (next === sig) return;
	sig = next;
	params = configToParams(cfg);
	detail = new TerrainDetailGenerator(params);
	gen.clearCaches();
}

async function build(msg: WorldgenBuildRequest): Promise<void> {
	try {
		ensureConfig(msg.cfg);
		const chunk = await gen.generateChunk(msg.gridX, msg.gridZ, params);
		const sampler = new TerrainSampler(chunk);
		const { positions, normals, biome, heightGrid } = buildChunkArrays(
			sampler,
			detail,
			msg.segments,
		);
		const result: WorldgenBuildResult = {
			type: "built",
			id: msg.id,
			gridX: msg.gridX,
			gridZ: msg.gridZ,
			positions,
			normals,
			biome,
			heightGrid,
		};
		post(result, [positions.buffer, normals.buffer, biome.buffer, heightGrid.buffer]);
	} catch (err) {
		post({
			type: "error",
			id: msg.id,
			message: err instanceof Error ? err.message : String(err),
		});
	}
}

// Serialize builds: each waits for the previous so the shared generator/cache is
// never re-entered concurrently.
let chain: Promise<void> = Promise.resolve();
self.onmessage = (event: MessageEvent<WorldgenInbound>): void => {
	const msg = event.data;
	if (msg.type !== "build") return;
	chain = chain.then(() => build(msg));
};
