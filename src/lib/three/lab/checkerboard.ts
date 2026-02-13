// LAB EXPERIMENT — temporary, not production code
import * as THREE from "three";

export interface CheckerboardConfig {
	size?: number;
	tiles?: number;
	color1?: THREE.Color;
	color2?: THREE.Color;
}

const DEFAULTS: Required<CheckerboardConfig> = {
	size: 40,
	tiles: 20,
	color1: new THREE.Color(0x2d1b69),
	color2: new THREE.Color(0x1a1040),
};

const vertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform float uTiles;

varying vec2 vUv;

void main() {
  float check = mod(floor(vUv.x * uTiles) + floor(vUv.y * uTiles), 2.0);
  vec3 color = mix(uColor1, uColor2, check);
  gl_FragColor = vec4(color, 1.0);
}
`;

/** Create a procedural checkerboard floor on the XZ plane. */
export function createCheckerboard(config?: CheckerboardConfig): THREE.Mesh {
	const c = { ...DEFAULTS, ...config };

	const geo = new THREE.PlaneGeometry(c.size, c.size, 64, 64);
	geo.rotateX(-Math.PI / 2);

	const mat = new THREE.ShaderMaterial({
		vertexShader,
		fragmentShader,
		uniforms: {
			uColor1: { value: c.color1 },
			uColor2: { value: c.color2 },
			uTiles: { value: c.tiles },
		},
	});

	return new THREE.Mesh(geo, mat);
}
