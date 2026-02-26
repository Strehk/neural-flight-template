uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;

uniform float uZoom;       // @endpoint min:0.5 max:50.0 default:1.0
uniform float uCx;         // @endpoint min:-2.0 max:2.0 default:-0.7
uniform float uCy;         // @endpoint min:-2.0 max:2.0 default:0.27015
uniform float uMaxIter;    // @endpoint min:10.0 max:200.0 default:100.0
uniform float uColorSpeed; // @endpoint min:0.0 max:5.0 default:1.0

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  vec2 uv = (vUv - 0.5) * 2.0;
  uv.x *= uResolution.x / uResolution.y;
  uv /= uZoom;

  // Julia set iteration
  vec2 z = uv;
  vec2 c = vec2(uCx, uCy);

  float iter = 0.0;
  int maxIter = int(uMaxIter);
  for (int i = 0; i < 200; i++) {
    if (i >= maxIter) break;
    if (dot(z, z) > 4.0) break;
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    iter += 1.0;
  }

  // Smooth iteration count
  float smoothIter = iter;
  if (iter < uMaxIter) {
    smoothIter = iter - log2(log2(dot(z, z))) + 4.0;
  }

  // Color mapping
  vec3 color;
  if (iter >= uMaxIter) {
    color = vec3(0.0);
  } else {
    float t = smoothIter / uMaxIter;
    float hue = fract(t * 3.0 + uTime * uColorSpeed * 0.1);
    color = hsv2rgb(vec3(hue, 0.8, 0.9));
    color *= 1.0 - t * 0.3;
  }

  gl_FragColor = vec4(color, 1.0);
}
