/**
 * Frontmatter Parser — Extracts metadata from GLSL comment headers.
 *
 * Each .frag/.vert file can contain structured `@`-prefixed metadata
 * in its leading comments. The filesystem provides category (folder name)
 * and id (file name). This parser extracts the rest.
 *
 * Supported tags:
 *   @name        Display name (e.g. "Fractal Flythrough")
 *   @description Short description of the visual effect
 *   @perf-tier   "quest-safe" | "desktop-only" | "showcase"
 *   @credits     Author attribution + source URL
 *   @tags        Comma-separated search tags
 *   @cost        Performance cost note (informational only)
 *
 * @example
 * // In a .frag file:
 * // @name Iridescent
 * // @description Thin-film interference holographic effect
 * // @perf-tier quest-safe
 * // @tags iridescent, holographic, fresnel
 * // @credits ICAROS Lab
 */

import type { PerfTier, ShaderCategory } from "./types.js";

export interface ShaderFrontmatter {
	name: string;
	description: string;
	perfTier: PerfTier;
	credits: string;
	tags: string[];
	cost: string;
}

const TAG_PATTERN = /^\/\/\s*@(\S+?):?\s+(.*)/;

const DEFAULTS: ShaderFrontmatter = {
	name: "",
	description: "",
	perfTier: "quest-safe",
	credits: "",
	tags: [],
	cost: "",
};

/**
 * Parses `@`-prefixed metadata from GLSL source comment headers.
 *
 * Only scans leading comment lines (stops at first non-comment line).
 * Returns parsed metadata merged with defaults for missing fields.
 */
export function parseFrontmatter(glslSource: string): ShaderFrontmatter {
	const result: ShaderFrontmatter = { ...DEFAULTS, tags: [] };

	for (const line of glslSource.split("\n")) {
		const trimmed = line.trim();

		// Stop scanning at first non-comment, non-empty line
		if (trimmed !== "" && !trimmed.startsWith("//") && !trimmed.startsWith("#pragma")) {
			break;
		}

		const match = trimmed.match(TAG_PATTERN);
		if (!match) continue;

		const [, tag, value] = match;
		const cleanValue = value.trim();

		switch (tag) {
			case "name":
				result.name = cleanValue;
				break;
			case "description":
				result.description = cleanValue;
				break;
			case "perf-tier":
				result.perfTier = cleanValue as PerfTier;
				break;
			case "credits":
				result.credits = cleanValue;
				break;
			case "tags":
				result.tags = cleanValue.split(",").map((t) => t.trim()).filter(Boolean);
				break;
			case "cost":
				result.cost = cleanValue;
				break;
		}
	}

	return result;
}

/**
 * Derives a human-readable name from a shader file path.
 *
 * "abstract/70s-melt.frag" → "70s Melt"
 */
export function fileNameToDisplayName(fileName: string): string {
	const base = fileName.replace(/\.frag$/, "").split("/").pop() ?? "";
	return base
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

/**
 * Derives the shader category from its folder path.
 *
 * "./fragment/lighting/iridescent.frag" → "lighting"
 */
export function pathToCategory(relativePath: string): ShaderCategory {
	const parts = relativePath.replace(/^\.\//, "").split("/");
	// Expected: fragment/{category}/{name}.frag
	return (parts.length >= 2 ? parts[parts.length - 2] : "unknown") as ShaderCategory;
}

/**
 * Derives a URL-safe ID from a file path.
 *
 * "./fragment/lighting/iridescent.frag" → "iridescent"
 */
export function pathToId(relativePath: string): string {
	const fileName = relativePath.split("/").pop() ?? "";
	return fileName.replace(/\.frag$/, "");
}
