// ============================================================================
// shaders.ts — Shader imports + material factories for Shader Landscape
//
// ALL GLSL lives in src/lib/shaders/ library. This file bridges library shaders
// to the experience by providing typed factory functions for each material.
// scene.ts calls these factories instead of inline GLSL.
//
// Pattern: Experience imports shaders → shaders.ts creates materials → scene.ts uses them
// ============================================================================

import * as THREE from "three";
import { createShaderMaterial } from "$lib/shaders";
// ── Fragment shaders ──
import psychedelicTerrainFrag from "$lib/shaders/fragment/landscape/psychedelic-terrain.frag?raw";
import psychedelicWaterFrag from "$lib/shaders/fragment/landscape/psychedelic-water.frag?raw";
import subsurfaceGlowFrag from "$lib/shaders/fragment/lighting/subsurface-glow.frag?raw";
import gaussianGlowFrag from "$lib/shaders/fragment/particle/gaussian-glow.frag?raw";
import blobWobbleVert from "$lib/shaders/vertex/blob-wobble.vert?raw";
// ── Vertex shaders ──
import lavaBumpVert from "$lib/shaders/vertex/lava-bump.vert?raw";
import oceanVert from "$lib/shaders/vertex/ocean.vert?raw";
import particlePulseVert from "$lib/shaders/vertex/particle-pulse.vert?raw";

// ── Fog Color (shared between terrain + water) ──
const FOG_COLOR = new THREE.Color(0x330066);

// ── Material Factories ──────────────────────────────────────────────────────

export function createTerrainMaterial(): THREE.ShaderMaterial {
	return createShaderMaterial({
		vertexShader: lavaBumpVert,
		fragmentShader: psychedelicTerrainFrag,
		uniforms: {
			uTerrainScale: { value: 0.005 },
			uTerrainHeight: { value: 50.0 },
			uColorSpeed: { value: 0.12 },
			uBrightness: { value: 1.2 },
			uFogColor: { value: FOG_COLOR.clone() },
			uFogNear: { value: 40.0 },
			uFogFar: { value: 200.0 },
			uBumpData: {
				value: Array.from({ length: 8 }, () => new THREE.Vector4(0, 0, 0, 10)),
			},
		},
	});
}

export function createWaterMaterial(): THREE.ShaderMaterial {
	return createShaderMaterial({
		vertexShader: oceanVert,
		fragmentShader: psychedelicWaterFrag,
		uniforms: {
			uWaveAmplitude: { value: 1.5 },
			uWaveFreq: { value: 0.8 },
			uWaveSpeed: { value: 0.6 },
			uBrightness: { value: 1.2 },
			uFogColor: { value: FOG_COLOR.clone() },
			uFogNear: { value: 40.0 },
			uFogFar: { value: 200.0 },
		},
		transparent: true,
		side: THREE.DoubleSide,
	});
}

export function createBubbleMaterial(): THREE.ShaderMaterial {
	return createShaderMaterial({
		vertexShader: blobWobbleVert,
		fragmentShader: subsurfaceGlowFrag,
		uniforms: {
			uGlowColor: { value: new THREE.Vector3(1.0, 0.3, 0.1) },
			uRimColor: { value: new THREE.Vector3(1.0, 0.1, 0.6) },
			uSubsurfaceIntensity: { value: 1.5 },
			uOpacity: { value: 0.5 },
		},
		transparent: true,
		depthWrite: false,
		side: THREE.DoubleSide,
	});
}

export function createParticleMaterial(): THREE.ShaderMaterial {
	return createShaderMaterial({
		vertexShader: particlePulseVert,
		fragmentShader: gaussianGlowFrag,
		transparent: true,
		depthWrite: false,
	});
}
