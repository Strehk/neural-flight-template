import fs from "node:fs";
import { sveltekit } from "@sveltejs/kit/vite";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import { WebSocketServer } from "ws";
import { handleConnection } from "./src/lib/ws/server";

function webSocketPlugin(): Plugin {
	return {
		name: "vite-plugin-websocket",
		configureServer(server) {
			const wss = new WebSocketServer({ noServer: true });

			server.httpServer?.on("upgrade", (request, socket, head) => {
				// Let Vite HMR keep its own WebSocket
				if (request.headers["sec-websocket-protocol"]?.includes("vite-hmr"))
					return;

				wss.handleUpgrade(request, socket, head, (ws) => {
					handleConnection(ws);
				});
			});
		},
	};
}

export default defineConfig({
	plugins: [sveltekit(), webSocketPlugin()],
	server: {
		https: {
			key: fs.readFileSync("localhost-key.pem"),
			cert: fs.readFileSync("localhost.pem"),
		},
		host: true,
	},
	ssr: {
		// @xyflow has directory imports that don't work with ESM resolution
		noExternal: ["@xyflow/svelte", "@xyflow/system"],
	},
});
