// LAB EXPERIMENT — temporary, not production code
import * as THREE from "three";
import { MarchingCubes } from "three/addons/objects/MarchingCubes.js";

export interface MetaballDef {
	color: THREE.Color;
	/** Orbit amplitude (0-1 normalized). Higher = wider movement */
	amplitude: number;
	/** Speed multiplier for orbit */
	speed: number;
	/** Phase offset in radians */
	phase: number;
	/** Metaball strength. Convention: ~1.2 shared across all balls */
	strength: number;
	/** Metaball subtract (falloff). Typical ~12 */
	subtract: number;
}

export interface MetaballsConfig {
	resolution?: number;
	scale?: number;
	balls?: MetaballDef[];
	envMap?: THREE.Texture;
}

const DEFAULTS = {
	resolution: 48,
	scale: 12,
};

export interface MetaballsResult {
	mesh: MarchingCubes;
	update: (time: number) => void;
	dispose: () => void;
}

// TODO: David fills in the ball config — see createMetaballs() below

export function createMetaballs(config?: MetaballsConfig): MetaballsResult {
	const resolution = config?.resolution ?? DEFAULTS.resolution;
	const scale = config?.scale ?? DEFAULTS.scale;
	const balls = config?.balls ?? PLACEHOLDER_BALLS;

	const material = new THREE.MeshPhysicalMaterial({
		vertexColors: true,
		toneMapped: false,
		metalness: 0.3,
		roughness: 0.15,
		iridescence: 1.0,
		iridescenceIOR: 1.3,
		iridescenceThicknessRange: [100, 400],
		clearcoat: 0.3,
		clearcoatRoughness: 0.1,
		envMapIntensity: 0.8,
	});

	if (config?.envMap) {
		material.envMap = config.envMap;
	}

	const mc = new MarchingCubes(resolution, material, false, true, 50_000);
	mc.position.set(0, 0, 0);
	mc.scale.setScalar(scale);
	mc.isolation = 80;

	function update(time: number): void {
		mc.reset();

		for (let i = 0; i < balls.length; i++) {
			const ball = balls[i];
			// Lissajous orbit — closely matching Three.js MarchingCubes example
			const x =
				Math.sin(
					i +
						1.26 *
							time *
							ball.speed *
							(1.03 + 0.5 * Math.cos(0.21 * i + ball.phase)),
				) *
					ball.amplitude +
				0.5;
			const y =
				Math.abs(
					Math.cos(
						i +
							1.12 *
								time *
								ball.speed *
								Math.cos(1.22 + 0.1424 * i + ball.phase),
					),
				) * 0.77;
			const z =
				Math.cos(
					i +
						1.32 *
							time *
							ball.speed *
							0.1 *
							Math.sin(0.92 + 0.53 * i + ball.phase),
				) *
					ball.amplitude +
				0.5;

			mc.addBall(x, y, z, ball.strength, ball.subtract, ball.color);
		}

		mc.update();
	}

	function dispose(): void {
		mc.geometry.dispose();
		material.dispose();
	}

	return { mesh: mc, update, dispose };
}

// ── 14 balls — 3 size classes: Hero / Medium / Satellite ──
// Cyan-Magenta-Orange-Pink palette (no green, no pure yellow)
const PLACEHOLDER_BALLS: MetaballDef[] = [
	// Hero (3) — large, slow anchors that create fusion bridges
	{
		color: new THREE.Color(0x00ffff),
		amplitude: 0.2,
		speed: 0.3,
		phase: 0,
		strength: 0.8,
		subtract: 12,
	},
	{
		color: new THREE.Color(0xff00ff),
		amplitude: 0.22,
		speed: 0.35,
		phase: 2.1,
		strength: 0.75,
		subtract: 12,
	},
	{
		color: new THREE.Color(0xff1493),
		amplitude: 0.25,
		speed: 0.4,
		phase: 4.2,
		strength: 0.7,
		subtract: 12,
	},
	// Medium (5) — mid-size, merge readily
	{
		color: new THREE.Color(0xff6600),
		amplitude: 0.28,
		speed: 0.5,
		phase: 0.7,
		strength: 0.55,
		subtract: 12,
	},
	{
		color: new THREE.Color(0x9933ff),
		amplitude: 0.3,
		speed: 0.55,
		phase: 1.5,
		strength: 0.5,
		subtract: 12,
	},
	{
		color: new THREE.Color(0x00ccff),
		amplitude: 0.32,
		speed: 0.6,
		phase: 2.8,
		strength: 0.5,
		subtract: 12,
	},
	{
		color: new THREE.Color(0xff00ff),
		amplitude: 0.29,
		speed: 0.65,
		phase: 3.5,
		strength: 0.45,
		subtract: 12,
	},
	{
		color: new THREE.Color(0x00ffff),
		amplitude: 0.31,
		speed: 0.55,
		phase: 5.0,
		strength: 0.5,
		subtract: 12,
	},
	// Satellite (6) — small, fast orbiters
	{
		color: new THREE.Color(0xff1493),
		amplitude: 0.35,
		speed: 0.7,
		phase: 0.3,
		strength: 0.35,
		subtract: 12,
	},
	{
		color: new THREE.Color(0xff6600),
		amplitude: 0.38,
		speed: 0.8,
		phase: 1.2,
		strength: 0.3,
		subtract: 12,
	},
	{
		color: new THREE.Color(0x9933ff),
		amplitude: 0.33,
		speed: 0.75,
		phase: 2.4,
		strength: 0.3,
		subtract: 12,
	},
	{
		color: new THREE.Color(0x00ccff),
		amplitude: 0.4,
		speed: 0.9,
		phase: 3.6,
		strength: 0.25,
		subtract: 12,
	},
	{
		color: new THREE.Color(0xff00ff),
		amplitude: 0.36,
		speed: 0.85,
		phase: 4.8,
		strength: 0.28,
		subtract: 12,
	},
	{
		color: new THREE.Color(0x00ffff),
		amplitude: 0.37,
		speed: 0.8,
		phase: 5.8,
		strength: 0.3,
		subtract: 12,
	},
];
