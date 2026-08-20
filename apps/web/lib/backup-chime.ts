/**
 * Backup completion chime — subtle two-note ascending tone.
 * Generated via Web Audio API (no external audio files).
 * Respects user sound preferences from localStorage.
 */

const STORAGE_KEY = "xenboox_sound_enabled";

/** Whether sound effects are enabled (default: true) */
export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored !== "false"; // default true
}

/** Toggle sound effects on/off */
export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, String(enabled));
}

/**
 * Play a subtle two-note ascending chime.
 * First note: C5 (523 Hz), Second note: E5 (659 Hz).
 * Gentle attack, quick decay — feels like a "ding" not a "BEEP".
 *
 * Safe to call in any environment — silently no-ops on server.
 */
export function playBackupChime(): void {
  if (typeof window === "undefined") return;
  if (!isSoundEnabled()) return;

  try {
    const ctx = new AudioContext();

    // First note — C5
    playNote(ctx, 523, 0, 0.08, 0.12);

    // Second note — E5 (higher, 0.1s after first)
    playNote(ctx, 659, 0.1, 0.06, 0.1);

    // Close context after notes finish
    ctx.close().catch(() => {});
  } catch {
    // Web Audio not available — silently ignore
  }
}

function playNote(
  ctx: AudioContext,
  frequency: number,
  startOffset: number,
  volume: number,
  duration: number,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);

  // Gentle envelope: quick attack, exponential decay
  gain.gain.setValueAtTime(0, ctx.currentTime + startOffset);
  gain.gain.linearRampToValueAtTime(
    volume,
    ctx.currentTime + startOffset + 0.01,
  );
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    ctx.currentTime + startOffset + duration,
  );

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime + startOffset);
  osc.stop(ctx.currentTime + startOffset + duration + 0.01);
}
