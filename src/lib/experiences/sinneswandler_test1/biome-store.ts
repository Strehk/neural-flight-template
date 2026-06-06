import { writable } from "svelte/store";
import type { BatBiomeId } from "./config";

export const currentBiomeStore = writable<BatBiomeId | null>(null);
