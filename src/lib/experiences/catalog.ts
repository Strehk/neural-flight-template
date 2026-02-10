import type { ExperienceManifest } from "./types";
import { manifest as mountainFlight } from "./mountain-flight";

// ── Registry ──
// Students: add 1 import + 1 entry here to register your experience

const CATALOG: Record<string, ExperienceManifest> = {
	"mountain-flight": mountainFlight,
};

export const DEFAULT_EXPERIENCE_ID = "mountain-flight";

/** Get experience by ID — throws if not found */
export function getExperience(id: string): ExperienceManifest {
	const exp = CATALOG[id];
	if (!exp) throw new Error(`Experience not found: ${id}`);
	return exp;
}

/** List all available experiences (for Landing Page catalog) */
export function listExperiences(): ExperienceManifest[] {
	return Object.values(CATALOG);
}
