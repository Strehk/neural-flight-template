// ============================================================================
// shaders.ts — Shader imports + material factories (OPTIONAL)
//
// Only needed for experiences with custom shaders. Standard experiences using
// MeshStandardMaterial or MeshPhysicalMaterial don't need this file.
//
// Pattern: Import shaders from src/lib/shaders/ → create factory functions
// Rule: NEVER put inline GLSL in scene.ts. ALL GLSL lives in the shader library.
//
// Example:
//   import { createShaderMaterial, registerSnippet, updateTime } from '$lib/shaders';
//   import noiseGlsl from '$lib/shaders/common/noise.glsl?raw';
//   import myVert from '$lib/shaders/vertex/terrain.vert?raw';
//   import myFrag from '$lib/shaders/fragment/landscape/my-effect.frag?raw';
//
//   export function initSnippets(): void {
//     registerSnippet('noise', noiseGlsl);
//   }
//
//   export function createMyMaterial(): THREE.ShaderMaterial {
//     return createShaderMaterial({
//       vertexShader: myVert,
//       fragmentShader: myFrag,
//       uniforms: { uSpeed: { value: 1.0 } },
//     });
//   }
//
//   export { updateTime };
// ============================================================================

export {};
