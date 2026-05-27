import type { SenseSwitchManager } from "./sense-switch";
import type { VisionModeId } from "./vision-modes";

interface IntroStep {
  url: string;
  mode: VisionModeId;
}

const INTRO_STEPS: readonly IntroStep[] = [
  { url: "/sinneswandler_test1/intro/Nichts.mp3", mode: "luft" },
  { url: "/sinneswandler_test1/intro/A_Bat_echo.mp3", mode: "echoLocation" },
  { url: "/sinneswandler_test1/intro/fire_beetle_red.mp3", mode: "infrarot" },
  { url: "/sinneswandler_test1/intro/bee_chemical.mp3", mode: "duft" },
  { url: "/sinneswandler_test1/intro/swarm.mp3", mode: "netzwerk" },
];

const INTRO_VOLUME = 0.95;
const INITIAL_DELAY_MS = 5000;
const INTER_TRACK_DELAY_MS = 5000;

export class IntroSequence {
  private readonly senseSwitch: SenseSwitchManager;
  private audio: HTMLAudioElement | null = null;
  private stepIndex = 0;
  private finished = false;
  private cancelled = false;
  private pendingTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly handleEnded: () => void;
  private readonly handleError: () => void;
  private readonly handleUnlock: () => void;

  constructor(senseSwitch: SenseSwitchManager) {
    this.senseSwitch = senseSwitch;
    this.handleEnded = () => this.scheduleNext(INTER_TRACK_DELAY_MS);
    this.handleError = () => this.scheduleNext(INTER_TRACK_DELAY_MS);
    this.handleUnlock = () => {
      if (this.audio && this.audio.paused) {
        void this.audio.play().catch(() => {
          // Browser still blocks — wait for the next interaction.
        });
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("pointerdown", this.handleUnlock, { passive: true });
      window.addEventListener("keydown", this.handleUnlock);
      window.addEventListener("touchend", this.handleUnlock, { passive: true });
    }
  }

  get isActive(): boolean {
    return !this.finished && !this.cancelled;
  }

  start(): void {
    if (this.finished || this.cancelled || this.audio || this.pendingTimeout) return;
    this.scheduleStep(0, INITIAL_DELAY_MS);
  }

  dispose(): void {
    this.cancelled = true;
    this.finished = true;
    this.clearPendingTimeout();
    this.detachAudio();
    if (typeof window !== "undefined") {
      window.removeEventListener("pointerdown", this.handleUnlock);
      window.removeEventListener("keydown", this.handleUnlock);
      window.removeEventListener("touchend", this.handleUnlock);
    }
  }

  private scheduleStep(index: number, delayMs: number): void {
    this.clearPendingTimeout();
    this.pendingTimeout = setTimeout(() => {
      this.pendingTimeout = null;
      this.playStep(index);
    }, delayMs);
  }

  private scheduleNext(delayMs: number): void {
    if (this.cancelled) return;
    this.scheduleStep(this.stepIndex + 1, delayMs);
  }

  private clearPendingTimeout(): void {
    if (this.pendingTimeout !== null) {
      clearTimeout(this.pendingTimeout);
      this.pendingTimeout = null;
    }
  }

  private playStep(index: number): void {
    if (this.cancelled) return;
    if (index >= INTRO_STEPS.length) {
      this.finish();
      return;
    }

    const step = INTRO_STEPS[index];
    this.stepIndex = index;
    this.senseSwitch.switchTo(step.mode);

    this.detachAudio();
    const audio = new Audio(step.url);
    audio.volume = INTRO_VOLUME;
    audio.preload = "auto";
    audio.addEventListener("ended", this.handleEnded);
    audio.addEventListener("error", this.handleError);
    this.audio = audio;

    void audio.play().catch(() => {
      // Autoplay blocked — handleUnlock retries on first interaction.
    });
  }

  private finish(): void {
    this.detachAudio();
    this.finished = true;
  }

  private detachAudio(): void {
    if (!this.audio) return;
    this.audio.removeEventListener("ended", this.handleEnded);
    this.audio.removeEventListener("error", this.handleError);
    this.audio.pause();
    this.audio.src = "";
    this.audio = null;
  }
}
