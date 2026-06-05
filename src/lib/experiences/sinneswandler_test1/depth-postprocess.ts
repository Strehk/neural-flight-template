import * as THREE from "three";

export interface DepthPostprocess {
  render: (
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    factor: number,
    inverted: boolean,
    floor: number,
    sphereRadius: number,
  ) => void;
  renderInverted: (drawScene: () => void) => void;
  dispose: () => void;
}

const VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT_SHADER = /* glsl */ `
varying vec2 vUv;
uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform float cameraNear;
uniform float cameraFar;
uniform float uDepthFactor;
uniform float uInvertDepth;
uniform float uDepthFloor;
uniform float uSphereRadius;
uniform mat4 uProjInverse;
// >1 holds the dark core and ramps sharply to the bright edge (more pronounced gradient).
#define DEPTH_CONTRAST 2.2
// Palette size for the depth view — quantize the grey ramp to this many flat bands
// (low = chunky papercut layers with crisp contour edges).
#define DEPTH_LEVELS 12.0

void main() {
  vec3 diffuse = texture2D(tDiffuse, vUv).rgb;
  float rawDepth = texture2D(tDepth, vUv).x;
  vec3 depthColor = vec3(1.0);
  if (rawDepth > 0.9999) {
    gl_FragColor = vec4(mix(diffuse, depthColor, uDepthFactor), 1.0);
    return; 
  }

  // Reconstruct view-space position from depth; its length is the true euclidean
  // distance from the camera (the origin in view space), so altitude/Y counts too —
  // fly up and the ground is farther, so it lightens. Matches the VR path.
  vec4 ndc = vec4(vUv * 2.0 - 1.0, rawDepth * 2.0 - 1.0, 1.0);
  vec4 viewPos = uProjInverse * ndc;
  viewPos /= viewPos.w;
  float dist = length(viewPos.xyz);
  float depthNorm = clamp(dist / max(uSphereRadius, 1.0), 0.0, 1.0);
  depthNorm = pow(depthNorm, DEPTH_CONTRAST);
  depthColor = mix(1.0 - vec3(depthNorm), vec3(depthNorm), uInvertDepth);
  // Lift the near (dark) end off pure black when inverted. No-op when floor is 0.
  depthColor = mix(depthColor, mix(vec3(uDepthFloor), vec3(1.0), depthColor), uInvertDepth);
  // Hard-quantize to DEPTH_LEVELS flat bands — crisp contour edges between solid
  // shades give the layered papercut look (no dithering, so boundaries stay sharp).
  depthColor = floor(depthColor * (DEPTH_LEVELS - 1.0) + 0.5) / (DEPTH_LEVELS - 1.0);
  gl_FragColor = vec4(mix(diffuse, depthColor, uDepthFactor), 1.0);
}
`;

const INVERT_FRAGMENT_SHADER = /* glsl */ `
varying vec2 vUv;
uniform sampler2D tDiffuse;

void main() {
  vec4 color = texture2D(tDiffuse, vUv);
  gl_FragColor = vec4(1.0 - color.rgb, color.a);
}
`;

export function createDepthPostprocess(
  renderer: THREE.WebGLRenderer,
): DepthPostprocess {
  const target = new THREE.WebGLRenderTarget(1, 1);
  target.texture.minFilter = THREE.NearestFilter;
  target.texture.magFilter = THREE.NearestFilter;
  target.texture.generateMipmaps = false;
  target.stencilBuffer = false;
  target.samples = 0;
  target.depthTexture = new THREE.DepthTexture(1, 1);
  target.depthTexture.format = THREE.DepthFormat;
  target.depthTexture.type = THREE.UnsignedShortType;

  const colorTarget = new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    depthBuffer: false,
    stencilBuffer: false,
  });
  colorTarget.texture.generateMipmaps = false;

  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    uniforms: {
      cameraNear: { value: 0.1 },
      cameraFar: { value: 1000 },
      uDepthFactor: { value: 1 },
      uInvertDepth: { value: 1 },
      uDepthFloor: { value: 0 },
      uSphereRadius: { value: 120 },
      uProjInverse: { value: new THREE.Matrix4() },
      tDiffuse: { value: target.texture },
      tDepth: { value: target.depthTexture },
    },
    depthWrite: false,
    depthTest: false,
    fog: false,
    toneMapped: false,
  });

  const postScene = new THREE.Scene();
  const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  postQuad.frustumCulled = false;
  postScene.add(postQuad);

  const invertMaterial = new THREE.ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: INVERT_FRAGMENT_SHADER,
    uniforms: {
      tDiffuse: { value: colorTarget.texture },
    },
    depthWrite: false,
    depthTest: false,
    fog: false,
    toneMapped: false,
  });
  const invertScene = new THREE.Scene();
  const invertQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), invertMaterial);
  invertQuad.frustumCulled = false;
  invertScene.add(invertQuad);

  const size = new THREE.Vector2(1, 1);

  function resize(): void {
    renderer.getDrawingBufferSize(size);
    const width = Math.max(1, Math.floor(size.x));
    const height = Math.max(1, Math.floor(size.y));
    target.setSize(width, height);
    colorTarget.setSize(width, height);
  }

  resize();

  return {
    render(
      scene: THREE.Scene,
      camera: THREE.PerspectiveCamera,
      factor: number,
      inverted: boolean,
      floor: number,
      sphereRadius: number,
    ): void {
      // Custom render targets don't composite to the XR framebuffer correctly.
      // Fall back to a direct render and skip the depth overlay in VR.
      if (renderer.xr.isPresenting) {
        renderer.render(scene, camera);
        return;
      }

      renderer.getDrawingBufferSize(size);
      const width = Math.max(1, Math.floor(size.x));
      const height = Math.max(1, Math.floor(size.y));
      if (target.width !== width || target.height !== height) {
        target.setSize(width, height);
      }

      material.uniforms.cameraNear.value = camera.near;
      material.uniforms.cameraFar.value = camera.far;
      material.uniforms.uDepthFactor.value = THREE.MathUtils.clamp(factor, 0, 1);
      material.uniforms.uInvertDepth.value = inverted ? 1 : 0;
      material.uniforms.uDepthFloor.value = floor;
      material.uniforms.uSphereRadius.value = sphereRadius;
      material.uniforms.uProjInverse.value.copy(camera.projectionMatrixInverse);
      material.uniforms.tDiffuse.value = target.texture;
      material.uniforms.tDepth.value = target.depthTexture;

      const previousTarget = renderer.getRenderTarget();
      renderer.setRenderTarget(target);
      renderer.clear();
      renderer.render(scene, camera);

      renderer.setRenderTarget(null);
      renderer.render(postScene, postCamera);

      if (previousTarget) {
        renderer.setRenderTarget(previousTarget);
      }
    },
    renderInverted(drawScene: () => void): void {
      // Same XR limitation — skip the invert pass in VR.
      if (renderer.xr.isPresenting) {
        drawScene();
        return;
      }

      renderer.getDrawingBufferSize(size);
      const width = Math.max(1, Math.floor(size.x));
      const height = Math.max(1, Math.floor(size.y));
      if (colorTarget.width !== width || colorTarget.height !== height) {
        colorTarget.setSize(width, height);
      }

      const previousTarget = renderer.getRenderTarget();
      renderer.setRenderTarget(colorTarget);
      renderer.clear();
      drawScene();

      invertMaterial.uniforms.tDiffuse.value = colorTarget.texture;
      renderer.setRenderTarget(null);
      renderer.render(invertScene, postCamera);

      if (previousTarget) {
        renderer.setRenderTarget(previousTarget);
      }
    },
    dispose(): void {
      target.dispose();
      colorTarget.dispose();
      material.dispose();
      invertMaterial.dispose();
      postQuad.geometry.dispose();
      invertQuad.geometry.dispose();
    },
  };
}
