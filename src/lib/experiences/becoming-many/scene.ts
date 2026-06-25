// ── Becoming Many — Streaming GPU Terrain + Senses + Flight ────
//
// You fly (M1) over a streaming, effectively-infinite world (M3): a grid of
// terrain chunks that load ahead of you and unload behind. Each chunk's vertices
// are generated off the main thread by a worker pool running the active *terrain
// provider* (terrain/) — a fully pluggable generation algorithm — and drawn by
// one shared sense material. The M2 sense-switch state machine drives that
// material's kit uniforms so the 7 senses read as distinct view modes over the
// whole streamed world.
//
//   - terrain/        → pluggable providers + worker pool + ChunkScheduler
//   - senses.ts       → the 7 view-mode profiles lerped into the kit uniforms
//   - flight-controller.ts / input/ → bat-flight on the modular control stack
//
// TIME SPINE: an experience-local ExperienceClock (clock.ts) drives everything —
// flight, sense transitions, the `uTime` shader uniform, and the audio cues
// (audio.ts) are all advanced by / scheduled against it, so pause / reset /
// timeScale move visuals, motion, and sound together. Transport keys: Space, R.
//
// IMPORTANT — see AGENTS.md "WebGPU + TSL": classes come from `three/webgpu`,
// node functions from `three/tsl`. Never import core classes from plain `three`.

import { uniform } from "three/tsl";
import * as THREE from "three/webgpu";
import type { ExperienceState, SetupContext, TickContext } from "../types";
import { SoundBus, SoundDirector } from "./audio";
import { ExperienceClock } from "./clock";
import { FlightController } from "./flight-controller";
import { createDefaultInput, type FlightIntent, type InputHub } from "./input";
import { type SenseId, SENSE_ORDER, SenseManager } from "./senses";
import { createSenseUniforms, type KitUniforms } from "./terrain/material";
import { DEFAULT_PROVIDER_ID, getTerrainProvider } from "./terrain/providers";
import { TerrainWorld } from "./terrain/world";

// Spawn pose for the flight rig (keep in sync with manifest.spawn). High enough
// to clear the hill crests; the soft altitude floor settles it to cruise height.
// In XR the headset adds head pose on top of the rig.
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
	/** Streaming chunked terrain (owns its material + ChunkScheduler). */
	world: TerrainWorld;
	uniforms: KitUniforms;
	senses: SenseManager;
	/** The time spine — advanced each tick; drives flight, visuals + audio. */
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
	// ── Sense-driven uniforms ──
	// The SenseManager mutates these every frame; the shared terrain material
	// reads them. Initial values are overwritten by the manager's start profile.
	const uniforms = createSenseUniforms();
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

	// ── Flight + modular controls ──
	// The controller wraps the route-injected camera in a rig (so manifest
	// fov/near/far + aspect-resize keep working, and the route's
	// renderCamera.parent lands on our rig). The input hub merges the network,
	// keyboard, and gamepad/XR sources; the scene maps the result in tick().
	const flight = new FlightController(ctx.camera, SPAWN, ctx.renderer);
	ctx.scene.add(flight.rig);
	const input = createDefaultInput(ctx.renderer);

	// ── Streaming terrain ──
	// One shared sense material; each chunk's vertices generated off-thread by a
	// worker pool running the active provider. The provider's height() feeds both
	// the worker (geometry) and the flight floor.
	const world = new TerrainWorld({
		scene: ctx.scene,
		uniforms,
		uTime,
		provider: getTerrainProvider(DEFAULT_PROVIDER_ID),
	});
	// Stream the first ring around spawn before the first frame.
	world.update(SPAWN.x, SPAWN.z);

	return {
		camera: ctx.camera,
		world,
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
	s.flight.tick(s.clock.delta, (x, z) => s.world.sampleHeight(x, z));
	// Stream chunks around the rig's new position.
	s.world.update(s.flight.rig.position.x, s.flight.rig.position.z);
	s.senses.update(s.clock.delta);
	s.uTime.value = s.clock.now;

	return { state: s };
}

export function dispose(state: ExperienceState, scene: THREE.Scene): void {
	const s = state as BecomingManyState;
	s.input.dispose();
	s.director.dispose();
	scene.remove(s.flight.rig);
	s.world.dispose();
}

// Number of senses, exported for settings.ts range clamping.
export const SENSE_COUNT = SENSE_ORDER.length;
