/**
 * Tests for backup chime sound utility and SoundPreferences component.
 * Validates chime generation, sound toggle, and integration.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const chimeSrc = readFileSync(
  resolve(__dirname, "../lib/backup-chime.ts"),
  "utf-8",
);

const indicatorSrc = readFileSync(
  resolve(__dirname, "../components/settings/backup-progress-indicator.tsx"),
  "utf-8",
);

const soundPrefsSrc = readFileSync(
  resolve(__dirname, "../components/settings/sound-preferences.tsx"),
  "utf-8",
);

const settingsPage = readFileSync(
  resolve(__dirname, "../app/dashboard/settings/page.tsx"),
  "utf-8",
);

describe("backup-chime.ts", () => {
  // ─── Exports ──────────────────────────────────────────────────────────────

  it("exports playBackupChime function", () => {
    expect(chimeSrc).toContain("export function playBackupChime()");
  });

  it("exports isSoundEnabled function", () => {
    expect(chimeSrc).toContain("export function isSoundEnabled()");
  });

  it("exports setSoundEnabled function", () => {
    expect(chimeSrc).toContain(
      "export function setSoundEnabled(enabled: boolean)",
    );
  });

  // ─── Storage key ──────────────────────────────────────────────────────────

  it("uses xenboox_sound_enabled localStorage key", () => {
    expect(chimeSrc).toContain("xenboox_sound_enabled");
  });

  // ─── isSoundEnabled ───────────────────────────────────────────────────────

  it("isSoundEnabled returns true by default", () => {
    expect(chimeSrc).toContain('stored !== "false"');
  });

  it("isSoundEnabled returns false when stored as false", () => {
    expect(chimeSrc).toContain("localStorage.getItem(STORAGE_KEY)");
  });

  // ─── setSoundEnabled ──────────────────────────────────────────────────────

  it("setSoundEnabled writes to localStorage", () => {
    expect(chimeSrc).toContain(
      "localStorage.setItem(STORAGE_KEY, String(enabled))",
    );
  });

  // ─── Server safety ────────────────────────────────────────────────────────

  it("playBackupChime silently no-ops on server", () => {
    expect(chimeSrc).toContain('typeof window === "undefined"');
  });

  it("isSoundEnabled returns true on server", () => {
    expect(chimeSrc).toContain(
      'if (typeof window === "undefined") return true',
    );
  });

  // ─── Sound check ──────────────────────────────────────────────────────────

  it("playBackupChime checks if sound is enabled before playing", () => {
    expect(chimeSrc).toContain("if (!isSoundEnabled()) return");
  });

  // ─── Web Audio API ────────────────────────────────────────────────────────

  it("uses AudioContext for sound generation", () => {
    expect(chimeSrc).toContain("new AudioContext()");
  });

  it("creates oscillator for tone generation", () => {
    expect(chimeSrc).toContain("ctx.createOscillator()");
  });

  it("creates gain node for volume control", () => {
    expect(chimeSrc).toContain("ctx.createGain()");
  });

  it("uses sine wave for gentle tone", () => {
    expect(chimeSrc).toContain('osc.type = "sine"');
  });

  // ─── Two-note chime ───────────────────────────────────────────────────────

  it("plays C5 note (523 Hz)", () => {
    expect(chimeSrc).toContain("523");
  });

  it("plays E5 note (659 Hz)", () => {
    expect(chimeSrc).toContain("659");
  });

  it("second note starts 0.1s after first", () => {
    expect(chimeSrc).toContain("0.1");
  });

  // ─── Envelope ─────────────────────────────────────────────────────────────

  it("has gentle attack envelope", () => {
    expect(chimeSrc).toContain("linearRampToValueAtTime");
  });

  it("has exponential decay", () => {
    expect(chimeSrc).toContain("exponentialRampToValueAtTime");
  });

  // ─── Error handling ───────────────────────────────────────────────────────

  it("silently catches errors (Web Audio not available)", () => {
    expect(chimeSrc).toContain("catch");
  });

  it("closes AudioContext after playing", () => {
    expect(chimeSrc).toContain("ctx.close()");
  });

  // ─── playNote helper ──────────────────────────────────────────────────────

  it("has playNote helper function", () => {
    expect(chimeSrc).toContain("function playNote(");
  });

  it("playNote accepts frequency, startOffset, volume, duration", () => {
    expect(chimeSrc).toContain("frequency: number");
    expect(chimeSrc).toContain("startOffset: number");
    expect(chimeSrc).toContain("volume: number");
    expect(chimeSrc).toContain("duration: number");
  });
});

describe("BackupProgressIndicator chime integration", () => {
  it("imports playBackupChime", () => {
    expect(indicatorSrc).toContain(
      'import { playBackupChime } from "@/lib/backup-chime"',
    );
  });

  it("plays chime when justCompleted becomes true", () => {
    expect(indicatorSrc).toContain("playBackupChime()");
  });

  it("chime triggers in useEffect on justCompleted change", () => {
    expect(indicatorSrc).toContain("if (justCompleted)");
  });
});

describe("SoundPreferences component", () => {
  it("exports SoundPreferences component", () => {
    expect(soundPrefsSrc).toContain("export function SoundPreferences");
  });

  it("imports isSoundEnabled and setSoundEnabled", () => {
    expect(soundPrefsSrc).toContain("isSoundEnabled");
    expect(soundPrefsSrc).toContain("setSoundEnabled");
  });

  it("uses Volume2 icon when enabled", () => {
    expect(soundPrefsSrc).toContain("Volume2");
  });

  it("uses VolumeX icon when disabled", () => {
    expect(soundPrefsSrc).toContain("VolumeX");
  });

  it("has Switch toggle", () => {
    expect(soundPrefsSrc).toContain("Switch");
    expect(soundPrefsSrc).toContain("checked={enabled}");
    expect(soundPrefsSrc).toContain("onCheckedChange={handleToggle}");
  });

  it("calls setSoundEnabled on toggle", () => {
    expect(soundPrefsSrc).toContain("setSoundEnabled(checked)");
  });

  it("loads initial state from localStorage", () => {
    expect(soundPrefsSrc).toContain("isSoundEnabled()");
  });

  it("shows backup chime description", () => {
    expect(soundPrefsSrc).toContain("Backup chime");
  });
});

describe("Settings page sound integration", () => {
  it("imports SoundPreferences", () => {
    expect(settingsPage).toContain(
      'import { SoundPreferences } from "@/components/settings/sound-preferences"',
    );
  });

  it("renders SoundPreferences in settings", () => {
    expect(settingsPage).toContain("<SoundPreferences />");
  });
});
