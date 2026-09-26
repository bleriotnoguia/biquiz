import { Haptics, NotificationType } from "@capacitor/haptics";
import { useSettingsStore } from "../stores/useSettingsStore";

let audioContext: AudioContext | null = null;

const playTones = (tones: { frequency: number; start: number; duration: number }[]) => {
  try {
    audioContext ??= new AudioContext();
    const ctx = audioContext;
    if (ctx.state === "suspended") void ctx.resume();
    for (const { frequency, start, duration } of tones) {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const t0 = ctx.currentTime + start;
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(t0);
      oscillator.stop(t0 + duration);
    }
  } catch {
    // Web Audio unavailable.
  }
};

export const answerFeedback = (success: boolean) => {
  const { sounds, haptics } = useSettingsStore.getState();
  if (sounds) {
    playTones(
      success
        ? [
            { frequency: 660, start: 0, duration: 0.12 },
            { frequency: 880, start: 0.1, duration: 0.2 },
          ]
        : [
            { frequency: 300, start: 0, duration: 0.15 },
            { frequency: 220, start: 0.13, duration: 0.25 },
          ],
    );
  }
  if (haptics) {
    Haptics.notification({ type: success ? NotificationType.Success : NotificationType.Error }).catch(() => {});
  }
};
