/**
 * ⚠️ TEMPORARY DEFAULTS — Will move to experience manifest (Step 2).
 * These values currently mirror config/flight.ts SKY constants.
 * After migration: each experience passes its own config, no defaults here.
 */
import * as THREE from "three";

export interface SkyConfig {
	radius?: number;
	detail?: number;
	colorTop?: number;
	colorHorizon?: number;
	colorBottom?: number;
}

const DEFAULTS: Required<SkyConfig> = {
	radius: 800,
	detail: 3,
	colorTop: 0x1a6fc4,
	colorHorizon: 0xffeebb,
	colorBottom: 0x87ceeb,
};

/** Create a low-poly sky dome using an inverted IcosahedronGeometry with vertex colors. */
export function createSky(config?: SkyConfig): THREE.Mesh {
	const c = { ...DEFAULTS, ...config };

	const geo = new THREE.IcosahedronGeometry(c.radius, c.detail);

	// Invert faces so they render inside-out
	geo.scale(-1, 1, 1);

	const pos = geo.attributes.position;
	const colors = new Float32Array(pos.count * 3);
	const colorTop = new THREE.Color(c.colorTop);
	const colorHorizon = new THREE.Color(c.colorHorizon);
	const colorBottom = new THREE.Color(c.colorBottom);
	const temp = new THREE.Color();

	for (let i = 0; i < pos.count; i++) {
		const y = pos.getY(i);
		// Normalize y: -radius..+radius → 0..1
		const t = (y / c.radius + 1) * 0.5;

		if (t > 0.5) {
			// Upper half: horizon → top
			const u = (t - 0.5) * 2;
			temp.copy(colorHorizon).lerp(colorTop, u);
		} else {
			// Lower half: bottom → horizon
			const u = t * 2;
			temp.copy(colorBottom).lerp(colorHorizon, u);
		}

		colors[i * 3] = temp.r;
		colors[i * 3 + 1] = temp.g;
		colors[i * 3 + 2] = temp.b;
	}

	geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

	const mat = new THREE.MeshBasicMaterial({
		vertexColors: true,
		side: THREE.BackSide,
		fog: false,
	});

	const mesh = new THREE.Mesh(geo, mat);
	mesh.userData.skyRadius = c.radius;
	return mesh;
}

/** Update sky dome vertex colors live from hex color strings. */
export function updateSkyColors(
	mesh: THREE.Mesh,
	top: string,
	horizon: string,
	bottom: string,
): void {
	const geo = mesh.geometry;
	const pos = geo.attributes.position;
	const colors = geo.attributes.color as THREE.BufferAttribute | undefined;

	if (!colors) return;

	const radius = (mesh.userData.skyRadius as number) ?? 800;
	const colorTop = new THREE.Color(top);
	const colorHorizon = new THREE.Color(horizon);
	const colorBottom = new THREE.Color(bottom);
	const temp = new THREE.Color();

	for (let i = 0; i < pos.count; i++) {
		const y = pos.getY(i);
		const t = (y / radius + 1) * 0.5;

		if (t > 0.5) {
			const u = (t - 0.5) * 2;
			temp.copy(colorHorizon).lerp(colorTop, u);
		} else {
			const u = t * 2;
			temp.copy(colorBottom).lerp(colorHorizon, u);
		}

		colors.setXYZ(i, temp.r, temp.g, temp.b);
	}

	colors.needsUpdate = true;
}
