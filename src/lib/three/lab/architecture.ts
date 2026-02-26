// LAB EXPERIMENT — temporary, not production code
//
// Generative architectural space from gradient panels.
// Places panels on 6 zones (left/right walls, ceiling, ground, bridges, accents)
// with probabilistic overlays (smaller panel ON bigger panel).
//
// Designed for chunk-based infinite generation:
//   generateChunk(zStart, zEnd, seed) → THREE.Group

import * as THREE from "three";
import { createGradientMaterial } from "./gradient_material";

// ── Config ──────────────────────────────────────────────

export interface ArchitectureConfig {
	/** Corridor half-width (X). Default 6 */
	corridorWidth?: number;
	/** Corridor ceiling height (Y). Default 8 */
	ceilingHeight?: number;
	/** Step size between corridor sections. Default 3 */
	sectionStep?: number;
	/** Probability a wall panel appears (0-1). Default 0.65 */
	wallDensity?: number;
	/** Probability a ceiling panel appears. Default 0.45 */
	ceilingDensity?: number;
	/** Probability a ground panel appears. Default 0.35 */
	groundDensity?: number;
	/** Probability a panel gets an overlay child. Default 0.4 */
	overlayChance?: number;
	/** Probability of a floating accent cube. Default 0.2 */
	accentChance?: number;
	/** Probability of a bridge panel connecting walls. Default 0.15 */
	bridgeChance?: number;
	/** Color palettes [bottom, top] hex pairs */
	palettes?: [number, number][];
	/** Base seed for deterministic randomness. Default 42 */
	seed?: number;
}

const DEFAULT_PALETTES: [number, number][] = [
	[0xd63384, 0x0dcaf0], // Hot pink → Cyan
	[0xe85d04, 0x7209b7], // Deep orange → Purple
	[0xf72585, 0x4cc9f0], // Magenta → Light blue
	[0x3a0ca3, 0x4361ee], // Deep blue → Blue
	[0xf77f00, 0x06d6a0], // Orange → Teal
	[0x9b5de5, 0xf15bb5], // Purple → Pink
	[0x00b4d8, 0xff6d00], // Cyan → Orange
	[0x1a1a2e, 0x2d2d44], // Near-black (dark)
	[0xee6c4d, 0x3d5a80], // Terracotta → Steel blue
	[0x560bad, 0xf72585], // Purple → Magenta
];

const DEFAULTS: Required<ArchitectureConfig> = {
	corridorWidth: 6,
	ceilingHeight: 8,
	sectionStep: 3,
	wallDensity: 0.65,
	ceilingDensity: 0.45,
	groundDensity: 0.35,
	overlayChance: 0.4,
	accentChance: 0.2,
	bridgeChance: 0.15,
	palettes: DEFAULT_PALETTES,
	seed: 42,
};

// ── Seeded PRNG (mulberry32) ────────────────────────────

function mulberry32(seed: number): () => number {
	let s = seed | 0;
	return () => {
		s = (s + 0x6d2b79f5) | 0;
		let t = Math.imul(s ^ (s >>> 15), 1 | s);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

// ── Panel builder ───────────────────────────────────────

const PANEL_DEPTH = 0.3;

function buildPanel(
	w: number,
	h: number,
	palette: [number, number],
	direction: "x" | "y" = "y",
): THREE.Mesh {
	const geo = new THREE.BoxGeometry(w, h, PANEL_DEPTH);
	const mat = createGradientMaterial({
		colors: [new THREE.Color(palette[0]), new THREE.Color(palette[1])],
		direction,
	});
	return new THREE.Mesh(geo, mat);
}

/** Overlay panel with polygonOffset to prevent z-fighting. */
function addOverlay(
	parent: THREE.Mesh,
	parentW: number,
	parentH: number,
	palette: [number, number],
	rand: () => number,
): void {
	const ow = parentW * (0.25 + rand() * 0.4);
	const oh = parentH * (0.25 + rand() * 0.4);

	const geo = new THREE.PlaneGeometry(ow, oh);
	const mat = createGradientMaterial({
		colors: [new THREE.Color(palette[0]), new THREE.Color(palette[1])],
		direction: "y",
	});
	// Prevent z-fighting with polygon offset
	mat.polygonOffset = true;
	mat.polygonOffsetFactor = -1;
	mat.polygonOffsetUnits = -1;

	const child = new THREE.Mesh(geo, mat);

	const maxOffX = (parentW - ow) * 0.4;
	const maxOffY = (parentH - oh) * 0.4;
	child.position.set(
		(rand() - 0.5) * maxOffX * 2,
		(rand() - 0.5) * maxOffY * 2,
		PANEL_DEPTH * 0.5 + 0.02,
	);

	parent.add(child);
}

// ── Chunk generator ─────────────────────────────────────

/** Generate a chunk of architecture between zStart and zEnd. */
export function generateChunk(
	zStart: number,
	zEnd: number,
	config?: ArchitectureConfig,
): THREE.Group {
	const c = { ...DEFAULTS, ...config };
	// Derive seed from base seed + chunk start position for determinism
	const chunkSeed = c.seed + Math.floor(zStart * 7919);
	const rand = mulberry32(chunkSeed);
	const group = new THREE.Group();
	group.userData.zStart = zStart;
	group.userData.zEnd = zEnd;

	const pals = c.palettes;
	const pick = () => pals[Math.floor(rand() * pals.length)];
	const halfW = c.corridorWidth;

	for (let z = zStart; z < zEnd; z += c.sectionStep) {
		const zOff = z + rand() * c.sectionStep;

		// ── Left wall ──
		if (rand() < c.wallDensity) {
			const pw = 2 + rand() * 5;
			const ph = 3 + rand() * 6;
			const panel = buildPanel(pw, ph, pick());
			panel.position.set(-halfW, ph / 2 + rand() * 1.5, zOff);
			panel.rotation.y = Math.PI / 2;
			if (rand() < c.overlayChance) addOverlay(panel, pw, ph, pick(), rand);
			group.add(panel);

			// Occasional second panel at different depth (layering)
			if (rand() < 0.4) {
				const pw2 = 1.5 + rand() * 3;
				const ph2 = 2 + rand() * 4;
				const p2 = buildPanel(pw2, ph2, pick());
				p2.position.set(
					-halfW + (rand() * 0.8 + 0.3),
					ph2 / 2 + rand() * 3,
					zOff + (rand() - 0.5) * 2,
				);
				p2.rotation.y = Math.PI / 2;
				group.add(p2);
			}
		}

		// ── Right wall ──
		if (rand() < c.wallDensity) {
			const pw = 2 + rand() * 5;
			const ph = 3 + rand() * 6;
			const panel = buildPanel(pw, ph, pick());
			panel.position.set(halfW, ph / 2 + rand() * 1.5, zOff);
			panel.rotation.y = -Math.PI / 2;
			if (rand() < c.overlayChance) addOverlay(panel, pw, ph, pick(), rand);
			group.add(panel);

			if (rand() < 0.4) {
				const pw2 = 1.5 + rand() * 3;
				const ph2 = 2 + rand() * 4;
				const p2 = buildPanel(pw2, ph2, pick());
				p2.position.set(
					halfW - (rand() * 0.8 + 0.3),
					ph2 / 2 + rand() * 3,
					zOff + (rand() - 0.5) * 2,
				);
				p2.rotation.y = -Math.PI / 2;
				group.add(p2);
			}
		}

		// ── Ceiling panels ──
		if (rand() < c.ceilingDensity) {
			const pw = 3 + rand() * 7;
			const pd = 1.5 + rand() * 3;
			const panel = buildPanel(pw, pd, pick(), "x");
			panel.position.set(
				(rand() - 0.5) * halfW * 0.6,
				c.ceilingHeight - rand() * 1.5,
				zOff,
			);
			panel.rotation.x = Math.PI / 2;
			if (rand() < c.overlayChance * 0.5)
				addOverlay(panel, pw, pd, pick(), rand);
			group.add(panel);
		}

		// ── Ground panels (define floor via boxes — gradient or dark) ──
		if (rand() < c.groundDensity) {
			const isDark = rand() < 0.4;
			const pw = isDark ? 3 + rand() * 6 : 2 + rand() * 5;
			const pd = isDark ? 2 + rand() * 4 : 1.5 + rand() * 3;
			const ph = isDark ? 0.3 + rand() * 0.8 : 0.15 + rand() * 0.4;
			const geo = new THREE.BoxGeometry(pw, ph, pd);

			let mat: THREE.Material;
			if (isDark) {
				mat = new THREE.MeshBasicMaterial({ color: 0x0a0810 });
			} else {
				const pal = pick();
				mat = createGradientMaterial({
					colors: [new THREE.Color(pal[0]), new THREE.Color(pal[1])],
					direction: "x",
				});
			}

			const slab = new THREE.Mesh(geo, mat);
			slab.position.set(
				(rand() - 0.5) * halfW * 1.2,
				-ph / 2 + rand() * 0.2,
				zOff,
			);
			group.add(slab);
		}

		// ── Bridge panel (horizontal connecting walls) ──
		if (rand() < c.bridgeChance) {
			const bw = halfW * (1.2 + rand() * 0.6); // spans most of corridor
			const bh = 0.8 + rand() * 1.5;
			const panel = buildPanel(bw, bh, pick(), "x");
			panel.position.set(
				(rand() - 0.5) * 1.5,
				3 + rand() * (c.ceilingHeight - 5),
				zOff,
			);
			group.add(panel);
		}

		// ── Floating accent cube ──
		if (rand() < c.accentChance) {
			const size = 0.3 + rand() * 0.7;
			const geo = new THREE.BoxGeometry(size, size, size);
			const pal = pick();
			const mat = createGradientMaterial({
				colors: [new THREE.Color(pal[0]), new THREE.Color(pal[1])],
				direction: "y",
			});
			const cube = new THREE.Mesh(geo, mat);
			cube.position.set(
				(rand() - 0.5) * halfW * 1.5,
				1 + rand() * (c.ceilingHeight - 2),
				zOff,
			);
			cube.rotation.set(rand() * 0.4, rand() * Math.PI, rand() * 0.4);
			group.add(cube);
		}

		// ── Dark shadow volume ──
		if (rand() < 0.2) {
			const sw = 1.5 + rand() * 3;
			const sh = 2 + rand() * 5;
			const sd = 0.8 + rand() * 2;
			const geo = new THREE.BoxGeometry(sw, sh, sd);
			const mat = new THREE.MeshBasicMaterial({ color: 0x08060e });
			const block = new THREE.Mesh(geo, mat);
			const side = rand() > 0.5 ? 1 : -1;
			block.position.set(side * (halfW - sw * 0.25), sh / 2 + rand() * 2, zOff);
			group.add(block);
		}
	}

	return group;
}

/** Dispose all geometries and materials in a chunk group. */
export function disposeChunk(chunk: THREE.Group): void {
	chunk.traverse((obj) => {
		if (obj instanceof THREE.Mesh) {
			obj.geometry.dispose();
			if (Array.isArray(obj.material)) {
				for (const m of obj.material) m.dispose();
			} else {
				obj.material.dispose();
			}
		}
	});
}

// ── Legacy API (backwards compatible) ───────────────────

/** Generate a fixed corridor (non-infinite). Use generateChunk for infinite worlds. */
export function createArchitecture(
	config?: ArchitectureConfig & { corridorDepth?: number },
): THREE.Group {
	const depth = config?.corridorDepth ?? 60;
	return generateChunk(-depth / 2, depth / 2, config);
}
