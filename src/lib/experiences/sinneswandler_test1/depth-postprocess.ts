import * as THREE from "three";

export interface DepthPostprocess {
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
  const colorTarget = new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    depthBuffer: false,
    stencilBuffer: false,
  });
  colorTarget.texture.generateMipmaps = false;

  const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

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
    colorTarget.setSize(width, height);
  }

  resize();

  return {
    renderInverted(drawScene: () => void): void {
      // Custom render targets don't composite to the XR framebuffer correctly.
      // Skip the invert pass in VR and draw straight through.
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
      colorTarget.dispose();
      invertMaterial.dispose();
      invertQuad.geometry.dispose();
    },
  };
}
