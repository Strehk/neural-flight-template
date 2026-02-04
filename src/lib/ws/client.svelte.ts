import { browser } from "$app/environment";
import type { ControllerMessage } from "$lib/types/orientation";
import type {
	ConnectionStatus,
	WebSocketClientOptions,
} from "$lib/types/websocket";
import { parseMessage, serializeMessage } from "./protocol";

interface WebSocketClient {
	status: ConnectionStatus;
	lastMessage: ControllerMessage | null;
	send: (msg: ControllerMessage) => void;
	disconnect: () => void;
}

const DEFAULTS: Required<WebSocketClientOptions> = {
	autoReconnect: true,
	maxReconnects: 5,
	reconnectDelay: 1000,
};

/** SSR-safe no-op client */
const NOOP_CLIENT: WebSocketClient = {
	status: "disconnected",
	lastMessage: null,
	send: () => {},
	disconnect: () => {},
};

/**
 * Create a reactive WebSocket client using Svelte 5 runes.
 * Returns a no-op client during SSR.
 */
export function createWebSocketClient(
	options?: WebSocketClientOptions,
): WebSocketClient {
	if (!browser) return NOOP_CLIENT;

	const opts = { ...DEFAULTS, ...options };
	let ws: WebSocket | null = null;
	let reconnectCount = 0;
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

	let status = $state<ConnectionStatus>("disconnected");
	let lastMessage = $state<ControllerMessage | null>(null);

	function getUrl(): string {
		const proto = location.protocol === "https:" ? "wss:" : "ws:";
		return `${proto}//${location.host}`;
	}

	function connect(): void {
		status = "connecting";
		ws = new WebSocket(getUrl());

		ws.onopen = () => {
			status = "connected";
			reconnectCount = 0;
		};

		ws.onmessage = (event: MessageEvent) => {
			try {
				lastMessage = parseMessage(String(event.data));
			} catch {
				// Invalid message — ignore
			}
		};

		ws.onclose = () => {
			status = "disconnected";
			ws = null;
			maybeReconnect();
		};

		ws.onerror = () => {
			status = "error";
		};
	}

	function maybeReconnect(): void {
		if (!opts.autoReconnect || reconnectCount >= opts.maxReconnects) return;
		reconnectCount++;
		const delay = opts.reconnectDelay * 2 ** (reconnectCount - 1);
		reconnectTimer = setTimeout(connect, delay);
	}

	function send(msg: ControllerMessage): void {
		if (ws?.readyState === WebSocket.OPEN) {
			ws.send(serializeMessage(msg));
		} else {
			console.warn("[WS] Message dropped — socket not open", {
				readyState: ws?.readyState,
				type: msg.type,
			});
		}
	}

	function disconnect(): void {
		opts.autoReconnect = false;
		if (reconnectTimer) clearTimeout(reconnectTimer);
		ws?.close();
	}

	connect();

	return {
		get status() {
			return status;
		},
		get lastMessage() {
			return lastMessage;
		},
		send,
		disconnect,
	};
}
