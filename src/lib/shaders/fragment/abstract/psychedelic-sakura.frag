// Based on Shadertoy "PsychedelicSakura" by Reva — https://www.shadertoy.com/view/wlGXRD
// @perf-tier: quest-safe
// @cost: polar math + cosine palette, no loops

#pragma include <color>

float plot(float r, float pct) {
    return smoothstep(pct - 0.2, pct, r) - smoothstep(pct, pct + 0.2, r);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / uResolution.xy;
    vec3 col = vec3(1.0);
    vec2 pos = vec2(0.5) - uv;
    pos.x *= uResolution.x / uResolution.y;
    pos *= cos(uTime) * 1.0 + 1.5;

    float r = length(pos) * 2.0;
    float a = atan(pos.y, pos.x);

    float f = abs(cos(a * 2.5 + uTime * 0.5)) * sin(uTime * 2.0) * 0.698 + cos(uTime) - 4.0;
    float d = f - r;

    col = (vec3(smoothstep(fract(d), fract(d) + -0.200, 0.160)) - vec3(smoothstep(fract(d), fract(d) + -1.184, 0.160)))
        * cosinePalette(f, vec3(0.725, 0.475, 0.440), vec3(0.605, 0.587, 0.007), vec3(1.0, 1.0, 1.0), vec3(0.310, 0.410, 0.154));
    float pct = plot(r * 0.272, fract(d * (sin(uTime) * 0.45 + 0.5)));

    col += pct * cosinePalette(r, vec3(0.750, 0.360, 0.352), vec3(0.450, 0.372, 0.271), vec3(0.540, 0.442, 0.264), vec3(0.038, 0.350, 0.107));

    fragColor = vec4(col, pct * 0.3);
}
