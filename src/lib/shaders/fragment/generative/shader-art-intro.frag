// Based on Shadertoy "Shader Art Coding Introduction" by kishimisu — https://www.shadertoy.com/view/mtyGWy
// License: Not specified

#pragma include <color>

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord * 2.0 - uResolution.xy) / uResolution.y;
    vec2 uv0 = uv;
    vec3 finalColor = vec3(0.0);

    for (float i = 0.0; i < 4.0; i++) {
        uv = fract(uv * 1.5) - 0.5;

        float d = length(uv) * exp(-length(uv0));

        vec3 col = cosinePalette(
            length(uv0) + i * 0.4 + uTime * 0.4,
            vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.263, 0.416, 0.557)
        );

        d = sin(d * 8.0 + uTime) / 8.0;
        d = abs(d);
        d = pow(0.01 / d, 1.2);

        finalColor += col * d;
    }

    fragColor = vec4(finalColor, 1.0);
}
