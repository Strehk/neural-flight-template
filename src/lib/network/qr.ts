import type { HotspotConfig, NetworkInfo, QrData } from "./types.js";

export function buildWifiQr(config: HotspotConfig): string {
	return `WIFI:T:WPA;S:${config.ssid};P:${config.password};;`;
}

export function buildQrData(info: NetworkInfo): QrData {
	return {
		wifi: info.hotspot ? buildWifiQr(info.hotspot) : null,
		gyro: info.urls.gyro,
		vr: info.urls.vr,
	};
}
