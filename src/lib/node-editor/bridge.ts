/**
 * Node Editor → VR Scene Bridge
 * Sends SettingsUpdate messages via WebSocket
 */

import type { SettingsUpdate } from "$lib/types/orientation";
import { createWebSocketClient } from "$lib/ws/client.svelte";

/** Singleton WebSocket client for the editor */
let client: ReturnType<typeof createWebSocketClient> | null = null;

/** Initialize the bridge connection */
export function initBridge(): void {
	if (!client) {
		client = createWebSocketClient({ autoReconnect: true });
	}
}

/** Send settings to VR scene */
export function sendSettings(
	settings: Record<string, number | boolean | string>,
): void {
	if (!client) {
		initBridge();
	}

	const message: SettingsUpdate = {
		type: "settings",
		settings,
		timestamp: Date.now(),
	};

	client?.send(message);
}

/** Get current connection status */
export function getBridgeStatus():
	| "connected"
	| "disconnected"
	| "connecting"
	| "error" {
	return client?.status ?? "disconnected";
}

/** Cleanup connection */
export function disconnectBridge(): void {
	client?.disconnect();
	client = null;
}
