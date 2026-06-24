// ── Becoming Many — Flight Controller ──────────────────────────
//
// The Sinneswandler bat-flight feel, ported verbatim from the legacy WebGL
// experience (sinneswandler_test1/flight-controller.ts) into the WebGPU world:
// banking turns the heading, banking also drifts you sideways + adds a little
// lift, pitch climbs/dives, and a soft floor keeps you a few metres above the
// terrain. A gentle camera bob sells the wingbeat.
//
// Two deltas from the original:
//   1. It takes the *existing* (route-injected) camera and builds a rig around
//      it, instead of creating its own — so the manifest fov/near/far and the
//      route's aspect-resize keep working, and the route's `renderCamera.parent`
//      lands on our rig (XR locomotion: move the rig, the headset adds head pose).
//   2. The camera bob only writes camera.position outside an immersive session;
//      in XR the headset owns the camera matrix while the rig carries locomotion.
//
// The physics math is copied 1:1 — see the legacy file / AGENTS.md for the
// derivation. Flight constants are public + mutable so settings can tune them.
//
// IMPORTANT — see AGENTS.md "WebGPU + TSL": classes come from `three/webgpu`,
// never plain `three`, in new graphics modules.

import * as THREE from "three/webgpu";
import type { AnyRenderer } from "../types";

/** Sinneswandler's tuned flight defaults (config.ts → BAT_FLIGHT_DEFAULTS). */
const DEFAULTS = {
	cruiseSpeed: 11,
	boostSpeed: 18,
	strafeSpeed: 5.5,
	climbSpeed: 8,
	turnSpeed: 1.2,
	lookSmoothing: 0.12,
	minAltitude: 5,
	liftAssist: 1.4,
} as const;

export interface Spawn {
	x: number;
	y: number;
	z: number;
}

export class FlightController {
	/** Locomotion container — the route's renderCamera.parent. */
	readonly rig: THREE.Group;
	/** The (route-injected) camera, parented under the rig. */
	readonly camera: THREE.PerspectiveCamera;

	// Public + mutable so applySettings() can steer them live. Explicit `number`
	// types — without them the `as const` DEFAULTS would narrow each field to its
	// literal value and reject runtime reassignment.
	cruiseSpeed: number = DEFAULTS.cruiseSpeed;
	boostSpeed: number = DEFAULTS.boostSpeed;
	strafeSpeed: number = DEFAULTS.strafeSpeed;
	climbSpeed: number = DEFAULTS.climbSpeed;
	speedMultiplier = 1;
	turnSpeed: number = DEFAULTS.turnSpeed;
	lookSmoothing: number = DEFAULTS.lookSmoothing;
	minAltitude: number = DEFAULTS.minAltitude;
	liftAssist: number = DEFAULTS.liftAssist;

	private readonly renderer: AnyRenderer;

	private targetPitch = 0;
	private targetRoll = 0;
	private currentPitch = 0;
	private currentRoll = 0;
	private yaw = 0;
	private accelerating = false;
	private braking = false;
	private readonly desiredVelocity = new THREE.Vector3();
	private readonly velocity = new THREE.Vector3();
	private readonly forward = new THREE.Vector3();
	private readonly right = new THREE.Vector3();
	private elapsed = 0;

	constructor(camera: THREE.PerspectiveCamera, spawn: Spawn, renderer: AnyRenderer) {
		this.camera = camera;
		this.renderer = renderer;
		this.rig = new THREE.Group();
		this.rig.position.set(spawn.x, spawn.y, spawn.z);
		this.rig.add(camera);
		// Camera is now rig-local; zero it so the bob offsets from the rig origin
		// (the loader may have placed it at the world spawn before setup()).
		camera.position.set(0, 0, 0);
		camera.rotation.set(0, 0, 0);
	}

	/** Desired look, in degrees; clamped to the bat's flight envelope. */
	setOrientation(pitch: number, roll: number): void {
		this.targetPitch = THREE.MathUtils.clamp(pitch, -65, 65);
		this.targetRoll = THREE.MathUtils.clamp(roll, -75, 75);
	}

	setSpeed(accelerate: boolean, brake: boolean): void {
		this.accelerating = accelerate;
		this.braking = brake;
	}

	tick(delta: number, sampleHeight: (x: number, z: number) => number): void {
		this.elapsed += delta;

		const alpha = 1 - Math.exp(-delta / Math.max(this.lookSmoothing, 0.01));
		this.currentPitch += (this.targetPitch - this.currentPitch) * alpha;
		this.currentRoll += (this.targetRoll - this.currentRoll) * alpha;

		const pitchRad = THREE.MathUtils.degToRad(this.currentPitch * 0.78);
		const bankRad = THREE.MathUtils.degToRad(this.currentRoll * 0.92);
		const forwardSpeed =
			(this.braking
				? -this.boostSpeed * 0.55
				: this.accelerating
					? this.boostSpeed
					: this.cruiseSpeed) * this.speedMultiplier;

		this.yaw -= bankRad * this.turnSpeed * delta * 0.8;

		this.forward.set(
			-Math.sin(this.yaw) * Math.cos(pitchRad),
			-Math.sin(pitchRad),
			-Math.cos(this.yaw) * Math.cos(pitchRad),
		);
		this.right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

		const strafeVelocity = Math.sin(bankRad) * this.strafeSpeed;
		const verticalVelocity =
			-Math.sin(pitchRad) * this.climbSpeed +
			Math.abs(Math.sin(bankRad)) * this.liftAssist;

		this.desiredVelocity
			.copy(this.forward)
			.multiplyScalar(forwardSpeed)
			.addScaledVector(this.right, strafeVelocity);
		this.desiredVelocity.y += verticalVelocity;

		const velocityBlend = 1 - Math.exp(-delta * 3.5);
		this.velocity.lerp(this.desiredVelocity, velocityBlend);
		this.rig.position.addScaledVector(this.velocity, delta);

		const minimumY =
			sampleHeight(this.rig.position.x, this.rig.position.z) + this.minAltitude;
		if (this.rig.position.y < minimumY) {
			this.rig.position.y = THREE.MathUtils.lerp(this.rig.position.y, minimumY, 0.28);
			if (this.velocity.y < 0) {
				this.velocity.y *= 0.15;
			}
		}

		// Camera bob — wingbeat sway. Skip in XR: the headset pose owns the
		// camera matrix there, so writing camera.position would fight it.
		if (!this.renderer.xr.isPresenting) {
			this.camera.position.set(
				Math.sin(this.elapsed * 1.7) * 0.04,
				Math.sin(this.elapsed * 2.2) * 0.06,
				0,
			);
		}
		this.rig.rotation.set(-pitchRad, this.yaw, -bankRad * 0.55, "YXZ");
	}
}
