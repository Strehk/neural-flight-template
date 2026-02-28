// Based on Shadertoy "Dreaming about Clouds" by iq — https://www.shadertoy.com/view/MtXXz4
// Textures replaced with procedural equivalents
#pragma include <math>

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;

// Procedural 3D noise replacing textureLod(iChannel0, (uv+0.5)/256.0, 0.0)
float noise(in vec3 x)
{
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    vec2 uv = (p.xy + vec2(37.0, 17.0) * p.z) + f.xy;
    float a = hash21(uv * 0.00390625);
    float b = hash21((uv + vec2(1.0, 0.0)) * 0.00390625);
    return -1.0 + 2.0 * mix(a, b, f.z);
}

float map5(in vec3 p)
{
    vec3 q = p - vec3(0.0, 0.1, 1.0) * uTime;
    float f;
    f  = 0.50000 * noise(q); q = q * 2.02;
    f += 0.25000 * noise(q); q = q * 2.03;
    f += 0.12500 * noise(q); q = q * 2.01;
    f += 0.06250 * noise(q); q = q * 2.02;
    f += 0.03125 * noise(q);
    return clamp(1.5 - p.y - 2.0 + 1.75 * f, 0.0, 1.0);
}

float map4(in vec3 p)
{
    vec3 q = p - vec3(0.0, 0.1, 1.0) * uTime;
    float f;
    f  = 0.50000 * noise(q); q = q * 2.02;
    f += 0.25000 * noise(q); q = q * 2.03;
    f += 0.12500 * noise(q); q = q * 2.01;
    f += 0.06250 * noise(q);
    return clamp(1.5 - p.y - 2.0 + 1.75 * f, 0.0, 1.0);
}

float map3(in vec3 p)
{
    vec3 q = p - vec3(0.0, 0.1, 1.0) * uTime;
    float f;
    f  = 0.50000 * noise(q); q = q * 2.02;
    f += 0.25000 * noise(q); q = q * 2.03;
    f += 0.12500 * noise(q);
    return clamp(1.5 - p.y - 2.0 + 1.75 * f, 0.0, 1.0);
}

float map2(in vec3 p)
{
    vec3 q = p - vec3(0.0, 0.1, 1.0) * uTime;
    float f;
    f  = 0.50000 * noise(q); q = q * 2.02;
    f += 0.25000 * noise(q);
    return clamp(1.5 - p.y - 2.0 + 1.75 * f, 0.0, 1.0);
}

vec3 sundir = normalize(vec3(-1.0, 0.0, -1.0));

vec4 integrate(in vec4 sum, in float dif, in float den, in vec3 bgcol, in float t)
{
    vec3 lin = vec3(0.65, 0.68, 0.7) * 1.3 + 0.5 * vec3(0.7, 0.5, 0.3) * dif;
    vec4 col = vec4(mix(1.15 * vec3(1.0, 0.95, 0.8), vec3(0.65), den), den);
    col.xyz *= lin;
    col.xyz = mix(col.xyz, bgcol, 1.0 - exp(-0.003 * t * t));
    col.a *= 0.4;
    col.rgb *= col.a;
    return sum + col * (1.0 - sum.a);
}

#define MARCH(STEPS,MAPLOD) for(int i=0; i<STEPS; i++) { vec3 pos = ro + t*rd; if(pos.y<-3.0 || pos.y>2.0 || sum.a > 0.99) break; float den = MAPLOD(pos); if(den>0.01) { float dif = clamp((den - MAPLOD(pos+0.3*sundir))/0.6, 0.0, 1.0); sum = integrate(sum, dif, den, bgcol, t); } t += max(0.1,0.02*t); }

vec4 raymarch(in vec3 ro, in vec3 rd, in vec3 bgcol)
{
    vec4 sum = vec4(0.0);
    float t = 0.0;
    MARCH(30, map5);
    MARCH(30, map4);
    MARCH(30, map3);
    MARCH(30, map2);
    return clamp(sum, 0.0, 1.0);
}

mat3 setCamera(in vec3 ro, in vec3 ta, float cr)
{
    vec3 cw = normalize(ta - ro);
    vec3 cp = vec3(sin(cr), cos(cr), 0.0);
    vec3 cu = normalize(cross(cw, cp));
    vec3 cv = normalize(cross(cu, cw));
    return mat3(cu, cv, cw);
}

// Procedural sky background replacing texture(iChannel1, coo.xy)
vec3 proceduralSky(vec2 coo) {
    float sun = clamp(dot(sundir, normalize(vec3(coo * 2.0 - 1.0, 1.0))), 0.0, 1.0);
    vec3 col = vec3(0.6, 0.71, 0.75) - coo.y * 0.2 * vec3(1.0, 0.5, 1.0) + 0.15 * 0.5;
    col += 0.2 * vec3(1.0, .6, 0.1) * pow(sun, 8.0);
    return col;
}

vec4 render(in vec3 ro, in vec3 rd, in vec2 coo)
{
    float sun = clamp(dot(sundir, rd), 0.0, 1.0);
    vec3 col = vec3(0.6, 0.71, 0.75) - rd.y * 0.2 * vec3(1.0, 0.5, 1.0) + 0.15 * 0.5;
    col += 0.2 * vec3(1.0, .6, 0.1) * pow(sun, 8.0);

    col = proceduralSky(coo.xy);

    vec4 res = raymarch(ro, rd, col);
    col = col * (1.0 - res.w) + res.xyz;

    col += 0.1 * vec3(1.0, 0.4, 0.2) * pow(sun, 3.0);

    return vec4(col, 1.0);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 p = (-uResolution.xy + 2.0 * fragCoord.xy) / uResolution.y;
    vec2 m = uMouse.xy / uResolution.xy;

    vec3 ro = 4.0 * normalize(vec3(sin(3.0 * m.x), 0.4 * m.y, cos(3.0 * m.x)));
    vec3 ta = vec3(0.0, -1.0, 0.0);
    mat3 ca = setCamera(ro, ta, 0.0);
    vec3 rd = ca * normalize(vec3(p.xy, 1.5));

    fragColor = render(ro, rd, fragCoord.xy / uResolution.xy);
}
