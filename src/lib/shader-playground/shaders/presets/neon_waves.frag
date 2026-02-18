uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;

uniform float uWaveScale;   // @endpoint min:1.0 max:20.0 default:5.0
uniform float uSpeed;       // @endpoint min:0.1 max:3.0 default:1.0
uniform float uColorShift;  // @endpoint min:0.0 max:6.28 default:0.0

void main() {
  vec2 uv = vUv;

  // Layered sine waves
  float wave1 = sin(uv.x * uWaveScale + uTime * uSpeed) * 0.5;
  float wave2 = sin(uv.y * uWaveScale * 0.7 + uTime * uSpeed * 1.3 + 1.0) * 0.3;
  float wave3 = sin((uv.x + uv.y) * uWaveScale * 0.5 + uTime * uSpeed * 0.8 + 2.0) * 0.2;

  float combined = wave1 + wave2 + wave3;

  // Color from wave value
  vec3 color;
  color.r = 0.5 + 0.5 * sin(combined * 3.0 + uColorShift);
  color.g = 0.5 + 0.5 * sin(combined * 3.0 + uColorShift + 2.094);
  color.b = 0.5 + 0.5 * sin(combined * 3.0 + uColorShift + 4.189);

  // Boost saturation
  color = pow(color, vec3(0.8));

  gl_FragColor = vec4(color, 1.0);
}
