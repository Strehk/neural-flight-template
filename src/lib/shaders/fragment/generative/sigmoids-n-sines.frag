// Based on Shadertoy "[SIG15] sigmoids n sines" by victor_shepardson — https://www.shadertoy.com/view/ltfXzj
// @perf-tier: quest-safe
// @cost: sigmoid/sine feedback, no raymarching

const float pi = 3.14159;

float sigmoid(float x) {
    return x / (1.0 + abs(x));
}

float iter(vec2 p, vec4 a, vec4 wt, vec4 ws, float t, float m, float stereo) {
    float wp = 0.2;
    vec4 phase = vec4(mod(t, wp), mod(t + wp * 0.25, wp), mod(t + wp * 0.5, wp), mod(t + wp * 0.75, wp)) / wp;
    float zoom = 1.0 / (1.0 + 0.5 * (p.x * p.x + p.y * p.y));
    vec4 scale = zoom * pow(vec4(2.0), -4.0 * phase);
    vec4 ms = 0.5 - 0.5 * cos(2.0 * pi * phase);
    vec4 pan = stereo / scale * (1.0 - phase) * (1.0 - phase);
    vec4 v = ms * sin(wt * (t + m) + (m + ws * scale) * ((p.x + pan) * cos((t + m) * a) + p.y * sin((t + m) * a)));
    return sigmoid(v.x + v.y + v.z + v.w + m);
}

vec3 scene(float gt, vec2 uv, vec4 a0, vec4 wt0, vec4 ws0, float blur) {
    // time modulation
    float tm = mod(0.0411 * gt, 1.0);
    tm = sin(2.0 * pi * tm * tm);
    float t = (0.04 * gt + 0.05 * tm);

    float stereo = 1.0 * (sigmoid(2.0 * (sin(1.325 * t * cos(0.5 * t)) + sin(-0.7 * t * sin(0.77 * t)))));

    // spatial offset
    uv += 0.5 * sin(0.33 * t) * vec2(cos(t), sin(t));

    // wildly iterate and divide
    float p0 = iter(uv, a0, wt0, ws0, t, 0.0, stereo);
    float p1 = iter(uv, a0, wt0, ws0, t, p0, stereo);
    float p2 = sigmoid(p0 / (p1 + blur));
    float p3 = iter(uv, a0, wt0, ws0, t, p2, stereo);
    float p4 = sigmoid(p3 / (p2 + blur));
    float p5 = iter(uv, a0, wt0, ws0, t, p4, stereo);
    float p6 = sigmoid(p4 / (p5 + blur));
    float p7 = iter(uv, a0, wt0, ws0, t, p6, stereo);
    float p8 = sigmoid(p4 / (p2 + blur));
    float p9 = sigmoid(p8 / (p7 + blur));
    float p10 = iter(uv, a0, wt0, ws0, t, p8, stereo);
    float p11 = iter(uv, a0, wt0, ws0, t, p9, stereo);
    float p12 = sigmoid(p11 / (p10 + blur));
    float p13 = iter(uv, a0, wt0, ws0, t, p12, stereo);

    // colors
    vec3 accent_color = vec3(1.0, 0.2, 0.0);
    float r = sigmoid(p0 + p1 + p5 + p7 + p10 + p11 + p13);
    float g = sigmoid(p0 - p1 + p3 + p7 + p10 + p11);
    float b = sigmoid(p0 + p1 + p3 + p5 + p11 + p13);

    vec3 c = max(vec3(0.0), 0.4 + 0.6 * vec3(r, g, b));

    float eps = 0.4;
    float canary = min(abs(p1), abs(p2));
    canary = min(canary, abs(p5));
    canary = min(canary, abs(p7));
    canary = min(canary, abs(p10));
    float m = max(0.0, eps - canary) / eps;
    m = sigmoid((m - 0.5) * 700.0 / (1.0 + 10.0 * blur)) * 0.5 + 0.5;
    vec3 m3 = m * (1.0 - accent_color);
    c *= 0.8 * (1.0 - m3) + 0.3;

    return c;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    float s = min(uResolution.x, uResolution.y);
    vec2 uv = (2.0 * fragCoord.xy - uResolution.xy) / s;

    float blur = 0.5 * (uv.x * uv.x + uv.y * uv.y);

    // angular, spatial and temporal frequencies
    vec4 a0 = pi * vec4(0.1, -0.11, 0.111, -0.1111);
    vec4 wt0 = 2.0 * pi * vec4(0.3);
    vec4 ws0 = 2.5 * vec4(11.0, 13.0, 11.0, 5.0);

    // aa and motion blur
    float mb = 1.0;
    float t = 1100.0 + uTime;
    vec3 c = scene(t, uv, a0, wt0, ws0, blur)
        + scene(t - mb * 0.00185, uv + (1.0 + blur) * vec2(0.66 / s, 0.0), a0, wt0, ws0, blur)
        + scene(t - mb * 0.00370, uv + (1.0 + blur) * vec2(-0.66 / s, 0.0), a0, wt0, ws0, blur)
        + scene(t - mb * 0.00555, uv + (1.0 + blur) * vec2(0.0, 0.66 / s), a0, wt0, ws0, blur)
        + scene(t - mb * 0.00741, uv + (1.0 + blur) * vec2(0.0, -0.66 / s), a0, wt0, ws0, blur)
        + scene(t - mb * 0.00926, uv + (1.0 + blur) * vec2(0.5 / s, 0.5 / s), a0, wt0, ws0, blur)
        + scene(t - mb * 0.01111, uv + (1.0 + blur) * vec2(-0.5 / s, 0.5 / s), a0, wt0, ws0, blur)
        + scene(t - mb * 0.01296, uv + (1.0 + blur) * vec2(-0.5 / s, -0.5 / s), a0, wt0, ws0, blur)
        + scene(t - mb * 0.01481, uv + (1.0 + blur) * vec2(0.5 / s, -0.5 / s), a0, wt0, ws0, blur);
    c /= 9.0;

    fragColor = vec4(c, 1.0);
}
