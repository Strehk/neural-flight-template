/** River network helpers (the graph types live in mapTypes). */
import type { RiverNetwork } from '../mapTypes';

export function emptyNetwork(): RiverNetwork {
  return { paths: [], sources: [] };
}
