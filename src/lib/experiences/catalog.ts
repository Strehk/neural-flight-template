import { manifest as mountainFlight } from "./mountain-flight";
import { manifest as shaderDemo } from "./shader-demo";
import type { ExperienceManifest } from "./types";

// ── Registry ──
//
// Students: To register your experience, add 2 lines:
//   1. Import:  import { manifest as myExp } from "./my-experience";
//   2. Entry:   "my-experience": myExp,
//
// The ID must match the folder name and the manifest.id field.

const CATALOG: Record<string, ExperienceManifest> = {
	"mountain-flight": mountainFlight,
	"shader-demo": shaderDemo,
};

export const DEFAULT_EXPERIENCE_ID = "mountain-flight";

/** Get experience by ID — throws with available IDs if not found */
export function getExperience(id: string): ExperienceManifest {
	const exp = CATALOG[id];
	if (!exp) {
		const available = Object.keys(CATALOG).join(", ");
		throw new Error(`Experience "${id}" not found. Available: [${available}]`);
	}
	return exp;
}

/** List all available experiences (for Landing Page catalog) */
export function listExperiences(): ExperienceManifest[] {
	return Object.values(CATALOG);
}
