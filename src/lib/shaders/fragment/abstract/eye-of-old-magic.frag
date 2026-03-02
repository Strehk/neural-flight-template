// @name Eye of Old Magic Dragon
// @description Multi-layered composition blending 4D Mandelbox fractal, Star Nest volumetrics, FBM nebula, and star burst effects
// @perf-tier showcase
// @tags fractal, mandelbox, volumetric, star-nest, composition, complex
// @credits nayk — https://www.shadertoy.com/view/4c3fRj
// @cost ~8 volsteps x 6 iterations + 11 fractal iterations + fbm, very expensive
//
//
// Based on Shadertoy "eye of old magic dragon" by nayk — https://www.shadertoy.com/view/4c3fRj
// Incorporates "Star Nest" by Pablo Roman Andrioli (MIT License)

#define iterations 6
#define formuparam 0.53
#define volsteps 8
#define stepsize 0.1
#define zoom 0.800
#define tile 0.850
#define speed 0.000
#define brightness 0.0015
#define darkmatter 0.300
#define distfading 0.730
#define saturation 0.850

float happy_star(vec2 uv, float anim) {
    uv = abs(uv);
    vec2 pos = min(uv.xy / uv.yx, anim);
    float p = (2.0 - pos.x - pos.y);
    return (2.0 + p * (p * p - 1.5)) / (uv.x + uv.y);
}

vec4 starNest(in vec2 fragCoord, in vec3 ro, in vec3 rd) {
    vec3 dir = rd;
    vec3 from = ro;

    float s = 0.1, fade = 1.0;
    vec3 v = vec3(0.0);
    for (int r = 0; r < volsteps; r++) {
        vec3 p = from + s * dir * 0.5;
        p = abs(vec3(tile) - mod(p, vec3(tile * 2.0)));
        float pa, a = pa = 0.0;
        for (int i = 0; i < iterations; i++) {
            p = abs(p) / dot(p, p) - formuparam;
            p.xy *= mat2(cos(uTime * 0.01), sin(uTime * 0.01), -sin(uTime * 0.01), cos(uTime * 0.01));
            a += abs(length(p) - pa);
            pa = length(p);
        }
        float dm = max(0.0, darkmatter - a * a * 0.001);
        a *= a * a;
        if (r > 6) fade *= 1.2 - dm;
        v += fade;
        v += vec3(s, s * s, s * s * s * s) * a * brightness * fade;
        fade *= distfading;
        s += stepsize;
    }
    v = mix(vec3(length(v)), v, saturation);
    return vec4(v * 0.01, 1.0);
}

float numOct = 4.0;
float focus = 0.0;
float focus2 = 0.0;

float randomVal(vec2 p) {
    return fract(sin(dot(p, vec2(12.0, 90.0))) * 5e5);
}

mat2 rot2(float an) {
    float cc = cos(an), ss = sin(an);
    return mat2(cc, -ss, ss, cc);
}

float noise3(vec3 p) {
    vec2 i = floor(p.yz);
    vec2 f = fract(p.yz);
    float a = randomVal(i);
    float b = randomVal(i + vec2(1.0, 0.0));
    float c = randomVal(i + vec2(0.0, 1.0));
    float d = randomVal(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm3d(vec3 p) {
    float v = 0.0;
    float a = 0.35;
    for (float i = 0.0; i < numOct; i++) {
        v += a * noise3(p);
        a *= 0.25 * (1.2 + focus + focus2);
    }
    return v;
}

vec3 hash33(vec3 p3) {
    p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
    p3 += dot(p3, p3.yxz + 19.19);
    return -1.0 + 2.0 * fract(vec3(p3.x + p3.y, p3.x + p3.z, p3.y + p3.z) * p3.zyx);
}

float snoise3(vec3 p) {
    const float K1 = 0.333333333;
    const float K2 = 0.866666667;
    vec3 i = floor(p + (p.x + p.y + p.z) * K1);
    vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);
    vec3 e = step(vec3(0.0), d0 - d0.yzx);
    vec3 i1 = e * (1.0 - e.zxy);
    vec3 i2 = 1.0 - e.zxy * (1.0 - e);
    vec3 d1 = d0 - (i1 - K2);
    vec3 d2 = d0 - (i2 - K1);
    vec3 d3 = d0 - 0.5;
    vec4 h = max(0.3 - vec4(dot(d0, d0), dot(d1, d1), dot(d2, d2), dot(d3, d3)), 0.0);
    vec4 n = h * h * h * h * vec4(dot(d0, hash33(i)), dot(d1, hash33(i + i1)), dot(d2, hash33(i + i2)), dot(d3, hash33(i + 1.0)));
    return dot(vec4(301.316), n);
}

// 4D Mandelbox-like fractal
#define C3(x) x = x > 1.0 ? 2.0 - x : (x < -1.0 ? -2.0 - x : x)

vec3 F(vec3 p) {
    float tt = uTime;
    vec4 q = vec4(p, 1), jc = q;
    q.xz *= rot2(tt / 5.0);
    for (float i = 0.0; i < 11.0; i++) {
        C3(q.x); C3(q.y); C3(q.z); C3(q.w);
        q.xyz /= dot(q.xyz, q.xyz);
        q.yzw /= dot(q.yzw, q.yzw);
        q.zwx /= dot(q.zwx, q.zwx);
        q.xyz *= 0.8; q.yzw *= 0.9; q.zwx *= 1.3;
        q.xy *= rot2(-p.z * p.z);
        q += jc;
    }
    return q.xyz;
}

#define SM(x) max(-x * 0.2, min(0.0, x))

vec3 march(vec3 ro, vec3 rd) {
    vec3 color = vec3(0);
    for (float i = 0.0; i < 3.0; i++) {
        vec3 cx = F(ro + i * 0.6 * rd * (1.0 - SM(4.0)));
        cx = 1.0 - exp(-cx * cx);
        color += cx * cx * exp(-i * i / 1.8 * (1.0 + SM(2.0)));
    }
    return color;
}

vec4 fractalRender(in vec2 U) {
    U = (2.0 * U - uResolution.xy) / uResolution.y * 2.0;
    vec3 rd = normalize(vec3(U, 2));
    vec3 ro = vec3(0, 0, -4.0 - SM(0.5));
    rd.xy *= rot2(uTime / 5.0);
    return vec4(pow(march(ro, rd), vec3(0.45)), 1);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / uResolution.xy - 0.5;
    float t2 = uTime * 0.1 + ((0.25 + 0.05 * sin(uTime * 0.1)) / (length(uv.xy) + 0.07)) * 1.2;
    float si = sin(t2);
    float co = cos(t2);
    mat2 ma = mat2(co, si, -si, co);

    uv.y *= uResolution.y / uResolution.x;
    vec3 dir = vec3(uv * zoom, 0.001);
    float time = uTime * speed + 0.25;

    // Fractal render (no AA)
    vec4 O = fractalRender(fragCoord);

    vec2 uv2 = (2.0 * fragCoord - uResolution.xy) / uResolution.y * 2.5;
    float aspectRatio = uResolution.x / uResolution.y;

    vec3 rd = normalize(vec3(uv2, -1.2));
    vec3 ro = vec3(0);

    float delta = uTime / 1.5;
    rd.yz *= rot2(-delta / 2.0);
    rd.xz *= rot2(delta * 3.0);
    vec3 p = ro + rd;

    float bass = 1.5 + 0.5 * max(0.0, 2.0 * sin(uTime * 3.0));
    vec2 nudgeV = vec2(aspectRatio * cos(uTime * 1.5), sin(uTime * 1.5));

    focus = length(uv2 + nudgeV);
    focus = 2.0 / (1.0 + focus) * bass;

    focus2 = length(uv2 - nudgeV);
    focus2 = 4.0 / (1.0 + focus2 * focus2) / bass;

    vec3 q = vec3(fbm3d(p), fbm3d(p.yzx), fbm3d(p.zxy));
    float f = fbm3d(p + q);

    vec3 cc = q;
    cc *= 20.0 * f;

    cc.r += 5.0 * focus; cc.g += 3.5 * focus;
    cc.b += 7.0 * focus2; cc.r -= 3.5 * focus2;
    cc /= 25.0;

    vec3 from = vec3(1.0, 0.5, 0.5) + O.xyz;

    fragColor = starNest(fragCoord, from, dir);
    uv *= 2.0 * (cos(uTime * 2.0) - 2.5);
    float anim = sin(uTime * 12.0) * 0.1 + 1.0;
    fragColor *= vec4(happy_star(uv, anim) * vec3(0.35, 0.2, 0.55) * 15.0 * O.xyz, 1.0);
    fragColor += vec4(cc * 0.51, 1.0);
}
