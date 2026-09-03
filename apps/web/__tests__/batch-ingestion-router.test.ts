import { describe, it, expect, vi, beforeEach } from "vitest";

// Test the pure helpers of the batch ingestion module without the tRPC
// context. These are the production-critical behaviors that were faked
// before the rewrite: status mapping and stage labels.
import {
  mapDocStatus,
  stageLabel,
} from "@/server/routers/batch-ingestion-helpers";

describe("batch ingestion helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("mapDocStatus", () => {
    it("maps terminal document statuses to batch statuses", () => {
      expect(mapDocStatus("done")).toBe("completed");
      expect(mapDocStatus("persisted")).toBe("completed");
      expect(mapDocStatus("failed")).toBe("failed");
      expect(mapDocStatus("archived")).toBe("cancelled");
    });

    it("maps queue/processing statuses", () => {
      expect(mapDocStatus("detected")).toBe("pending");
      expect(mapDocStatus("processing")).toBe("processing");
      expect(mapDocStatus("posting")).toBe("processing");
      expect(mapDocStatus("agent_processing")).toBe("processing");
    });

    it("never fabricates a completion", () => {
      // The old code marked everything "done" after a fake delay. The real
      // mapper only reports completed for actual terminal statuses.
      for (const s of [
        "detected",
        "processing",
        "extracted",
        "synced",
        "validated",
        "resolving",
        "classifying_workflow",
        "mapping_accounts",
        "calculating_tax",
        "generating_journal",
        "validating_entry",
        "deciding_post",
        "posting",
        "propagating",
        "agent_processing",
      ]) {
        expect(mapDocStatus(s)).not.toBe("completed");
      }
    });
  });

  describe("stageLabel", () => {
    it("labels every pipeline stage", () => {
      expect(stageLabel("detected")).toBe("Queued");
      expect(stageLabel("posting")).toBe("Posting");
      expect(stageLabel("done")).toBe("Complete");
      expect(stageLabel("failed")).toBe("Failed");
      expect(stageLabel("archived")).toBe("Cancelled");
    });

    it("falls back to the raw status for unknowns", () => {
      expect(stageLabel("bogus")).toBe("bogus");
    });
  });
});
