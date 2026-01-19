/**
 * WebXR Development Server
 *
 * A minimal HTTPS server with WebSocket support for WebXR development.
 * Features:
 * - HTTPS required for WebXR API access
 * - On-the-fly TypeScript transpilation (no build step)
 * - WebSocket broadcast for real-time communication
 *
 * @see docs/ARCHITECTURE.md for detailed documentation
 */

import type { BunFile, ServerWebSocket } from "bun";

// ============================================================================
// Configuration
// ============================================================================

/** Server port - WebXR requires HTTPS, so we use a single port for both HTTP and WS */
const PORT = 3000;

/** MIME type mapping for static file serving */
const MIME_TYPES: Record<string, string> = {
	".html": "text/html",
	".js": "application/javascript",
	".ts": "application/javascript", // TypeScript served as JS after transpilation
	".css": "text/css",
	".json": "application/json",
	".png": "image/png",
	".jpg": "image/jpeg",
	".svg": "image/svg+xml",
};

// ============================================================================
// Utilities
// ============================================================================

/**
 * Gets the MIME type for a file based on its extension
 * @param path - File path to check
 * @returns MIME type string, defaults to "application/octet-stream"
 */
function getMimeType(path: string): string {
	const ext = path.slice(path.lastIndexOf("."));
	return MIME_TYPES[ext] ?? "application/octet-stream";
}

/**
 * Bun's built-in TypeScript transpiler
 * Converts TypeScript to JavaScript on-the-fly without a build step.
 * This allows serving .ts files directly to the browser.
 */
const transpiler = new Bun.Transpiler({ loader: "ts" });

/**
 * Serves a static file, with TypeScript transpilation if needed
 *
 * For .ts files:
 * 1. Read the TypeScript source
 * 2. Transpile to JavaScript using Bun.Transpiler
 * 3. Return as application/javascript
 *
 * For other files:
 * - Serve directly with appropriate MIME type
 *
 * @param path - Relative file path from project root
 * @returns HTTP Response with file contents or 404
 */
async function serveFile(path: string): Promise<Response> {
	const file: BunFile = Bun.file(path);
	const exists = await file.exists();

	if (!exists) {
		return new Response("Not Found", { status: 404 });
	}

	// TypeScript files need transpilation before browser can execute
	if (path.endsWith(".ts")) {
		const source = await file.text();
		const js = transpiler.transformSync(source);
		return new Response(js, {
			headers: { "Content-Type": "application/javascript" },
		});
	}

	return new Response(file, {
		headers: { "Content-Type": getMimeType(path) },
	});
}

// ============================================================================
// WebSocket Management
// ============================================================================

/**
 * Connected WebSocket clients
 * Using a Set for O(1) add/delete operations
 */
const clients = new Set<ServerWebSocket<unknown>>();

/**
 * Broadcasts a message to all connected clients except the sender
 *
 * This "broadcast-to-others" pattern:
 * - Prevents echo loops (sender receiving their own message)
 * - Enables multi-controller scenarios
 * - Controller sends command → Server broadcasts → Quest receives
 *
 * @param data - JSON string to broadcast
 * @param sender - Optional WebSocket to exclude from broadcast
 */
function broadcast(data: string, sender?: ServerWebSocket<unknown>): void {
	for (const client of clients) {
		if (client !== sender) {
			client.send(data);
		}
	}
}

// ============================================================================
// Server
// ============================================================================

/**
 * Main Bun.serve() configuration
 *
 * Handles:
 * - HTTPS with self-signed certificates (required for WebXR)
 * - WebSocket upgrade for real-time communication
 * - Static file serving with TypeScript transpilation
 */
Bun.serve({
	port: PORT,

	// TLS configuration for HTTPS
	// Generate certs with: bunx mkcert localhost
	tls: {
		key: Bun.file("localhost-key.pem"),
		cert: Bun.file("localhost.pem"),
	},

	/**
	 * HTTP request handler
	 * Routes requests to WebSocket upgrade or static file serving
	 */
	async fetch(req: Request, server): Promise<Response | undefined> {
		const url = new URL(req.url);

		// Handle WebSocket upgrade requests
		if (req.headers.get("upgrade") === "websocket") {
			const upgraded = server.upgrade(req);
			return upgraded ? undefined : new Response("Upgrade failed", { status: 400 });
		}

		// Route "/" to "/index.html"
		let path = url.pathname;
		if (path === "/") {
			path = "/index.html";
		}

		// Serve static files from project root
		const filePath = `.${path}`;
		return serveFile(filePath);
	},

	/**
	 * WebSocket event handlers
	 * Manages client connections and message broadcasting
	 */
	websocket: {
		/** New client connected */
		open(ws) {
			clients.add(ws);
			console.log(`📱 Client connected (${clients.size} total)`);
		},

		/** Client disconnected */
		close(ws) {
			clients.delete(ws);
			console.log(`📱 Client disconnected (${clients.size} remaining)`);
		},

		/**
		 * Message received from a client
		 * Broadcasts to all other clients (not back to sender)
		 */
		message(ws, message) {
			const msgStr = typeof message === "string" ? message : message.toString();
			console.log("📨 Command:", msgStr);
			broadcast(msgStr, ws);
		},
	},
});

// ============================================================================
// Startup Info
// ============================================================================

console.log(`🚀 HTTPS Server running at https://localhost:${PORT}`);
console.log("📱 Controller: https://localhost:3000/controller.html");
console.log("🥽 VR Scene:   https://localhost:3000/?mode=vr");
console.log("👓 AR Scene:   https://localhost:3000/?mode=ar");
