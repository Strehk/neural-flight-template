import type { VisionModeId } from "./vision-modes";

const MODE_AUDIO: Partial<Record<VisionModeId, string>> = {
  luft: "/sinneswandler_test1/intro/Nichts.mp3",
  echoLocation: "/sinneswandler_test1/intro/A_Bat_echo.mp3",
  infrarot: "/sinneswandler_test1/intro/fire_beetle_red.mp3",
  duft: "/sinneswandler_test1/intro/bee_chemical.mp3",
  netzwerk: "/sinneswandler_test1/intro/swarm.mp3",
};

const INTRO_VOLUME = 0.95;

export class IntroSequence {
  private audio: HTMLAudioElement | null = null;
  private currentUrl: string | null = null;

  playForMode(mode: VisionModeId): void {
    const url = MODE_AUDIO[mode];
    if (!url) return;
    this.playUrl(url);
  }

  dispose(): void {
    this.detachAudio();
  }

  private playUrl(url: string): void {
    if (
      this.audio &&
      this.currentUrl === url &&
      !this.audio.ended &&
      !this.audio.paused
    ) {
      return;
    }

    this.detachAudio();
    const audio = new Audio(url);
    audio.volume = INTRO_VOLUME;
    audio.preload = "auto";
    this.audio = audio;
    this.currentUrl = url;

    void audio.play().catch(() => {});
  }

  private detachAudio(): void {
    if (!this.audio) return;
    this.audio.pause();
    this.audio.src = "";
    this.audio = null;
    this.currentUrl = null;
  }
}
