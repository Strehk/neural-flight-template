// LAB EXPERIMENT — temporary, not production code
import * as THREE from "three";

export interface GradientSkyConfig {
	colorTop?: THREE.Color;
	colorMiddle?: THREE.Color;
	colorBottom?: THREE.Color;
	radius?: number;
	/** Where the horizon band sits (0=bottom, 1=top). Default 0.5 */
	horizonHeight?: number;
}

const DEFAULTS: Required<GradientSkyConfig> = {
	colorTop: new THREE.Color(0x0a0a2e),
	colorMiddle: new THREE.Color(0xe84393),
	colorBottom: new THREE.Color(0xfd9644),
	radius: 50,
	horizonHeight: 0.5,
};

const vertexShader = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>

varying float vY;
uniform float uRadius;

void main() {
  vY = (position.y / uRadius + 1.0) * 0.5;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  #include <logdepthbuf_vertex>
}
`;

const fragmentShader = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>

uniform vec3 uColorTop;
uniform vec3 uColorMiddle;
uniform vec3 uColorBottom;
uniform float uHorizon;

varying float vY;

void main() {
  #include <logdepthbuf_fragment>
  vec3 color = mix(uColorBottom, uColorMiddle, smoothstep(0.0, uHorizon, vY));
  color = mix(color, uColorTop, smoothstep(uHorizon, uHorizon + 0.15, vY));
  gl_FragColor = vec4(color, 1.0);
}
`;

/** Create an inverted sphere sky dome with a smooth 3-stop vertical gradient shader. */
export function createGradientSky(config?: GradientSkyConfig): THREE.Mesh {
	const c = { ...DEFAULTS, ...config };

	const geo = new THREE.SphereGeometry(c.radius, 32, 16);
	const mat = new THREE.ShaderMaterial({
		vertexShader,
		fragmentShader,
		uniforms: {
			uRadius: { value: c.radius },
			uColorTop: { value: c.colorTop },
			uColorMiddle: { value: c.colorMiddle },
			uColorBottom: { value: c.colorBottom },
			uHorizon: { value: c.horizonHeight },
		},
		side: THREE.BackSide,
		depthWrite: false,
	});

	return new THREE.Mesh(geo, mat);
}
