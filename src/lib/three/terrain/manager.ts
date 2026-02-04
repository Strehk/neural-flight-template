import * as THREE from "three";
import { runtimeConfig, TERRAIN } from "$lib/config/flight";
import {
	type ChunkRings,
	createChunkRings,
	type RingState,
	recolorRings,
	updateRings,
} from "../rings";
import { TerrainChunk } from "./chunk";
import { type ChunkDecorations, createChunkDecorations } from "./decorations";
import { DEFAULT_HEIGHTMAP, type HeightmapConfig } from "./heightmap";

interface ChunkEntry {
	terrain: TerrainChunk;
	decorations: ChunkDecorations;
	rings: ChunkRings;
}

/** Manages a chunk grid around the player with terrain, decorations, and rings. */
export class TerrainManager {
	readonly group = new THREE.Group();
	readonly ringGroup = new THREE.Group();

	private readonly config: HeightmapConfig;
	private readonly active = new Map<string, ChunkEntry>();
	private readonly pool: TerrainChunk[] = [];

	constructor(config: HeightmapConfig = DEFAULT_HEIGHTMAP) {
		this.config = config;
	}

	/** Call each frame with the player's world position. Returns collected rings count. */
	update(position: THREE.Vector3): number {
		const cx = Math.round(position.x / TERRAIN.CHUNK_SIZE);
		const cz = Math.round(position.z / TERRAIN.CHUNK_SIZE);

		const needed = new Set<string>();

		const viewRadius = runtimeConfig.viewRadius;
		for (let dx = -viewRadius; dx <= viewRadius; dx++) {
			for (let dz = -viewRadius; dz <= viewRadius; dz++) {
				const gx = cx + dx;
				const gz = cz + dz;
				const key = `${gx},${gz}`;
				needed.add(key);

				if (!this.active.has(key)) {
					const terrain = this.acquireTerrain(gx, gz);
					const decorations = createChunkDecorations(
						gx,
						gz,
						this.config,
						runtimeConfig.treeDensity,
					);
					const rings = createChunkRings(
						gx,
						gz,
						this.config,
						runtimeConfig.ringCountPerChunk,
					);

					this.group.add(terrain.mesh);
					this.group.add(decorations.group);
					for (const ring of rings.rings) this.ringGroup.add(ring.mesh);

					this.active.set(key, { terrain, decorations, rings });
				}
			}
		}

		// Remove chunks outside view
		for (const [key, entry] of this.active) {
			if (!needed.has(key)) {
				this.group.remove(entry.terrain.mesh);
				this.group.remove(entry.decorations.group);
				for (const ring of entry.rings.rings) this.ringGroup.remove(ring.mesh);

				entry.decorations.dispose();
				entry.rings.dispose();

				this.active.delete(key);
				this.recycleTerrain(entry.terrain);
			}
		}

		// Check ring collection
		let collected = 0;
		for (const entry of this.active.values()) {
			collected += updateRings(entry.rings.rings, position);
		}
		return collected;
	}

	/** Update color of all uncollected rings across active chunks. */
	updateRingColors(hexColor: string): void {
		for (const entry of this.active.values()) {
			recolorRings(entry.rings.rings, hexColor);
		}
	}

	/** Clear all active chunks so they regenerate with updated config (amplitude, frequency). */
	rebuildAllChunks(): void {
		for (const entry of this.active.values()) {
			this.group.remove(entry.terrain.mesh);
			this.group.remove(entry.decorations.group);
			for (const ring of entry.rings.rings) this.ringGroup.remove(ring.mesh);

			entry.terrain.dispose();
			entry.decorations.dispose();
			entry.rings.dispose();
		}
		this.active.clear();
		// Pool is also stale — clear it
		for (const chunk of this.pool) chunk.dispose();
		this.pool.length = 0;
	}

	/** Get all active ring states (for score display). */
	getAllRings(): RingState[] {
		const all: RingState[] = [];
		for (const entry of this.active.values()) {
			all.push(...entry.rings.rings);
		}
		return all;
	}

	private acquireTerrain(gx: number, gz: number): TerrainChunk {
		const recycled = this.pool.pop();
		if (recycled) {
			recycled.rebuild(gx, gz, TERRAIN.CHUNK_SIZE, this.config);
			return recycled;
		}
		return new TerrainChunk(gx, gz, TERRAIN.CHUNK_SIZE, this.config);
	}

	private recycleTerrain(chunk: TerrainChunk): void {
		if (this.pool.length < TERRAIN.MAX_POOL) {
			this.pool.push(chunk);
		} else {
			chunk.dispose();
		}
	}

	dispose(): void {
		for (const entry of this.active.values()) {
			entry.terrain.dispose();
			entry.decorations.dispose();
			entry.rings.dispose();
		}
		for (const chunk of this.pool) chunk.dispose();
		this.active.clear();
		this.pool.length = 0;
	}
}
