// @name Fractal Flythrough
// @description Camera flythrough of repeating fractal structure with reflections
// @perf-tier desktop-only
// @tags raymarching, fractal, flythrough, reflections
// @credits Shane — https://www.shadertoy.com/view/4s3SRN
// @cost ~48 march steps, no reflections
//
// Based on Shadertoy "Fractal Flythrough" by Shane — https://www.shadertoy.com/view/4s3SRN
// Textures replaced with procedural equivalents (tri-planar + cube map → procedural noise + env)

#pragma include <math>

const float FAR = 50.0;
float objID = 0.;

float hash_s(float n) { return fract(cos(n) * 45758.5453); }

// Procedural tri-planar replacing tex3D(sampler2D, ...)
vec3 tex3D(in vec3 p, in vec3 n) {
    n = max(abs(n), 0.001);
    n /= dot(n, vec3(1));
    float tx = hash21(p.yz * 3.0);
    float ty = hash21(p.zx * 3.0);
    float tz = hash21(p.xy * 3.0);
    vec3 cx = vec3(tx * 0.8 + 0.1);
    vec3 cy = vec3(ty * 0.8 + 0.1);
    vec3 cz = vec3(tz * 0.8 + 0.1);
    return (cx * cx * n.x + cy * cy * n.y + cz * cz * n.z);
}

float lengthN(in vec2 p, in float n) { p = pow(abs(p), vec2(n)); return pow(p.x + p.y, 1.0 / n); }

vec3 cp[16];

void setCamPath() {
    const float sl = 2. * .96;
    const float bl = 4. * .96;
    cp[0] = vec3(0, 0, 0);       cp[1] = vec3(0, 0, bl);
    cp[2] = vec3(sl, 0, bl);     cp[3] = vec3(sl, 0, sl);
    cp[4] = vec3(sl, sl, sl);    cp[5] = vec3(-sl, sl, sl);
    cp[6] = vec3(-sl, 0, sl);    cp[7] = vec3(-sl, 0, 0);
    cp[8] = vec3(0, 0, 0);       cp[9] = vec3(0, 0, -bl);
    cp[10] = vec3(0, bl, -bl);   cp[11] = vec3(-sl, bl, -bl);
    cp[12] = vec3(-sl, 0, -bl);  cp[13] = vec3(-sl, 0, 0);
    cp[14] = vec3(-sl, -sl, 0);  cp[15] = vec3(0, -sl, 0);
}

vec3 Catmull(vec3 p0, vec3 p1, vec3 p2, vec3 p3, float t) {
    return (((-p0 + p1 * 3. - p2 * 3. + p3) * t * t * t + (p0 * 2. - p1 * 5. + p2 * 4. - p3) * t * t + (-p0 + p2) * t + p1 * 2.) * .5);
}

vec3 camPath(float t) {
    const int aNum = 16;
    t = fract(t / float(aNum)) * float(aNum);
    float segNum = floor(t);
    float segTime = t - segNum;

    if (segNum == 0.) return Catmull(cp[aNum-1], cp[0], cp[1], cp[2], segTime);
    for(int i = 1; i < aNum - 2; i++) {
        if (segNum == float(i)) return Catmull(cp[i-1], cp[i], cp[i+1], cp[i+2], segTime);
    }
    if (segNum == float(aNum-2)) return Catmull(cp[aNum-3], cp[aNum-2], cp[aNum-1], cp[0], segTime);
    if (segNum == float(aNum-1)) return Catmull(cp[aNum-2], cp[aNum-1], cp[0], cp[1], segTime);
    return vec3(0);
}

float sminP(float a, float b, float s) {
    float h = clamp(0.5 + 0.5 * (b - a) / s, 0.0, 1.0);
    return mix(b, a, h) - s * h * (1.0 - h);
}

float map(in vec3 q) {
    vec3 p = abs(fract(q / 4.) * 4. - 2.);
    float tube = min(max(p.x, p.y), min(max(p.y, p.z), max(p.x, p.z))) - 4. / 3. - .015;

    p = abs(fract(q / 2.) * 2. - 1.);
    tube = max(tube, sminP(max(p.x, p.y), sminP(max(p.y, p.z), max(p.x, p.z), .05), .05) - 2. / 3.);

    float panel = sminP(max(p.x, p.y), sminP(max(p.y, p.z), max(p.x, p.z), .125), .125) - 0.5;
    float strip = step(p.x, .75) * step(p.y, .75) * step(p.z, .75);
    panel -= (strip) * .025;

    p = abs(fract(q * 2.) * .5 - .25);
    float pan2 = min(p.x, min(p.y, p.z)) - .05;
    panel = max(abs(panel), abs(pan2)) - .0425;

    p = abs(fract(q * 1.5) / 1.5 - 1. / 3.);
    tube = max(tube, min(max(p.x, p.y), min(max(p.y, p.z), max(p.x, p.z))) - 2. / 9. + .025);

    p = abs(fract(q * 3.) / 3. - 1. / 6.);
    tube = max(tube, min(max(p.x, p.y), min(max(p.y, p.z), max(p.x, p.z))) - 1. / 9. - .035);

    objID = 1. + step(tube, panel) + step(panel, tube) * (strip) * 2.;
    return min(panel, tube);
}

float trace(in vec3 ro, in vec3 rd) {
    float t = 0., h;
    for(int i = 0; i < 48; i++) {
        h = map(ro + rd * t);
        if(abs(h) < .001 * (t * .25 + 1.) || t > FAR) break;
        t += h * .8;
    }
    return t;
}

float refTrace(vec3 ro, vec3 rd) {
    float t = 0.;
    for(int i = 0; i < 16; i++) {
        float d = map(ro + rd * t);
        if (d < .0025 * (t * .25 + 1.) || t > FAR) break;
        t += d;
    }
    return t;
}

vec3 calcNormal(in vec3 p) {
    const vec2 e = vec2(0.005, 0);
    return normalize(vec3(map(p + e.xyy) - map(p - e.xyy), map(p + e.yxy) - map(p - e.yxy), map(p + e.yyx) - map(p - e.yyx)));
}

float calcAO(in vec3 pos, in vec3 nor)
{
    float sca = 2.0, occ = 0.0;
    for(int i = 0; i < 5; i++) {
        float hr = 0.01 + float(i) * 0.5 / 4.0;
        float dd = map(nor * hr + pos);
        occ += (hr - dd) * sca;
        sca *= 0.7;
    }
    return clamp(1.0 - occ, 0.0, 1.0);
}

// Texture bump mapping with procedural noise
vec3 texBump(in vec3 p, in vec3 n, float bf) {
    const vec2 e = vec2(0.001, 0);
    mat3 m = mat3(tex3D(p - e.xyy, n), tex3D(p - e.yxy, n), tex3D(p - e.yyx, n));
    vec3 g = vec3(0.299, 0.587, 0.114) * m;
    g = (g - dot(tex3D(p, n), vec3(0.299, 0.587, 0.114))) / e.x; g -= n * dot(n, g);
    return normalize(n + g * bf);
}

// Procedural env/cube map replacing texture(iChannel1, rf)
vec3 fakeEnv(vec3 rf) {
    float t = 0.5 + 0.5 * rf.y;
    vec3 sky = mix(vec3(0.05, 0.08, 0.1), vec3(0.2, 0.35, 0.5), t);
    float sun = pow(max(dot(rf, normalize(vec3(0.5, 0.3, 0.8))), 0.0), 16.0);
    return sky + vec3(0.4, 0.3, 0.2) * sun;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    vec2 u = (fragCoord - uResolution.xy * 0.5) / uResolution.y;
    float speed = uTime * 0.35 + 8.;

    setCamPath();

    vec3 ro = camPath(speed);
    vec3 lk = camPath(speed + .5);
    vec3 lp = camPath(speed + .5) + vec3(0, .25, 0);

    float FOV = 1.57;
    vec3 fwd = normalize(lk - ro);
    vec3 rgt = normalize(vec3(fwd.z, 0, -fwd.x));
    vec3 up = (cross(fwd, rgt));
    vec3 rd = normalize(fwd + FOV * (u.x * rgt + u.y * up));

    float t = trace(ro, rd);
    vec3 col = vec3(0);

    if(t < FAR) {
        float ts = 1.;
        float saveObjID = objID;

        vec3 pos = ro + rd * t;
        vec3 nor = calcNormal(pos);
        vec3 sNor = nor;
        nor = texBump(pos * ts, nor, 0.0015);

        col = tex3D(pos * ts, nor);

        vec3 li = lp - pos;
        float lDist = max(length(li), .001);
        float atten = 1. / (1.0 + lDist * 0.125 + lDist * lDist * .05);
        li /= lDist;

        float occ = calcAO(pos, nor);
        float dif = clamp(dot(nor, li), 0.0, 1.0);
        dif = pow(dif, 4.) * 2.;
        float spe = pow(max(dot(reflect(-li, nor), -rd), 0.), 8.);
        float spe2 = spe * spe;

        if(saveObjID > 1.5) {
            col = vec3(1) * dot(col, vec3(.299, .587, .114)) * .7 + col * .15;
        }

        if(saveObjID > 2.5) {
            vec3 fire = pow(vec3(1.5, 1, 1) * col, vec3(8, 2, 1.5));
            col = col + min(mix(vec3(1, .9, .375), vec3(.75, .375, .3), fire), 2.) * .5;
        }

        col = col * (dif + .25 + vec3(.35, .45, .5) * spe) + vec3(.7, .9, 1) * spe2;

        {
            float speR = pow(max(dot(normalize(li - rd), nor), 0.), 5.);
            vec3 rf = reflect(rd, nor);
            vec3 rTx = fakeEnv(rf); rTx *= rTx;
            float rF = saveObjID > 1.5 ? 4. : 1.;
            col += col * rTx * speR * rF;
        }

        col *= occ * atten;
    }

    col = mix(max(col, 0.), vec3(0), 1. - exp(-t * t / FAR / FAR * 20.));
    fragColor = vec4(sqrt(max(col, 0.)), 1.0);
}
