import { registerSnippet } from "./loader.js";

/**
 * Auto-registers all GLSL snippets from `common/` via `import.meta.glob`.
 *
 * After calling this, any shader can use `#pragma include <name>`
 * where `name` matches the filename without extension (e.g. `noise`, `math`, `color`).
 *
 * Replaces manual `registerSnippet()` calls scattered across experiences.
 */

const snippetModules = import.meta.glob("./common/*.glsl", {
	eager: true,
	query: "?raw",
	import: "default",
}) as Record<string, string>;

export function registerAllSnippets(): void {
	for (const [path, source] of Object.entries(snippetModules)) {
		const name = path.split("/").pop()!.replace(".glsl", "");
		registerSnippet(name, source);
	}
}
