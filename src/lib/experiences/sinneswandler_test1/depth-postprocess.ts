import * as THREE from "three";

export interface DepthPostprocess {
  render: (
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    factor: number,
    inverted: boolean,
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

float readDepth(sampler2D depthSampler, vec2 coord) {
  float fragCoordZ = texture2D(depthSampler, coord).x;
  float viewZ = (cameraNear * cameraFar) / ((cameraFar - cameraNear) * fragCoordZ - cameraFar);
  return (viewZ + cameraNear) / (cameraNear - cameraFar);
}

void main() {
  vec3 diffuse = texture2D(tDiffuse, vUv).rgb;
  float rawDepth = texture2D(tDepth, vUv).x;
  vec3 depthColor = vec3(1.0);
  if (rawDepth > 0.9999) {
    gl_FragColor = vec4(mix(diffuse, depthColor, uDepthFactor), 1.0);
    return; 
  }

  float depth = readDepth(tDepth, vUv);
  depthColor = mix(1.0 - vec3(depth), vec3(depth), uInvertDepth);
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
