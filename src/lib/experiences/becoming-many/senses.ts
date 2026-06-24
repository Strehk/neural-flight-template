// ── Becoming Many — Sense-Switch State Machine ─────────────────
//
// The "soul" of the experience (M2): the 7 perceptual senses are *view modes*
// over the same world (sinneswandler-spec §4). This is the renderer-agnostic
// state machine — which sense is active, the linear cycle order, and the ~4.5 s
// eased transition between them. The *visuals* are the shared M0 material kit
// (src/lib/tsl): each sense is just a target set of kit uniforms, and switching
// lerps the live uniforms from wherever they are toward the new sense's profile.
//
// Auto trigger zones are disabled in the source (AUTO_MODE_TRIGGERS_ENABLED =
// false), so switching here is key/controller-driven only.
//
// Tuning status: Normal + Echo are the two senses tuned end-to-end for M2; the
// other five have plausible placeholder profiles to prove the machine and get
// refined in M4.

import { Color } from "three/webgpu";

export type SenseId =
	| "luft"
	| "echo"
	| "infrarot"
	| "duft"
	| "netzwerk"
	| "depth"
	| "normal";

/** Linear cycle order — keys 1–7 map to these indices (spec §4). */
export const SENSE_ORDER: SenseId[] = [
	"luft",
	"echo",
	"infrarot",
	"duft",
	"netzwerk",
	"depth",
	"normal",
];

export interface SenseProfile {
	id: SenseId;
	label: string;
	/** How far you can see, in metres (the view-radius cutoff). */
	viewRadius: number;
	/** Width of the soft fade at the reveal edge, in metres. */
	revealSoftness: number;
	/** Quantized depth-band count ("papercut"); high ≈ continuous. */
	depthLevels: number;
	fogNear: number;
	fogFar: number;
	rimPower: number;
	rimStrength: number;
	/** Near-distance terrain tint (hex). */
	colorNear: number;
	/** Far-distance terrain tint (hex). */
	colorFar: number;
	/** Haze / void colour the world dissolves into (hex). */
	fogColor: number;
	/** Fresnel edge-glow colour (hex). */
	rimColor: number;
}

export const SENSE_PROFILES: Record<SenseId, SenseProfile> = {
	// 1 — sensory void / white-out: world culled, only fog remains.
	luft: {
		id: "luft",
		label: "Luft",
		viewRadius: 4,
		revealSoftness: 4,
		depthLevels: 2,
		fogNear: 2,
		fogFar: 30,
		rimPower: 1,
		rimStrength: 0,
		colorNear: 0xf0f4ff,
		colorFar: 0xf0f4ff,
		fogColor: 0xf0f4ff,
		rimColor: 0xf0f4ff,
	},
	// 2 — bat sonar: tight dark bubble, strong papercut bands, wire glow.
	echo: {
		id: "echo",
		label: "Echo Location",
		viewRadius: 120,
		revealSoftness: 30,
		depthLevels: 7,
		fogNear: 12,
		fogFar: 150,
		rimPower: 3.0,
		rimStrength: 0.9,
		colorNear: 0x0a141f,
		colorFar: 0x4f86b0,
		fogColor: 0x05070d,
		rimColor: 0x6fb0ff,
	},
	// 3 — thermal: wide field, heat tint, warm edges (placeholder).
	infrarot: {
		id: "infrarot",
		label: "Infrarot",
		viewRadius: 620,
		revealSoftness: 80,
		depthLevels: 12,
		fogNear: 80,
		fogFar: 600,
		rimPower: 2.2,
		rimStrength: 0.6,
		colorNear: 0xffb14e,
		colorFar: 0x3a0d52,
		fogColor: 0x180a14,
		rimColor: 0xff7a3c,
	},
	// 4 — smell / chemosense: wide field, green gradient (placeholder).
	duft: {
		id: "duft",
		label: "Duft",
		viewRadius: 600,
		revealSoftness: 80,
		depthLevels: 18,
		fogNear: 70,
		fogFar: 560,
		rimPower: 2.0,
		rimStrength: 0.35,
		colorNear: 0xbfe08a,
		colorFar: 0x2f5a4a,
		fogColor: 0x0c1612,
		rimColor: 0x9ff06a,
	},
	// 5 — collective / network: wide field, red accent (placeholder).
	netzwerk: {
		id: "netzwerk",
		label: "Netzwerk",
		viewRadius: 680,
		revealSoftness: 90,
		depthLevels: 14,
		fogNear: 90,
		fogFar: 640,
		rimPower: 2.6,
		rimStrength: 0.7,
		colorNear: 0xff5a6a,
		colorFar: 0x1a1030,
		fogColor: 0x0a0814,
		rimColor: 0xff5a6a,
	},
	// 6 — dev diagnostic: quantized greyscale depth bands (placeholder).
	depth: {
		id: "depth",
		label: "Depth Debug",
		viewRadius: 460,
		revealSoftness: 50,
		depthLevels: 8,
		fogNear: 40,
		fogFar: 440,
		rimPower: 1.5,
		rimStrength: 0.2,
		colorNear: 0x111418,
		colorFar: 0xe8eef5,
		fogColor: 0x0a0a0e,
		rimColor: 0xffffff,
	},
	// 7 — daylight human vision: full-colour, near-continuous shading.
	normal: {
		id: "normal",
		label: "Normal",
		viewRadius: 500,
		revealSoftness: 60,
		depthLevels: 48,
		fogNear: 80,
		fogFar: 480,
		rimPower: 1.4,
		rimStrength: 0.25,
		colorNear: 0x8fa86a,
		colorFar: 0x6a7a88,
		fogColor: 0x0a0a14,
		rimColor: 0x9fc0ff,
	},
};

// Minimal structural view of the live TSL uniforms the manager steers. The real
// objects are `uniform()` nodes whose `.value` we mutate each frame.
interface ScalarRef {
	value: number;
}
interface ColorRef {
	value: Color;
}
export interface SenseUniforms {
	viewRadius: ScalarRef;
	revealSoftness: ScalarRef;
	depthLevels: ScalarRef;
	fogNear: ScalarRef;
	fogFar: ScalarRef;
	rimPower: ScalarRef;
	rimStrength: ScalarRef;
	colorNear: ColorRef;
	colorFar: ColorRef;
	fogColor: ColorRef;
	rimColor: ColorRef;
}

interface ScalarSnapshot {
	viewRadius: number;
	revealSoftness: number;
	depthLevels: number;
	fogNear: number;
	fogFar: number;
	rimPower: number;
	rimStrength: number;
}

function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

// Smooth ease-in-out so transitions accelerate then settle (no linear snap).
function easeInOutCubic(t: number): number {
	return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export class SenseManager {
	private readonly u: SenseUniforms;
	/** Index into SENSE_ORDER of the sense we're transitioning toward. */
	private index: number;
	/** Seconds a full sense transition takes (spec ≈ 4.5 s). */
	duration = 4.5;

	/** Fired whenever the active sense actually changes (not on construction). */
	onSwitch?: (id: SenseId) => void;

	private elapsed: number;
	private readonly from: ScalarSnapshot;
	private readonly fromColors: { near: Color; far: Color; fog: Color; rim: Color };
	private to: SenseProfile;
	private readonly toColors: { near: Color; far: Color; fog: Color; rim: Color };

	constructor(uniforms: SenseUniforms, start: SenseId) {
		this.u = uniforms;
		this.index = SENSE_ORDER.indexOf(start);
		this.to = SENSE_PROFILES[start];
		this.from = this.snapshotScalars();
		this.fromColors = {
			near: new Color(),
			far: new Color(),
			fog: new Color(),
			rim: new Color(),
		};
		this.toColors = {
			near: new Color(this.to.colorNear),
			far: new Color(this.to.colorFar),
			fog: new Color(this.to.fogColor),
			rim: new Color(this.to.rimColor),
		};
		// Snap straight to the start profile — no opening transition.
		this.elapsed = this.duration;
		this.applyProfile(this.to);
	}

	/** Current target sense (the one we're easing toward). */
	get currentIndex(): number {
		return this.index;
	}
	get current(): SenseProfile {
		return this.to;
	}

	switchToIndex(i: number): void {
		const clamped = ((i % SENSE_ORDER.length) + SENSE_ORDER.length) %
			SENSE_ORDER.length;
		if (clamped === this.index) return; // already heading there
		this.index = clamped;
		const id = SENSE_ORDER[clamped];
		this.beginTransition(SENSE_PROFILES[id]);
		this.onSwitch?.(id);
	}
	next(): void {
		this.switchToIndex(this.index + 1);
	}
	prev(): void {
		this.switchToIndex(this.index - 1);
	}

	/** Lerp the live uniforms toward the target profile. Call once per frame. */
	update(dt: number): void {
		if (this.elapsed >= this.duration) return; // settled — nothing to do
		this.elapsed = Math.min(this.elapsed + dt, this.duration);
		const t = this.duration > 0 ? this.elapsed / this.duration : 1;

		// Styling leads the radius change so terrain is always styled before it
		// becomes visible (spec §4) — radius lags the rest by ~15%.
		const st = easeInOutCubic(t);
		const rt = easeInOutCubic(Math.min(Math.max((t - 0.15) / 0.85, 0), 1));

		this.u.viewRadius.value = lerp(this.from.viewRadius, this.to.viewRadius, rt);
		this.u.revealSoftness.value = lerp(
			this.from.revealSoftness,
			this.to.revealSoftness,
			st,
		);
		this.u.depthLevels.value = lerp(this.from.depthLevels, this.to.depthLevels, st);
		this.u.fogNear.value = lerp(this.from.fogNear, this.to.fogNear, st);
		this.u.fogFar.value = lerp(this.from.fogFar, this.to.fogFar, st);
		this.u.rimPower.value = lerp(this.from.rimPower, this.to.rimPower, st);
		this.u.rimStrength.value = lerp(this.from.rimStrength, this.to.rimStrength, st);

		this.u.colorNear.value.copy(this.fromColors.near).lerp(this.toColors.near, st);
		this.u.colorFar.value.copy(this.fromColors.far).lerp(this.toColors.far, st);
		this.u.fogColor.value.copy(this.fromColors.fog).lerp(this.toColors.fog, st);
		this.u.rimColor.value.copy(this.fromColors.rim).lerp(this.toColors.rim, st);
	}

	private beginTransition(profile: SenseProfile): void {
		// Snapshot wherever the uniforms currently are (mid-transition included).
		Object.assign(this.from, this.snapshotScalars());
		this.fromColors.near.copy(this.u.colorNear.value);
		this.fromColors.far.copy(this.u.colorFar.value);
		this.fromColors.fog.copy(this.u.fogColor.value);
		this.fromColors.rim.copy(this.u.rimColor.value);

		this.to = profile;
		this.toColors.near.set(profile.colorNear);
		this.toColors.far.set(profile.colorFar);
		this.toColors.fog.set(profile.fogColor);
		this.toColors.rim.set(profile.rimColor);
		this.elapsed = 0;
	}

	private snapshotScalars(): ScalarSnapshot {
		return {
			viewRadius: this.u.viewRadius.value,
			revealSoftness: this.u.revealSoftness.value,
			depthLevels: this.u.depthLevels.value,
			fogNear: this.u.fogNear.value,
			fogFar: this.u.fogFar.value,
			rimPower: this.u.rimPower.value,
			rimStrength: this.u.rimStrength.value,
		};
	}

	private applyProfile(p: SenseProfile): void {
		this.u.viewRadius.value = p.viewRadius;
		this.u.revealSoftness.value = p.revealSoftness;
		this.u.depthLevels.value = p.depthLevels;
		this.u.fogNear.value = p.fogNear;
		this.u.fogFar.value = p.fogFar;
		this.u.rimPower.value = p.rimPower;
		this.u.rimStrength.value = p.rimStrength;
		this.u.colorNear.value.set(p.colorNear);
		this.u.colorFar.value.set(p.colorFar);
		this.u.fogColor.value.set(p.fogColor);
		this.u.rimColor.value.set(p.rimColor);
	}
}
