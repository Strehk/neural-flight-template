export type ConnectionStatus =
	| "connecting"
	| "connected"
	| "disconnected"
	| "error";

export interface WebSocketClientOptions {
	autoReconnect?: boolean;
	maxReconnects?: number;
	reconnectDelay?: number;
}
