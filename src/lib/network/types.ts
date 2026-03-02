export interface NetworkInfo {
	ip: string;
	port: number;
	urls: {
		landing: string;
		vr: string;
		gyro: string;
		controller: string;
	};
	hotspot: HotspotConfig | null;
}

export interface HotspotConfig {
	ssid: string;
	password: string;
}

export interface QrData {
	wifi: string | null;
	gyro: string;
	vr: string;
}
