// ── Becoming Many — Terrain Providers ──────────────────────────
//
// Importing this module registers the built-in providers as a side effect, then
// re-exports the registry surface. Anything that needs a provider should import
// from here (or call registerTerrainProvider with its own) so the registry is
// guaranteed populated.

import { registerTerrainProvider } from "./registry";
import { ridgedProvider } from "./ridged";
import { sineHillsProvider } from "./sine-hills";

registerTerrainProvider(sineHillsProvider);
registerTerrainProvider(ridgedProvider);

export {
	getTerrainProvider,
	listTerrainProviders,
	registerTerrainProvider,
} from "./registry";
export { sineHillsProvider } from "./sine-hills";
export { ridgedProvider } from "./ridged";

/** The provider the world opens with. */
export const DEFAULT_PROVIDER_ID = sineHillsProvider.id;
