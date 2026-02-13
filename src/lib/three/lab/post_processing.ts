// LAB EXPERIMENT — temporary, not production code
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { AfterimagePass } from "three/addons/postprocessing/AfterimagePass.js";

export interface PostProcessingConfig {
	bloomStrength?: number;
	bloomThreshold?: number;
	bloomRadius?: number;
	grainIntensity?: number;
	vignetteIntensity?: number;
	bokehFocus?: number;
	bokehAperture?: number;
	bokehMaxBlur?: number;
	afterimageDecay?: number;
}

const DEFAULTS: Required<PostProcessingConfig> = {
	bloomStrength: 1.2,
	bloomThreshold: 0.3,
	bloomRadius: 0.4,
	grainIntensity: 0.06,
	vignetteIntensity: 0.0,
	bokehFocus: 0,
	bokehAperture: 0.002,
	bokehMaxBlur: 0.005,
	afterimageDecay: 0,
};

const vignetteShader = {
	uniforms: {
		tDiffuse: { value: null },
		uIntensity: { value: 0.4 },
	},
	vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
	fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uIntensity;
    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float dist = distance(vUv, vec2(0.5));
      float vignette = smoothstep(0.4, 1.1, dist * (1.0 + uIntensity));
      color.rgb *= 1.0 - vignette * uIntensity;
      gl_FragColor = color;
    }
  `,
};

const grainShader = {
	uniforms: {
		tDiffuse: { value: null },
		uTime: { value: 0.0 },
		uIntensity: { value: 0.06 },
	},
	vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
	fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uIntensity;
    varying vec2 vUv;

    float random(vec2 co) {
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float noise = random(vUv + uTime) * uIntensity;
      color.rgb += noise - uIntensity * 0.5;
      gl_FragColor = color;
    }
  `,
};

export interface PostProcessingResult {
	composer: EffectComposer;
	/** Call this in the animation loop instead of renderer.render() */
	update: (deltaTime: number) => void;
	dispose: () => void;
}

/** Set up EffectComposer with Bloom + Film Grain + Output passes. */
export function createPostProcessing(
	renderer: THREE.WebGLRenderer,
	scene: THREE.Scene,
	camera: THREE.Camera,
	config?: PostProcessingConfig,
): PostProcessingResult {
	const c = { ...DEFAULTS, ...config };

	const composer = new EffectComposer(renderer);

	// 1. Render pass
	composer.addPass(new RenderPass(scene, camera));

	// 2. Bloom
	const size = renderer.getSize(new THREE.Vector2());
	const bloomPass = new UnrealBloomPass(
		size,
		c.bloomStrength,
		c.bloomRadius,
		c.bloomThreshold,
	);
	composer.addPass(bloomPass);

	// 3. Bokeh (depth-of-field) — opt-in when focus > 0
	if (c.bokehFocus > 0) {
		const bokehPass = new BokehPass(scene, camera, {
			focus: c.bokehFocus,
			aperture: c.bokehAperture,
			maxblur: c.bokehMaxBlur,
		});
		composer.addPass(bokehPass);
	}

	// 4. Vignette
	if (c.vignetteIntensity > 0) {
		const vignettePass = new ShaderPass(vignetteShader);
		vignettePass.uniforms.uIntensity.value = c.vignetteIntensity;
		composer.addPass(vignettePass);
	}

	// 5. Afterimage (motion trails) — opt-in when decay > 0
	if (c.afterimageDecay > 0) {
		const afterimagePass = new AfterimagePass(c.afterimageDecay);
		composer.addPass(afterimagePass);
	}

	// 6. Grain
	const grainPass = new ShaderPass(grainShader);
	grainPass.uniforms.uIntensity.value = c.grainIntensity;
	composer.addPass(grainPass);

	// 7. Output (tone mapping + color space)
	composer.addPass(new OutputPass());

	let elapsed = 0;

	return {
		composer,
		update(deltaTime: number) {
			elapsed += deltaTime;
			grainPass.uniforms.uTime.value = elapsed;
			composer.render();
		},
		dispose() {
			composer.dispose();
		},
	};
}
