// Based on Shadertoy "Ribbon Assault" by Dave_Hoskins — https://www.shadertoy.com/view/MdBGDK
// License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.
// @perf-tier: quest-safe
// @cost: Julia-like orbit traps, 2D fractal

void mainImage(out vec4 o, vec2 U) {
    float T = uTime, f = 3., g = f, d;
    vec2 r = uResolution.xy, m = uMouse.xy, p, u = (U + U - r) / r.y;
    if (length(uMouse) < 0.5) m = (vec2(sin(T * .3) * sin(T * .17) + sin(T * .3),
          (1. - cos(T * .632)) * sin(T * .131) * 1. + cos(T * .3)) + 1.) * r;
    p = (2. + m - r) / r.y;
    for (int i = 0; i < 20; i++)
        u = vec2(u.x, -u.y) / dot(u, u) + p,
        u.x = abs(u.x),
        f = max(f, dot(u - p, u - p)),
        g = min(g, sin(dot(u + p, u + p)) + 1.);
    f = abs(-log(f) / 3.5);
    g = abs(-log(g) / 8.);
    o = min(vec4(g, g * f, f, 0), 1.);
}
