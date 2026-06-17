<script lang="ts">
/**
 * DevConsole — Entwickler-Overlay (Drawer)
 * ----------------------------------------
 * Mit "C" ein-/ausklappbares Performance-Panel. Liest den aktuell
 * registrierten Renderer aus der Registry und zeigt FPS, Frame-/GPU-Zeit,
 * Draw Calls, Geometrie-/Textur-/Shader-Zählungen und Kontext-Infos.
 *
 * Wird einmal global im Root-Layout gemountet und funktioniert dadurch
 * auf jeder Route, die ihren Renderer per `registerRenderer()` meldet.
 */
import type { WebGLRenderer } from "three";
import { onMount } from "svelte";
import { devConsole } from "./registry.svelte";

let open = $state(false);

// Aktuelle Werte der registrierten Live-Regler (im Sample-Loop gespiegelt,
// damit die Anzeige reaktiv bleibt – die Werte leben in fremden Uniforms).
let tweakVals = $state<number[]>([]);

function setTweak(i: number, value: number): void {
	const t = devConsole.tweaks[i];
	if (!t) return;
	t.set(value);
	tweakVals[i] = value;
}

// ── Live-Metriken (gedrosselt aktualisiert, damit Reactivity nicht ruckelt) ──
let fps = $state(0);
let fpsAvg = $state(0);
let fpsMin = $state(0);
let frameMs = $state(0);
let gpuMs = $state<number | null>(null);
let drawCalls = $state(0);
let triangles = $state(0);
let lines = $state(0);
let points = $state(0);
let geometries = $state(0);
let textures = $state(0);
let programs = $state(0);
let heapUsed = $state<number | null>(null);
let heapLimit = $state<number | null>(null);

// ── Statische Kontext-Infos (nur bei Renderer-Wechsel neu ermittelt) ──
let ctxInfo = $state<{
	gpu: string;
	api: string;
	pixelRatio: number;
	bufferW: number;
	bufferH: number;
	maxTexture: number;
} | null>(null);

let graphCanvas = $state<HTMLCanvasElement>();

// ── Mess-Schleife ──
const HISTORY = 120;
const frameTimes: number[] = [];
let lastSampleRenderer: unknown = null;
let raf = 0;
let lastTime = 0;
let lastTextUpdate = 0;

function readContextInfo(): void {
	const r = devConsole.renderer;
	if (!r) {
		ctxInfo = null;
		return;
	}

	// WebGPU-Renderer: kein WebGL-Context, keine `capabilities`.
	if ("isWebGPURenderer" in r && r.isWebGPURenderer) {
		ctxInfo = {
			gpu: "unbekannt",
			api: "WebGPU",
			pixelRatio: r.getPixelRatio(),
			bufferW: 0,
			bufferH: 0,
			maxTexture: 0,
		};
		return;
	}

	const glr = r as WebGLRenderer;
	let gpu = "unbekannt";
	let bufferW = 0;
	let bufferH = 0;
	try {
		const gl = glr.getContext();
		bufferW = gl.drawingBufferWidth;
		bufferH = gl.drawingBufferHeight;
		const dbg = gl.getExtension("WEBGL_debug_renderer_info");
		if (dbg) {
			gpu = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL));
		}
	} catch {
		// ignore
	}
	ctxInfo = {
		gpu,
		api: glr.capabilities.isWebGL2 ? "WebGL 2" : "WebGL 1",
		pixelRatio: glr.getPixelRatio(),
		bufferW,
		bufferH,
		maxTexture: glr.capabilities.maxTextureSize,
	};
}

function sample(now: number): void {
	raf = requestAnimationFrame(sample);

	const dt = lastTime ? now - lastTime : 16.7;
	lastTime = now;

	frameTimes.push(dt);
	if (frameTimes.length > HISTORY) frameTimes.shift();

	const r = devConsole.renderer;
	if (r !== lastSampleRenderer) {
		lastSampleRenderer = r;
		readContextInfo();
	}

	drawGraph();

	// Zahlenwerte nur ~8×/s aktualisieren → ruhiger lesbar, weniger Reactivity-Last.
	if (now - lastTextUpdate < 120) return;
	lastTextUpdate = now;

	const sum = frameTimes.reduce((a, b) => a + b, 0);
	const avgMs = sum / frameTimes.length;
	const maxMs = Math.max(...frameTimes);
	frameMs = dt;
	fps = Math.round(1000 / dt);
	fpsAvg = Math.round(1000 / avgMs);
	fpsMin = Math.round(1000 / maxMs);

	if (r) {
		// WebGPU- und WebGL-Info teilen sich diese Felder; `programs` ist unter
		// WebGPU undefined und wird per `?.` abgefangen.
		const info = (r as WebGLRenderer).info;
		drawCalls = info.render.calls;
		triangles = info.render.triangles;
		lines = info.render.lines;
		points = info.render.points;
		geometries = info.memory.geometries;
		textures = info.memory.textures;
		programs = info.programs?.length ?? 0;
	}

	// GPU-Zeit nur zeigen, wenn frisch gemessen (sonst veraltet/„n/a").
	gpuMs =
		devConsole.gpuTimeMs !== null && now - devConsole.gpuUpdatedAt < 1000
			? devConsole.gpuTimeMs
			: null;

	// biome-ignore lint/suspicious/noExplicitAny: performance.memory ist non-standard
	const mem = (performance as any).memory;
	if (mem) {
		heapUsed = mem.usedJSHeapSize / 1048576;
		heapLimit = mem.jsHeapSizeLimit / 1048576;
	}

	// Live-Regler-Werte spiegeln (Anzahl/Werte können sich beim Wechsel ändern).
	if (tweakVals.length !== devConsole.tweaks.length) {
		tweakVals = devConsole.tweaks.map((t) => t.get());
	} else {
		for (let i = 0; i < devConsole.tweaks.length; i++) {
			tweakVals[i] = devConsole.tweaks[i].get();
		}
	}
}

function drawGraph(): void {
	if (!graphCanvas) return;
	const ctx = graphCanvas.getContext("2d");
	if (!ctx) return;

	const w = graphCanvas.width;
	const h = graphCanvas.height;
	ctx.clearRect(0, 0, w, h);

	// Referenzlinien: 60 fps (16.7ms) und 30 fps (33.3ms)
	const msToY = (ms: number) => h - (Math.min(ms, 50) / 50) * h;
	ctx.strokeStyle = "rgba(255,255,255,0.10)";
	ctx.lineWidth = 1;
	for (const ms of [16.7, 33.3]) {
		const y = msToY(ms);
		ctx.beginPath();
		ctx.moveTo(0, y);
		ctx.lineTo(w, y);
		ctx.stroke();
	}

	if (frameTimes.length < 2) return;
	const step = w / (HISTORY - 1);
	ctx.beginPath();
	for (let i = 0; i < frameTimes.length; i++) {
		const x = i * step;
		const y = msToY(frameTimes[i]);
		if (i === 0) ctx.moveTo(x, y);
		else ctx.lineTo(x, y);
	}
	// Farbe nach aktueller Performance
	const lastMs = frameTimes[frameTimes.length - 1];
	ctx.strokeStyle =
		lastMs <= 18 ? "#4ade80" : lastMs <= 34 ? "#facc15" : "#f87171";
	ctx.lineWidth = 1.5;
	ctx.stroke();
}

function fpsColor(v: number): string {
	return v >= 55
		? "var(--success)"
		: v >= 30
			? "var(--warning)"
			: "var(--error)";
}

function fmt(n: number): string {
	return n >= 1000 ? n.toLocaleString("de-DE") : String(n);
}

function onKeydown(e: KeyboardEvent): void {
	if (e.key !== "c" && e.key !== "C") return;
	if (e.metaKey || e.ctrlKey || e.altKey) return; // Copy etc. nicht kapern
	const el = document.activeElement;
	if (
		el instanceof HTMLInputElement ||
		el instanceof HTMLTextAreaElement ||
		(el as HTMLElement)?.isContentEditable
	) {
		return; // beim Tippen nicht togglen
	}
	e.preventDefault();
	open = !open;
}

onMount(() => {
	window.addEventListener("keydown", onKeydown);
	raf = requestAnimationFrame(sample);
	return () => {
		window.removeEventListener("keydown", onKeydown);
		cancelAnimationFrame(raf);
	};
});
</script>

<!-- Toggle-Hinweis (immer sichtbar, dezent) -->
{#if !open}
	<button class="devc-tab" onclick={() => (open = true)} title="Dev-Konsole (C)">
		C
	</button>
{/if}

<aside class="devc-drawer" class:open aria-hidden={!open}>
	<header class="devc-head">
		<span class="devc-title">DEV CONSOLE</span>
		<span class="devc-label">{devConsole.label || (devConsole.renderer ? "Renderer" : "kein Renderer")}</span>
		<button class="devc-close" onclick={() => (open = false)} title="Schließen (C)">✕</button>
	</header>

	{#if !devConsole.renderer}
		<div class="devc-empty">
			Kein aktiver Renderer.<br />
			Öffne eine 3D-Experience (z. B. <code>/vr</code>).
		</div>
	{:else}
		<!-- FPS-Headline + Graph -->
		<section class="devc-section">
			<div class="devc-fps-row">
				<div class="devc-fps-big" style:color={fpsColor(fps)}>{fps}<span>fps</span></div>
				<div class="devc-fps-sub">
					<div><span>avg</span> {fpsAvg}</div>
					<div><span>min</span> {fpsMin}</div>
				</div>
			</div>
			<canvas bind:this={graphCanvas} width="280" height="60" class="devc-graph"></canvas>
		</section>

		<!-- Timing -->
		<section class="devc-section devc-grid">
			<div class="devc-metric"><span>CPU Frame</span><b>{frameMs.toFixed(1)} ms</b></div>
			<div class="devc-metric">
				<span>GPU Frame</span>
				<b>{gpuMs !== null ? `${gpuMs.toFixed(2)} ms` : "n/a"}</b>
			</div>
		</section>

		<!-- Render-Statistik (pro Frame) -->
		<section class="devc-section">
			<h3 class="devc-h3">Render / Frame</h3>
			<div class="devc-grid">
				<div class="devc-metric"><span>Draw Calls</span><b>{fmt(drawCalls)}</b></div>
				<div class="devc-metric"><span>Triangles</span><b>{fmt(triangles)}</b></div>
				{#if lines > 0}
					<div class="devc-metric"><span>Lines</span><b>{fmt(lines)}</b></div>
				{/if}
				{#if points > 0}
					<div class="devc-metric"><span>Points</span><b>{fmt(points)}</b></div>
				{/if}
			</div>
		</section>

		<!-- Speicher / GPU-Ressourcen -->
		<section class="devc-section">
			<h3 class="devc-h3">GPU-Ressourcen</h3>
			<div class="devc-grid">
				<div class="devc-metric"><span>Geometries</span><b>{fmt(geometries)}</b></div>
				<div class="devc-metric"><span>Textures</span><b>{fmt(textures)}</b></div>
				<div class="devc-metric"><span>Shader Programs</span><b>{fmt(programs)}</b></div>
				{#if heapUsed !== null}
					<div class="devc-metric">
						<span>JS Heap</span>
						<b>{heapUsed.toFixed(0)}<small> / {heapLimit?.toFixed(0)} MB</small></b>
					</div>
				{/if}
			</div>
		</section>

		<!-- Live-Regler der aktiven Experience (z. B. Shader-Tuning) -->
		{#if devConsole.tweaks.length > 0}
			<section class="devc-section">
				<h3 class="devc-h3">Live-Regler</h3>
				{#each devConsole.tweaks as tweak, i (tweak.id)}
					<div class="devc-tweak">
						<div class="devc-tweak-head">
							<span>{tweak.label}</span>
							<b>{tweakVals[i] ?? tweak.get()}{tweak.unit ?? ""}</b>
						</div>
						<input
							type="range"
							min={tweak.min}
							max={tweak.max}
							step={tweak.step}
							value={tweakVals[i] ?? tweak.get()}
							oninput={(e) => setTweak(i, Number(e.currentTarget.value))}
						/>
					</div>
				{/each}
			</section>
		{/if}

		<!-- Kontext (statisch) -->
		{#if ctxInfo}
			<section class="devc-section">
				<h3 class="devc-h3">Kontext</h3>
				<div class="devc-kv"><span>GPU</span><b title={ctxInfo.gpu}>{ctxInfo.gpu}</b></div>
				<div class="devc-kv"><span>API</span><b>{ctxInfo.api}</b></div>
				<div class="devc-kv"><span>Pixel Ratio</span><b>{ctxInfo.pixelRatio}×</b></div>
				<div class="devc-kv"><span>Buffer</span><b>{ctxInfo.bufferW}×{ctxInfo.bufferH}</b></div>
				<div class="devc-kv"><span>Max Texture</span><b>{ctxInfo.maxTexture}px</b></div>
			</section>
		{/if}
	{/if}

	<footer class="devc-foot">
		<kbd>C</kbd> öffnen / schließen
	</footer>
</aside>

<style>
	.devc-tab {
		position: fixed;
		top: 50%;
		right: 0;
		transform: translateY(-50%);
		z-index: 9998;
		width: 24px;
		height: 48px;
		padding: 0;
		background: var(--surface);
		border: 1px solid var(--border);
		border-right: none;
		color: var(--text-muted);
		font-family: var(--font-mono);
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
		opacity: 0.5;
		transition: opacity 0.15s;
	}
	.devc-tab:hover {
		opacity: 1;
		color: var(--accent);
	}

	.devc-drawer {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		z-index: 9999;
		width: 320px;
		max-width: 90vw;
		display: flex;
		flex-direction: column;
		gap: 0;
		background: rgba(9, 9, 11, 0.92);
		backdrop-filter: blur(8px);
		border-left: 1px solid var(--border);
		color: var(--text);
		font-family: var(--font-mono);
		font-size: 12px;
		transform: translateX(100%);
		transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);
		overflow-y: auto;
		pointer-events: auto;
	}
	.devc-drawer.open {
		transform: translateX(0);
	}

	.devc-head {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 12px;
		border-bottom: 1px solid var(--border-subtle);
		position: sticky;
		top: 0;
		background: rgba(9, 9, 11, 0.95);
		z-index: 1;
	}
	.devc-title {
		font-weight: 700;
		letter-spacing: 0.08em;
		color: var(--accent);
	}
	.devc-label {
		flex: 1;
		color: var(--text-subtle);
		text-align: right;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.devc-close {
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		font-size: 13px;
		padding: 2px 4px;
	}
	.devc-close:hover {
		color: var(--error);
	}

	.devc-empty {
		padding: 24px 14px;
		color: var(--text-subtle);
		line-height: 1.6;
	}
	.devc-empty code {
		color: var(--accent);
	}

	.devc-section {
		padding: 12px;
		border-bottom: 1px solid var(--border-subtle);
	}
	.devc-h3 {
		margin: 0 0 8px;
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-subtle);
	}

	.devc-fps-row {
		display: flex;
		align-items: baseline;
		gap: 14px;
		margin-bottom: 8px;
	}
	.devc-fps-big {
		font-size: 36px;
		font-weight: 700;
		line-height: 1;
	}
	.devc-fps-big span {
		font-size: 13px;
		font-weight: 400;
		color: var(--text-subtle);
		margin-left: 4px;
	}
	.devc-fps-sub {
		display: flex;
		flex-direction: column;
		gap: 2px;
		color: var(--text-muted);
	}
	.devc-fps-sub span {
		color: var(--text-subtle);
		display: inline-block;
		width: 26px;
	}

	.devc-graph {
		width: 100%;
		height: 60px;
		display: block;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid var(--border-subtle);
	}

	.devc-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}
	.devc-metric {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.devc-metric span {
		font-size: 10px;
		color: var(--text-subtle);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.devc-metric b {
		font-size: 15px;
		font-weight: 600;
		color: var(--text);
	}
	.devc-metric small {
		font-size: 10px;
		font-weight: 400;
		color: var(--text-subtle);
	}

	.devc-kv {
		display: flex;
		justify-content: space-between;
		gap: 10px;
		padding: 3px 0;
	}
	.devc-kv span {
		color: var(--text-subtle);
		flex-shrink: 0;
	}
	.devc-kv b {
		font-weight: 500;
		color: var(--text-muted);
		text-align: right;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.devc-tweak {
		margin-bottom: 12px;
	}
	.devc-tweak:last-child {
		margin-bottom: 0;
	}
	.devc-tweak-head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: 4px;
	}
	.devc-tweak-head span {
		color: var(--text-muted);
	}
	.devc-tweak-head b {
		color: var(--accent);
		font-weight: 600;
	}
	.devc-tweak input[type="range"] {
		width: 100%;
		height: 4px;
		-webkit-appearance: none;
		appearance: none;
		background: var(--surface-active);
		outline: none;
		cursor: pointer;
	}
	.devc-tweak input[type="range"]::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 12px;
		height: 12px;
		background: var(--accent);
		border: none;
		cursor: pointer;
	}
	.devc-tweak input[type="range"]::-moz-range-thumb {
		width: 12px;
		height: 12px;
		background: var(--accent);
		border: none;
		border-radius: 0;
		cursor: pointer;
	}

	.devc-foot {
		margin-top: auto;
		padding: 8px 12px;
		color: var(--text-subtle);
		font-size: 10px;
		border-top: 1px solid var(--border-subtle);
	}
	.devc-foot kbd {
		background: var(--surface-hover);
		border: 1px solid var(--border);
		border-radius: 2px;
		padding: 1px 5px;
		color: var(--text-muted);
	}
</style>
