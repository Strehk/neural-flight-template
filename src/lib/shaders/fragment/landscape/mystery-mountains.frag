// Based on Shadertoy "[2TC 15] Mystery Mountains" by David Hoskins — https://www.shadertoy.com/view/llsGW7
// Textures replaced with procedural equivalents
#pragma include <math>

uniform float uTime;
uniform vec2 uResolution;

// Procedural noise replacement for texture lookup
float pnoise(vec2 p) {
    return hash21(floor(p) + hash21(floor(p) + 0.5) * 0.5) * 0.5 + 0.25;
}

vec4 texNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    float val = mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    return vec4(val);
}

// Replaces: #define F +texture(iChannel0,.3+p.xz*s/3e3)/(s+=s)
#define F +texNoise(.3+p.xz*s/3e3)/(s+=s)

void mainImage( out vec4 c, vec2 w )
{
    vec4 p = vec4(w / uResolution.xy, 1, 1) - .5, d = p, t;
    p.z += uTime * 20.; d.y -= .4;

    for(float i = 1.5; i > 0.; i -= .002)
    {
        float s = .5;
        t = F F F F F F;
        c = 1. + d.x - t * i; c.z -= .1;
        if(t.x > p.y * .007 + 1.3) break;
        p += d;
    }
}
