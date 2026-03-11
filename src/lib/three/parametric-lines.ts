/**
 * ParametricLines — Mathematical curve generator for Line Art / Op-Art scenes
 *
 * Generates LineSegments or TubeGeometry from parametric equations.
 * Supports multiple curve types with configurable parameters.
 *
 * @example
 * const lines = createParametricLines({
 *   curveType: 'lissajous',
 *   count: 50,
 *   color: 0xffffff,
 * });
 * scene.add(lines);
 */
import * as THREE from "three";

export type CurveType = "lissajous" | "spiral" | "rose" | "torusKnot";

export interface ParametricLinesConfig {
	curveType?: CurveType;
	count?: number;
	segments?: number;
	scale?: number;
	color?: number;
	lineWidth?: number;
	useTubes?: boolean;
	tubeRadius?: number;
	spreadZ?: number;
}

const DEFAULTS: Required<ParametricLinesConfig> = {
	curveType: "lissajous",
	count: 30,
	segments: 200,
	scale: 10,
	color: 0xffffff,
	lineWidth: 1,
	useTubes: false,
	tubeRadius: 0.02,
	spreadZ: 20,
};

function generateCurvePoints(
	type: CurveType,
	segments: number,
	scale: number,
	variation: number,
): THREE.Vector3[] {
	const points: THREE.Vector3[] = [];
	for (let i = 0; i <= segments; i++) {
		const t = (i / segments) * Math.PI * 2;
		let x = 0;
		let y = 0;
		let z = 0;

		switch (type) {
			case "lissajous": {
				const a = 3 + variation * 2;
				const b = 2 + variation * 1.5;
				x = Math.sin(a * t + variation) * scale;
				y = Math.sin(b * t) * scale;
				z = Math.sin(t * (1 + variation * 0.5)) * scale * 0.3;
				break;
			}
			case "spiral": {
				const r = (t / (Math.PI * 2)) * scale;
				x = r * Math.cos(t * (1 + variation));
				y = r * Math.sin(t * (1 + variation));
				z = variation * scale * 0.1;
				break;
			}
			case "rose": {
				const k = 3 + Math.floor(variation * 4);
				const r2 = Math.cos(k * t) * scale;
				x = r2 * Math.cos(t);
				y = r2 * Math.sin(t);
				z = Math.sin(t * 2) * scale * 0.2 * variation;
				break;
			}
			case "torusKnot": {
				const p = 2 + Math.floor(variation * 3);
				const q = 3 + Math.floor(variation * 2);
				const r3 = Math.cos(q * t) + 2;
				x = r3 * Math.cos(p * t) * scale * 0.3;
				y = r3 * Math.sin(p * t) * scale * 0.3;
				z = -Math.sin(q * t) * scale * 0.3;
				break;
			}
		}
		points.push(new THREE.Vector3(x, y, z));
	}
	return points;
}

export function createParametricLines(
	config?: ParametricLinesConfig,
): THREE.Group {
	const c = { ...DEFAULTS, ...config };
	const group = new THREE.Group();

	for (let i = 0; i < c.count; i++) {
		const variation = i / c.count;
		const points = generateCurvePoints(
			c.curveType,
			c.segments,
			c.scale,
			variation,
		);
		const curve = new THREE.CatmullRomCurve3(points);

		let lineObj: THREE.Object3D;

		if (c.useTubes) {
			const tubeGeo = new THREE.TubeGeometry(
				curve,
				c.segments,
				c.tubeRadius,
				4,
				false,
			);
			const tubeMat = new THREE.MeshBasicMaterial({
				color: c.color,
				transparent: true,
				opacity: 0.4 + variation * 0.6,
			});
			lineObj = new THREE.Mesh(tubeGeo, tubeMat);
		} else {
			const curvePoints = curve.getPoints(c.segments);
			const lineGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
			const lineMat = new THREE.LineBasicMaterial({
				color: c.color,
				transparent: true,
				opacity: 0.3 + variation * 0.7,
				linewidth: c.lineWidth,
			});
			lineObj = new THREE.Line(lineGeo, lineMat);
		}

		// Spread curves along Z axis
		lineObj.position.z = (variation - 0.5) * c.spreadZ;
		group.add(lineObj);
	}

	return group;
}
