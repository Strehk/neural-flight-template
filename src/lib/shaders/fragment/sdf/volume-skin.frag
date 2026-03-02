// @name Volume Skin
// @description Volume skin rendering with anti-aliasing fixes
// @perf-tier showcase
// @tags volume, skin, antialiasing, rendering
// @credits FabriceNeyret2 — https://www.shadertoy.com/view/WtBfDm
// @cost volume rendering with aliasing fix, very expensive
//
// Based on Shadertoy "volume skin: fixing aliasing" by FabriceNeyret2 — https://www.shadertoy.com/view/WtBfDm
// Textures replaced with procedural equivalents

#pragma include <math>

#define SQR(x) ((x)*(x))
#define CUB(x) ((x)*(x)*(x))

// Procedural noise replacing textureLod(iChannel0, (x)/32., 0.).x
float pnoise(vec2 x) {
    vec2 p = floor(x);
    vec2 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(p);
    float b = hash21(p + vec2(1.0, 0.0));
    float c = hash21(p + vec2(0.0, 1.0));
    float d = hash21(p + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

#define noise(x) (2.0 * pnoise((x) / 32.0 * 256.0) - 1.0)

float map(vec3 p)
{
    vec3 q = p - vec3(0, .1, 1) * uTime;
    float f = 0., s = .5;
    for (int i = 0; i < 5; i++, s /= 2.)
        f += s * noise(q.xy + q.z * 37.0), q *= 2.;

    return clamp(1. + .5 * p.y + 3. * f, 0., 1.);
}

float thick = 1. / 2000.;
#define LUT(d) max(1. - SQR(d - .5) / thick, 0.)

#define C(d) clamp(d, .5 - sqrt(thick), .5 + sqrt(thick))
#define I(d) (d - CUB(d - .5) / 3. / thick)
#define intLUT(d0,d1) (abs(d1-d0) < 1e-3 ? 0. : (I(C(d1)) - I(C(d0))) / (d1-d0))

vec2 coord;

float LUTs(float _d, float d) {
    return coord.x > 0.
             ? LUT(d)
             : intLUT(_d, d);
}

#define hue(v) (.6 + .6 * cos(6.3*(v) + vec3(0,23,21)))

vec4 raymarch(vec3 ro, vec3 rd, vec3 bgcol, ivec2 px)
{
    vec4 sum = vec4(0);
    float t = 0.,
          dt = 0.,
         den = 0., _den, lut, dv;
    for(int i = 0; i < 150; i++)
    {
        vec3 pos = ro + t * rd;
        if(pos.y < -3. || pos.y > 3. || sum.a > .99) break;
        _den = den; den = map(pos);
        if(abs(pos.x) > .5)
        {
            for (float ofs = 0.; ofs < 7.; ofs++)
            {
                dv = (ofs / 3.5 - 1.) * .4;
                lut = LUTs(_den + dv, den + dv);
                if (lut > .01)
                {
                    vec3 col = hue(ofs / 8.);
                    col = mix(col, bgcol, 1. - exp(-.003 * t * t));
                    sum += (1. - sum.a) * vec4(col, 1) * (lut * dt * 3.);
                }
            }
        }
        t += dt = max(.05, .02 * t);
    }

    return sum;
}

mat3 setCamera(vec3 ro, vec3 ta, float cr)
{
    vec3 cw = normalize(ta - ro),
         cp = vec3(sin(cr), cos(cr), 0),
         cu = normalize(cross(cw, cp)),
         cv = cross(cu, cw);
    return mat3(cu, cv, cw);
}

#define render(ro,rd,px) raymarch(ro, rd, vec3(0), px)

void mainImage( out vec4 O, vec2 U )
{
    vec2 R = uResolution.xy,
         p = (2. * U - R) / R.y,
         m = 2. * uMouse.xy / R.xy;
    coord = p;

    vec3 ro = 4. * normalize(vec3(sin(3. * m.x), .4 * m.y, cos(3. * m.x))),
         ta = vec3(0, -1, 0);
    mat3 ca = setCamera(ro, ta, 0.);
    vec3 rd = ca * normalize(vec3(p, 1.5));

    O = render(ro, rd, ivec2(U - .5));
    if (floor(U.x) == floor(R.x / 2.)) O = vec4(1, 0, 0, 1);
}
