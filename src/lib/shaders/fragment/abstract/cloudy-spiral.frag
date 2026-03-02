// @name Cloudy Spiral
// @description Animated spiral cloud formation with volumetric layers
// @perf-tier quest-safe
// @tags spiral, clouds, volumetric, animated
// @credits aiekick — https://www.shadertoy.com/view/MlSSzc
// @cost procedural noise spiral, no raymarching
//
// Based on Shadertoy "Cloudy Spiral" by Stephane Cuillerdier (Aiekick) — https://www.shadertoy.com/view/MlSSzc
// Textures replaced with procedural equivalents
// License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.

#pragma include <math>

float t;

// Procedural noise replacing texture(iChannel0, (uv+0.5)/256.0).yx
float pn(in vec3 x)
{
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    vec2 uv = (p.xy + vec2(37.0, 17.0) * p.z) + f.xy;
    float a = hash21(uv);
    float b = hash21(uv + vec2(1.0, 0.0));
    return -1.0 + 2.4 * mix(a, b, f.z);
}

float df(vec3 p)
{
    float pnNoise = pn(p * .26) * 1.98 + pn(p * .26) * .62 + pn(p * 1.17) * .39;
    p.xy = 20. - abs(p.xy - vec2(cos(p.z - t), -sin(p.z - t)) * 12.);
    return min(p.x, p.y) + pnNoise;
}

vec3 cam(vec2 uv, vec3 ro, vec3 cu, vec3 cv, float fov)
{
    vec3 rov = normalize(cv - ro);
    vec3 u = normalize(cross(cu, rov));
    vec3 v = normalize(cross(rov, u));
    vec3 rd = normalize(rov + fov * u * uv.x + fov * v * uv.y);
    return rd;
}

vec3 march(vec3 f, vec3 ro, vec3 rd, float st)
{
    vec3 s = vec3(1), h = vec3(.16, .008, .032), w = vec3(0);
    float d = 1., dl = 0., td = 0.;
    vec3 p = ro;
    for(float i = 0.; i < 100.; i++)
    {
        if(s.x < 0.01 || d > 40. || td > .95) break;
        s = df(p) * .1 * i / vec3(107, 160, 72);
        w = (1. - td) * (h - s) * i / vec3(61, 27, 54) * step(s, h);
        f += w;
        td += w.x + .01;
        dl += 1. - exp(-0.001 * log(d));
        s = max(s, st);
        d += s.x;
        p = ro + rd * d;
    }
    dl += 2.52;
    f /= dl / 7.04;
    f = mix(f.rgb, vec3(0), 1. - exp(-.0017 * d * d));
    return f;
}

void mainImage( out vec4 f, in vec2 g )
{
    t = uTime * 1.5;
    f = vec4(0, 0.15, 0.32, 1);
    vec2 uScreenSize = uResolution.xy;
    vec2 q = g / uScreenSize;
    vec3 ro = vec3(cos(-t), sin(-t), t) * vec3(vec2(8. + (sin(t) * .5 + .5) * 4.), 5.);
    vec3 rd = cam((2. * g - uScreenSize) / uScreenSize.y, ro, vec3(0, 1, 0), ro + vec3(0, 0, 1), 3.5);
    f.rgb = march(f.rgb, ro, rd, 0.396);
    f.rgb *= 0.5 + 0.5 * pow(16.0 * q.x * q.y * (1.0 - q.x) * (1.0 - q.y), 0.25);
}
