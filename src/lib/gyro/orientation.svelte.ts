import { browser } from "$app/environment";
import {
	applyCalibration,
	type CalibrationOffset,
	clearCalibration,
	loadCalibration,
	saveCalibration,
} from "./calibration";

export type GyroStatus =
	| "initializing"
	| "permission-required"
	| "not-supported"
	| "not-calibrated"
	| "active"
	| "error";

export interface GyroState {
	status: GyroStatus;
	pitch: number;
	roll: number;
	rawBeta: number;
	rawGamma: number;
	calibration: CalibrationOffset | null;
	errorMessage: string | null;
}

interface GyroClient {
	status: GyroStatus;
	pitch: number;
	roll: number;
	rawBeta: number;
	rawGamma: number;
	calibration: CalibrationOffset | null;
	errorMessage: string | null;
	requestPermission: () => Promise<void>;
	calibrate: () => void;
	resetCalibration: () => void;
	destroy: () => void;
}

const THROTTLE_MS = 33; // ~30Hz
const SMOOTHING_ALPHA = 0.2; // Exponential moving average factor

/** SSR-safe no-op client */
const NOOP_CLIENT: GyroClient = {
	status: "not-supported",
	pitch: 0,
	roll: 0,
	rawBeta: 0,
	rawGamma: 0,
	calibration: null,
	errorMessage: "Not running in browser",
	requestPermission: async () => {},
	calibrate: () => {},
	resetCalibration: () => {},
	destroy: () => {},
};

/**
 * Check if Device Orientation API is available.
 */
function isGyroSupported(): boolean {
	return "DeviceOrientationEvent" in window;
}

/**
 * Check if iOS-style permission is required.
 */
function requiresPermission(): boolean {
	return (
		typeof DeviceOrientationEvent !== "undefined" &&
		typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> })
			.requestPermission === "function"
	);
}

/**
 * Create a reactive gyroscope client using Svelte 5 runes.
 * Handles iOS permission, calibration, smoothing, and throttling.
 */
export function createGyroClient(): GyroClient {
	if (!browser) return NOOP_CLIENT;

	let status = $state<GyroStatus>("initializing");
	let pitch = $state(0);
	let roll = $state(0);
	let rawBeta = $state(0);
	let rawGamma = $state(0);
	let calibration = $state<CalibrationOffset | null>(null);
	let errorMessage = $state<string | null>(null);

	// Smoothed values (internal)
	let smoothedBeta = 0;
	let smoothedGamma = 0;
	let lastEmitTime = 0;
	let orientationHandler: ((e: DeviceOrientationEvent) => void) | null = null;

	function initialize(): void {
		if (!isGyroSupported()) {
			status = "not-supported";
			errorMessage = "Device Orientation API not supported";
			return;
		}

		// Load existing calibration
		calibration = loadCalibration();

		if (requiresPermission()) {
			status = "permission-required";
		} else {
			// Android: start listening immediately
			startListening();
		}
	}

	async function requestPermission(): Promise<void> {
		if (!requiresPermission()) {
			startListening();
			return;
		}

		try {
			const permission = await (
				DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }
			).requestPermission();

			if (permission === "granted") {
				startListening();
			} else {
				status = "error";
				errorMessage = "Permission denied. Enable in Settings > Safari > Motion & Orientation";
			}
		} catch (err) {
			status = "error";
			errorMessage = err instanceof Error ? err.message : "Permission request failed";
		}
	}

	function startListening(): void {
		orientationHandler = (event: DeviceOrientationEvent) => {
			const now = Date.now();
			if (now - lastEmitTime < THROTTLE_MS) return;
			lastEmitTime = now;

			const beta = event.beta ?? 0;
			const gamma = event.gamma ?? 0;

			// Exponential moving average for smoothing
			smoothedBeta = smoothedBeta * (1 - SMOOTHING_ALPHA) + beta * SMOOTHING_ALPHA;
			smoothedGamma = smoothedGamma * (1 - SMOOTHING_ALPHA) + gamma * SMOOTHING_ALPHA;

			rawBeta = Math.round(smoothedBeta * 10) / 10;
			rawGamma = Math.round(smoothedGamma * 10) / 10;

			// Apply calibration
			const calibrated = applyCalibration(smoothedBeta, smoothedGamma, calibration);
			pitch = Math.round(calibrated.pitch * 10) / 10;
			roll = Math.round(calibrated.roll * 10) / 10;

			// Update status
			if (status !== "active" && status !== "not-calibrated") {
				status = calibration ? "active" : "not-calibrated";
			}
		};

		window.addEventListener("deviceorientation", orientationHandler);
		status = calibration ? "active" : "not-calibrated";
	}

	function calibrate(): void {
		const newCalibration: CalibrationOffset = {
			beta: smoothedBeta,
			gamma: smoothedGamma,
			timestamp: Date.now(),
		};
		calibration = newCalibration;
		saveCalibration(newCalibration);
		status = "active";

		// Reset pitch/roll to 0 immediately after calibration
		pitch = 0;
		roll = 0;
	}

	function resetCalibration(): void {
		calibration = null;
		clearCalibration();
		status = "not-calibrated";
	}

	function destroy(): void {
		if (orientationHandler) {
			window.removeEventListener("deviceorientation", orientationHandler);
			orientationHandler = null;
		}
	}

	// Initialize on creation
	initialize();

	return {
		get status() {
			return status;
		},
		get pitch() {
			return pitch;
		},
		get roll() {
			return roll;
		},
		get rawBeta() {
			return rawBeta;
		},
		get rawGamma() {
			return rawGamma;
		},
		get calibration() {
			return calibration;
		},
		get errorMessage() {
			return errorMessage;
		},
		requestPermission,
		calibrate,
		resetCalibration,
		destroy,
	};
}
