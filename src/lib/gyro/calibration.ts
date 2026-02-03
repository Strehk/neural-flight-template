const STORAGE_KEY = "icaros-gyro-calibration";

export interface CalibrationOffset {
	beta: number;
	gamma: number;
	timestamp: number;
}

/**
 * Load calibration offset from localStorage.
 * Returns null if no calibration exists.
 */
export function loadCalibration(): CalibrationOffset | null {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (!stored) return null;
		return JSON.parse(stored) as CalibrationOffset;
	} catch {
		return null;
	}
}

/**
 * Save calibration offset to localStorage.
 */
export function saveCalibration(offset: CalibrationOffset): void {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(offset));
}

/**
 * Clear calibration from localStorage.
 */
export function clearCalibration(): void {
	localStorage.removeItem(STORAGE_KEY);
}

/**
 * Apply calibration offset to raw gyro values.
 * Returns calibrated pitch/roll clamped to ±90°.
 */
export function applyCalibration(
	beta: number,
	gamma: number,
	offset: CalibrationOffset | null,
): { pitch: number; roll: number } {
	const rawPitch = offset ? beta - offset.beta : beta;
	const rawRoll = offset ? gamma - offset.gamma : gamma;

	return {
		pitch: clamp(rawPitch, -90, 90),
		roll: clamp(rawRoll, -90, 90),
	};
}

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}
