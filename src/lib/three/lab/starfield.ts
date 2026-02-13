// LAB EXPERIMENT — temporary, not production code
import * as THREE from "three";

export interface StarfieldConfig {
	count?: number;
	radius?: number;
	size?: number;
	color?: THREE.Color;
}

const DEFAULTS: Required<StarfieldConfig> = {
	count: 2000,
	radius: 50,
	size: 0.08,
	color: new THREE.Color(0xffffff),
};

/** Create a points-based starfield with random positions in a sphere volume. */
export function createStarfield(config?: StarfieldConfig): THREE.Points {
	const c = { ...DEFAULTS, ...config };

	const positions = new Float32Array(c.count * 3);

	for (let i = 0; i < c.count; i++) {
		// Random point in sphere using rejection-free spherical coordinates
		const theta = Math.random() * Math.PI * 2;
		const phi = Math.acos(2 * Math.random() - 1);
		const r = c.radius * Math.cbrt(Math.random());

		positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
		positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
		positions[i * 3 + 2] = r * Math.cos(phi);
	}

	const geo = new THREE.BufferGeometry();
	geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

	const mat = new THREE.PointsMaterial({
		size: c.size,
		color: c.color,
		sizeAttenuation: true,
		transparent: true,
		opacity: 0.8,
	});

	return new THREE.Points(geo, mat);
}
