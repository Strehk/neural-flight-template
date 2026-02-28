// Based on Shadertoy "Noise animation - Electric" by nimitz (stormoid.com) — https://www.shadertoy.com/view/ldlXRS
// Textures replaced with procedural equivalents
// License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.
#pragma include <math>

uniform float uTime;
uniform vec2 uResolution;

#define time uTime*0.15
#define tau 6.2831853

mat2 makem2(in float theta) { float c = cos(theta); float s = sin(theta); return mat2(c,-s,s,c); }

// Procedural noise replacing texture(iChannel0, x*.01).x
float noise(in vec2 x) {
    vec2 p = floor(x * 0.01 * 256.0);
    vec2 f = fract(x * 0.01 * 256.0);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(p);
    float b = hash21(p + vec2(1.0, 0.0));
    float c = hash21(p + vec2(0.0, 1.0));
    float d = hash21(p + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(in vec2 p)
{
    float z = 2.;
    float rz = 0.;
    vec2 bp = p;
    for (float i = 1.; i < 6.; i++)
    {
        rz += abs((noise(p) - 0.5) * 2.) / z;
        z = z * 2.;
        p = p * 2.;
    }
    return rz;
}

float dualfbm(in vec2 p)
{
    vec2 p2 = p * .7;
    vec2 basis = vec2(fbm(p2 - time * 1.6), fbm(p2 + time * 1.7));
    basis = (basis - .5) * .2;
    p += basis;
    return fbm(p * makem2(time * 0.2));
}

float circ(vec2 p)
{
    float r = length(p);
    r = log(sqrt(r));
    return abs(mod(r * 4., tau) - 3.14) * 3. + .2;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 p = fragCoord.xy / uResolution.xy - 0.5;
    p.x *= uResolution.x / uResolution.y;
    p *= 4.;

    float rz = dualfbm(p);

    p /= exp(mod(time * 10., 3.14159));
    rz *= pow(abs((0.1 - circ(p))), .9);

    vec3 col = vec3(.2, 0.1, 0.4) / rz;
    col = pow(abs(col), vec3(.99));
    fragColor = vec4(col, 1.);
}
