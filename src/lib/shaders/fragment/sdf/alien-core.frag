// Based on Shadertoy "Alien Core" by GLKITTY — https://www.shadertoy.com/view/4tcXRr
// Textures replaced with procedural equivalents
// @perf-tier: desktop-only
// @cost: ~64 march steps, 1 noise per step
#pragma include <math>

vec3 rotateY(vec3 v, float t) {
    float cost = cos(t); float sint = sin(t);
    return vec3(v.x * cost + v.z * sint, v.y, -v.x * sint + v.z * cost);
}

float smin(float a, float b, float k)
{
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

// Procedural noise replacing texture(iChannel0, ...).x
float noise(vec3 p) {
    vec3 np = normalize(p);

    // Bi-planar procedural noise
    float a = hash21(uTime / 20.0 + np.xy);
    float b = hash21(uTime / 20.0 + 0.77 + np.yz);

    a = mix(a, 0.5, abs(np.x));
    b = mix(b, 0.5, abs(np.z));

    float n = a + b - 0.4;
    n = mix(n, 0.5, abs(np.y) / 2.0);

    return n;
}

float map(vec3 p) {
    float d = (-1.0 * length(p) + 3.0) + 1.5 * noise(p);
    d = min(d, (length(p) - 1.5) + 1.5 * noise(p));

    float m = 1.5; float s = .03;
    d = smin(d, max(abs(p.x) - s, abs(p.y + p.z * .2) - .07), m);
    d = smin(d, max(abs(p.z) - s, abs(p.x + p.y / 2.) - .07), m);
    d = smin(d, max(abs(p.z - p.y * .4) - s, abs(p.x - p.y * .2) - .07), m);
    d = smin(d, max(abs(p.z * .2 - p.y) - s, abs(p.x + p.z) - .07), m);
    d = smin(d, max(abs(p.z * -.2 + p.y) - s, abs(-p.x + p.z) - .07), m);

    return d;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = fragCoord.xy * 2.0 / uResolution.xy - 1.0;
    uv.x *= uResolution.x / uResolution.y;
    vec3 ray = normalize(vec3(1.0 * uv.x, 1.0 * uv.y, 1.0));

    vec3 color = vec3(0);
    const int rayCount = 64;

    float t = 0.;
    for (int r = 1; r <= rayCount; r++)
    {
        vec3 p = vec3(0, 0, -3.) + ray * t;

        p = rotateY(p, uMouse.x / uResolution.x * 2. * 3.14);
        p = rotateY(p, uTime / 3.);

        float mask = max(0., (1. - length(p / 3.)));
        p = rotateY(p, mask * sin(uTime / 2.) * 1.2);
        p.y += sin(uTime + p.x) * mask * .5;
        p *= 1.1 + (sin(uTime / 2.) * mask * .3);

        float d = map(p);

        if(d < 0.01 || r == rayCount)
        {
            float iter = float(r) / float(rayCount);
            float ao = (1. - iter);
            ao *= ao;
            ao = 1. - ao;

            float mask2 = max(0., (1. - length(p / 2.)));
            mask2 *= abs(sin(uTime * -1.5 + length(p) + p.x) - .2);
            color += 2. * vec3(.1, 1., .8) * max(0., (noise(p) * 4. - 2.6)) * mask2;
            color += vec3(.1, .5, .6) * ao * 6.;
            color += vec3(.27, .2, .4) * (t / 8.);

            color *= 2.;
            color -= .15;

            break;
        }

        t += d * 0.8;
    }

    // Vignette
    uv = fragCoord.xy / uResolution.xy;
    uv *= 1.0 - uv.yx;
    float vig = uv.x * uv.y * 20.0;
    vig = pow(vig, 0.25);
    color *= vig;

    color.y *= .8;
    color.x *= 1.5;

    fragColor = vec4(color, 1);
}
