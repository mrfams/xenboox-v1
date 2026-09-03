import { describe, it, expect } from "vitest";

/**
 * The ingestion job's error contract (regression tests for H2/H3):
 *  - A pipeline failure must RETHROW so Trigger.dev retries + the DLQ engage
 *    (the old `return { success: false }` made the task look successful and
 *    silently skipped retries for the most important job).
 *  - The failed-document metadata update must MERGE, never replace, so
 *    extraction/classification/trustGuard context survives for review.
 *
 * These invariants are enforced in the task body; here we assert the pure
 * merge behavior that keeps metadata intact.
 */
import { mergeFailureMetadata } from "../lib/ingestion-job-helpers";

describe("mergeFailureMetadata", () => {
  it("merges failure context without dropping existing metadata", () => {
    const existing = {
      source: "upload",
      classification: { category: "invoice", confidence: 0.9 },
      extraction: { type: "invoice", data: { total: 100 } },
      trustGuard: { passed: true },
    };
    const merged = mergeFailureMetadata(
      existing,
      "GL write failed",
      "2026-09-03T00:00:00Z",
      "ingestion",
    );

    expect(merged).toEqual({
      source: "upload",
      classification: { category: "invoice", confidence: 0.9 },
      extraction: { type: "invoice", data: { total: 100 } },
      trustGuard: { passed: true },
      error: "GL write failed",
      failedAt: "2026-09-03T00:00:00Z",
      pipelineStage: "ingestion",
    });
  });

  it("handles empty existing metadata", () => {
    const merged = mergeFailureMetadata(
      {},
      "boom",
      "2026-09-03T00:00:00Z",
      "ingestion",
    );
    expect(merged.error).toBe("boom");
    expect(merged.pipelineStage).toBe("ingestion");
    expect(merged.failedAt).toBe("2026-09-03T00:00:00Z");
  });
});
