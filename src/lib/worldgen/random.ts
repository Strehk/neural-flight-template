export function seededRandom(seed: number): number {
	let h = (seed * 2654435761) | 0;
	h = ((h >>> 16) ^ h) * 0x45d9f3b;
	h = ((h >>> 16) ^ h) * 0x45d9f3b;
	h = (h >>> 16) ^ h;
	return (h & 0x7fffffff) / 0x7fffffff;
}

export function seededRandom2D(a: number, b: number): number {
	let h = (a * 2654435761) ^ (b * 2246822519);
	h = ((h >>> 16) ^ h) * 0x45d9f3b;
	h = ((h >>> 16) ^ h) * 0x45d9f3b;
	h = (h >>> 16) ^ h;
	return (h & 0x7fffffff) / 0x7fffffff;
}
