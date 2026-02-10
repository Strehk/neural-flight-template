/**
 * ⚠️ TEMPORARY DEFAULTS — Will move to experience manifest (Step 2).
 * These values currently mirror config/flight.ts CAMERA + FLIGHT constants.
 * After migration: each experience passes its own config, no defaults here.
 */
import * as THREE from "three";
import { runtimeConfig } from "$lib/config/flight";
import { DEFAULT_HEIGHTMAP, getHeight } from "$lib/three/terrain/heightmap";
import type { OrientationData, SpeedCommand } from "$lib/types/orientation";

const DEG2RAD = Math.PI / 180;

export interface FlightPlayerConfig {
	fov?: number;
	near?: number;
	far?: number;
	spawnPosition?: { x: number; y: number; z: number };
	baseSpeed?: number;
	terrainSlowdown?: number;
}

const DEFAULTS: Required<FlightPlayerConfig> = {
	fov: 75,
	near: 0.1,
	far: 1000,
	spawnPosition: { x: 0, y: 50, z: 0 },
	baseSpeed: 20,
	terrainSlowdown: 0.7,
};

/** Flight player — rig with camera, driven by pitch/roll + speed commands. */
export class FlightPlayer {
	readonly rig: THREE.Group;
	readonly camera: THREE.PerspectiveCamera;

	velocity: number;
	private readonly terrainSlowdown: number;
	private targetPitch = 0;
	private targetRoll = 0;
	private currentPitch = 0;
	private currentRoll = 0;
	private heading = 0;
	private accelerating = false;
	private braking = false;

	constructor(config?: FlightPlayerConfig) {
		const c = { ...DEFAULTS, ...config };

		this.velocity = c.baseSpeed;
		this.terrainSlowdown = c.terrainSlowdown;

		this.camera = new THREE.PerspectiveCamera(c.fov, 1, c.near, c.far);
		this.rig = new THREE.Group();
		this.rig.position.set(
			c.spawnPosition.x,
			c.spawnPosition.y,
			c.spawnPosition.z,
		);
		this.rig.add(this.camera);
	}

	updateOrientation(data: OrientationData): void {
		this.targetPitch = data.pitch;
		this.targetRoll = data.roll;
	}

	updateSpeed(cmd: SpeedCommand): void {
		if (cmd.action === "accelerate") this.accelerating = cmd.active;
		if (cmd.action === "brake") this.braking = cmd.active;
	}

	tick(delta: number): void {
		this.currentPitch +=
			(this.targetPitch - this.currentPitch) * runtimeConfig.lerpAlpha;
		this.currentRoll +=
			(this.targetRoll - this.currentRoll) * runtimeConfig.lerpAlpha;

		this.updateVelocity();

		const pitchRad = this.currentPitch * DEG2RAD;
		const rollRad = this.currentRoll * DEG2RAD;

		// Heading accumulates from roll (banking turns the plane).
		// This is a scalar — no Euler coupling possible.
		this.heading -= rollRad * runtimeConfig.rollYawMultiplier * delta;

		// Forward vector from spherical coordinates (heading + pitch).
		// Decoupled: pure pitch = straight up/down, pure roll = pure turn.
		const forward = new THREE.Vector3(
			-Math.sin(this.heading) * Math.cos(pitchRad),
			-Math.sin(pitchRad),
			-Math.cos(this.heading) * Math.cos(pitchRad),
		);
		this.rig.position.addScaledVector(forward, this.velocity * delta);

		// Visual rotation only — YXZ order: heading first, then pitch, then bank.
		// Prevents Euler gimbal-coupling artifacts.
		this.rig.rotation.set(-pitchRad, this.heading, -rollRad, "YXZ");

		this.clampToTerrain();
	}

	private updateVelocity(): void {
		if (this.accelerating) {
			this.velocity = runtimeConfig.baseSpeed * 2;
		} else if (this.braking) {
			this.velocity = runtimeConfig.baseSpeed * 0.25;
		} else {
			this.velocity = runtimeConfig.baseSpeed;
		}
	}

	private clampToTerrain(): void {
		const terrainY = getHeight(
			this.rig.position.x,
			this.rig.position.z,
			DEFAULT_HEIGHTMAP,
		);
		const minY = terrainY + runtimeConfig.minClearance;
		if (this.rig.position.y < minY) {
			this.rig.position.y = minY;
			this.velocity *= this.terrainSlowdown;
		}
	}
}
