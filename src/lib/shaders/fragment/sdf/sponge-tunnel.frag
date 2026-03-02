// @name Sponge Tunnel
// @description Raymarched Menger sponge tunnel with polar modulation
// @perf-tier desktop-only
// @tags raymarching, menger-sponge, fractal, tunnel
// @credits hatuxes — https://www.shadertoy.com/view/ttK3Wt
// @cost ~48 march steps x 3 fractal levels
//
//
// Based on Shadertoy "Sponge Tunnel" by hatuxes — https://www.shadertoy.com/view/ttK3Wt

const float pi = acos(-1.0);
const float pi2 = pi * 2.0;

mat2 rot(float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, s, -s, c);
}

vec2 pmod(vec2 p, float r) {
    float a = atan(p.x, p.y) + pi / r;
    float n = pi2 * (-sin(0.42 * uTime) * sin(0.42 * uTime) + 0.35) / r;
    a = floor(a / n) * n - pi;
    return p * rot(-a);
}

float crossf(vec3 p, float r) {
    p = abs(p);
    float dxy = max(p.x, p.y);
    float dyz = max(p.y, p.z);
    float dxz = max(p.z, p.x);
    return min(dxy, min(dyz, dxz)) - r;
}

float boxf(vec3 p, vec3 b) {
    p = abs(p) - b;
    return length(max(p, 0.0)) + min(max(p.x, max(p.y, p.z)), 0.0);
}

float mengersponge(vec3 p, float scale, float width) {
    float d = boxf(p, vec3(1.0));
    float s = 1.0;
    for (int i = 0; i < 3; i++) {
        vec3 a = mod(p * s, 2.0) - 1.0;
        s *= scale;
        vec3 r = 1.0 - scale * abs(a);
        float c = crossf(r, width) / s;
        d = max(d, c);
    }
    return d;
}

float map(vec3 p) {
    p = mod(p, 4.0) - 2.0;
    return mengersponge(p, 3.0, 1.0);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord.xy * 2.0 - uResolution.xy) / min(uResolution.x, uResolution.y);
    vec3 ro = vec3(0.0, 0.0, 8.0 * uTime);
    vec3 rd = normalize(vec3(uv, 0.8 * sin(0.58 * uTime)));
    vec3 col = vec3(0);
    float dp = 0.0, dpp = 0.0;
    for (int i = 0; i < 48; i++) {
        vec3 pos = ro + rd * dp;
        pos.xy *= rot(0.1 * uTime);
        pos.xy = pmod(pos.xy, 8.0);
        float d = map(pos);
        if (d < 0.00001) {
            col = vec3(1.0 - float(i) * 0.02);
            break;
        }
        dp += d * 0.8;
        dpp = d * 75.516;
    }
    fragColor = vec4(col, dpp);
}
