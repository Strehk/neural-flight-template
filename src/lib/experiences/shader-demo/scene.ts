// ============================================================================
// scene.ts — 3D scene setup, shader material, and animation loop
//
// This is the creative core of the experience. Students customize:
//   1. FRAGMENT_SHADER  — the GLSL visual effect
//   2. VERTEX_SHADER    — geometry deformation (optional, default: standard.vert)
//   3. UNIFORMS         — shader parameters exposed to the UI
//   4. GEOMETRY         — the 3D shape to render
//
// The experience system calls setup() once, tick() every frame, dispose() on exit.
// ============================================================================

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

// ── State ──
// Each experience defines its own state shape extending ExperienceState.
// The loader passes this opaquely — only your code reads/writes these fields.

export interface ShaderDemoState extends ExperienceState {
	mesh: THREE.Mesh;
	material: THREE.ShaderMaterial;
	camera: THREE.PerspectiveCamera;
	animSpeed: number;
}

// ── GLSL Snippets ──
// Register reusable GLSL code before creating materials.
// Available snippets: math, noise, sdf, color, transforms
// Use in shaders via: #pragma include <name>

function registerSnippets(): void {
	registerSnippet("math", mathGlsl);
	registerSnippet("noise", noiseGlsl);
	registerSnippet("color", colorGlsl);
}

// ── Fragment Shader ──
// CUSTOMIZE: Replace this with your own GLSL effect.
// System uniforms (uTime, uResolution, uMouse) are auto-injected by the loader
// when the shader doesn't already declare them.

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

// ── Uniform Defaults ──
// CUSTOMIZE: Match these to the uniforms declared in your fragment shader.
// Each uniform here must have a corresponding ParameterDef in manifest.ts
// and a case in settings.ts to be controllable via UI.

const UNIFORMS = {
	uNoiseScale: { value: 3 },
	uSpeed: { value: 0.3 },
	uColorShift: { value: 0 },
	uDistortion: { value: 0.5 },
	uBrightness: { value: 1 },
	uDisplacement: { value: 0.15 },
	uDisplacementFreq: { value: 3.0 },
};

// ── Setup ──
// Called once when the experience loads. Create geometry, material, camera.

export async function setup(ctx: SetupContext): Promise<ShaderDemoState> {
	registerSnippets();

	// Position camera outside the mesh — spawn.position in manifest.ts is
	// the intended starting point. The loader sets fov/near/far but not position.
	ctx.camera.position.set(0, 0, 4);
	ctx.camera.lookAt(0, 0, 0);

	// CUSTOMIZE: Choose your geometry.
	// 64 subdivisions = ~13k triangles — Quest 3 safe at 72fps stereo.
	const geometry = new THREE.IcosahedronGeometry(1.5, 64);

	// CUSTOMIZE: Swap vertexShader/fragmentShader for different effects.
	// Available vertex shaders: standard, displacement, breathe, dissolve, ocean, etc.
	const material = createShaderMaterial({
		vertexShader: displacementVert,
		fragmentShader: FRAGMENT_SHADER,
		uniforms: UNIFORMS,
	});

	const mesh = new THREE.Mesh(geometry, material);
	ctx.scene.add(mesh);

	return { mesh, material, camera: ctx.camera, animSpeed: 0.3 };
}

// ── Tick ──
// Called every frame. Update time uniforms and animations.
// Keep this lightweight — runs at 72fps stereo on Quest 3.

export function tick(
	state: ExperienceState,
	ctx: TickContext,
): { state: ExperienceState; outputs?: Record<string, number> } {
	const s = state as ShaderDemoState;

	updateTime(s.material, ctx.elapsed * s.animSpeed);
	s.mesh.rotation.y = ctx.elapsed * 0.05;

	return { state: s };
}

// ── Dispose ──
// Called when experience unloads. Clean up GPU resources.

export function dispose(state: ExperienceState, scene: THREE.Scene): void {
	const s = state as ShaderDemoState;
	scene.remove(s.mesh);
	s.mesh.geometry.dispose();
	s.material.dispose();
}
