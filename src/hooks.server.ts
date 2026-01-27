import type { Handle } from "@sveltejs/kit";

// WebSocket upgrade is handled by the Vite plugin in dev mode.
// For production, the adapter (e.g. adapter-node) will need
// its own WebSocket setup — see Phase N when we get there.

export const handle: Handle = async ({ event, resolve }) => {
	return resolve(event);
};
