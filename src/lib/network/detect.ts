import { readFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { resolve } from "node:path";
import type { HotspotConfig, NetworkInfo } from "./types.js";

const HOTSPOT_CONF_PATH = resolve("scripts/hotspot/hotspot.conf");

export function getLocalIp(): string {
	const nets = networkInterfaces();
	for (const interfaces of Object.values(nets)) {
		if (!interfaces) continue;
		for (const iface of interfaces) {
			if (!iface.internal && iface.family === "IPv4") {
				return iface.address;
			}
		}
	}
	return "127.0.0.1";
}

export function readHotspotConfig(): HotspotConfig | null {
	try {
		const content = readFileSync(HOTSPOT_CONF_PATH, "utf-8");
		const vars: Record<string, string> = {};
		for (const line of content.split("\n")) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith("#")) continue;
			const eq = trimmed.indexOf("=");
			if (eq === -1) continue;
			const key = trimmed.slice(0, eq).trim();
			const val = trimmed
				.slice(eq + 1)
				.trim()
				.replace(/^["']|["']$/g, "");
			vars[key] = val;
		}
		const ssid = vars.HOTSPOT_SSID;
		const password = vars.HOTSPOT_PASSWORD;
		if (!ssid || !password) return null;
		return { ssid, password };
	} catch {
		return null;
	}
}

export function buildNetworkInfo(port: number): NetworkInfo {
	const ip = getLocalIp();
	const base = `https://${ip}:${port}`;
	return {
		ip,
		port,
		urls: {
			landing: base,
			vr: `${base}/vr`,
			gyro: `${base}/gyro`,
			controller: `${base}/controller`,
		},
		hotspot: readHotspotConfig(),
	};
}
