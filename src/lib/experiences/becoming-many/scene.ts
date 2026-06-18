// ── Becoming Many — WebGPU + TSL Compute Swarm ─────────────────
//
// Ground-floor scaffold for a fresh, WebGPU-native rebuild of the Sinneswandler
// experience. Built on three/webgpu + TSL + WebXR from the start so the Quest
// performance budget is respected by construction.
//
// This scaffold proves the *real* WebGPU pipeline — not just a TSL colour graph,
// but GPU **compute** driving the simulation:
//   - particle state lives in GPU **storage buffers** (`instancedArray`)
//   - a one-time **compute kernel** seeds them (run once in setup())
//   - a per-frame **compute kernel** integrates them (dispatched in render())
//   - a `SpriteNodeMaterial` reads the same buffers straight from the GPU —
//     zero CPU round-trip per frame
//
// The shape of this code mirrors the official three.js example
// `webgpu_compute_particles_fluid` (and the simpler `webgpu_compute_particles`):
// `instancedArray(count, type)` → `Fn(() => …)().compute(count)` →
// `renderer.compute(kernel)` → `buffer.toAttribute()` on the material.
//
// IMPORTANT — see AGENTS.md "WebGPU + TSL": in WebGPU experiences everything
// comes from `three/webgpu` (classes) and `three/tsl` (node functions). Never
// import core classes from plain `three` here.

import * as THREE from "three/webgpu";
import {
	color,
	Fn,
	hash,
	instancedArray,
	instanceIndex,
	mix,
	mx_noise_vec3,
	shapeCircle,
	time,
	uniform,
	uv,
	vec3,
} from "three/tsl";
import type { ExperienceState, RenderContext, SetupContext } from "../types";

// TSL `uniform()` returns a node whose `.value` we mutate from JS each frame /
// on settings change. Typing it off the factory keeps us `any`-free.
type UniformNode = ReturnType<typeof uniform>;

// How many particles the swarm simulates on the GPU. This is "becoming many":
// the count is the whole point. WebGPU compute eats this for breakfast; the
// cost is overwhelmingly fill-rate (overdraw), not the sim — tune `pointSize`
// and `particleCount` together against the Quest budget.
const particleCount = 80_000;

// Two themed hues the swarm blends between (kept from the old scaffold cube so
// the visual identity carries over): cool blue → warm magenta.
const HUE_INNER = 0x4f9dff;
const HUE_OUTER = 0xff5f8f;

// ── State ──────────────────────────────────────────────────────
// Held across frames so render()/settings.ts/dispose() can reach the GPU objects.

export interface BecomingManyState extends ExperienceState {
	camera: THREE.PerspectiveCamera;
	/** Instanced Sprite that draws all `particleCount` particles in one call. */
	particles: THREE.Sprite;
	material: THREE.SpriteNodeMaterial;
	/** GPU storage buffers — particle state never leaves the GPU. */
	positions: ReturnType<typeof instancedArray>;
	velocities: ReturnType<typeof instancedArray>;
	colors: ReturnType<typeof instancedArray>;
	/** Per-frame compute kernel dispatched via `renderer.compute()`. */
	updateKernel: THREE.ComputeNode;
	/** Live uniforms steered from settings.ts / advanced each frame. */
	uSpeed: UniformNode;
	uTurbulence: UniformNode;
	uAttraction: UniformNode;
	uPointSize: UniformNode;
	/** Per-frame delta-time fed to the compute integrator. */
	uDelta: UniformNode;
	/** Whether the simulation steps at all (steered via settings.ts). */
	running: boolean;
}

// ── Lifecycle: setup() ─────────────────────────────────────────
// Called once on load, AFTER the loader has `await renderer.init()`-ed the
// WebGPURenderer — so it is safe to dispatch the one-time init compute here.

export async function setup(ctx: SetupContext): Promise<BecomingManyState> {
	// WebGPURenderer — guaranteed by `manifest.renderer === "webgpu"`.
	const renderer = ctx.renderer as THREE.WebGPURenderer;

	// Eye-height camera looking at the swarm's centre of mass.
	ctx.camera.position.set(0, 1.6, 6);
	ctx.camera.lookAt(0, 1.6, 0);

	// ── GPU storage buffers ──
	// `instancedArray(count, type)` allocates a persistent GPU buffer. Velocities
	// start zero-filled (default). We read/write elements with `.element(i)`.
	const positions = instancedArray(particleCount, "vec3");
	const velocities = instancedArray(particleCount, "vec3");
	const colors = instancedArray(particleCount, "vec3");

	// ── Steerable uniforms ──
	const uSpeed = uniform(1.0);
	const uTurbulence = uniform(0.6);
	const uAttraction = uniform(1.2);
	const uPointSize = uniform(0.05);
	const uDelta = uniform(0.0);

	// ── Init kernel (runs once) ──
	// Scatter every particle onto a spherical shell and assign it a colour seed.
	// `instanceIndex` is the per-particle invocation id; `hash()` is a cheap
	// deterministic [0,1) PRNG keyed by it.
	const initKernel = Fn(() => {
		const pos = positions.element(instanceIndex);
		const col = colors.element(instanceIndex);

		const radius = hash(instanceIndex).mul(1.5).add(2.5); // 2.5 … 4.0
		const theta = hash(instanceIndex.add(1)).mul(Math.PI * 2);
		const phi = hash(instanceIndex.add(2)).mul(Math.PI);

		pos.assign(
			vec3(
				radius.mul(phi.sin()).mul(theta.cos()),
				radius.mul(phi.cos()),
				radius.mul(phi.sin()).mul(theta.sin()),
			),
		);

		col.assign(mix(color(HUE_INNER), color(HUE_OUTER), hash(instanceIndex.add(3))));
	})().compute(particleCount);

	// ── Update kernel (runs every frame) ──
	// Each particle is pulled toward the centre (becoming one), pushed along a
	// tangential swirl and a curl-noise turbulence field (becoming many), then
	// integrated semi-implicitly with light damping.
	const updateKernel = Fn(() => {
		const pos = positions.element(instanceIndex);
		const vel = velocities.element(instanceIndex);

		const toCenter = pos.negate().normalize();
		const dist = pos.length();

		// Spring-like inward pull, stronger the farther out — keeps the cloud bound.
		const pull = toCenter.mul(uAttraction.mul(dist));
		// Tangential component → orbiting swirl rather than collapse to a point.
		const swirl = toCenter.cross(vec3(0, 1, 0)).mul(0.8);
		// Curl-ish turbulence sampled from a drifting MaterialX noise field.
		const turbulence = mx_noise_vec3(pos.mul(0.4).add(time.mul(0.15))).mul(
			uTurbulence,
		);

		vel.addAssign(pull.add(swirl).add(turbulence).mul(uDelta));
		vel.mulAssign(0.94); // damping
		pos.addAssign(vel.mul(uDelta).mul(uSpeed));
	})().compute(particleCount);

	// Seed the buffers on the GPU before the first frame.
	await renderer.computeAsync(initKernel);

	// ── Render material ──
	// `SpriteNodeMaterial` draws each particle as a camera-facing quad. The vital
	// idioms: `positions.toAttribute()` binds the storage buffer as the per-
	// instance position, `colors.element(instanceIndex)` reads colour straight
	// from the GPU buffer, and `shapeCircle()` masks the quad into a soft disc.
	const material = new THREE.SpriteNodeMaterial();
	material.positionNode = positions.toAttribute();
	material.colorNode = colors.element(instanceIndex);
	material.scaleNode = uPointSize;
	material.opacityNode = shapeCircle();
	material.transparent = true;
	material.depthWrite = false;
	material.blending = THREE.AdditiveBlending;

	const particles = new THREE.Sprite(material);
	particles.count = particleCount; // instanced draw count
	particles.position.set(0, 1.6, 0); // lift the whole swarm to eye height
	particles.frustumCulled = false; // positions live on the GPU; CPU bounds are stale
	ctx.scene.add(particles);

	return {
		camera: ctx.camera,
		particles,
		material,
		positions,
		velocities,
		colors,
		updateKernel,
		uSpeed,
		uTurbulence,
		uAttraction,
		uPointSize,
		uDelta,
		running: true,
	};
}

// ── Lifecycle: tick() ──────────────────────────────────────────
// CPU-side per-frame work. The simulation itself is GPU compute dispatched in
// render(); there is nothing to advance on the CPU, so this is a pass-through.

export function tick(state: ExperienceState): { state: ExperienceState } {
	return { state };
}

// ── Lifecycle: render() ────────────────────────────────────────
// Custom render hook (manifest.render). Because we define it, the /vr route
// hands us full control of the frame: we dispatch the GPU compute step, then
// draw. Both are synchronous inside the animation loop — the `*Async` variants
// are only needed when the CPU must await GPU results (e.g. read-back).

export function render(state: ExperienceState, ctx: RenderContext): void {
	const s = state as BecomingManyState;
	const renderer = ctx.renderer as THREE.WebGPURenderer;

	if (s.running) {
		// Clamp delta so a stalled tab / headset resume can't explode the sim.
		s.uDelta.value = Math.min(ctx.delta, 1 / 30);
		renderer.compute(s.updateKernel);
	}

	renderer.render(ctx.scene, ctx.camera);
}

// ── Lifecycle: dispose() ───────────────────────────────────────
// Free every GPU resource we created. NodeMaterials and storage buffers dispose
// like any THREE resource. Critical on Quest — see RULES.md "Dispose Requirement".

export function dispose(state: ExperienceState, scene: THREE.Scene): void {
	const s = state as BecomingManyState;
	scene.remove(s.particles);
	s.material.dispose();
	s.positions.dispose();
	s.velocities.dispose();
	s.colors.dispose();
}
