/**
 * GradientSky — Configurable gradient skybox for abstract scenes
 *
 * Unlike sky.ts (low-poly vertex colors for nature), this uses a smooth
 * shader-based gradient with N configurable color stops and animation.
 *
 * @example
 * const sky = createGradientSky({
 *   colors: [0x0a0020, 0x3d1a6e, 0xff6b9d, 0xffa07a],
 *   radius: 500,
 * });
 * scene.add(sky);
 */
import * as THREE from "three";

export interface GradientSkyConfig {
	radius?: number;
	colors?: number[];
	animationSpeed?: number;
}

const DEFAULTS: Required<GradientSkyConfig> = {
	radius: 500,
	colors: [0x0a0020, 0x1a0040, 0x4a1080, 0xff8060],
	animationSpeed: 0.0,
};

const GRADIENT_SKY_VERT = /* glsl */ `
varying vec3 vWorldPosition;
void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

function buildFragmentShader(stopCount: number): string {
	return /* glsl */ `
uniform vec3 uColors[${stopCount}];
uniform float uTime;
uniform float uAnimSpeed;
varying vec3 vWorldPosition;

void main() {
  // Normalize Y to [0..1] based on world position
  float t = normalize(vWorldPosition).y * 0.5 + 0.5;

  // Optional subtle animation: shift gradient over time
  t = fract(t + uTime * uAnimSpeed);

  // N-stop gradient interpolation
  float segment = t * ${(stopCount - 1).toFixed(1)};
  int idx = int(floor(segment));
  float frac = fract(segment);

  vec3 col = uColors[0];
  ${Array.from({ length: stopCount - 1 }, (_, i) => `if (idx == ${i}) col = mix(uColors[${i}], uColors[${i + 1}], frac);`).join("\n  ")}

  gl_FragColor = vec4(col, 1.0);
}
`;
}

export function createGradientSky(config?: GradientSkyConfig): THREE.Mesh {
	const c = { ...DEFAULTS, ...config };
	const colors = c.colors.map((hex) => new THREE.Color(hex));

	const geo = new THREE.IcosahedronGeometry(c.radius, 4);
	geo.scale(-1, 1, 1); // Render inside-out

	const mat = new THREE.ShaderMaterial({
		vertexShader: GRADIENT_SKY_VERT,
		fragmentShader: buildFragmentShader(colors.length),
		uniforms: {
			uColors: { value: colors },
			uTime: { value: 0 },
			uAnimSpeed: { value: c.animationSpeed },
		},
		side: THREE.BackSide,
		depthWrite: false,
	});

	const mesh = new THREE.Mesh(geo, mat);
	mesh.renderOrder = -1;
	mesh.frustumCulled = false;
	return mesh;
}

export function updateGradientSky(mesh: THREE.Mesh, elapsed: number): void {
	const mat = mesh.material as THREE.ShaderMaterial;
	if (mat.uniforms.uTime) {
		mat.uniforms.uTime.value = elapsed;
	}
}
