import * as THREE from "three";

export interface WatercolorPostprocessOptions {
  strength?: number;
  radius?: number;
  pigment?: number;
  edgeStrength?: number;
  grainStrength?: number;
}

export interface WatercolorPostprocess {
  render: (
    scene: THREE.Scene,
    camera: THREE.Camera,
    delta: number,
    elapsed: number,
  ) => void;
  resize: () => void;
  dispose: () => void;
}

const VERTEX_SHADER = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform float uTime;
uniform float uStrength;
uniform float uRadius;
uniform float uPigment;
uniform float uEdgeStrength;
uniform float uGrainStrength;

varying vec2 vUv;

float luma(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec4 sampleRegion(vec2 uv, int minX, int maxX, int minY, int maxY) {
  vec2 texel = uRadius / max(uResolution, vec2(1.0));
  vec3 sum = vec3(0.0);
  vec3 sumSq = vec3(0.0);
  float count = 0.0;

  for (int x = -4; x <= 4; x++) {
    for (int y = -4; y <= 4; y++) {
      if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
        vec2 offset = vec2(float(x), float(y)) * texel;
        vec3 color = texture2D(tDiffuse, clamp(uv + offset, vec2(0.001), vec2(0.999))).rgb;
        sum += color;
        sumSq += color * color;
        count += 1.0;
      }
    }
  }

  vec3 mean = sum / max(count, 1.0);
  vec3 variance = abs(sumSq / max(count, 1.0) - mean * mean);
  return vec4(mean, variance.r + variance.g + variance.b);
}

vec3 kuwahara(vec2 uv) {
  vec4 q0 = sampleRegion(uv, -4, 0, -4, 0);
  vec4 q1 = sampleRegion(uv, 0, 4, -4, 0);
  vec4 q2 = sampleRegion(uv, -4, 0, 0, 4);
  vec4 q3 = sampleRegion(uv, 0, 4, 0, 4);

  vec4 best = q0;
  if (q1.a < best.a) best = q1;
  if (q2.a < best.a) best = q2;
  if (q3.a < best.a) best = q3;
  return best.rgb;
}

float edgeAmount(vec2 uv) {
  vec2 texel = 1.5 / max(uResolution, vec2(1.0));
  float center = luma(texture2D(tDiffuse, uv).rgb);
  float dx = abs(center - luma(texture2D(tDiffuse, clamp(uv + vec2(texel.x, 0.0), vec2(0.001), vec2(0.999))).rgb));
  float dy = abs(center - luma(texture2D(tDiffuse, clamp(uv + vec2(0.0, texel.y), vec2(0.001), vec2(0.999))).rgb));
  return smoothstep(0.035, 0.22, dx + dy);
}

void main() {
  vec3 original = texture2D(tDiffuse, vUv).rgb;
  vec3 painted = kuwahara(vUv);
  float edge = edgeAmount(vUv);

  float paper = hash(floor(vUv * uResolution * 0.42) + uTime * 0.03);
  float wash = hash(floor(vUv * uResolution * 0.08) - uTime * 0.015);
  vec3 paperTint = vec3(1.0, 0.985, 0.945);

  vec3 color = mix(original, painted, uStrength);
  color = mix(color, color * paperTint, uPigment);
  color += (paper - 0.5) * uGrainStrength;
  color += (wash - 0.5) * uPigment * 0.06;
  color -= edge * uEdgeStrength * vec3(0.10, 0.085, 0.065);
  color = mix(color, floor(color * 18.0 + 0.5) / 18.0, uPigment * 0.22);

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;

export function createWatercolorPostprocess(
  renderer: THREE.WebGLRenderer,
  options: WatercolorPostprocessOptions = {},
): WatercolorPostprocess {
  const renderTarget = new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    depthBuffer: true,
    stencilBuffer: false,
  });
  renderTarget.texture.name = "sinneswandler-watercolor-source";

  const size = new THREE.Vector2(1, 1);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: renderTarget.texture },
      uResolution: { value: size.clone() },
      uTime: { value: 0 },
      uStrength: { value: options.strength ?? 0.82 },
      uRadius: { value: options.radius ?? 1.2 },
      uPigment: { value: options.pigment ?? 0.34 },
      uEdgeStrength: { value: options.edgeStrength ?? 0.78 },
      uGrainStrength: { value: options.grainStrength ?? 0.035 },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    depthWrite: false,
    depthTest: false,
    fog: false,
  });

  const quadScene = new THREE.Scene();
  const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  quadScene.add(quad);

  function resize(): void {
    renderer.getDrawingBufferSize(size);
    const width = Math.max(1, Math.floor(size.x));
    const height = Math.max(1, Math.floor(size.y));
    renderTarget.setSize(width, height);
    material.uniforms.uResolution.value.copy(size);
  }

  resize();

  return {
    render(scene: THREE.Scene, camera: THREE.Camera, delta: number, elapsed: number): void {
      material.uniforms.uTime.value = elapsed;

      if (renderer.xr.isPresenting) {
        renderer.render(scene, camera);
        return;
      }

      renderer.getDrawingBufferSize(size);
      if (renderTarget.width !== Math.floor(size.x) || renderTarget.height !== Math.floor(size.y)) {
        resize();
      }

      const previousTarget = renderer.getRenderTarget();
      renderer.setRenderTarget(renderTarget);
      renderer.clear();
      renderer.render(scene, camera);
      renderer.setRenderTarget(previousTarget);

      renderer.setRenderTarget(null);
      renderer.render(quadScene, quadCamera);
      if (previousTarget) renderer.setRenderTarget(previousTarget);

      void delta;
    },
    resize,
    dispose(): void {
      renderTarget.dispose();
      material.dispose();
      quad.geometry.dispose();
    },
  };
}
