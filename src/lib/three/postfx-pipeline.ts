/**
 * PostFX Pipeline — WebXR-compatible post-processing wrapper
 *
 * Uses pmndrs/postprocessing for efficient multi-pass effects.
 * Supports Bloom + Film Grain + Vignette with per-effect toggles.
 *
 * @example
 * const pipeline = createPostFXPipeline(renderer, scene, camera, {
 *   bloom: { intensity: 1.5 },
 *   filmGrain: { opacity: 0.1 },
 * });
 * // In animation loop: pipeline.render() instead of renderer.render()
 * // Cleanup: pipeline.dispose()
 */
import * as THREE from "three";
import {
	BloomEffect,
	EffectComposer,
	EffectPass,
	NoiseEffect,
	RenderPass,
	VignetteEffect,
	BlendFunction,
} from "postprocessing";

export interface BloomConfig {
	intensity?: number;
	luminanceThreshold?: number;
	luminanceSmoothing?: number;
	mipmapBlur?: boolean;
}

export interface FilmGrainConfig {
	opacity?: number;
}

export interface VignetteConfig {
	offset?: number;
	darkness?: number;
}

export interface PostFXConfig {
	bloom?: BloomConfig | false;
	filmGrain?: FilmGrainConfig | false;
	vignette?: VignetteConfig | false;
	multisampling?: number;
}

export interface PostFXPipeline {
	composer: EffectComposer;
	render: (delta?: number) => void;
	resize: (width: number, height: number) => void;
	setBloomIntensity: (value: number) => void;
	setGrainOpacity: (value: number) => void;
	dispose: () => void;
}

const BLOOM_DEFAULTS: Required<BloomConfig> = {
	intensity: 1.0,
	luminanceThreshold: 0.8,
	luminanceSmoothing: 0.3,
	mipmapBlur: true,
};

const GRAIN_DEFAULTS: Required<FilmGrainConfig> = {
	opacity: 0.08,
};

const VIGNETTE_DEFAULTS: Required<VignetteConfig> = {
	offset: 0.3,
	darkness: 0.7,
};

export function createPostFXPipeline(
	renderer: THREE.WebGLRenderer,
	scene: THREE.Scene,
	camera: THREE.Camera,
	config?: PostFXConfig,
): PostFXPipeline {
	const composer = new EffectComposer(renderer, {
		multisampling: config?.multisampling ?? 0,
	});

	composer.addPass(new RenderPass(scene, camera));

	const effects: InstanceType<typeof BloomEffect | typeof NoiseEffect | typeof VignetteEffect>[] = [];
	let bloomEffect: BloomEffect | null = null;
	let grainEffect: NoiseEffect | null = null;

	// Bloom
	if (config?.bloom !== false) {
		const bc = { ...BLOOM_DEFAULTS, ...(typeof config?.bloom === "object" ? config.bloom : {}) };
		bloomEffect = new BloomEffect({
			intensity: bc.intensity,
			luminanceThreshold: bc.luminanceThreshold,
			luminanceSmoothing: bc.luminanceSmoothing,
			mipmapBlur: bc.mipmapBlur,
		});
		effects.push(bloomEffect);
	}

	// Film Grain (via NoiseEffect)
	if (config?.filmGrain !== false) {
		const gc = { ...GRAIN_DEFAULTS, ...(typeof config?.filmGrain === "object" ? config.filmGrain : {}) };
		grainEffect = new NoiseEffect({
			blendFunction: BlendFunction.OVERLAY,
		});
		grainEffect.blendMode.opacity.value = gc.opacity;
		effects.push(grainEffect);
	}

	// Vignette
	if (config?.vignette !== false) {
		const vc = { ...VIGNETTE_DEFAULTS, ...(typeof config?.vignette === "object" ? config.vignette : {}) };
		const vignetteEffect = new VignetteEffect({
			offset: vc.offset,
			darkness: vc.darkness,
		});
		effects.push(vignetteEffect);
	}

	if (effects.length > 0) {
		composer.addPass(new EffectPass(camera, ...effects));
	}

	return {
		composer,
		render(delta?: number) {
			composer.render(delta);
		},
		resize(width: number, height: number) {
			composer.setSize(width, height);
		},
		setBloomIntensity(value: number) {
			if (bloomEffect) bloomEffect.intensity = value;
		},
		setGrainOpacity(value: number) {
			if (grainEffect) grainEffect.blendMode.opacity.value = value;
		},
		dispose() {
			composer.dispose();
		},
	};
}
