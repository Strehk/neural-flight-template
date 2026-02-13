// LAB EXPERIMENT — temporary, not production code
//
// Manages infinite chunk-based world generation.
// Creates/disposes architecture chunks as camera moves along Z axis.

import type * as THREE from "three";
import {
	type ArchitectureConfig,
	disposeChunk,
	generateChunk,
} from "./architecture";

export interface ChunkManagerConfig {
	/** Size of each chunk along Z axis. Default 20 */
	chunkSize?: number;
	/** How many chunks to keep ahead of camera. Default 3 */
	chunksAhead?: number;
	/** How many chunks to keep behind camera. Default 1 */
	chunksBehind?: number;
	/** Architecture config passed to each chunk */
	architecture?: ArchitectureConfig;
	/** Custom chunk generator — overrides default architecture generator */
	generator?: (zStart: number, zEnd: number) => THREE.Group;
}

const CM_DEFAULTS = {
	chunkSize: 20,
	chunksAhead: 3,
	chunksBehind: 1,
	architecture: {} as ArchitectureConfig,
} satisfies Omit<Required<ChunkManagerConfig>, "generator">;

export interface ChunkManager {
	/** Call every frame with camera Z position. Returns true if chunks changed. */
	update: (cameraZ: number) => boolean;
	/** Dispose all chunks and cleanup. */
	dispose: () => void;
}

/** Create a chunk manager that adds/removes chunks from the scene. */
export function createChunkManager(
	scene: THREE.Scene,
	config?: ChunkManagerConfig,
): ChunkManager {
	const c = { ...CM_DEFAULTS, ...config };
	const chunks = new Map<number, THREE.Group>();
	let lastCameraChunk = Number.NaN;

	function chunkIndexForZ(z: number): number {
		return Math.floor(z / c.chunkSize);
	}

	function ensureChunk(index: number): void {
		if (chunks.has(index)) return;

		const zStart = index * c.chunkSize;
		const zEnd = zStart + c.chunkSize;
		const chunk = c.generator
			? c.generator(zStart, zEnd)
			: generateChunk(zStart, zEnd, c.architecture);
		chunks.set(index, chunk);
		scene.add(chunk);
	}

	function removeChunk(index: number): void {
		const chunk = chunks.get(index);
		if (!chunk) return;

		scene.remove(chunk);
		disposeChunk(chunk);
		chunks.delete(index);
	}

	return {
		update(cameraZ: number): boolean {
			const currentChunk = chunkIndexForZ(cameraZ);
			if (currentChunk === lastCameraChunk) return false;

			lastCameraChunk = currentChunk;

			// Determine desired range
			// Camera moves in -Z direction, so "ahead" = lower indices
			const minIndex = currentChunk - c.chunksAhead;
			const maxIndex = currentChunk + c.chunksBehind;

			// Add missing chunks
			for (let i = minIndex; i <= maxIndex; i++) {
				ensureChunk(i);
			}

			// Remove out-of-range chunks
			for (const [index] of chunks) {
				if (index < minIndex || index > maxIndex) {
					removeChunk(index);
				}
			}

			return true;
		},

		dispose(): void {
			for (const [index] of chunks) {
				removeChunk(index);
			}
		},
	};
}
