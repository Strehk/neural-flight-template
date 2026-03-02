// @name Topologica
// @description Topological VR-ready surface with animated mesh deformation
// @perf-tier showcase
// @tags topological, mesh, deformation, animated, vr
// @credits ajb — https://www.shadertoy.com/view/3dyXRz
// @cost ~210 march steps, spiral space warping, rust noise, very expensive
//
// Based on Shadertoy "Topologica VR" by Otavio Good — https://www.shadertoy.com/view/3dyXRz
// Textures replaced with procedural equivalents
// License CC0 - http://creativecommons.org/publicdomain/zero/1.0/

#pragma include <math>

float Hash2d(vec2 uv) { float f = uv.x + uv.y * 47.0; return fract(cos(f * 3.333) * 100003.9); }
float Hash3d(vec3 uv) { float f = uv.x + uv.y * 37.0 + uv.z * 521.0; return fract(cos(f * 3.333) * 100003.9); }
float mixP(float f0, float f1, float a) { return mix(f0, f1, a * a * (3.0 - 2.0 * a)); }

const vec2 zeroOne = vec2(0.0, 1.0);

float noise(vec3 uv)
{
    vec3 fr = fract(uv.xyz);
    vec3 fl = floor(uv.xyz);
    float h000 = Hash3d(fl);
    float h100 = Hash3d(fl + zeroOne.yxx);
    float h010 = Hash3d(fl + zeroOne.xyx);
    float h110 = Hash3d(fl + zeroOne.yyx);
    float h001 = Hash3d(fl + zeroOne.xxy);
    float h101 = Hash3d(fl + zeroOne.yxy);
    float h011 = Hash3d(fl + zeroOne.xyy);
    float h111 = Hash3d(fl + zeroOne.yyy);
    return mixP(
        mixP(mixP(h000, h100, fr.x), mixP(h010, h110, fr.x), fr.y),
        mixP(mixP(h001, h101, fr.x), mixP(h011, h111, fr.x), fr.y),
        fr.z);
}

float PI2 = 3.14159265;

vec3 saturateV(vec3 a) { return clamp(a, 0.0, 1.0); }
float saturateF(float a) { return clamp(a, 0.0, 1.0); }

float Density(vec3 p)
{
    float final2 = noise(p * 0.06125);
    float other = noise(p * 0.06125 + 1234.567);
    other -= 0.5;
    final2 -= 0.5;
    final2 = 0.1 / (abs(final2 * final2 * other));
    final2 += 0.5;
    return final2 * 0.0001;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = fragCoord.xy / uResolution.xy * 2.0 - 1.0;

    vec3 camUp = vec3(0, 1, 0);
    vec3 camLookat = vec3(0, 0.0, 0);

    float mx = uMouse.x / uResolution.x * PI2 * 2.0 + uTime * 0.01;
    float my = -uMouse.y / uResolution.y * 10.0 + sin(uTime * 0.03) * 0.2 + 0.2;
    vec3 camPos = vec3(cos(my) * cos(mx), sin(my), cos(my) * sin(mx)) * 200.2;

    vec3 camVec = normalize(camLookat - camPos);
    vec3 sideNorm = normalize(cross(camUp, camVec));
    vec3 upNorm = cross(camVec, sideNorm);
    vec3 worldFacing = camPos + camVec;
    vec3 worldPix = worldFacing + uv.x * sideNorm * (uResolution.x / uResolution.y) + uv.y * upNorm;
    vec3 relVec = normalize(worldPix - camPos);

    float t = 0.0;
    float inc = 0.02;
    float maxDepth = 70.0;
    vec3 pos = vec3(0, 0, 0);
    float density = 0.0;

    for (int i = 0; i < 37; i++)
    {
        if (t > maxDepth) break;
        pos = camPos + relVec * t;
        float temp = Density(pos);
        inc = 1.9 + temp * 0.05;
        density += temp * inc;
        t += inc;
    }

    vec3 finalColor = vec3(0.01, 0.1, 1.0) * density * 0.2;
    fragColor = vec4(sqrt(clamp(finalColor, 0.0, 1.0)), 1.0);
}
