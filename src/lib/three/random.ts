/**
 * Deterministic pseudo-random number generators for procedural 3D content.
 *
 * Both variants use a multiply-shift-XOR hash to convert integer seeds into
 * a float in [0, 1). The determinism ensures identical results across frames
 * and devices — critical for terrain, clouds, and ring placement.
 */

/**
 * Single-seed PRNG — good for sequential indexing (cloud blobs, etc.).
 *
 * Uses Knuth's multiplicative hash (2654435761 = golden-ratio × 2^32).
 * Three rounds of multiply-shift-XOR eliminate seed correlation.
 */
export function seededRandom(seed: number): number {
	let h = (seed * 2654435761) | 0;
	h = ((h >>> 16) ^ h) * 0x45d9f3b;
	h = ((h >>> 16) ^ h) * 0x45d9f3b;
	h = (h >>> 16) ^ h;
	return (h & 0x7fffffff) / 0x7fffffff;
}

/**
 * Two-seed PRNG — good for grid-based placement (chunk × index).
 *
 * XOR-combines two Knuth hashes before the mix rounds, so (a=1, b=2) and
 * (a=2, b=1) produce different results. Used for terrain decorations and rings
 * where placement depends on both chunk coordinate and item index.
 */
export function seededRandom2D(a: number, b: number): number {
	let h = (a * 2654435761) ^ (b * 2246822519);
	h = ((h >>> 16) ^ h) * 0x45d9f3b;
	h = ((h >>> 16) ^ h) * 0x45d9f3b;
	h = (h >>> 16) ^ h;
	return (h & 0x7fffffff) / 0x7fffffff;
}
