// LAB EXPERIMENT — temporary, not production code
import * as THREE from "three";

export interface GradientConfig {
	colors: THREE.Color[];
	direction?: "x" | "y" | "radial";
	opacity?: number;
	transparent?: boolean;
	side?: THREE.Side;
}

const DEFAULTS = {
	direction: "y" as const,
	opacity: 1.0,
	transparent: false,
};

const vertexShader = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>

varying vec2 vUv;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  #include <logdepthbuf_vertex>
}
`;

/**
 * Generates a fragment shader that interpolates through N color stops.
 * Each stop is evenly spaced between 0 and 1.
 */
function buildFragmentShader(
	colorCount: number,
	direction: "x" | "y" | "radial",
): string {
	const uniforms = Array.from(
		{ length: colorCount },
		(_, i) => `uniform vec3 uColor${i};`,
	).join("\n");

	let factorExpr: string;
	switch (direction) {
		case "x":
			factorExpr = "vUv.x";
			break;
		case "radial":
			factorExpr = "length(vUv - vec2(0.5)) * 2.0";
			break;
		default:
			factorExpr = "vUv.y";
	}

	// Build mix chain: for 3 colors with stops at 0.0, 0.5, 1.0
	// smoothstep between adjacent pairs
	let mixChain: string;
	if (colorCount === 1) {
		mixChain = "vec3 color = uColor0;";
	} else {
		const segments = colorCount - 1;
		const lines: string[] = ["vec3 color = uColor0;"];
		for (let i = 0; i < segments; i++) {
			const start = (i / segments).toFixed(4);
			const end = ((i + 1) / segments).toFixed(4);
			lines.push(
				`color = mix(color, uColor${i + 1}, smoothstep(${start}, ${end}, factor));`,
			);
		}
		mixChain = lines.join("\n  ");
	}

	return /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>

uniform float uOpacity;
${uniforms}

varying vec2 vUv;
varying vec3 vPosition;

void main() {
  #include <logdepthbuf_fragment>
  float factor = ${factorExpr};
  ${mixChain}
  gl_FragColor = vec4(color, uOpacity);
}
`;
}

/** Create a ShaderMaterial with a multi-stop gradient. */
export function createGradientMaterial(
	config: GradientConfig,
): THREE.ShaderMaterial {
	const { direction, opacity, transparent } = { ...DEFAULTS, ...config };
	const { colors } = config;

	if (colors.length === 0) {
		throw new Error("GradientConfig.colors must have at least 1 color");
	}

	const uniforms: Record<string, THREE.IUniform> = {
		uOpacity: { value: opacity },
	};
	for (let i = 0; i < colors.length; i++) {
		uniforms[`uColor${i}`] = { value: colors[i] };
	}

	return new THREE.ShaderMaterial({
		vertexShader,
		fragmentShader: buildFragmentShader(colors.length, direction),
		uniforms,
		transparent,
		side: config.side ?? THREE.FrontSide,
		toneMapped: false,
	});
}
