// Based on Shadertoy "Mandelbrot - smooth" by iq — https://www.shadertoy.com/view/4df3Rn
// Created by inigo quilez - iq/2013 — https://iquilezles.org
// Educational purposes only. See original for full license terms.
// @perf-tier: quest-safe
// @cost: Mandelbrot iteration, 2D only

#define AA 2

float mandelbrot(in vec2 c) {
    #if 1
    {
        float c2 = dot(c, c);
        if (256.0 * c2 * c2 - 96.0 * c2 + 32.0 * c.x - 3.0 < 0.0) return 0.0;
        if (16.0 * (c2 + 2.0 * c.x + 1.0) - 1.0 < 0.0) return 0.0;
    }
    #endif

    const float B = 256.0;
    float n = 0.0;
    vec2 z = vec2(0.0);
    for (int i = 0; i < 512; i++) {
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
        if (dot(z, z) > (B * B)) break;
        n += 1.0;
    }

    if (n > 511.0) return 0.0;

    float sn = n - log2(log2(dot(z, z))) + 4.0;

    float al = smoothstep(-0.1, 0.0, sin(0.5 * 6.2831 * uTime));
    return mix(n, sn, al);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec3 col = vec3(0.0);

#if AA>1
    for (int m = 0; m < AA; m++)
    for (int n = 0; n < AA; n++) {
        vec2 p = (-uResolution.xy + 2.0 * (fragCoord.xy + vec2(float(m), float(n)) / float(AA))) / uResolution.y;
        float w = float(AA * m + n);
        float time = uTime + 0.5 * (1.0 / 24.0) * w / float(AA * AA);
#else
        vec2 p = (-uResolution.xy + 2.0 * fragCoord.xy) / uResolution.y;
        float time = uTime;
#endif

        float zoo = 0.62 + 0.38 * cos(.07 * time);
        float coa = cos(0.15 * (1.0 - zoo) * time);
        float sia = sin(0.15 * (1.0 - zoo) * time);
        zoo = pow(zoo, 8.0);
        vec2 xy = vec2(p.x * coa - p.y * sia, p.x * sia + p.y * coa);
        vec2 c = vec2(-.745, .186) + xy * zoo;

        float l = mandelbrot(c);

        col += (l < 0.5) ? vec3(0.0, 0.0, 0.0) :
               0.5 + 0.5 * cos(3.0 + l * 0.15 + vec3(0.0, 0.6, 1.0));
#if AA>1
    }
    col /= float(AA * AA);
#endif

    fragColor = vec4(col, 1.0);
}
