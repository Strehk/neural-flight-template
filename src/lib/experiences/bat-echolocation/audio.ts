import * as THREE from "three";
import type { BatAudioSettings } from "./config";
import type { EchoProbeHit, EchoProbeProfile, EchoSurfaceType } from "./world";

type AudioContextCtor = typeof AudioContext;
type EchoLayerId = "high" | "mid" | "low";

interface EchoPulseVoiceOptions {
  settings: BatAudioSettings;
  profile: EchoProbeProfile;
  range: number;
  scanDuration: number;
  intensity: number;
  noiseBuffer: AudioBuffer;
}

interface PulseSlice {
  time: number;
  distance: number;
  density: number;
  ruggedness: number;
  pan: number;
  highEnergy: number;
  midEnergy: number;
  lowEnergy: number;
  tree: number;
  rock: number;
  grass: number;
  terrain: number;
  moth: number;
}

interface LayerNodes {
  oscillator: OscillatorNode;
  toneFilter: BiquadFilterNode;
  toneGain: GainNode;
  noiseFilter: BiquadFilterNode;
  noiseGain: GainNode;
  panner: StereoPannerNode;
}

interface TransientDescriptor {
  oscillatorType: OscillatorType;
  filterType: BiquadFilterType;
  duration: number;
  gain: number;
  pitchOffset: number;
  sweep: number;
  q: number;
  filterMultiplier: number;
}

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;

  const audioWindow = window as Window &
    typeof globalThis & {
      webkitAudioContext?: AudioContextCtor;
    };

  return window.AudioContext ?? audioWindow.webkitAudioContext ?? null;
}

function createNoiseBuffer(context: AudioContext): AudioBuffer {
  const length = Math.max(1, Math.floor(context.sampleRate * 1.8));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const channel = buffer.getChannelData(0);

  for (let i = 0; i < length; i++) {
    channel[i] = (Math.random() * 2 - 1) * 0.7;
  }

  return buffer;
}

function clampAudio(value: number, min: number, max: number): number {
  return THREE.MathUtils.clamp(value, min, max);
}

function getTransientDescriptor(
  material: EchoSurfaceType,
): TransientDescriptor {
  switch (material) {
    case "tree":
      return {
        oscillatorType: "sine",
        filterType: "lowpass",
        duration: 0.12,
        gain: 0.055,
        pitchOffset: 360,
        sweep: 0.74,
        q: 1.4,
        filterMultiplier: 0.92,
      };
    case "rock":
      return {
        oscillatorType: "triangle",
        filterType: "bandpass",
        duration: 0.085,
        gain: 0.072,
        pitchOffset: 620,
        sweep: 0.62,
        q: 5.6,
        filterMultiplier: 1.12,
      };
    case "grass":
      return {
        oscillatorType: "sine",
        filterType: "highpass",
        duration: 0.065,
        gain: 0.04,
        pitchOffset: 760,
        sweep: 0.8,
        q: 0.9,
        filterMultiplier: 0.88,
      };
    case "moth":
      return {
        oscillatorType: "triangle",
        filterType: "bandpass",
        duration: 0.145,
        gain: 0.168,
        pitchOffset: 1420,
        sweep: 0.82,
        q: 12.6,
        filterMultiplier: 1.74,
      };
    case "terrain":
    default:
      return {
        oscillatorType: "triangle",
        filterType: "bandpass",
        duration: 0.1,
        gain: 0.05,
        pitchOffset: 470,
        sweep: 0.7,
        q: 2.4,
        filterMultiplier: 1,
      };
  }
}

function getHitVariation(hit: EchoProbeHit): number {
  return (
    Math.sin(hit.point.x * 0.173 + hit.point.z * 0.211 + hit.point.y * 0.097) *
      0.5 +
    0.5
  );
}

function mapDistanceToPitch(
  distance: number,
  range: number,
  pitchCurve: number,
): number {
  const normalized = clampAudio(distance / Math.max(range, 1), 0, 1);
  const closeBias = 1 - Math.log1p(normalized * 8.5) / Math.log(9.5);
  const curved = Math.pow(clampAudio(closeBias, 0, 1), pitchCurve);
  return 110 + curved * 820;
}

function buildSlices(
  profile: EchoProbeProfile,
  range: number,
  settings: BatAudioSettings,
): PulseSlice[] {
  if (profile.hits.length === 0) return [];

  const maxDelay = profile.hits.reduce(
    (max, hit) => Math.max(max, hit.delay),
    0.12,
  );
  const sliceCount = clampAudio(Math.ceil(maxDelay / 0.16), 8, 18);
  const slices = Array.from({ length: sliceCount }, (_, index) => ({
    time: (index / sliceCount) * maxDelay,
    distance: 0,
    density: 0,
    ruggedness: 0,
    pan: 0,
    highEnergy: 0,
    midEnergy: 0,
    lowEnergy: 0,
    tree: 0,
    rock: 0,
    grass: 0,
    terrain: 0,
    moth: 0,
    weight: 0,
  }));

  for (const hit of profile.hits) {
    const normalized = clampAudio(hit.distance / Math.max(range, 1), 0, 1);
    const index = Math.min(
      slices.length - 1,
      Math.floor((hit.delay / Math.max(maxDelay, 1e-3)) * slices.length),
    );
    const slice = slices[index];
    const distanceGain = Math.pow(
      clampAudio(1 - normalized * 0.9, 0.12, 1),
      settings.distanceVolume,
    );
    const densityGain =
      0.58 + hit.density * clampAudio(settings.densityComplexity, 0.2, 2.5);
    const weight =
      distanceGain * densityGain * (0.34 + hit.reflectivity * 0.86);
    const highWeight = Math.pow(1 - normalized, settings.pitchCurve);
    const midWeight = clampAudio(1 - Math.abs(normalized * 2 - 1), 0, 1);
    const lowWeight = Math.pow(normalized, 1.18);

    slice.distance += hit.distance * weight;
    slice.density += hit.density * weight;
    slice.ruggedness += hit.ruggedness * weight;
    slice.pan += hit.pan * weight;
    slice.highEnergy += highWeight * weight;
    slice.midEnergy += midWeight * weight;
    slice.lowEnergy += lowWeight * weight;

    switch (hit.material) {
      case "tree":
        slice.tree += weight;
        break;
      case "rock":
        slice.rock += weight;
        break;
      case "grass":
        slice.grass += weight;
        break;
      case "terrain":
        slice.terrain += weight;
        break;
      case "moth":
        slice.moth += weight;
        break;
    }

    slice.weight += weight;
  }

  return slices
    .filter((slice) => slice.weight > 0)
    .map((slice) => {
      const inverse = 1 / Math.max(slice.weight, 1e-4);
      return {
        time: slice.time,
        distance: slice.distance * inverse,
        density: slice.density * inverse,
        ruggedness: slice.ruggedness * inverse,
        pan: slice.pan * inverse,
        highEnergy: slice.highEnergy * inverse,
        midEnergy: slice.midEnergy * inverse,
        lowEnergy: slice.lowEnergy * inverse,
        tree: slice.tree * inverse,
        rock: slice.rock * inverse,
        grass: slice.grass * inverse,
        terrain: slice.terrain * inverse,
        moth: slice.moth * inverse,
      };
    });
}

function pickEnabledLayers(
  slices: PulseSlice[],
  maxLayers: number,
): Set<EchoLayerId> {
  const totals = {
    high: 0,
    mid: 0,
    low: 0,
  };

  for (const slice of slices) {
    totals.high += slice.highEnergy;
    totals.mid += slice.midEnergy;
    totals.low += slice.lowEnergy;
  }

  return new Set(
    (Object.entries(totals) as Array<[EchoLayerId, number]>)
      .sort((a, b) => b[1] - a[1])
      .slice(0, clampAudio(Math.round(maxLayers), 1, 3))
      .map(([id]) => id),
  );
}

class EchoPulseVoice {
  readonly stopTime: number;

  private readonly mixGain: GainNode;
  private readonly layers: Record<EchoLayerId, LayerNodes>;
  private readonly noiseSource: AudioBufferSourceNode;
  private disposed = false;

  constructor(
    private readonly context: AudioContext,
    private readonly destination: AudioNode,
    options: EchoPulseVoiceOptions,
  ) {
    this.mixGain = context.createGain();
    this.mixGain.gain.value = 0.0001;
    this.layers = {
      high: this.createLayer("triangle", "bandpass"),
      mid: this.createLayer("triangle", "bandpass"),
      low: this.createLayer("sine", "lowpass"),
    };
    this.noiseSource = context.createBufferSource();
    this.noiseSource.buffer = options.noiseBuffer;
    this.noiseSource.loop = true;

    for (const layer of Object.values(this.layers)) {
      this.noiseSource.connect(layer.noiseFilter);
    }

    this.mixGain.connect(this.destination);
    this.stopTime = this.schedule(options);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    for (const layer of Object.values(this.layers)) {
      layer.oscillator.disconnect();
      layer.toneFilter.disconnect();
      layer.toneGain.disconnect();
      layer.noiseFilter.disconnect();
      layer.noiseGain.disconnect();
      layer.panner.disconnect();
    }

    this.noiseSource.disconnect();
    this.mixGain.disconnect();
  }

  private createLayer(
    oscillatorType: OscillatorType,
    noiseFilterType: BiquadFilterType,
  ): LayerNodes {
    const oscillator = this.context.createOscillator();
    oscillator.type = oscillatorType;

    const toneFilter = this.context.createBiquadFilter();
    toneFilter.type = "bandpass";
    toneFilter.frequency.value = 220;
    toneFilter.Q.value = 1.1;

    const toneGain = this.context.createGain();
    toneGain.gain.value = 0.0001;

    const noiseFilter = this.context.createBiquadFilter();
    noiseFilter.type = noiseFilterType;
    noiseFilter.frequency.value = 700;
    noiseFilter.Q.value = 0.8;

    const noiseGain = this.context.createGain();
    noiseGain.gain.value = 0.0001;

    const panner = this.context.createStereoPanner();
    panner.pan.value = 0;

    oscillator.connect(toneFilter);
    toneFilter.connect(toneGain);
    toneGain.connect(panner);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(panner);
    panner.connect(this.mixGain);

    return {
      oscillator,
      toneFilter,
      toneGain,
      noiseFilter,
      noiseGain,
      panner,
    };
  }

  private scheduleMothSparkle(
    onset: number,
    pitch: number,
    pan: number,
    intensity: number,
  ): void {
    const oscillator = this.context.createOscillator();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    const panner = this.context.createStereoPanner();
    const releaseTime = onset + 0.108;

    oscillator.type = "sine";
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(this.mixGain);

    filter.type = "bandpass";
    filter.Q.value = 10.5;
    panner.pan.value = clampAudio(pan, -1, 1);

    oscillator.frequency.setValueAtTime(
      clampAudio(pitch * 1.38, 1400, 4600),
      onset,
    );
    oscillator.frequency.exponentialRampToValueAtTime(
      clampAudio(pitch * 0.94, 980, 2800),
      releaseTime,
    );
    filter.frequency.setValueAtTime(
      clampAudio(pitch * 1.52, 1800, 5200),
      onset,
    );
    filter.frequency.exponentialRampToValueAtTime(
      clampAudio(pitch * 0.9, 1200, 3200),
      releaseTime,
    );
    gain.gain.setValueAtTime(0.0001, onset);
    gain.gain.exponentialRampToValueAtTime(
      clampAudio(intensity * 1.14, 0.0001, 0.26),
      onset + 0.006,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, releaseTime);

    oscillator.start(onset);
    oscillator.stop(releaseTime + 0.02);
    oscillator.addEventListener("ended", () => {
      oscillator.disconnect();
      filter.disconnect();
      gain.disconnect();
      panner.disconnect();
    });
  }

  private scheduleHitTransients(
    options: EchoPulseVoiceOptions,
    startTime: number,
  ): void {
    const orderedHits = [...options.profile.hits].sort(
      (a, b) => a.delay - b.delay,
    );
    const materialInfluence = clampAudio(
      options.settings.materialInfluence,
      0,
      1.5,
    );

    for (const hit of orderedHits) {
      const descriptor = getTransientDescriptor(hit.material);
      const variation = getHitVariation(hit);
      const onset = startTime + hit.delay;
      const duration =
        descriptor.duration *
        (0.88 + variation * 0.24 + hit.reflectivity * 0.12);
      const releaseTime = onset + duration;
      const basePitch = mapDistanceToPitch(
        hit.distance,
        options.range,
        options.settings.pitchCurve,
      );
      const pitch = clampAudio(
        basePitch * 1.08 + descriptor.pitchOffset + variation * 240,
        980,
        3400,
      );
      const filterFrequency = clampAudio(
        pitch * descriptor.filterMultiplier + variation * 320,
        900,
        5200,
      );
      const gainValue = clampAudio(
        descriptor.gain *
          options.intensity *
          (0.96 + hit.reflectivity * 0.5 + hit.density * 0.18),
        0.0001,
        hit.material === "moth" ? 0.28 : 0.18,
      );
      const oscillator = this.context.createOscillator();
      const filter = this.context.createBiquadFilter();
      const gain = this.context.createGain();
      const panner = this.context.createStereoPanner();

      oscillator.type = descriptor.oscillatorType;
      filter.type = descriptor.filterType;
      filter.Q.value =
        descriptor.q +
        hit.ruggedness * 1.8 +
        materialInfluence * hit.reflectivity * 1.6;
      panner.pan.value = clampAudio(
        hit.pan * options.settings.stereoWidth * 1.12,
        -1,
        1,
      );

      oscillator.connect(filter);
      filter.connect(gain);
      gain.connect(panner);
      panner.connect(this.mixGain);

      oscillator.frequency.setValueAtTime(pitch, onset);
      oscillator.frequency.exponentialRampToValueAtTime(
        clampAudio(pitch * descriptor.sweep, 620, pitch),
        releaseTime,
      );
      filter.frequency.setValueAtTime(filterFrequency, onset);
      filter.frequency.exponentialRampToValueAtTime(
        clampAudio(filterFrequency * 0.82, 720, 5400),
        releaseTime,
      );
      gain.gain.setValueAtTime(0.0001, onset);
      gain.gain.exponentialRampToValueAtTime(gainValue, onset + 0.009);
      gain.gain.exponentialRampToValueAtTime(0.0001, releaseTime);

      oscillator.start(onset);
      oscillator.stop(releaseTime + 0.02);
      if (hit.material === "moth") {
        this.scheduleMothSparkle(
          onset + 0.012,
          pitch,
          hit.pan * options.settings.stereoWidth * 1.24,
          gainValue,
        );
        this.scheduleMothSparkle(
          onset + 0.044,
          pitch * 0.84,
          hit.pan * options.settings.stereoWidth * 1.08,
          gainValue * 0.72,
        );
        this.scheduleMothSparkle(
          onset + 0.078,
          pitch * 1.12,
          hit.pan * options.settings.stereoWidth * 1.3,
          gainValue * 0.54,
        );
      }
      oscillator.addEventListener("ended", () => {
        oscillator.disconnect();
        filter.disconnect();
        gain.disconnect();
        panner.disconnect();
      });
    }
  }

  private schedule(options: EchoPulseVoiceOptions): number {
    const slices = buildSlices(
      options.profile,
      options.range,
      options.settings,
    );
    const enabledLayers = pickEnabledLayers(slices, options.settings.maxLayers);
    const startTime = this.context.currentTime + 0.02;
    const sustainUntil = startTime + Math.max(options.scanDuration, 0.18);
    const voiceLevel =
      options.settings.masterVolume *
      options.intensity *
      (0.42 +
        options.profile.density * 0.34 +
        options.profile.terrainVariance * 0.14 +
        options.settings.droneIntensity * 0.44 +
        options.profile.mothWeight * 0.22);

    this.mixGain.gain.setValueAtTime(0.0001, startTime);
    this.mixGain.gain.linearRampToValueAtTime(
      clampAudio(voiceLevel, 0.0001, 1.15),
      startTime + 0.07,
    );
    this.mixGain.gain.setValueAtTime(
      clampAudio(voiceLevel, 0.0001, 1.15),
      sustainUntil,
    );

    for (const [id, layer] of Object.entries(this.layers) as Array<
      [EchoLayerId, LayerNodes]
    >) {
      layer.oscillator.frequency.setValueAtTime(
        id === "low" ? 84 : id === "mid" ? 240 : 620,
        startTime,
      );
      layer.toneFilter.frequency.setValueAtTime(
        id === "low" ? 140 : id === "mid" ? 420 : 900,
        startTime,
      );
      layer.noiseFilter.frequency.setValueAtTime(
        id === "low" ? 180 : id === "mid" ? 680 : 1300,
        startTime,
      );
      layer.toneGain.gain.setValueAtTime(0.0001, startTime);
      layer.noiseGain.gain.setValueAtTime(0.0001, startTime);
      layer.panner.pan.setValueAtTime(0, startTime);
      layer.oscillator.start(startTime);
    }

    this.noiseSource.start(startTime);
    this.scheduleHitTransients(options, startTime);

    if (slices.length === 0) {
      const silentStop =
        sustainUntil + clampAudio(options.settings.decay * 0.35, 0.18, 1.4);
      this.mixGain.gain.linearRampToValueAtTime(0.0001, silentStop);
      this.stopNodes(silentStop);
      return silentStop;
    }

    const materialInfluence = clampAudio(
      options.settings.materialInfluence,
      0,
      1.5,
    );
    let finalTime = startTime;

    for (const slice of slices) {
      const at = startTime + slice.time;
      const basePitch = mapDistanceToPitch(
        slice.distance,
        options.range,
        options.settings.pitchCurve,
      );
      const densityBoost =
        0.46 +
        clampAudio(
          slice.density * options.settings.densityComplexity +
            options.profile.density,
          0,
          1.4,
        ) *
          0.54;
      const roughnessBoost = 1 + slice.ruggedness * 0.38;
      const pan = clampAudio(
        slice.pan * options.settings.stereoWidth,
        -0.8,
        0.8,
      );
      const lowGain = enabledLayers.has("low")
        ? clampAudio(
            slice.lowEnergy *
              densityBoost *
              (0.18 +
                options.settings.droneIntensity * 0.18 +
                slice.terrain * 0.06 +
                slice.rock * 0.04),
            0.0001,
            0.52,
          )
        : 0.0001;
      const midGain = enabledLayers.has("mid")
        ? clampAudio(
            slice.midEnergy *
              densityBoost *
              (0.11 +
                options.settings.droneIntensity * 0.08 +
                slice.tree * 0.03 +
                slice.terrain * 0.02 +
                slice.moth * 0.08),
            0.0001,
            0.46,
          )
        : 0.0001;
      const highGain = enabledLayers.has("high")
        ? clampAudio(
            slice.highEnergy *
              densityBoost *
              (0.08 +
                options.settings.droneIntensity * 0.05 +
                slice.rock * 0.05 +
                slice.grass * 0.03 +
                slice.moth * 0.22),
            0.0001,
            0.42,
          )
        : 0.0001;

      this.layers.low.oscillator.frequency.linearRampToValueAtTime(
        clampAudio(basePitch * 0.33, 52, 210),
        at,
      );
      this.layers.mid.oscillator.frequency.linearRampToValueAtTime(
        clampAudio(
          basePitch * (0.72 + slice.tree * 0.06 + slice.moth * 0.08),
          110,
          1040,
        ),
        at,
      );
      this.layers.high.oscillator.frequency.linearRampToValueAtTime(
        clampAudio(
          basePitch * (1.32 + slice.rock * 0.12 + slice.moth * 0.2),
          190,
          2600,
        ),
        at,
      );

      this.layers.low.toneFilter.frequency.linearRampToValueAtTime(
        clampAudio(140 + basePitch * 0.38 + slice.terrain * 120, 90, 620),
        at,
      );
      this.layers.mid.toneFilter.frequency.linearRampToValueAtTime(
        clampAudio(
          basePitch * (0.98 + slice.grass * 0.08 + slice.moth * 0.12),
          180,
          1500,
        ),
        at,
      );
      this.layers.high.toneFilter.frequency.linearRampToValueAtTime(
        clampAudio(
          basePitch * (1.64 + slice.rock * 0.22 + slice.moth * 0.48),
          520,
          4400,
        ),
        at,
      );

      this.layers.low.toneFilter.Q.linearRampToValueAtTime(
        0.8 + slice.terrain * 2.4 + options.settings.droneIntensity * 1.8,
        at,
      );
      this.layers.mid.toneFilter.Q.linearRampToValueAtTime(
        1.1 +
          slice.tree * 2.1 +
          slice.ruggedness * 2.4 * materialInfluence +
          slice.moth * 1.4,
        at,
      );
      this.layers.high.toneFilter.Q.linearRampToValueAtTime(
        1.4 +
          slice.rock * 5.6 * materialInfluence +
          slice.grass * 1.2 +
          slice.moth * 6.2,
        at,
      );

      this.layers.low.noiseFilter.frequency.linearRampToValueAtTime(
        clampAudio(220 + slice.tree * 180 + slice.terrain * 60, 120, 860),
        at,
      );
      this.layers.mid.noiseFilter.frequency.linearRampToValueAtTime(
        clampAudio(600 + basePitch * 0.28 + slice.tree * 240, 260, 1900),
        at,
      );
      this.layers.high.noiseFilter.frequency.linearRampToValueAtTime(
        clampAudio(
          1200 + basePitch * 0.52 + slice.grass * 520 + slice.moth * 940,
          900,
          6200,
        ),
        at,
      );

      this.layers.low.noiseGain.gain.linearRampToValueAtTime(
        clampAudio(lowGain * (0.22 + slice.tree * 0.2), 0.0001, 0.13),
        at,
      );
      this.layers.mid.noiseGain.gain.linearRampToValueAtTime(
        clampAudio(
          midGain *
            (0.12 +
              slice.tree * 0.28 * materialInfluence +
              slice.grass * 0.18 +
              slice.rock * 0.08 +
              slice.moth * 0.2),
          0.0001,
          0.22,
        ),
        at,
      );
      this.layers.high.noiseGain.gain.linearRampToValueAtTime(
        clampAudio(
          highGain *
            (0.08 +
              slice.rock * 0.26 * materialInfluence +
              slice.grass * 0.34 +
              slice.moth * 0.42),
          0.0001,
          0.26,
        ),
        at,
      );

      this.layers.low.toneGain.gain.linearRampToValueAtTime(
        lowGain * roughnessBoost,
        at,
      );
      this.layers.mid.toneGain.gain.linearRampToValueAtTime(
        midGain * roughnessBoost,
        at,
      );
      this.layers.high.toneGain.gain.linearRampToValueAtTime(
        highGain * roughnessBoost,
        at,
      );

      this.layers.low.panner.pan.linearRampToValueAtTime(pan * 0.35, at);
      this.layers.mid.panner.pan.linearRampToValueAtTime(pan * 0.7, at);
      this.layers.high.panner.pan.linearRampToValueAtTime(pan, at);

      finalTime = at;
    }

    finalTime = Math.max(finalTime, sustainUntil);
    const stopTime = finalTime + clampAudio(options.settings.decay, 0.4, 6);
    this.layers.low.toneGain.gain.linearRampToValueAtTime(0.0001, stopTime);
    this.layers.mid.toneGain.gain.linearRampToValueAtTime(0.0001, stopTime);
    this.layers.high.toneGain.gain.linearRampToValueAtTime(0.0001, stopTime);
    this.layers.low.noiseGain.gain.linearRampToValueAtTime(0.0001, stopTime);
    this.layers.mid.noiseGain.gain.linearRampToValueAtTime(0.0001, stopTime);
    this.layers.high.noiseGain.gain.linearRampToValueAtTime(0.0001, stopTime);
    this.mixGain.gain.linearRampToValueAtTime(0.0001, stopTime + 0.18);
    this.stopNodes(stopTime + 0.2);
    return stopTime + 0.2;
  }

  private stopNodes(stopTime: number): void {
    for (const layer of Object.values(this.layers)) {
      layer.oscillator.stop(stopTime);
    }
    this.noiseSource.stop(stopTime);
  }
}

export class EchoAudioManager {
  private readonly context: AudioContext | null;
  private readonly master: GainNode | null;
  private readonly compressor: DynamicsCompressorNode | null;
  private readonly outputGain: GainNode | null;
  private readonly noiseBuffer: AudioBuffer | null;
  private readonly voices = new Set<EchoPulseVoice>();
  private disposed = false;
  private readonly handleUnlock = (): void => {
    void this.resume();
  };

  constructor(private settings: BatAudioSettings) {
    const ContextCtor = getAudioContextCtor();
    if (!ContextCtor) {
      this.context = null;
      this.master = null;
      this.compressor = null;
      this.outputGain = null;
      this.noiseBuffer = null;
      return;
    }

    this.context = new ContextCtor();
    this.master = this.context.createGain();
    this.master.gain.value = this.settings.masterVolume;
    this.compressor = this.context.createDynamicsCompressor();
    this.compressor.threshold.value = -26;
    this.compressor.knee.value = 18;
    this.compressor.ratio.value = 3.2;
    this.compressor.attack.value = 0.01;
    this.compressor.release.value = 0.22;
    this.outputGain = this.context.createGain();
    this.outputGain.gain.value = 1.35;
    this.noiseBuffer = createNoiseBuffer(this.context);
    this.master.connect(this.compressor);
    this.compressor.connect(this.outputGain);
    this.outputGain.connect(this.context.destination);
    this.installUnlockHandlers();
  }

  update(): void {
    if (!this.context) return;

    for (const voice of this.voices) {
      if (this.context.currentTime < voice.stopTime) continue;
      voice.dispose();
      this.voices.delete(voice);
    }
  }

  emitPulse(
    profile: EchoProbeProfile,
    range: number,
    scanDuration: number,
    intensity: number,
  ): void {
    if (
      this.disposed ||
      !this.context ||
      !this.master ||
      !this.noiseBuffer ||
      profile.hits.length === 0
    ) {
      return;
    }

    if (this.context.state !== "running") {
      void this.resume().then(() => {
        if (this.context?.state !== "running") return;
        this.scheduleVoice(profile, range, scanDuration, intensity);
      });
      return;
    }

    this.scheduleVoice(profile, range, scanDuration, intensity);
  }

  setSettings(nextSettings: Partial<BatAudioSettings>): void {
    this.settings = { ...this.settings, ...nextSettings };
    if (!this.context || !this.master) return;
    this.master.gain.linearRampToValueAtTime(
      this.settings.masterVolume,
      this.context.currentTime + 0.12,
    );
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.removeUnlockHandlers();

    for (const voice of this.voices) {
      voice.dispose();
    }
    this.voices.clear();

    this.master?.disconnect();
    this.compressor?.disconnect();
    this.outputGain?.disconnect();
    void this.context?.close();
  }

  private scheduleVoice(
    profile: EchoProbeProfile,
    range: number,
    scanDuration: number,
    intensity: number,
  ): void {
    if (!this.context || !this.master || !this.noiseBuffer) return;
    const voice = new EchoPulseVoice(this.context, this.master, {
      settings: this.settings,
      profile,
      range,
      scanDuration,
      intensity,
      noiseBuffer: this.noiseBuffer,
    });
    this.voices.add(voice);
  }

  private async resume(): Promise<void> {
    if (!this.context || this.context.state === "running") return;

    try {
      await this.context.resume();
    } catch {
      return;
    }
  }

  private installUnlockHandlers(): void {
    if (typeof window === "undefined") return;
    window.addEventListener("pointerdown", this.handleUnlock, {
      passive: true,
    });
    window.addEventListener("keydown", this.handleUnlock);
    window.addEventListener("touchend", this.handleUnlock, { passive: true });
  }

  private removeUnlockHandlers(): void {
    if (typeof window === "undefined") return;
    window.removeEventListener("pointerdown", this.handleUnlock);
    window.removeEventListener("keydown", this.handleUnlock);
    window.removeEventListener("touchend", this.handleUnlock);
  }
}
