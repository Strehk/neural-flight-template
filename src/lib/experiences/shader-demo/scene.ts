import * as THREE from "three";
import {
	createShaderMaterial,
	registerSnippet,
	updateTime,
} from "$lib/shaders";
import colorGlsl from "$lib/shaders/common/color.glsl?raw";
import mathGlsl from "$lib/shaders/common/math.glsl?raw";
import noiseGlsl from "$lib/shaders/common/noise.glsl?raw";
import displacementVert from "$lib/shaders/vertex/displacement.vert?raw";
import type { ExperienceState, SetupContext, TickContext } from "../types";

export interface ShaderDemoState extends ExperienceState {
	mesh: THREE.Mesh;
	material: THREE.ShaderMaterial;
	camera: THREE.PerspectiveCamera;
	animSpeed: number;
}

const FRAGMENT_SHADER = `
precision highp float;

uniform float uTime;
uniform float uNoiseScale;
uniform float uSpeed;
uniform float uColorShift;
uniform float uDistortion;
uniform float uBrightness;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

#pragma include <math>
#pragma include <noise>
#pragma include <color>

void main() {
  vec3 pos = vPosition * uNoiseScale;

  // Domain warp — distort input coordinates with noise
  float warp = fbm(pos + uTime * uSpeed) * uDistortion;
  float n = fbm(pos + vec3(warp));

  // Map noise to color via cosine palette
  float t = n * 0.5 + 0.5 + uColorShift;
  vec3 col = cosinePalette(
    t,
    vec3(0.5, 0.5, 0.5),
    vec3(0.5, 0.5, 0.5),
    vec3(1.0, 1.0, 1.0),
    vec3(0.0, 0.33, 0.67)
  );

  // Simple rim lighting from normal
  float rim = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
  col += rim * 0.3;

  col *= uBrightness;
  gl_FragColor = vec4(col, 1.0);
}
`;

function ensureSnippetsRegistered(): void {
	registerSnippet("math", mathGlsl);
	registerSnippet("noise", noiseGlsl);
	registerSnippet("color", colorGlsl);
}

export async function setup(ctx: SetupContext): Promise<ShaderDemoState> {
	ensureSnippetsRegistered();

	// 64 subdivisions ≈ 13k triangles — Quest 3 safe at 72fps stereo
	const geometry = new THREE.IcosahedronGeometry(1.5, 64);

	const material = createShaderMaterial({
		vertexShader: displacementVert,
		fragmentShader: FRAGMENT_SHADER,
		uniforms: {
			uNoiseScale: { value: 3 },
			uSpeed: { value: 0.3 },
			uColorShift: { value: 0 },
			uDistortion: { value: 0.5 },
			uBrightness: { value: 1 },
			uDisplacement: { value: 0.15 },
			uDisplacementFreq: { value: 3.0 },
		},
	});

	const mesh = new THREE.Mesh(geometry, material);
	ctx.scene.add(mesh);

	return {
		mesh,
		material,
		camera: ctx.camera,
		animSpeed: 0.3,
	};
}

export function tick(
	state: ExperienceState,
	ctx: TickContext,
): { state: ExperienceState; outputs?: Record<string, number> } {
	// Type narrowing — ExperienceState is generic, ShaderDemoState has our specific fields
	const s = state as ShaderDemoState;
	updateTime(s.material, ctx.elapsed * s.animSpeed);
	s.mesh.rotation.y = ctx.elapsed * 0.05;
	return { state: s };
}

export function dispose(state: ExperienceState, scene: THREE.Scene): void {
	const s = state as ShaderDemoState;
	scene.remove(s.mesh);
	s.mesh.geometry.dispose();
	s.material.dispose();
}
