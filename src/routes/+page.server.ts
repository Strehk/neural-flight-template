import type { PageServerLoad } from "./$types.js";
import { buildNetworkInfo } from "$lib/network/detect.js";
import { buildQrData } from "$lib/network/qr.js";

export const load: PageServerLoad = ({ url }) => {
	const port = Number(url.port) || 5173;
	const info = buildNetworkInfo(port);
	const qr = buildQrData(info);
	return { network: info, qr };
};
