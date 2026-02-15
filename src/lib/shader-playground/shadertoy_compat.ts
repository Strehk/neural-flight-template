/**
 * Shadertoy Compatibility — Detect and wrap Shadertoy-format shaders.
 */

/** Check if code uses Shadertoy mainImage convention */
export function isShadertoyFormat(code: string): boolean {
	return /void\s+mainImage\s*\(\s*out\s+vec4/.test(code);
}

/**
 * Wrap Shadertoy mainImage code in a standard fragment shader.
 * Adds iTime/iResolution/iMouse uniforms mapped to our system uniforms.
 */
export function wrapShadertoyCode(code: string): string {
	// Check if user already has a void main()
	if (/void\s+main\s*\(\s*\)/.test(code)) {
		// Already has main() — just ensure uniforms are declared
		return ensureShadertoyUniforms(code);
	}

	// Wrap: add main() that calls mainImage
	const wrapped = `${ensureShadertoyUniforms(code)}

void main() {
  mainImage(gl_FragColor, gl_FragCoord.xy);
}
`;
	return wrapped;
}

/** Ensure iTime, iResolution, iMouse are declared */
function ensureShadertoyUniforms(code: string): string {
	let result = code;

	const declarations: string[] = [];

	if (!/uniform\s+float\s+iTime\b/.test(code)) {
		declarations.push("uniform float iTime;");
	}
	if (!/uniform\s+vec2\s+iResolution\b/.test(code)) {
		declarations.push("uniform vec2 iResolution;");
	}
	if (!/uniform\s+vec4\s+iMouse\b/.test(code) && !/uniform\s+vec2\s+iMouse\b/.test(code)) {
		declarations.push("uniform vec2 iMouse;");
	}

	if (declarations.length > 0) {
		result = `${declarations.join("\n")}\n\n${result}`;
	}

	return result;
}
