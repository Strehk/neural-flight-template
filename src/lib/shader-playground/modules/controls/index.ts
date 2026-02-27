/**
 * Control Component Map — Maps module type → Svelte component.
 *
 * Rack.svelte uses this map instead of if/else chains.
 * New modules: add 1 import + 1 entry.
 */

import type { Component } from "svelte";
import type { RackModuleType } from "../types";

// Controls
import LFOModule from "./LFOModule.svelte";
import NoiseModule from "./NoiseModule.svelte";
import SliderModule from "./SliderModule.svelte";
import XYSliderModule from "./XYSliderModule.svelte";

// Vertex
import ExplodeModule from "./ExplodeModule.svelte";
import FlattenModule from "./FlattenModule.svelte";
import NoiseDisplaceModule from "./NoiseDisplaceModule.svelte";
import SineDisplaceModule from "./SineDisplaceModule.svelte";
import SpherizeModule from "./SpherizeModule.svelte";
import TaperModule from "./TaperModule.svelte";
import TwistModule from "./TwistModule.svelte";
import WaveModule from "./WaveModule.svelte";
import WobbleModule from "./WobbleModule.svelte";

// Fragment
import CosinePaletteModule from "./CosinePaletteModule.svelte";
import FragNoiseModule from "./FragNoiseModule.svelte";
import FresnelModule from "./FresnelModule.svelte";
import MixModule from "./MixModule.svelte";
import PatternModule from "./PatternModule.svelte";
import PostProcessModule from "./PostProcessModule.svelte";
import SDFCircleModule from "./SDFCircleModule.svelte";
import SolidColorModule from "./SolidColorModule.svelte";
import UVDistortModule from "./UVDistortModule.svelte";
import UVGradientModule from "./UVGradientModule.svelte";

/** Props interface shared by all control components */
export interface ControlComponentProps {
	params: Record<string, number>;
	onparamchange: (name: string, value: number) => void;
	/** Module ID for modulation routing (optional, passed by Rack) */
	moduleId?: string;
	/** Rack state for modulation routing (optional, passed by Rack) */
	rack?: import("../../state.svelte").ShaderRackState;
}

type CC = Component<ControlComponentProps>;

export const CONTROL_COMPONENTS: Partial<Record<RackModuleType, CC>> = {
	// Controls
	slider: SliderModule as CC,
	xy: XYSliderModule as CC,
	lfo: LFOModule as CC,
	noise: NoiseModule as CC,
	// Vertex (v_passthrough has no UI)
	v_sine_displace: SineDisplaceModule as CC,
	v_wave: WaveModule as CC,
	v_twist: TwistModule as CC,
	v_noise_displace: NoiseDisplaceModule as CC,
	v_explode: ExplodeModule as CC,
	v_wobble: WobbleModule as CC,
	v_flatten: FlattenModule as CC,
	v_spherize: SpherizeModule as CC,
	v_taper: TaperModule as CC,
	// Fragment
	f_solid_color: SolidColorModule as CC,
	f_uv_gradient: UVGradientModule as CC,
	f_cosine_palette: CosinePaletteModule as CC,
	f_pattern: PatternModule as CC,
	f_noise: FragNoiseModule as CC,
	f_mix: MixModule as CC,
	f_uv_distort: UVDistortModule as CC,
	f_sdf_circle: SDFCircleModule as CC,
	f_fresnel: FresnelModule as CC,
	f_post_process: PostProcessModule as CC,
};
