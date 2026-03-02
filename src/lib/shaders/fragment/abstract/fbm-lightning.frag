// @name Fbm Lightning
// @description FBM-based lightning bolt effect with procedural glow
// @perf-tier quest-safe
// @tags fbm, lightning, glow, procedural
// @credits nayk — https://www.shadertoy.com/view/MXyyWV
// @cost fbm noise, no raymarching
//
// Based on Shadertoy "fbm lightning and hole" by XT95 — https://www.shadertoy.com/view/MXyyWV
// Textures replaced with procedural equivalents

#pragma include <math>
#pragma include <transforms>

#define iterations 13
#define formuparam 0.53
#define volsteps 20
#define stepsize 0.1
#define zoom   0.800
#define tile   0.850
#define speed  0.000
#define brightness 0.0015
#define darkmatter 0.300
#define distfading 0.730
#define saturation 0.850
#define PI 3.1415926538

// Rodrigues' rotation
vec3 rot(vec3 v, vec3 u, float a) {
    float c = cos(a);
    float s = sin(a);
    return v * c + cross(u, v) * s + u * dot(u, v) * (1. - c);
}

float hash_local(float p) {
    p = fract(p * 0.011); p *= p + 7.5; p *= p + p;
    return fract(p);
}

float noise_3d(vec3 x) {
    const vec3 st = vec3(110, 241, 171);
    vec3 i = floor(x);
    vec3 f = fract(x);
    float n = dot(i, st);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash_local(n + dot(st, vec3(0,0,0))), hash_local(n + dot(st, vec3(1,0,0))), u.x),
                   mix(hash_local(n + dot(st, vec3(0,1,0))), hash_local(n + dot(st, vec3(1,1,0))), u.x), u.y),
               mix(mix(hash_local(n + dot(st, vec3(0,0,1))), hash_local(n + dot(st, vec3(1,0,1))), u.x),
                   mix(hash_local(n + dot(st, vec3(0,1,1))), hash_local(n + dot(st, vec3(1,1,1))), u.x), u.y), u.z);
}

float fbm_3d(vec3 x) {
    float v = 0.0;
    float a = 0.5;
    vec3 shift = vec3(100);
    for (int i = 0; i < 4; ++i) {
        v += a * noise_3d(x);
        x = x * 2.5 + shift;
        a *= 0.5;
    }
    return v;
}

float noise_2d(vec2 p) {
    vec2 ip = floor(p);
    vec2 fp = fract(p);
    float a = hash21(ip);
    float b = hash21(ip + vec2(1, 0));
    float c = hash21(ip + vec2(0, 1));
    float d = hash21(ip + vec2(1, 1));
    vec2 t = smoothstep(0.0, 1.0, fp);
    return mix(mix(a, b, t.x), mix(c, d, t.x), t.y);
}

float fbm_2d(vec2 p, int octaveCount) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 10; ++i) {
        if (i >= octaveCount) break;
        value += amplitude * noise_2d(p);
        p *= rotate2D(0.45);
        p *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

vec3 background(in vec3 rd) {
    vec3 gc = vec3(0., 0., 1.);
    float i = (1. - abs(rd.y - gc.y));
    vec3 val = vec3(pow(i, 8.)) * fbm_3d((rd + vec3(2., 1, -4.)) * 10.) * 0.5;
    val *= clamp(dot(rd.xz, gc.xz), 0., 1.);
    val *= 0.5 / distance(vec3(rd.x / 2.5, rd.y * 6., rd.z), gc);
    val.r *= 1. / distance(rd, gc);
    val.b *= distance(rd, gc);
    val.g = (val.r + val.b) / 4.;
    val /= fbm_3d(-rd);
    val = clamp(val, 0., 1.);
    if(abs(gc.y - rd.y) <= 0.1)
        val -= fbm_3d(rd * 30.) * vec3(1. - abs(gc.y - rd.y) * 10.) * vec3(0.2, 0.8, 0.9) * pow(clamp(dot(rd, gc), 0., 1.), 1.5);
    float s = fbm_3d(rd * 100.);
    s = pow(s * 1.18, 15.0);
    val += s;
    return val;
}

const float G = 0.01;
const float c = 100.;

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = fragCoord.xy / uResolution.xy - .5;
    vec4 o = fragColor;
    vec2 F = fragCoord;
    vec2 R = uResolution.xy;
    o -= o;
    for(float d, t = -uTime * .01, i = 0.; i > -1.; i -= .06)
    {
        d = fract(i - 3. * t);
        vec4 c2 = vec4((F - R * .5) / R.y * d, i, 0) * 28.;
        for (int j = 0; j++ < 27;)
            c2.xzyw = abs(c2 / dot(c2, c2)
                    - vec4(7. - .2 * sin(t), 6.3, .7, 1. - cos(t / .8)) / 7.);
        o -= c2 * c2.yzww * d-- * d / vec4(2, 1, 1, 1);
    }
    uv /= 1.0 - uv.y * 3.5;

    vec3 dir = vec3(uv * zoom, 1.);

    vec2 uv3 = fragCoord / uResolution.xy;
    uv3 = 2.0 * uv3 - 1.0;
    uv3.x *= uResolution.x / uResolution.y;
    uv3 /= 1.0 - uv3.y * 3.5;
    uv3 += 2.0 * fbm_2d(uv3 + 0.8 * uTime, 10) - 1.0;

    float dist = abs(uv3.x);
    vec3 col3 = vec3(0.2, 1.3, 0.8) * pow(mix(0.0, 0.07, hash11(uTime)) / dist, 1.0);
    col3 = pow(col3, vec3(1.0));

    vec3 ro = vec3(5., 0., -10);
    vec3 rd = normalize(vec3(uv, 1.));

    float time2 = uTime;
    vec3 col = vec3(0.);
    vec4 bh = vec4(3., 0., 0., 100000.);
    float k = 4.;
    bh.x += cos(time2) * k;
    bh.y += sin(time2) * k;

    vec3 cam = vec3(0., 0., 1.);
    vec3 rb = bh.xyz - ro;
    float a = acos(dot(rb, cam) / length(rb));
    vec3 rn = normalize(cross(rb, cam));
    rd = rot(rd, rn, -a * 0.8 + sin(time2) * 0.1);

    float t = dot(rd, bh.xyz - ro);
    vec3 v = ro + rd * t - bh.xyz;
    float r = length(v);

    float rs = 2. * G * bh.w / (c * c);
    if(r >= rs) {
        vec3 nml = normalize(cross(v, rd));
        float deflA = 4. * bh.w * G / (r * c * c);
        rd = rot(rd, nml, deflA);
        col = background(rd);
    }

    vec3 from = vec3(1., .5, 0.5) * col * o.xyz + col3;

    // Inline VR volumetric rendering
    float s2 = 0.1, fade = 1.;
    vec3 v2 = vec3(0.);
    for (int r2 = 0; r2 < volsteps; r2++) {
        vec3 p = from + s2 * dir * .5;
        p = abs(vec3(tile) - mod(p, vec3(tile * 2.)));
        float pa, a2 = pa = 0.;
        for (int i2 = 0; i2 < iterations; i2++) {
            p = abs(p) / dot(p, p) - formuparam;
            p.xy *= mat2(cos(uTime * 0.02), sin(uTime * 0.02), -sin(uTime * 0.02), cos(uTime * 0.02));
            a2 += abs(length(p) - pa);
            pa = length(p);
        }
        float dm = max(0., darkmatter - a2 * a2 * .001);
        a2 *= a2 * a2;
        if (r2 > 6) fade *= 1. - dm;
        v2 += fade;
        v2 += vec3(s2, s2 * s2, s2 * s2 * s2 * s2) * a2 * brightness * fade;
        fade *= distfading;
        s2 += stepsize;
    }
    v2 = mix(vec3(length(v2)), v2, saturation);

    fragColor = vec4(v2 * .03, 1.);
    fragColor += vec4(col + col3, 1.);
}
