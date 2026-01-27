import * as THREE from "three";
import { SKY } from "$lib/config/flight";

/** Create a low-poly sky dome using an inverted IcosahedronGeometry with vertex colors. */
export function createSky(): THREE.Mesh {
	const geo = new THREE.IcosahedronGeometry(SKY.RADIUS, SKY.DETAIL);

	// Invert faces so they render inside-out
	geo.scale(-1, 1, 1);

	const pos = geo.attributes.position;
	const colors = new Float32Array(pos.count * 3);
	const colorTop = new THREE.Color(SKY.COLOR_TOP);
	const colorHorizon = new THREE.Color(SKY.COLOR_HORIZON);
	const colorBottom = new THREE.Color(SKY.COLOR_BOTTOM);
	const temp = new THREE.Color();

	for (let i = 0; i < pos.count; i++) {
		const y = pos.getY(i);
		// Normalize y: -RADIUS..+RADIUS → 0..1
		const t = (y / SKY.RADIUS + 1) * 0.5;

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

	return new THREE.Mesh(geo, mat);
}
