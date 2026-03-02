/**
 * Starfield — Points-based star background for dark/space scenes
 *
 * Lighter alternative to sky.ts for abstract void environments.
 * Supports twinkle animation and configurable star count/depth.
 *
 * @example
 * const stars = createStarfield({ count: 2000, radius: 400 });
 * scene.add(stars);
 * // In loop: updateStarfield(stars, elapsed);
 */
import * as THREE from "three";

export interface StarfieldConfig {
	count?: number;
	radius?: number;
	minSize?: number;
	maxSize?: number;
	color?: number;
	twinkleSpeed?: number;
}

const DEFAULTS: Required<StarfieldConfig> = {
	count: 1500,
	radius: 400,
	minSize: 0.5,
	maxSize: 2.5,
	color: 0xffffff,
	twinkleSpeed: 1.0,
};

const STAR_VERT = /* glsl */ `
attribute float aSize;
attribute float aPhase;
uniform float uTime;
uniform float uTwinkleSpeed;
varying float vBrightness;

void main() {
  vBrightness = 0.5 + 0.5 * sin(uTime * uTwinkleSpeed + aPhase);
  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * (300.0 / -mvPos.z);
  gl_Position = projectionMatrix * mvPos;
}
`;

const STAR_FRAG = /* glsl */ `
uniform vec3 uColor;
varying float vBrightness;

void main() {
  // Soft circular point
  float dist = length(gl_PointCoord - vec2(0.5));
  float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
  gl_FragColor = vec4(uColor * vBrightness, alpha);
}
`;

export function createStarfield(config?: StarfieldConfig): THREE.Points {
	const c = { ...DEFAULTS, ...config };

	const positions = new Float32Array(c.count * 3);
	const sizes = new Float32Array(c.count);
	const phases = new Float32Array(c.count);

	for (let i = 0; i < c.count; i++) {
		// Uniform distribution on sphere surface
		const theta = Math.random() * Math.PI * 2;
		const phi = Math.acos(2 * Math.random() - 1);
		const r = c.radius * (0.8 + Math.random() * 0.2);

		positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
		positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
		positions[i * 3 + 2] = r * Math.cos(phi);

		sizes[i] = c.minSize + Math.random() * (c.maxSize - c.minSize);
		phases[i] = Math.random() * Math.PI * 2;
	}

	const geo = new THREE.BufferGeometry();
	geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
	geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
	geo.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));

	const mat = new THREE.ShaderMaterial({
		vertexShader: STAR_VERT,
		fragmentShader: STAR_FRAG,
		uniforms: {
			uTime: { value: 0 },
			uColor: { value: new THREE.Color(c.color) },
			uTwinkleSpeed: { value: c.twinkleSpeed },
		},
		transparent: true,
		depthWrite: false,
	});

	const points = new THREE.Points(geo, mat);
	points.frustumCulled = false;
	return points;
}

export function updateStarfield(stars: THREE.Points, elapsed: number): void {
	const mat = stars.material as THREE.ShaderMaterial;
	if (mat.uniforms.uTime) {
		mat.uniforms.uTime.value = elapsed;
	}
}
