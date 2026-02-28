// Based on Shadertoy "colorful galaxy audio visualizer" by berelium — https://www.shadertoy.com/view/MXXcD4
// Textures replaced with procedural equivalents (audio → time-based)

uniform float uTime;
uniform vec2 uResolution;

// Audio FFT replacement: time-based oscillation
#define FFT(a) pow(0.5 + 0.3 * sin(uTime * float(a) * 0.05 + float(a) * 0.3), 5.)

#define iterations 13
#define formuparam 0.53
#define volsteps 20
#define stepsize 0.1
#define zoom   0.800
#define tile   0.850
#define brightness 0.0015
#define darkmatter 0.300
#define distfading 0.730
#define saturation 0.850
#define PI 3.141592
#define TWOPI 6.283184
#define D2R PI/180.0*

float iAmplifiedTime = 0.;
mat2 rotMat(in float r) { float c = cos(r); float s = sin(r); return mat2(c, -s, s, c); }
float abs1d(in float x) { return abs(fract(x) - 0.5); }
vec2 abs2d(in vec2 v) { return abs(fract(v) - 0.5); }
float cos1d(float p) { return cos(p * TWOPI) * 0.25 + 0.25; }
float sin1d(float p) { return sin(p * TWOPI) * 0.25 + 0.25; }

#define OC 15.0
vec3 Oilnoise(in vec2 pos, in vec3 RGB)
{
    vec2 q = vec2(0.0);
    float result = 0.0;
    float s = 2.2;
    float gain = 0.44;
    vec2 aPos = abs2d(pos) * 0.5;

    for(float i = 0.0; i < OC; i++)
    {
        pos *= rotMat(D2R 30.);
        float time2 = (sin(iAmplifiedTime) * 0.5 + 0.5) * 0.2 + iAmplifiedTime * 0.8;
        q = pos * s + time2;
        q = pos * s + aPos + time2;
        q = vec2(cos(q));
        result += sin1d(dot(q, vec2(0.3))) * gain;
        s *= 1.07;
        aPos += cos(smoothstep(0.0, 0.15, q));
        aPos *= rotMat(D2R 5.0);
        aPos *= 1.232;
    }
    result = pow(result, 4.504);
    return clamp(RGB / abs1d(dot(q, vec2(-0.240, 0.000))) * .5 / result, vec3(0.0), vec3(1.0));
}

float easeFade(float x) { return 1. - (2. * x - 1.) * (2. * x - 1.) * (2. * x - 1.) * (2. * x - 1.); }
float holeFade(float t, float life, float lo) { return easeFade(mod(t - lo, life) / life); }
vec2 getPos(float t, float life, float offset, float lo) {
    return vec2(cos(offset + floor((t - lo) / life) * life) * uResolution.x / 2.,
    sin(2. * offset + floor((t - lo) / life) * life) * uResolution.y / 2.);
}

float happy_star(vec2 uv, float anim)
{
    uv = abs(uv);
    vec2 pos = min(uv.xy / uv.yx, anim);
    float p = (2.0 - pos.x - pos.y);
    return (2.0 + p * (p * p - 1.5)) / (uv.x + uv.y);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    float add_to_time = 0.;
    for (int i = 0; i < 45; i++) {
        add_to_time += FFT((1. + float(i) * 2.));
    }
    add_to_time /= 45.;
    iAmplifiedTime = uTime + add_to_time;

    vec4 o = fragColor;
    vec2 u = fragCoord;
    vec2 uv = fragCoord.xy / uResolution.xy - .5;

    vec2 st = (fragCoord / uResolution.xy);
    st.x = ((st.x - 0.5) * (uResolution.x / uResolution.y)) + 0.5;
    st *= 3.;

    vec3 rgb = vec3(0.30, .8, 1.200);
    vec3 col = Oilnoise(st, rgb);

    uv.y *= uResolution.y / uResolution.x;
    vec2 v = uResolution.xy, w,
         k = u = .2 * (u + u - v) / v.y;

    o = vec4(1, 2, 3, 0);

    for (float a = .5, t = iAmplifiedTime * 0.21, i = 0.;
         ++i < 19.;
         o += (1. + cos(vec4(0, 1, 3, 0) + t))
           / length((1. + i * dot(v, v)) * sin(w * 3. - 9. * u.yx + t)))
        v = cos(++t - 7. * u * pow(a += .03, i)) - 5. * u,
        u *= mat2(cos(i + t * .02 - vec4(0, 11, 33, 0))),
        u += .005 * tanh(40. * dot(u, u) * cos(1e2 * u.yx + t))
           + .2 * a * u
           + .003 * cos(t + 4. * exp(-.01 * dot(o, o))),
        w = u / (1. - 2. * dot(u, u));

    o = pow(o = 1. - sqrt(exp(-o * o * o / 2e2)), .3 * o / o)
      - dot(k -= u, k) / 250.;

    vec3 dir = vec3(uv * zoom, 1.);
    vec2 coord = fragCoord * 2. - uResolution.xy;

    float holeSize = uResolution.y / 10.;
    float holeLife = 2.;

    vec3 final2 = vec3(0);
    float audio_avg = 0.;
    for (int i = 0; i < 45; i++) {
        audio_avg += FFT((1. + float(i) * 2.));
        float audio = FFT((1. + float(i) * 2.)) * 7.;
        vec3 col2 = 0.5 + 0.5 * cos(iAmplifiedTime + uv.xyx + vec3(float(i), 2. * float(i) + 4., 4. * float(i) + 16.));
        float s = holeSize;
        float lifeOffset = float(i) / 2.;
        vec2 pos = getPos(iAmplifiedTime, holeLife, float(i) * 4.5, lifeOffset);
        float d = distance(coord, pos) / s;
        d = 1. / d - .1;
        final2 += mix(vec3(0), col2, d) * holeFade(iAmplifiedTime, holeLife, lifeOffset) * audio;
    }
    audio_avg /= 45.;

    if(audio_avg > .1855) {
        final2 = 1.0 - final2.rgb + final2 * audio_avg * 14. * (vec3(FFT(0) * .75, FFT(25), FFT(50) * 1.5 * audio_avg) * 1.2);
    }

    vec3 from = vec3(1., .5, 0.5);

    // Inline VR volumetric rendering
    float s2 = 0.1, fade = 1.;
    vec3 v2 = vec3(0.);
    for (int r = 0; r < volsteps; r++) {
        vec3 p = from + s2 * dir * .5;
        p = abs(vec3(tile) - mod(p, vec3(tile * 2.)));
        float pa, a2 = pa = 0.;
        for (int j = 0; j < iterations; j++) {
            p = abs(p) / dot(p, p) - formuparam;
            p.xy *= mat2(cos(iAmplifiedTime * 0.01), sin(iAmplifiedTime * 0.01), -sin(iAmplifiedTime * 0.01), cos(iAmplifiedTime * 0.01));
            a2 += abs(length(p) - pa);
            pa = length(p);
        }
        float dm = max(0., darkmatter - a2 * a2 * .001);
        a2 *= a2 * a2;
        if (r > 6) fade *= 1.3 - dm;
        v2 += fade;
        v2 += vec3(s2, s2 * s2, s2 * s2 * s2 * s2) * a2 * brightness * fade;
        fade *= distfading;
        s2 += stepsize;
    }
    v2 = mix(vec3(length(v2)), v2, saturation);

    fragColor = vec4(v2 * .01, 1.);
    fragColor *= vec4(final2 * vec3(0.4, 1., 1.) + o.xyz, 1.);
}
