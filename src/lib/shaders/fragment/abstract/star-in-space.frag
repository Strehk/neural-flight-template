// Based on Shadertoy "star in space3" by nayk — https://www.shadertoy.com/view/XXySWy

#define iterations 10
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

#define TAU 6.28318530718

#define TILING_FACTOR 1.0
#define MAX_ITER 8
#define PI 3.141592654

mat2 rot(float x) {
    return mat2(cos(x), sin(x), -sin(x), cos(x));
}

float waterHighlight(vec2 p, float time, float foaminess) {
    vec2 i = vec2(p);
    float c = 0.0;
    float foaminess_factor = mix(1.0, 0.5, foaminess);
    float inten = .005 * foaminess_factor;

    for (int n = 0; n < MAX_ITER; n++) {
        float t = time * (1.0 - (3.5 / float(n + 1)));
        i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
        c += 1.0 / length(vec2(p.x / (sin(i.x + t)), p.y / (cos(i.y + t))));
    }
    c = 0.2 + c / (inten * float(MAX_ITER));
    c = 1.17 - pow(c, 1.4);
    c = pow(abs(c), 8.0);
    return c / sqrt(foaminess_factor);
}

vec2 foldRotate(in vec2 p, in float s) {
    float a = PI / s - atan(p.x, p.y);
    float n = PI * 2. / s;
    a = floor(a / n) * n;
    p *= rot(a);
    return p;
}

void mainVR(out vec4 fragColor, in vec2 fragCoord, in vec3 ro, in vec3 rd) {
    vec3 dir = rd;
    vec3 from = ro;

    float s = 0.1, fade = 1.;
    vec3 v = vec3(0.);
    for (int r = 0; r < volsteps; r++) {
        vec3 p = from + s * dir * .5;
        p = abs(vec3(tile) - mod(p, vec3(tile * 2.)));
        float pa, a = pa = 0.;
        for (int i = 0; i < iterations; i++) {
            p = abs(p) / dot(p, p) - formuparam;
            p.xy *= mat2(cos(uTime * 0.05), sin(uTime * 0.05), -sin(uTime * 0.05), cos(uTime * 0.05));
            a += abs(length(p) - pa);
            pa = length(p);
        }
        float dm = max(0., darkmatter - a * a * .001);
        a *= a * a;
        if (r > 6) fade *= 1.5 - dm;
        v += fade;
        v += vec3(s, s * s, s * s * s * s) * a * brightness * fade;
        fade *= distfading;
        s += stepsize;
    }
    v = mix(vec3(length(v)), v, saturation);
    fragColor = vec4(v * .01, 1.);
}

float happy_star(vec2 uv, float anim) {
    uv = abs(uv);
    vec2 pos = min(uv.xy / uv.yx, anim);
    float p = (2.0 - pos.x - pos.y);
    return (2.0 + p * (p * p - 1.5)) / (uv.x + uv.y);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / uResolution.xy - .5;
    uv.y *= uResolution.y / uResolution.x;
    vec3 dir = vec3(uv * zoom, 1.);
    float time = uTime * speed + .25;

    float time2 = uTime * 0.1 + 23.0;
    vec2 uv2 = fragCoord.xy / uResolution.xy;
    vec2 uv_square = vec2(uv2.x * uResolution.x / uResolution.y, uv.y);
    float dist_center = pow(2.0 * length(uv2 - 0.5), 2.0);
    vec2 uv3 = fragCoord / uResolution.xy;
    uv3 = uv3 * 2.0 - 1.0;
    uv3.x *= uResolution.x / uResolution.y;

    float time3 = uTime * 0.5;

    dir.xy += foldRotate(dir.xy, uTime * 2.1);
    float angle = atan(uv3.y, uv3.x);
    float radius = length(uv3);

    float twist = sin(radius * 10.0 - time * 5.0) * 0.5;
    angle += twist;

    uv3 = vec2(cos(angle), sin(angle)) * radius;

    vec3 color3 = vec3(0.5 + 0.5 * cos(uTime + uv3.xyx + vec3(0, 2, 4)));
    float foaminess = smoothstep(0.4, 1.8, dist_center);
    float clearness = 0.1 + 0.9 * smoothstep(0.1, 0.5, dist_center);

    vec2 p = mod(uv_square * TAU * TILING_FACTOR, TAU) - 250.0;

    float c = waterHighlight(p, time2, foaminess);

    vec3 water_color = vec3(0.0, 0.5, 1.0);
    vec3 color = vec3(c);
    color = clamp(color + water_color, 0.0, 1.0);

    color = mix(water_color, color, clearness);

    vec3 from = vec3(1., .5, 0.5);

    mainVR(fragColor, fragCoord, from, dir);
    fragColor += vec4(color * color3, 1.);
    uv *= 2.0 * (cos(uTime * 2.0) - 2.5);
    float anim = sin(uTime * 12.0) * 0.1 + 1.0;
    fragColor *= vec4(happy_star(uv, anim) * vec3(0.55, 0.5, 0.55) * 1.0, 1.0);
}
