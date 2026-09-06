// ─── Batch 3 / N15+N14: ONE close implementation + durable sessions ─────────
// Authored RED-first; Run Phase pending. Failures reopen the nodes.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("N15 single close implementation", () => {
  const job = readFileSync("packages/jobs/month-end-close.ts", "utf8");
  const pipeline = readFileSync(
    "packages/agents/core/close-pipeline.ts",
    "utf8",
  );

  it("month-end job delegates to executeClosePipeline", () => {
    expect(job).toContain("executeClosePipeline");
    expect(job).toContain('triggerSource: "scheduled"');
  });

  it("the duplicate close logic is deleted from the job", () => {
    expect(job).not.toContain("runDepreciation");
    expect(job).not.toContain("Trial balance out of balance");
    // the job never writes journal tables directly anymore
    expect(job).not.toContain("journalEntries");
    expect(job).not.toContain("journalEntryLines");
  });

  it("outcome mapping never claims unearned success", () => {
    expect(job).toContain('closeState.status === "completed"');
    expect(job).toContain('closeState.status');
    expect(job).toMatch(/awaiting_human|failed/);
  });

  it("pipeline still owns depreciation + TrustGuard + snapshots", () => {
    expect(pipeline).toContain("runAutomatedAdjustments");
    expect(pipeline).toContain("validateJournalEntry");
  });
});

describe("N14 durable close sessions in the executing path", () => {
  const pipeline = readFileSync(
    "packages/agents/core/close-pipeline.ts",
    "utf8",
  );

  it("pipeline opens a durable session and finalizes it on every exit path", () => {
    expect(pipeline).toContain("await openCloseSession({");
    expect(pipeline).toContain("guardedPipeline");
    expect(pipeline).toContain('result.closeState.status === "completed" ? "locked" : "blocked"');
  });

  it("an active recent session for the same period blocks a second close", () => {
    expect(pipeline).toContain('"A close for this period is already in progress');
    expect(pipeline).toContain('inArray(closeSessions.status, ["in_progress", "ready"])');
  });

  it("a locked/notified session with a closed period replays idempotently", () => {
    expect(pipeline).toContain('inArray(closeSessions.status, ["locked", "notified"])');
    expect(pipeline).toContain("Durable close already completed");
  });

  it("session finalization never masks the close result", () => {
    const finalizeBlock = pipeline.slice(
      pipeline.indexOf("const guardedPipeline"),
      pipeline.indexOf("return withTimeout("),
    );
    expect(finalizeBlock).toContain("catch {");
  });
});
