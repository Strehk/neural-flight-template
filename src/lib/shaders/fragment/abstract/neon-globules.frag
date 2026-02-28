// Based on Shadertoy "Neon globules" by WAHa_06x36 — https://www.shadertoy.com/view/WlGXR1

#pragma include <math>

// Custom simplex noise returning vec4(gradient, value) — different from common snippet
vec4 snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 1. + 3.0 * C.xxx;

    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 1.0 / 7.0;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    vec4 m2 = m * m;
    vec4 m4 = m2 * m2;

    vec4 pdotx = vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3));

    vec4 temp = m2 * m * pdotx;
    vec3 grad = -8.0 * (temp.x * x0 + temp.y * x1 + temp.z * x2 + temp.w * x3);
    grad += m4.x * p0 + m4.y * p1 + m4.z * p2 + m4.w * p3;

    return 42.0 * vec4(grad, dot(m4, pdotx));
}

mat3 fromEuler(vec3 ang) {
    vec2 a1 = vec2(sin(ang.x), cos(ang.x));
    vec2 a2 = vec2(sin(ang.y), cos(ang.y));
    vec2 a3 = vec2(sin(ang.z), cos(ang.z));
    return mat3(
        vec3(a1.y * a3.y + a1.x * a2.x * a3.x, a1.y * a2.x * a3.x + a3.y * a1.x, -a2.y * a3.x),
        vec3(-a2.y * a1.x, a1.y * a2.y, a2.x),
        vec3(a3.y * a1.x * a2.x + a1.y * a3.x, a1.x * a3.x - a1.y * a3.y * a2.x, a2.y * a3.y)
    );
}

void mainVR(out vec4 fragColor, in vec2 fragCoord, in vec3 pos, in vec3 dir) {
    float stepSize = 0.2;
    dir = normalize(dir);

    vec3 planeNormal = vec3(0.0, 0.0, 1.0);

    vec3 travel = vec3(0.0, 0.0, uTime * 2.4);
    pos += travel;
    vec3 startPos = pos;

    if (dot(dir, startPos) > 0.0) {
        pos += dir / dot(dir, planeNormal) * stepSize * (-1.0 + fract(-(dot(startPos, planeNormal)) / stepSize));
    } else {
        pos += dir / dot(dir, planeNormal) * stepSize * fract(-(dot(startPos, planeNormal)) / stepSize);
    }

    vec3 col = vec3(0.0);

    for (float i = 0.0; i < 42.0; i++) {
        pos += dir * stepSize / abs(dot(dir, planeNormal));
        vec4 n = snoise(pos * 0.3 + vec3(0.5, 0.5, 0.5));
        float p = n.w + sin(uTime * 3.0) * 0.05 + 0.5;
        float dist = length(startPos - pos);
        float ampl = 1.0 / (abs(dot(dir, planeNormal)) + 0.1);
        float glow = 1.0 / (p * p + 0.0003 * ampl) * ampl * ampl;
        float distanceFadeout = 1.0 / exp(0.6 * dist + 0.5);
        float nearbyFadeout = 1.0 - exp(-0.3 * dist);
        float c = glow * nearbyFadeout * distanceFadeout;
        col += abs(vec3(dir.x, dir.y, dir.z)) * c * 0.01;
    }
    fragColor = vec4(col, 1.0);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 p = (2.0 * fragCoord.xy - uResolution.xy) / min(uResolution.x, uResolution.y);
    vec2 mouse = uMouse.xy == vec2(0.0) ? vec2(0.5) : uMouse.xy / uResolution.xy;

    vec3 ang = vec3(0.0, -(mouse.y - 0.5) * 3.14159265 * 1.0, mouse.x * 3.1415926535 * 2.0);

    vec3 dir = normalize(vec3(p.xy, -1.0 + length(p) * 0.25)) * fromEuler(ang);

    mainVR(fragColor, fragCoord, vec3(0.0), dir);
}
