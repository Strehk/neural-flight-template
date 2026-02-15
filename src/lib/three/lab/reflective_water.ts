// LAB EXPERIMENT — temporary, not production code
import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";

export interface ReflectiveWaterConfig {
	size?: number;
	waveSpeed?: number;
	waveScale?: number;
	tintColor?: THREE.Color;
	tintStrength?: number;
	fresnelPower?: number;
}

const DEFAULTS: Required<ReflectiveWaterConfig> = {
	size: 60,
	waveSpeed: 0.4,
	waveScale: 12.0,
	tintColor: new THREE.Color(0x020208),
	tintStrength: 0.85,
	fresnelPower: 3.0,
};

export interface ReflectiveWaterResult {
	mesh: THREE.Mesh;
	update: (time: number) => void;
	dispose: () => void;
}

/** Create a dark reflective water plane with wave distortion and fresnel. */
export function createReflectiveWater(config?: ReflectiveWaterConfig): ReflectiveWaterResult {
	const c = { ...DEFAULTS, ...config };

	const geometry = new THREE.PlaneGeometry(c.size, c.size, 1, 1);

	const reflector = new Reflector(geometry, {
		textureWidth: 512,
		textureHeight: 512,
		clipBias: 0.003,
	});

	// Reflector sets up its own shader. We replace the fragment to add waves + fresnel.
	const reflectorMaterial = reflector.material as THREE.ShaderMaterial;

	reflectorMaterial.uniforms.uTime = { value: 0.0 };
	reflectorMaterial.uniforms.uWaveSpeed = { value: c.waveSpeed };
	reflectorMaterial.uniforms.uWaveScale = { value: c.waveScale };
	reflectorMaterial.uniforms.uTintColor = { value: c.tintColor };
	reflectorMaterial.uniforms.uTintStrength = { value: c.tintStrength };
	reflectorMaterial.uniforms.uFresnelPower = { value: c.fresnelPower };

	reflectorMaterial.fragmentShader = /* glsl */ `
		uniform vec3 color;
		uniform sampler2D tDiffuse;
		uniform float uTime;
		uniform float uWaveSpeed;
		uniform float uWaveScale;
		uniform vec3 uTintColor;
		uniform float uTintStrength;
		uniform float uFresnelPower;

		varying vec4 vUvReflect;
		varying vec3 vWorldPosition;
		varying vec3 vWorldNormal;

		void main() {
			// Wave distortion on reflection UVs
			vec2 distortion = vec2(
				sin(vUvReflect.x * uWaveScale + uTime * uWaveSpeed) * 0.008
					+ sin(vUvReflect.y * uWaveScale * 0.7 + uTime * uWaveSpeed * 1.3) * 0.006,
				cos(vUvReflect.y * uWaveScale + uTime * uWaveSpeed * 0.8) * 0.008
					+ cos(vUvReflect.x * uWaveScale * 0.6 + uTime * uWaveSpeed * 1.1) * 0.006
			);

			vec4 reflUv = vUvReflect;
			reflUv.xy += distortion * reflUv.w;

			vec4 reflColor = texture2DProj(tDiffuse, reflUv);

			// Fresnel — stronger reflection at grazing angles
			vec3 viewDir = normalize(cameraPosition - vWorldPosition);
			float fresnel = pow(1.0 - max(dot(viewDir, vec3(0.0, 1.0, 0.0)), 0.0), uFresnelPower);
			fresnel = clamp(fresnel, 0.15, 1.0);

			// Dark tint — water is almost black, only reflections show color
			vec3 tinted = mix(reflColor.rgb, uTintColor, uTintStrength);
			vec3 finalColor = mix(uTintColor, tinted + reflColor.rgb * 0.3, fresnel);

			gl_FragColor = vec4(finalColor, 1.0);
		}
	`;

	// Add varyings to vertex shader for fresnel calculation
	reflectorMaterial.vertexShader = /* glsl */ `
		uniform mat4 textureMatrix;

		varying vec4 vUvReflect;
		varying vec3 vWorldPosition;
		varying vec3 vWorldNormal;

		void main() {
			vUvReflect = textureMatrix * vec4(position, 1.0);
			vec4 worldPos = modelMatrix * vec4(position, 1.0);
			vWorldPosition = worldPos.xyz;
			vWorldNormal = normalize(mat3(modelMatrix) * normal);
			gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
		}
	`;

	reflectorMaterial.needsUpdate = true;

	// Rotate to XZ plane, position at y=0
	reflector.rotation.x = -Math.PI / 2;

	function update(time: number): void {
		reflectorMaterial.uniforms.uTime.value = time;
	}

	function dispose(): void {
		geometry.dispose();
		reflectorMaterial.dispose();
		const renderTarget = (reflector as unknown as { getRenderTarget: () => THREE.WebGLRenderTarget }).getRenderTarget?.();
		renderTarget?.dispose();
	}

	return { mesh: reflector, update, dispose };
}
