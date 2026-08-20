/**
 * Tests for BackupProgressIndicator component
 * Validates progress bar rendering, animation states, and accessibility.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const src = readFileSync(
  resolve(__dirname, "../components/settings/backup-progress-indicator.tsx"),
  "utf-8",
);

const settingsPage = readFileSync(
  resolve(__dirname, "../app/dashboard/settings/page.tsx"),
  "utf-8",
);

const exportImport = readFileSync(
  resolve(__dirname, "../components/settings/export-import-settings.tsx"),
  "utf-8",
);

const versionHistory = readFileSync(
  resolve(__dirname, "../components/settings/settings-version-history.tsx"),
  "utf-8",
);

describe("BackupProgressIndicator", () => {
  it("exports BackupProgressIndicator component", () => {
    expect(src).toContain("export function BackupProgressIndicator");
  });

  it("accepts isPending and justCompleted props", () => {
    expect(src).toContain("isPending: boolean");
    expect(src).toContain("justCompleted: boolean");
  });

  it("accepts tooltip prop as ReactNode", () => {
    expect(src).toContain("tooltip?: React.ReactNode");
  });

  it("has custom text props", () => {
    expect(src).toContain("idleText?: string");
    expect(src).toContain("pendingText?: string");
    expect(src).toContain("completedText?: string");
  });

  // ─── Progress bar ────────────────────────────────────────────────────────

  it("shows progress bar when isPending", () => {
    expect(src).toContain("showProgress = isPending || justCompleted");
    expect(src).toContain(
      "h-1 w-full overflow-hidden rounded-full bg-emerald-200",
    );
  });

  it("shows percentage text", () => {
    expect(src).toContain("tabular-nums");
    expect(src).toContain("{progress}%");
  });

  it("progress bar transitions from 0% to 100%", () => {
    expect(src).toContain("width: `${progress}%`");
    expect(src).toContain("transition-all duration-300 ease-out");
  });

  it("progress bar completes to 100% on justCompleted", () => {
    expect(src).toContain("setProgress(100)");
  });

  it("progress bar uses ease-out cubic curve", () => {
    expect(src).toContain("Math.pow(1 - t, 3)");
  });

  it("progress bar maxes at 85% during pending", () => {
    expect(src).toContain("eased * 85");
  });

  it("hides progress bar when idle", () => {
    // showProgress is false when !isPending && !justCompleted
    expect(src).toContain("{showProgress && (");
  });

  // ─── Animation states ────────────────────────────────────────────────────

  it("shows spinner when pending", () => {
    expect(src).toContain("Loader2");
    expect(src).toContain("animate-spin");
  });

  it("shows checkmark when completed", () => {
    expect(src).toContain("CheckCircle2");
    expect(src).toContain("animate-[scaleIn_0.3s_ease-out]");
  });

  it("shows shield when idle", () => {
    expect(src).toContain("ShieldCheck");
  });

  it("applies pulse animation when pending", () => {
    expect(src).toContain('isPending && "animate-pulse"');
  });

  it("applies fadeOut animation when completed", () => {
    expect(src).toContain(
      'justCompleted && "animate-[fadeOut_1.5s_ease-in-out]"',
    );
  });

  // ─── Progress reset ──────────────────────────────────────────────────────

  it("resets progress to 0 when not pending and not completed", () => {
    expect(src).toContain("setProgress(0)");
  });

  it("cleans up animation frame on unmount", () => {
    expect(src).toContain("cancelAnimationFrame");
  });

  // ─── Integration: Settings page ──────────────────────────────────────────

  it("Settings page imports the Backup section", () => {
    expect(settingsPage).toContain(
      'import("@/components/settings/backup-section")',
    );
  });

  it("Settings page registers the Backup & Versions tab", () => {
    expect(settingsPage).toContain('id: "backup"');
  });

  it("ExportImportSettings renders the View backup link", () => {
    expect(exportImport).toContain("View backup");
  });

  // ─── Integration: ExportImportSettings ────────────────────────────────────

  it("ExportImportSettings imports BackupProgressIndicator", () => {
    expect(exportImport).toContain(
      'import { BackupProgressIndicator } from "@/components/settings/backup-progress-indicator"',
    );
  });

  it("ExportImportSettings uses BackupProgressIndicator", () => {
    expect(exportImport).toContain("<BackupProgressIndicator");
  });

  // ─── Integration: SettingsVersionHistory ──────────────────────────────────

  it("SettingsVersionHistory imports BackupProgressIndicator", () => {
    expect(versionHistory).toContain(
      'import { BackupProgressIndicator } from "@/components/settings/backup-progress-indicator"',
    );
  });

  it("SettingsVersionHistory uses BackupProgressIndicator", () => {
    expect(versionHistory).toContain("<BackupProgressIndicator");
  });

  // ─── Cleanup: no more ShieldCheck/Loader2/CheckCircle2 in settings ───────

  it("Settings page no longer imports ShieldCheck directly", () => {
    const importLine = settingsPage
      .split("\n")
      .find((l) => l.includes('from "lucide-react"'));
    if (importLine) {
      expect(importLine).not.toContain("ShieldCheck");
      expect(importLine).not.toContain("Loader2");
      expect(importLine).not.toContain("CheckCircle2");
    }
  });

  it("ExportImportSettings no longer imports ShieldCheck/Loader2/CheckCircle2", () => {
    const importSection = exportImport.substring(0, 500);
    expect(importSection).not.toContain("ShieldCheck");
    expect(importSection).not.toContain("Loader2");
    expect(importSection).not.toContain("CheckCircle2");
  });

  it("SettingsVersionHistory no longer imports ShieldCheck/Loader2/CheckCircle2", () => {
    const importSection = versionHistory.substring(0, 500);
    expect(importSection).not.toContain("ShieldCheck");
    expect(importSection).not.toContain("Loader2");
    expect(importSection).not.toContain("CheckCircle2");
  });

  // ─── Cleanup: no more raw backup indicator divs ──────────────────────────

  it("Settings page has no raw backup indicator divs", () => {
    // Old pattern: group relative flex items-center gap-2 rounded-lg border border-emerald-200
    const rawIndicators = settingsPage.match(
      /border-emerald-200 bg-emerald-50/g,
    );
    expect(rawIndicators).toBeNull();
  });

  it("ExportImportSettings has no raw backup indicator divs", () => {
    const rawIndicators = exportImport.match(
      /border-emerald-200 bg-emerald-50/g,
    );
    expect(rawIndicators).toBeNull();
  });

  it("SettingsVersionHistory has no raw backup indicator divs", () => {
    const rawIndicators = versionHistory.match(
      /border-emerald-200 bg-emerald-50/g,
    );
    expect(rawIndicators).toBeNull();
  });
});
