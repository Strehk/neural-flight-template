/**
 * Dev-only uniform validation — parses `uniform` declarations from GLSL source
 * and compares them with the uniforms provided to `createShaderMaterial()`.
 *
 * Warns on:
 * - Missing uniforms (declared in GLSL but not provided)
 * - Extra uniforms (provided but not declared in GLSL)
 *
 * System uniforms (`uTime`, `uResolution`, `uMouse`) are always excluded
 * from validation since they're auto-injected.
 *
 * Only active when `import.meta.env.DEV` — zero cost in production builds.
 */

const UNIFORM_PATTERN = /uniform\s+\w+\s+(\w+)\s*;/g;

const SYSTEM_UNIFORM_NAMES = new Set(["uTime", "uResolution", "uMouse"]);

function extractUniformNames(glslSource: string): Set<string> {
	const names = new Set<string>();
	let match: RegExpExecArray | null;

	while ((match = UNIFORM_PATTERN.exec(glslSource)) !== null) {
		const name = match[1];
		if (!SYSTEM_UNIFORM_NAMES.has(name)) {
			names.add(name);
		}
	}

	// Reset regex lastIndex for reuse
	UNIFORM_PATTERN.lastIndex = 0;

	return names;
}

export function validateUniforms(
	glslSource: string,
	providedUniforms: Record<string, unknown>,
): void {
	if (!import.meta.env.DEV) return;

	const declared = extractUniformNames(glslSource);
	const provided = new Set(
		Object.keys(providedUniforms).filter((k) => !SYSTEM_UNIFORM_NAMES.has(k)),
	);

	for (const name of declared) {
		if (!provided.has(name)) {
			console.warn(`[shader] Missing uniform "${name}" — declared in GLSL but not provided`);
		}
	}

	for (const name of provided) {
		if (!declared.has(name)) {
			console.warn(`[shader] Extra uniform "${name}" — provided but not declared in GLSL`);
		}
	}
}
