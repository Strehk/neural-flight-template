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

import {
	BlendFunction,
	BloomEffect,
	BokehEffect,
	ChromaticAberrationEffect,
	EffectComposer,
	EffectPass,
	NoiseEffect,
	RenderPass,
	VignetteEffect,
} from "postprocessing";
import * as THREE from "three";

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

export interface ChromaticConfig {
	offset?: number;
}

export interface DepthOfFieldConfig {
	focusDistance?: number;
	focalLength?: number;
	bokehScale?: number;
}

export interface PostFXConfig {
	bloom?: BloomConfig | false;
	filmGrain?: FilmGrainConfig | false;
	vignette?: VignetteConfig | false;
	chromatic?: ChromaticConfig | false;
	depthOfField?: DepthOfFieldConfig | false;
	multisampling?: number;
}

export interface PostFXPipeline {
	composer: EffectComposer;
	render: (delta?: number) => void;
	resize: (width: number, height: number) => void;
	setBloomIntensity: (value: number) => void;
	setGrainOpacity: (value: number) => void;
	setChromaticOffset: (value: number) => void;
	setBokehScale: (value: number) => void;
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

	const effects: (BloomEffect | NoiseEffect | VignetteEffect)[] = [];
	let bloomEffect: BloomEffect | null = null;
	let grainEffect: NoiseEffect | null = null;
	let chromaEffect: ChromaticAberrationEffect | null = null;
	let bokehEffect: BokehEffect | null = null;

	// Bloom
	if (config?.bloom !== false) {
		const bc = {
			...BLOOM_DEFAULTS,
			...(typeof config?.bloom === "object" ? config.bloom : {}),
		};
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
		const gc = {
			...GRAIN_DEFAULTS,
			...(typeof config?.filmGrain === "object" ? config.filmGrain : {}),
		};
		grainEffect = new NoiseEffect({
			blendFunction: BlendFunction.OVERLAY,
		});
		grainEffect.blendMode.opacity.value = gc.opacity;
		effects.push(grainEffect);
	}

	// Vignette
	if (config?.vignette !== false) {
		const vc = {
			...VIGNETTE_DEFAULTS,
			...(typeof config?.vignette === "object" ? config.vignette : {}),
		};
		const vignetteEffect = new VignetteEffect({
			offset: vc.offset,
			darkness: vc.darkness,
		});
		effects.push(vignetteEffect);
	}

	// Non-convolution effects in one shared pass
	if (effects.length > 0) {
		composer.addPass(new EffectPass(camera, ...effects));
	}

	// Convolution effects need their own passes
	// Chromatic Aberration
	if (config?.chromatic !== false && config?.chromatic) {
		const cc = typeof config.chromatic === "object" ? config.chromatic : {};
		const offsetVal = cc.offset ?? 0.001;
		chromaEffect = new ChromaticAberrationEffect({
			offset: new THREE.Vector2(offsetVal, offsetVal),
			radialModulation: true,
			modulationOffset: 0.2,
		});
		composer.addPass(new EffectPass(camera, chromaEffect));
	}

	// Depth of Field (Bokeh)
	if (config?.depthOfField !== false && config?.depthOfField) {
		const dc =
			typeof config.depthOfField === "object" ? config.depthOfField : {};
		bokehEffect = new BokehEffect({
			focus: dc.focusDistance ?? 0.35,
			dof: dc.focalLength ?? 0.08,
			aperture: dc.bokehScale ?? 0.015,
			maxBlur: 0.02,
		});
		composer.addPass(new EffectPass(camera, bokehEffect));
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
		setChromaticOffset(value: number) {
			if (chromaEffect) chromaEffect.offset.set(value, value);
		},
		setBokehScale(value: number) {
			if (bokehEffect) {
				const u = bokehEffect.uniforms.get("aperture");
				if (u) u.value = value;
			}
		},
		dispose() {
			composer.dispose();
		},
	};
}
