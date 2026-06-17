/**
 * Dev-Console Registry
 * --------------------
 * Globaler, reaktiver Slot für den gerade aktiven Three.js-Renderer.
 *
 * Jede Route, die einen WebGLRenderer betreibt, ruft beim Mount
 * `registerRenderer(renderer, label)` auf und beim Unmount
 * `unregisterRenderer(renderer)`. Die `<DevConsole>`-Overlay-Komponente
 * (im Root-Layout) liest aus dieser Registry und kann so auf jeder Seite
 * die Render-Statistik anzeigen, ohne dass die Routes die Konsole selbst
 * einbinden müssen.
 *
 * Zusätzlich wird – falls die GPU/Browser-Kombi es erlaubt – echtes
 * GPU-Timing per `EXT_disjoint_timer_query_webgl2` gemessen, indem
 * `renderer.render` umschlossen wird.
 */

import type { Camera, Scene, WebGLRenderer } from "three";
import type { WebGPURenderer } from "three/webgpu";

/**
 * Ein Renderer, den die Dev-Konsole anzeigen kann. GPU-Timing gibt es nur unter
 * WebGL 2 — WebGPU wird trotzdem registriert (zeigt alles außer GPU-ms).
 */
export type AnyRenderer = WebGLRenderer | WebGPURenderer;

/**
 * Live-Regler, den eine Experience in der Dev-Konsole bereitstellen kann
 * (z. B. ein Shader-Uniform, das man zur Laufzeit „durchprobieren" will).
 */
export interface DevTweak {
	/** Eindeutige ID zum Ab-/Anmelden. */
	id: string;
	/** Anzeigename im Panel. */
	label: string;
	min: number;
	max: number;
	step: number;
	/** Liest den aktuellen Wert (z. B. aus dem Uniform). */
	get: () => number;
	/** Schreibt den neuen Wert (z. B. ins Uniform). */
	set: (value: number) => void;
	/** Optionaler Suffix für die Wertanzeige (z. B. "px", "×"). */
	unit?: string;
}

interface DevConsoleState {
	/** Aktiver Renderer oder null, wenn keine 3D-Szene läuft. */
	renderer: AnyRenderer | null;
	/** Menschlich lesbares Label (z. B. Experience-Name). */
	label: string;
	/** Zuletzt gemessene GPU-Zeit in ms, oder null wenn nicht unterstützt. */
	gpuTimeMs: number | null;
	/** performance.now() der letzten GPU-Messung – für „veraltet"-Erkennung. */
	gpuUpdatedAt: number;
	/** Von der aktiven Experience bereitgestellte Live-Regler. */
	tweaks: DevTweak[];
}

export const devConsole = $state<DevConsoleState>({
	renderer: null,
	label: "",
	gpuTimeMs: null,
	gpuUpdatedAt: 0,
	tweaks: [],
});

/** Live-Regler in der Dev-Konsole registrieren (ersetzt einen mit gleicher ID). */
export function registerTweak(tweak: DevTweak): void {
	const existing = devConsole.tweaks.findIndex((t) => t.id === tweak.id);
	if (existing >= 0) devConsole.tweaks[existing] = tweak;
	else devConsole.tweaks.push(tweak);
}

/** Live-Regler wieder abmelden. */
export function unregisterTweak(id: string): void {
	devConsole.tweaks = devConsole.tweaks.filter((t) => t.id !== id);
}

// ── GPU-Timer-Plumbing ────────────────────────────────────────────────

// biome-ignore lint/suspicious/noExplicitAny: WebGL-Extension hat keine DOM-Typen
type TimerExt = any;

let gl: WebGL2RenderingContext | null = null;
let timerExt: TimerExt = null;
let originalRender: WebGLRenderer["render"] | null = null;
let wrappedRenderer: WebGLRenderer | null = null;
const pendingQueries: WebGLQuery[] = [];

// WebGPU misst GPU-Zeit per Timestamp-Query — ein ganz anderer Weg als WebGL.
// Wir umschließen render(), lösen danach die Timestamps asynchron auf und
// schreiben die Dauer (ms) in devConsole.
let wrappedGpuRenderer: WebGPURenderer | null = null;
let originalGpuRender: WebGPURenderer["render"] | null = null;

function pollGpuQueries(): void {
	if (!gl || !timerExt) return;

	// Bei einem "disjoint event" (z. B. GPU-Throttling) sind alle laufenden
	// Messungen ungültig und werden verworfen.
	const disjoint = gl.getParameter(timerExt.GPU_DISJOINT_EXT);
	if (disjoint) {
		for (const q of pendingQueries) gl.deleteQuery(q);
		pendingQueries.length = 0;
		return;
	}

	while (pendingQueries.length > 0) {
		const query = pendingQueries[0];
		const available = gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE);
		if (!available) break;
		const elapsedNs = gl.getQueryParameter(query, gl.QUERY_RESULT) as number;
		devConsole.gpuTimeMs = elapsedNs / 1e6;
		devConsole.gpuUpdatedAt = performance.now();
		gl.deleteQuery(query);
		pendingQueries.shift();
	}
}

function setupGpuTimer(renderer: AnyRenderer): void {
	if (wrappedRenderer === renderer || wrappedGpuRenderer === renderer) return;
	teardownGpuTimer();

	// WebGPU misst GPU-Zeit anders (Timestamp-Queries statt WebGL-2-Extension).
	if ("isWebGPURenderer" in renderer && renderer.isWebGPURenderer) {
		setupWebGPUTimer(renderer as WebGPURenderer);
		return;
	}
	const glRenderer = renderer as WebGLRenderer;

	const ctx = glRenderer.getContext();
	if (
		typeof WebGL2RenderingContext === "undefined" ||
		!(ctx instanceof WebGL2RenderingContext)
	) {
		return;
	}
	gl = ctx;
	timerExt = gl.getExtension("EXT_disjoint_timer_query_webgl2");
	if (!timerExt) {
		gl = null;
		return; // GPU-Timing nicht verfügbar (häufig deaktiviert) – graceful.
	}

	originalRender = glRenderer.render.bind(glRenderer);
	wrappedRenderer = glRenderer;

	glRenderer.render = function timedRender(scene: Scene, camera: Camera): void {
		pollGpuQueries();

		// Nicht mehr als ein paar Messungen gleichzeitig in der Pipeline halten.
		if (!gl || !timerExt || pendingQueries.length > 2) {
			originalRender?.(scene, camera);
			return;
		}

		const query = gl.createQuery();
		if (!query) {
			originalRender?.(scene, camera);
			return;
		}

		gl.beginQuery(timerExt.TIME_ELAPSED_EXT, query);
		originalRender?.(scene, camera);
		gl.endQuery(timerExt.TIME_ELAPSED_EXT);
		pendingQueries.push(query);
	} as WebGLRenderer["render"];
}

// ── WebGPU-GPU-Timer ──────────────────────────────────────────────────

function setupWebGPUTimer(renderer: WebGPURenderer): void {
	originalGpuRender = renderer.render.bind(renderer);
	wrappedGpuRenderer = renderer;

	renderer.render = function timedRender(scene: Scene, camera: Camera) {
		const result = originalGpuRender?.(scene, camera);
		// Timestamps des gerade abgeschickten Frames asynchron auflösen. Liefert
		// undefined, wenn das Gerät `timestamp-query` nicht kann → GPU-ms bleibt
		// "n/a" (resolveTimestampsAsync warnt dann genau einmal).
		renderer
			.resolveTimestampsAsync()
			.then((ms) => {
				if (typeof ms === "number" && ms > 0) {
					devConsole.gpuTimeMs = ms;
					devConsole.gpuUpdatedAt = performance.now();
				}
			})
			.catch(() => {});
		return result;
	} as WebGPURenderer["render"];
}

function teardownWebGPUTimer(): void {
	if (wrappedGpuRenderer && originalGpuRender) {
		wrappedGpuRenderer.render = originalGpuRender;
	}
	wrappedGpuRenderer = null;
	originalGpuRender = null;
}

function teardownGpuTimer(): void {
	teardownWebGPUTimer();
	if (wrappedRenderer && originalRender) {
		wrappedRenderer.render = originalRender;
	}
	if (gl) {
		for (const q of pendingQueries) gl.deleteQuery(q);
	}
	pendingQueries.length = 0;
	gl = null;
	timerExt = null;
	originalRender = null;
	wrappedRenderer = null;
	devConsole.gpuTimeMs = null;
	devConsole.gpuUpdatedAt = 0;
}

// ── Öffentliche API ───────────────────────────────────────────────────

export function registerRenderer(renderer: AnyRenderer, label = ""): void {
	if (devConsole.renderer === renderer) {
		devConsole.label = label;
		setupGpuTimer(renderer);
		return;
	}

	// Falls noch ein alter Renderer registriert war, sauber abbauen.
	if (devConsole.renderer) {
		teardownGpuTimer();
	}
	devConsole.renderer = renderer;
	devConsole.label = label;
	setupGpuTimer(renderer);
}

export function unregisterRenderer(renderer?: AnyRenderer): void {
	// Nur abmelden, wenn es wirklich der aktuelle Renderer ist (Race bei
	// schnellen Navigationen vermeiden).
	if (renderer && devConsole.renderer !== renderer) return;
	teardownGpuTimer();
	devConsole.renderer = null;
	devConsole.label = "";
	devConsole.tweaks = [];
}
