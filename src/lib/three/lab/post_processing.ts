/**
 * TSL Post-Processing — Node-based effect chain for WebGPURenderer.
 *
 * Uses Three.js PostProcessing with TSL effect nodes:
 * bloom, film (grain), afterImage, vignette (custom Fn).
 */

import { afterImage } from "three/addons/tsl/display/AfterImageNode.js";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import { film } from "three/addons/tsl/display/FilmNode.js";
import { Fn, float, length, mix, pass, smoothstep, uv, vec4 } from "three/tsl";
import * as THREE from "three/webgpu";

export interface PostProcessingConfig {
	bloomStrength?: number;
	bloomThreshold?: number;
	bloomRadius?: number;
	grainIntensity?: number;
	vignetteIntensity?: number;
	afterimageDecay?: number;
}

const DEFAULTS: Required<PostProcessingConfig> = {
	bloomStrength: 1.2,
	bloomThreshold: 0.3,
	bloomRadius: 0.4,
	grainIntensity: 0.06,
	vignetteIntensity: 0.0,
	afterimageDecay: 0,
};

const vignette = Fn(([color, intensity]: [THREE.Node, THREE.Node]) => {
	const dist = length(uv().sub(0.5));
	const factor = smoothstep(
		float(0.4),
		float(1.1),
		dist.mul(float(1.0).add(intensity)),
	);
	const darkened = mix(
		color,
		color.mul(float(1.0).sub(factor.mul(intensity))),
		float(1.0),
	);
	return darkened;
});

export interface PostProcessingResult {
	postProcessing: THREE.PostProcessing;
	update: (deltaTime: number) => void;
	dispose: () => void;
}

export function createPostProcessing(
	renderer: THREE.WebGPURenderer,
	scene: THREE.Scene,
	camera: THREE.Camera,
	config?: PostProcessingConfig,
): PostProcessingResult {
	const c = { ...DEFAULTS, ...config };

	const postProcessing = new THREE.PostProcessing(renderer);

	// 1. Scene pass
	const scenePass = pass(scene, camera);
	let output: THREE.Node = scenePass.getTextureNode("output");

	// 2. Bloom
	const bloomPass = bloom(
		output,
		c.bloomStrength,
		c.bloomRadius,
		c.bloomThreshold,
	);
	output = output.add(bloomPass);

	// 3. Afterimage (motion trails) — opt-in
	if (c.afterimageDecay > 0) {
		output = afterImage(output, c.afterimageDecay);
	}

	// 4. Vignette — opt-in
	if (c.vignetteIntensity > 0) {
		output = vignette(output, float(c.vignetteIntensity));
	}

	// 5. Film grain
	if (c.grainIntensity > 0) {
		output = film(output, float(c.grainIntensity));
	}

	postProcessing.outputNode = output;

	return {
		postProcessing,
		update(_deltaTime: number) {
			postProcessing.render();
		},
		dispose() {
			postProcessing.dispose();
		},
	};
}
