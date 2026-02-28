// Based on Shadertoy "Music Abstract Grassy Space" by Ds2yDy — https://www.shadertoy.com/view/Ds2yDy
// Textures replaced with procedural equivalents (audio → time-based, textures → procedural noise)
#pragma include <math>

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;

#define FAR 50.
float accum;
vec3 camera;
float PI2 = 3.14159265358979;

// Audio spectrum replacement (time-based)
float get_sound_spectrum(float u)
{
    return 0.5 + 0.3 * sin(uTime * 3.0 * u + u * 12.0);
}

vec3 rainbow(float rx)
{
    rx = fract(rx);
    if (rx < 0.0) rx += 1.0;
    rx *= 6.0;
    if (rx <= 1.0) return vec3(1.0, rx, 0.0); rx -= 1.0;
    if (rx <= 1.0) return vec3(1.0 - rx, 1.0, 0.0); rx -= 1.0;
    if (rx <= 1.0) return vec3(0.0, 1.0, rx); rx -= 1.0;
    if (rx <= 1.0) return vec3(0.0, 1.0 - rx, 1.0); rx -= 1.0;
    if (rx <= 1.0) return vec3(rx, 0.0, 1.0); rx -= 1.0;
    if (rx <= 1.0) return vec3(1.0, 0.0, 1.0 - rx); rx -= 1.0;
    return vec3(0);
}

mat2 rot2(float a) { vec2 v = sin(vec2(1.570796, 0) - a); return mat2(v, -v.y, v.x); }

// Procedural tri-planar noise replacing tpl(sampler2D, ...)
vec3 tpl(in vec3 p, in vec3 n) {
    n = max(abs(n) - .2, 0.001);
    n /= dot(n, vec3(1));
    float tx = hash21(p.zy * 2.0) * 0.5 + 0.25;
    float ty = hash21(p.xz * 2.0) * 0.5 + 0.25;
    float tz = hash21(p.xy * 2.0) * 0.5 + 0.25;
    return vec3(tx * tx * n.x + ty * ty * n.y + tz * tz * n.z);
}

vec3 camPath(float t) {
    float a = sin(t * 0.11);
    float b = cos(t * 0.14);
    return vec3(a * 4. - b * 1.5, b * 1.7 + a * 1.5, t);
}

float map(vec3 p) {
    vec3 rord = p;
    p.xy -= camPath(p.z).xy;
    p = cos(mod(p * .315 * 1.25 + sin(mod(p.zxy * .875 * 1.25, 2. * PI2)), 2. * PI2));
    float n = length(p);
    float u = min(max(length(camera - rord) * 0.02, 0.0), 1.0);
    float sound = get_sound_spectrum(u);
    float trembling = sin(uTime * PI2 * 15.0) * 0.5 + 0.5;
    n += sound * 0.1 * trembling;
    return (n - 1.025) * 1.33;
}

float cao(in vec3 p, in vec3 n)
{
    float sca = 1., occ = 0.;
    for(float i = 0.; i < 5.; i++) {
        float hr = .01 + i * .35 / 4.;
        float dd = map(n * hr + p);
        occ += (hr - dd) * sca;
        sca *= .7;
    }
    return clamp(1. - occ, 0., 1.);
}

vec3 nr(vec3 p) {
    const vec2 e = vec2(.002, 0);
    return normalize(vec3(map(p + e.xyy) - map(p - e.xyy),
                          map(p + e.yxy) - map(p - e.yxy), map(p + e.yyx) - map(p - e.yyx)));
}

float trace(in vec3 ro, in vec3 rd) {
    accum = 0.;
    float t = 0., h;
    for(int i = 0; i < 128; i++) {
        h = map(ro + rd * t);
        if(abs(h) < .001 * (t * .25 + 1.) || t > FAR) break;
        t += h;
        if(abs(h) < .35) accum += (.35 - abs(h)) / 24.;
    }
    return min(t, FAR);
}

float sha(in vec3 ro, in vec3 rd, in float start, in float end, in float k) {
    float shade = 1.;
    float dist = start;
    for (int i = 0; i < 24; i++) {
        float h = map(ro + rd * dist);
        shade = min(shade, smoothstep(0.0, 1.0, k * h / dist));
        dist += clamp(h, .01, .2);
        if (abs(h) < .001 || dist > end) break;
    }
    return min(max(shade, 0.) + .4, 1.);
}

// Texture bump mapping with procedural noise
vec3 db(in vec3 p, in vec3 n, float bf) {
    const vec2 e = vec2(.001, 0);
    mat3 m = mat3(tpl(p - e.xyy, n), tpl(p - e.yxy, n), tpl(p - e.yyx, n));
    vec3 g = vec3(.299, .587, .114) * m;
    g = (g - dot(tpl(p, n), vec3(.299, .587, .114))) / e.x; g -= n * dot(n, g);
    return normalize(n + g * bf);
}

float n3D(vec3 p) {
    const vec3 s = vec3(7, 157, 113);
    vec3 ip = floor(p); p -= ip;
    vec4 h = vec4(0., s.yz, s.y + s.z) + dot(ip, s);
    p = p * p * (3. - 2. * p);
    h = mix(fract(sin(h) * 43758.5453), fract(sin(h + s.x) * 43758.5453), p.x);
    h.xy = mix(h.xz, h.yw, p.y);
    return mix(h.x, h.y, p.z);
}

// Procedural env map
vec3 envMap(vec3 rd, vec3 n) {
    vec3 col = tpl(rd * 4., n);
    return smoothstep(0., 1., col);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 u = (fragCoord - uResolution.xy * .5) / uResolution.y;

    float speed = 4.;
    vec3 o = camPath(uTime * speed);
    vec3 lk = camPath(uTime * speed + .25);
    vec3 l = camPath(uTime * speed + 2.) + vec3(0, 1, 0);

    camera = o;

    float FOV = PI2 / 2.;
    vec3 fwd = normalize(lk - o);
    vec3 rgt = normalize(vec3(fwd.z, 0, -fwd.x));
    vec3 up = cross(fwd, rgt);

    vec3 r = fwd + FOV * (u.x * rgt + u.y * up);
    r = normalize(vec3(r.xy, (r.z - length(r.xy) * .125)));

    float t = trace(o, r);
    vec3 col = vec3(0);

    if(t < FAR) {
        vec3 p = o + r * t;
        vec3 n = nr(p);
        vec3 svn = n;
        float sz = 1. / 3.;
        n = db(p * sz, n, .1 / (1. + t * .25 / FAR));

        l -= p;
        float d = max(length(l), 0.001);
        l /= d;
        float at = 1. / (1. + d * .05 + d * d * .0125);
        float ao = cao(p, n);
        float sh = sha(p, l, 0.04, d, 16.);
        float di = max(dot(l, n), 0.);
        float sp = pow(max(dot(reflect(r, n), l), 0.), 64.);
        float fr = clamp(1.0 + dot(r, n), .0, 1.);

        vec3 tx = vec3(.05);
        col = tx * (di * .1 + ao * .25) + vec3(.5, .7, 1) * sp * 2. + vec3(1, .7, .4) * pow(fr, 8.) * .25;

        vec3 refl = envMap(normalize(reflect(r, svn * .5 + n * .5)), svn * .5 + n * .5);
        vec3 refr = envMap(normalize(refract(r, svn * .5 + n * .5, 1. / 1.35)), svn * .5 + n * .5);
        vec3 refCol = mix(refr, refl, pow(fr, 5.));
        col += refCol * ((di * di * .25 + .75) + ao * .25) * 1.5;
        col = mix(col.xzy, col, di * .85 + .15);

        vec3 accCol = vec3(1, .3, .1) * accum;
        vec3 gc = pow(min(vec3(1.5, 1, 1) * accum, 1.), vec3(1, 2.5, 12.)) * .5 + accCol * .5;
        col += col * gc * 12.;

        float dis = t * 0.1;
        for(float specu = 0.1; specu <= 1.0; specu += 0.1)
        {
            vec3 cCol = rainbow(specu) * abs(0.001 / (dis - specu * 2.0)) * get_sound_spectrum(specu) * 10.0;
            col += cCol;
        }

        col *= ao * sh * at;
    }

    vec3 fog = vec3(.125, .04, .05) * (r.y * .5 + .5);
    col = mix(col, fog, smoothstep(0., .95, t / FAR));

    u = fragCoord / uResolution.xy;
    col = mix(vec3(0), col, pow(16.0 * u.x * u.y * (1.0 - u.x) * (1.0 - u.y), .125) * .5 + .5);

    fragColor = vec4(sqrt(clamp(col, 0., 1.)), 1);
}
