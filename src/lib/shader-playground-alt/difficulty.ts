/**
 * Difficulty helpers — Color + label mapping for 3-level difficulty ratings.
 */

export function difficultyColor(d: 1 | 2 | 3): string {
	if (d === 1) return "var(--success)";
	if (d === 2) return "var(--warning)";
	return "var(--error)";
}

export function difficultyLabel(d: 1 | 2 | 3): string {
	if (d === 1) return "Beginner";
	if (d === 2) return "Mid";
	return "Advanced";
}
