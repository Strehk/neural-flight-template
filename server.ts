import { type BunFile } from "bun";

const PORT = 3000;

const MIME_TYPES: Record<string, string> = {
	".html": "text/html",
	".js": "application/javascript",
	".ts": "application/javascript",
	".css": "text/css",
	".json": "application/json",
	".png": "image/png",
	".jpg": "image/jpeg",
	".svg": "image/svg+xml",
};

function getMimeType(path: string): string {
	const ext = path.slice(path.lastIndexOf("."));
	return MIME_TYPES[ext] ?? "application/octet-stream";
}

async function serveFile(path: string): Promise<Response> {
	const file: BunFile = Bun.file(path);
	const exists = await file.exists();

	if (!exists) {
		return new Response("Not Found", { status: 404 });
	}

	return new Response(file, {
		headers: { "Content-Type": getMimeType(path) },
	});
}

Bun.serve({
	port: PORT,
	tls: {
		key: Bun.file("localhost-key.pem"),
		cert: Bun.file("localhost.pem"),
	},

	async fetch(req: Request): Promise<Response> {
		const url = new URL(req.url);
		let path = url.pathname;

		// Default to index.html
		if (path === "/") {
			path = "/index.html";
		}

		// Serve from project root
		const filePath = `.${path}`;
		return serveFile(filePath);
	},
});

console.log(`🚀 HTTPS Server running at https://localhost:${PORT}`);
