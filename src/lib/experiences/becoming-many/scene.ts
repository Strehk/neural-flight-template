// ── Becoming Many — TSL Terrain + Sense Modes ──────────────────
//
// A static terrain surface (M0/M1 slice) rendered through the shared TSL
// material kit (src/lib/tsl), with the M2 sense-switch state machine driving the
// kit uniforms so the 7 perceptual senses read as distinct view modes over the
// same world (sinneswandler-spec §4). The terrain is baked once on the CPU (so
// normals are correct); every *look* is TSL nodes:
//
//   - `depthBands`  → the quantized "papercut" banding (the dark-sense cue)
//   - `viewReveal`  → the per-mode view-radius bubble (world fades into the void)
//   - `distanceFog` → biome-/sense-tinted haze
//   - `fresnelEdge` → grazing-angle rim glow
//
// Senses are switched with keys 1–7 (desktop) or the "Sense" parameter; the
// SenseManager lerps the uniforms over the clock's transition time. No streaming
// or flight yet (M1/M3) — the camera auto-orbits. Compute-swarm ref: swarm-scene.
//
// TIME SPINE: an experience-local ExperienceClock (clock.ts) drives everything —
// sense transitions, the auto-orbit, the `uTime` shader uniform, and the audio
// cues (audio.ts) are all advanced by / scheduled against it, so pause / reset /
// timeScale move visuals and sound together. Transport keys: Space, R.
//
// IMPORTANT — see AGENTS.md "WebGPU + TSL": classes come from `three/webgpu`,
// node functions from `three/tsl`. Never import core classes from plain `three`.

import { cameraPosition, mix, positionWorld, uniform } from "three/tsl";
import * as THREE from "three/webgpu";
import { MeshStandardNodeMaterial } from "three/webgpu";
import { depthBands, distanceFog, fresnelEdge, viewReveal } from "$lib/tsl";
import type { ExperienceState, SetupContext, TickContext } from "../types";
import { SoundBus, SoundDirector } from "./audio";
import { ExperienceClock } from "./clock";
import { FlightController } from "./flight-controller";
import { createDefaultInput, type FlightIntent, type InputHub } from "./input";
import {
	type SenseId,
	SENSE_ORDER,
	SenseManager,
	type SenseUniforms,
} from "./senses";

// Half-extent of the (square) terrain patch, in metres. Big enough that the
// widest sense view radius reaches roughly to its corners.
const PATCH = 350;
const SEGMENTS = 200;

// Spawn pose for the flight rig (keep in sync with manifest.spawn). High enough
// to clear the ~14 m hill crests; the soft altitude floor settles it to cruise
// height. In XR the headset adds head pose on top of the rig.
const SPAWN = { x: 0, y: 38, z: 0 };

// Sense the experience opens in (index 6 = Normal — daylight).
const START_SENSE = "normal" as const;

// Audio assets are reused from the legacy experience (served from /static).
const SOUND_BASE = "/sinneswandler_test1";
// Per-sense intro narration, played once on first entry (spec §6). Normal and
// Depth have no narration line.
const NARRATION: Partial<Record<SenseId, string>> = {
	luft: "Nichts.mp3",
	echo: "A_Bat_echo.mp3",
	infrarot: "fire_beetle_red.mp3",
	duft: "bee_chemical.mp3",
	netzwerk: "swarm.mp3",
};

export interface BecomingManyState extends ExperienceState {
	camera: THREE.PerspectiveCamera;
	terrain: THREE.Mesh;
	geometry: THREE.PlaneGeometry;
	material: MeshStandardNodeMaterial;
	uniforms: SenseUniforms;
	senses: SenseManager;
	/** The time spine — advanced each tick; drives visuals + audio. */
	clock: ExperienceClock;
	/** Sound system (clip playback + clock-scheduled cues). */
	director: SoundDirector;
	/** Shader clock uniform, fed from `clock.now` each frame. */
	uTime: ReturnType<typeof uniform>;
	/** Bat-flight controller (rig + physics), driven off the clock spine. */
	flight: FlightController;
	/** Modular control stack (network + keyboard + gamepad/XR sources). */
	input: InputHub;
}

// Deterministic rolling-hills height field (planar coords → metres). A handful of
// layered sines — cheap, seed-free, and good enough to show relief under the kit.
function terrainHeight(x: number, y: number): number {
	let h = 8.0 * Math.sin(x * 0.045) * Math.cos(y * 0.05);
	h += 3.2 * Math.sin(x * 0.12 + 1.3) * Math.cos(y * 0.1 - 0.7);
	h += 1.6 * Math.sin(x * 0.27 - 2.1) * Math.cos(y * 0.31 + 0.4);
	h += 0.8 * Math.sin((x + y) * 0.05);
	return h;
}

// World-space ground height under a point. The terrain mesh is rotated -π/2 about
// X (plane XY → ground XZ), which maps a local (px, py, height) vertex to world
// (px, height, -py) — so the world point (x, z) reads the field at (x, -z).
function sampleHeight(x: number, z: number): number {
	return terrainHeight(x, -z);
}

// Map a merged input intent onto the world: flight controls, sense switching,
// and clock transport. The single seam between "what the controls want" and
// "what the experience does" — add a new InputAction case here.
function applyIntent(
	intent: FlightIntent,
	flight: FlightController,
	senses: SenseManager,
	clock: ExperienceClock,
): void {
	// Sources set pitch+roll together (or neither), so either being non-null
	// means a real orientation this frame; otherwise we keep the last target.
	if (intent.pitch !== null || intent.roll !== null) {
		flight.setOrientation(intent.pitch ?? 0, intent.roll ?? 0);
	}
	flight.setSpeed(intent.accelerate, intent.brake);
	flight.speedMultiplier = intent.boost ? 3 : 1;

	for (const action of intent.actions) {
		switch (action.kind) {
			case "sense":
				senses.switchToIndex(action.index);
				break;
			case "senseNext":
				senses.next();
				break;
			case "sensePrev":
				senses.prev();
				break;
			case "transportToggle":
				clock.toggle();
				break;
			case "transportReset":
				clock.reset();
				break;
		}
	}
}

export async function setup(ctx: SetupContext): Promise<BecomingManyState> {
	// ── Geometry: bake the height field on the CPU, then lay the patch flat ──
	const geometry = new THREE.PlaneGeometry(
		PATCH * 2,
		PATCH * 2,
		SEGMENTS,
		SEGMENTS,
	);
	const pos = geometry.attributes.position;
	for (let i = 0; i < pos.count; i++) {
		pos.setZ(i, terrainHeight(pos.getX(i), pos.getY(i)));
	}
	pos.needsUpdate = true;
	geometry.computeVertexNormals();

	// ── Sense-driven uniforms ──
	// The SenseManager mutates these every frame; they double as the kit inputs.
	// Initial values are overwritten immediately by the manager's start profile.
	const uniforms = {
		viewRadius: uniform(160),
		revealSoftness: uniform(28),
		depthLevels: uniform(6),
		fogNear: uniform(30),
		fogFar: uniform(220),
		rimPower: uniform(2.5),
		rimStrength: uniform(0.6),
		colorNear: uniform(new THREE.Color(0x8fa86a)),
		colorFar: uniform(new THREE.Color(0x6a7a88)),
		fogColor: uniform(new THREE.Color(0x0a0a14)),
		rimColor: uniform(new THREE.Color(0x9fc0ff)),
	};
	const senses = new SenseManager(uniforms, START_SENSE);

	// ── Time spine + audio ──
	const clock = new ExperienceClock();
	const uTime = uniform(0);
	const director = new SoundDirector(new SoundBus({ masterGain: 0.8 }), clock);

	// Background loop: a time cue at t=0 (starts once audio unlocks / clock runs).
	director.cue({
		id: "bg",
		src: `${SOUND_BASE}/Sound/Hintergrundmusik.mp3`,
		gain: 0.22,
		loop: true,
		fadeIn: 2,
		trigger: { kind: "time", at: 0 },
	});
	// Transition stinger: callback, fired on every sense switch.
	director.cue({
		id: "stinger",
		src: `${SOUND_BASE}/Sound/U%CC%88bergang.wav`,
		gain: 0.72,
		trigger: { kind: "callback" },
	});
	// Intro narration: one callback cue per narrated sense.
	for (const [id, file] of Object.entries(NARRATION)) {
		director.cue({
			id: `intro:${id}`,
			src: `${SOUND_BASE}/intro/${file}`,
			gain: 0.95,
			trigger: { kind: "callback" },
		});
	}

	// On every sense change: stinger + (first time only) the sense's narration.
	const heard = new Set<SenseId>();
	senses.onSwitch = (id: SenseId): void => {
		director.fire("stinger");
		if (NARRATION[id] && !heard.has(id)) {
			heard.add(id);
			director.fire(`intro:${id}`);
		}
	};

	// ── Material: every look comes from the kit, fed by the sense uniforms ──
	const material = new MeshStandardNodeMaterial();
	material.metalness = 0.0;
	material.roughness = 0.95;

	// Normalized camera distance → quantized bands → near/far tint.
	const camDist = cameraPosition.distance(positionWorld);
	const tNorm = camDist.div(uniforms.viewRadius).clamp(0, 1);
	const banded = depthBands(tNorm, uniforms.depthLevels);
	const albedo = mix(uniforms.colorNear, uniforms.colorFar, banded);

	// Haze, then the view-radius bubble — both fade to the (sense) void colour.
	const fogged = distanceFog(
		albedo,
		uniforms.fogColor,
		uniforms.fogNear,
		uniforms.fogFar,
	);
	const reveal = viewReveal(uniforms.viewRadius, uniforms.revealSoftness);
	material.colorNode = mix(uniforms.fogColor, fogged, reveal);

	// Grazing-angle rim, gated by the reveal so it never glows in the void, and
	// given a slow "breath" off the shader clock — a visible TSL element tied to
	// the time spine (it freezes when the clock pauses).
	const breath = uTime.mul(0.8).sin().mul(0.15).add(0.85); // 0.7 … 1.0
	const rim = fresnelEdge(uniforms.rimPower)
		.mul(uniforms.rimStrength)
		.mul(reveal)
		.mul(breath);
	material.emissiveNode = uniforms.rimColor.mul(rim);

	const terrain = new THREE.Mesh(geometry, material);
	terrain.rotation.x = -Math.PI / 2; // XY patch → XZ ground, +z → +y up
	ctx.scene.add(terrain);

	// ── Flight + modular controls ──
	// The controller wraps the route-injected camera in a rig (so manifest
	// fov/near/far + aspect-resize keep working, and the route's
	// renderCamera.parent lands on our rig). The input hub merges the network,
	// keyboard, and gamepad/XR sources; the scene maps the result in tick().
	const flight = new FlightController(ctx.camera, SPAWN, ctx.renderer);
	ctx.scene.add(flight.rig);
	const input = createDefaultInput(ctx.renderer);

	return {
		camera: ctx.camera,
		terrain,
		geometry,
		material,
		uniforms,
		senses,
		clock,
		director,
		uTime,
		flight,
		input,
	};
}

export function tick(
	state: ExperienceState,
	ctx: TickContext,
): { state: ExperienceState } {
	const s = state as BecomingManyState;

	// Advance the spine first, then drive everything off its (scaled) virtual
	// delta — so pause / timeScale / reset move flight, visuals, and audio
	// together. Input is polled on the real delta (sampling is time-agnostic and
	// must stay live so the Space-to-resume action still fires while paused).
	s.clock.advance(ctx.delta);
	applyIntent(s.input.poll(ctx.delta), s.flight, s.senses, s.clock);
	s.flight.tick(s.clock.delta, sampleHeight);
	s.senses.update(s.clock.delta);
	s.uTime.value = s.clock.now;

	return { state: s };
}

export function dispose(state: ExperienceState, scene: THREE.Scene): void {
	const s = state as BecomingManyState;
	s.input.dispose();
	s.director.dispose();
	scene.remove(s.flight.rig);
	scene.remove(s.terrain);
	s.geometry.dispose();
	s.material.dispose();
}

// Number of senses, exported for settings.ts range clamping.
export const SENSE_COUNT = SENSE_ORDER.length;
