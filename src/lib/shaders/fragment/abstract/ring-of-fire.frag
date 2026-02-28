// Based on Shadertoy "Ring of Fire Music Visualizer" by Orblivius — https://www.shadertoy.com/view/M33XRN
// Textures replaced with procedural equivalents (audio → time-based)

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;

#define PI 3.141592

float map(float v, float v_min, float v_max, float out1, float out2)
{
    if (v_max - v_min == 0.) return out2;
    return (clamp(v, v_min, v_max) - v_min) / (v_max - v_min) * (out2 - out1) + out1;
}

mat2 rotateUV(vec2 uv, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat2(c, -s, s, c);
}

vec3 hueShift(vec3 color, float hue) {
    const vec3 k = vec3(0.57735);
    float cosAngle = cos(hue);
    return vec3(color * cosAngle + cross(k, color) * sin(hue) + k * dot(k, color) * (1.0 - cosAngle));
}

// Procedural audio replacement
float fakeAudio(vec2 uv) {
    return 0.5 + 0.3 * sin(uTime * 2.0 + uv.x * 12.0 + uv.y * 8.0);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 mouseCoord = uMouse.xy / uResolution.xy;
    float ar = uResolution.y / uResolution.x;
    vec2 rolling = vec2(sin(uTime), cos(uTime)) * .5;

    vec2 uv = vec2(map(fragCoord.x, 0., uResolution.x, -1., 1.), map(fragCoord.y, 0., uResolution.y, -ar, ar)) + rolling * 0.25;
    vec2 uv2 = uv * rotateUV(uv, uTime * 0.03);
    float z = 2. / max(length(uv), 0.1);
    float angle = map(atan(uv.y, uv.x), -PI, PI, 0., 1.);
    float angle2 = map(atan(uv2.y, uv2.x), -PI, PI, 0., 1.);
    float zmax = map(rolling.x, -1., 1., 0.075, 0.15);
    float fade = map(z, 0., 8. - .001 * zmax, 1.0, 0.);

    // Procedural replacements for audio texture lookups
    vec3 color = vec3(fakeAudio(vec2(angle2 + rolling.y * 0.04, z * zmax))) * vec3(2., .3, .7);
    vec3 color2 = vec3(pow(fakeAudio(vec2(angle + 0.5 + rolling.y * 0.04, z * zmax + uTime * 0.1)) * 1.2, 2.1)) * vec3(.8, .1, 1.5);
    color2 = hueShift(color2, .8);
    color = hueShift(color, 5.5); color *= color;

    fragColor = vec4((color + color2) * fade, 1.);
}
