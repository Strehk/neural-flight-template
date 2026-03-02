/**
 * GridFloor — Emissive neon grid ground plane (Synthwave / Tron aesthetic)
 *
 * Uses neon-grid.frag ShaderMaterial for anti-aliased, distance-faded grid lines.
 * Pair with PostFXPipeline bloom for full glow effect.
 *
 * @example
 * const grid = createGridFloor({ color: 0x00ffcc, size: 200 });
 * scene.add(grid);
 */
import * as THREE from "three";

export interface GridFloorConfig {
	size?: number;
	segments?: number;
	color?: number;
	lineWidth?: number;
	fadeDistance?: number;
	gridScale?: number;
	yPosition?: number;
}

const DEFAULTS: Required<GridFloorConfig> = {
	size: 200,
	segments: 1,
	color: 0x00ccff,
	lineWidth: 1.0,
	fadeDistance: 80.0,
	gridScale: 1.0,
	yPosition: 0,
};

const GRID_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vPosition;
void main() {
  vUv = uv;
  vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const GRID_FRAG = /* glsl */ `
uniform vec3 uGridColor;
uniform float uLineWidth;
uniform float uFadeDistance;
uniform float uGridScale;

varying vec2 vUv;
varying vec3 vPosition;

void main() {
  vec2 grid = vPosition.xz * uGridScale;
  vec2 fw = fwidth(grid);
  vec2 lines = smoothstep(fw * (1.0 + uLineWidth), fw * 0.5, abs(fract(grid - 0.5) - 0.5));
  float gridLine = max(lines.x, lines.y);

  float dist = length(vPosition.xz);
  float fade = 1.0 - smoothstep(0.0, uFadeDistance, dist);

  float intersection = lines.x * lines.y;
  vec3 col = uGridColor * (gridLine + intersection * 0.5);
  float alpha = gridLine * fade;

  gl_FragColor = vec4(col, alpha);
}
`;

export function createGridFloor(config?: GridFloorConfig): THREE.Mesh {
	const c = { ...DEFAULTS, ...config };
	const color = new THREE.Color(c.color);

	const geo = new THREE.PlaneGeometry(c.size, c.size, c.segments, c.segments);
	geo.rotateX(-Math.PI / 2);

	const mat = new THREE.ShaderMaterial({
		vertexShader: GRID_VERT,
		fragmentShader: GRID_FRAG,
		uniforms: {
			uGridColor: { value: color },
			uLineWidth: { value: c.lineWidth },
			uFadeDistance: { value: c.fadeDistance },
			uGridScale: { value: c.gridScale },
		},
		transparent: true,
		side: THREE.DoubleSide,
		depthWrite: false,
	});

	const mesh = new THREE.Mesh(geo, mat);
	mesh.position.y = c.yPosition;
	return mesh;
}
