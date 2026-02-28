// Based on Shadertoy "Abstract Vortex" by Frostbyte_ — https://www.shadertoy.com/view/wcyBD3
// Licensed under CC BY-NC-SA 4.0
// @perf-tier: quest-safe
// @cost: ~10 march steps, simple noise

#pragma include <transforms>

// ACES tonemap
vec3 acesTonemap(vec3 c) {
    mat3 m1 = mat3(0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777);
    mat3 m2 = mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602);
    vec3 v = m1 * c;
    vec3 a = v * (v + 0.0245786) - 0.000090537;
    vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
    return m2 * (a / b);
}

// Xor's Dot Noise
float dotNoise(vec3 p) {
    const float PHI = 1.618033988;
    const mat3 GOLD = mat3(
        -0.571464913, +0.814921382, +0.096597072,
        -0.278044873, -0.303026659, +0.911518454,
        +0.772087367, +0.494042493, +0.399753815);
    return dot(cos(GOLD * p), sin(PHI * p * GOLD));
}

void mainImage(out vec4 o, in vec2 u) {
    float i, s, t = uTime;
    vec3 p, l, b, d;
    p.z = t;
    d = normalize(vec3(2.0 * u - uResolution.xy, uResolution.y));
    for (o *= i; i < 10.0; i++) {
        b = p;
        b.xy = rotate2D(t * 1.5 + b.z * 3.0) * sin(b.xy);
        s = 0.001 + abs(dotNoise(b * 12.0) / 12.0 - dotNoise(b)) * 0.4;
        s = max(s, 2.0 - length(p.xy));
        s += abs(p.y * 0.75 + sin(p.z + t * 0.1 + p.x * 1.5)) * 0.2;
        p += d * s;
        l += (1.0 + sin(i + length(p.xy * 0.1) + vec3(3.0, 1.5, 1.0))) / s;
    }
    o.rgb = acesTonemap(l * l / 6e2);
}
