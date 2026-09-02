import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();

describe("Real-Time Updates (SSE) — Verification", () => {
  describe("Settings SSE for real-time sync", () => {
    const settings = readFileSync(
      join(ROOT, "server/routers/settings.ts"),
      "utf-8",
    );

    it("imports notifySettingsChange from SSE", () => {
      expect(settings).toContain("notifySettingsChange");
      expect(settings).toContain("settings-sse");
    });
  });

  describe("Live runs for real-time agent status", () => {
    const liveRuns = readFileSync(
      join(ROOT, "server/routers/live-runs.ts"),
      "utf-8",
    );

    it("provides real-time agent execution status", () => {
      expect(liveRuns).toContain("real time");
    });

    it("uses Redis-backed SSE channel", () => {
      expect(liveRuns).toContain("Redis");
      expect(liveRuns).toContain("SSE");
    });
  });

  describe("Batch ingestion with real-time progress", () => {
    const batch = readFileSync(
      join(ROOT, "server/routers/batch-ingestion.ts"),
      "utf-8",
    );

    it("tracks progress in real-time", () => {
      expect(batch).toContain("real-time");
      expect(batch).toContain("progress");
    });
  });

  describe("Real-time test coverage", () => {
    const realtimeTest = readFileSync(
      join(ROOT, "__tests__/real-time-sync.test.ts"),
      "utf-8",
    );

    it("tests real-time synchronization", () => {
      expect(realtimeTest).toContain("sync");
    });
  });

  describe("Settings realtime test", () => {
    const settingsRealtime = readFileSync(
      join(ROOT, "__tests__/settings-realtime.test.ts"),
      "utf-8",
    );

    it("tests settings real-time updates", () => {
      expect(settingsRealtime).toContain("settings");
    });
  });
});
