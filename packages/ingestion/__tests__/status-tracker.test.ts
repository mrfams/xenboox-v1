import { describe, it, expect } from "vitest";

import {
  isValidTransition,
  getStageNumber,
  isTerminalStage,
  getOrderedStages,
} from "../engine/status-tracker";

describe("isValidTransition", () => {
  it("allows forward transitions through the pipeline", () => {
    expect(isValidTransition("detected", "processing")).toBe(true);
    expect(isValidTransition("extracted", "synced")).toBe(true);
    expect(isValidTransition("synced", "validated")).toBe(true);
    expect(isValidTransition("deciding_post", "posting")).toBe(true);
    expect(isValidTransition("posting", "propagating")).toBe(true);
  });

  it("rejects backward transitions between mid-pipeline stages", () => {
    // Note: transitions INTO the pipeline entry points (detected/resolving)
    // are allowed for retries — see the re-entry test below.
    expect(isValidTransition("posting", "deciding_post")).toBe(false);
    expect(isValidTransition("validated", "synced")).toBe(false);
    expect(isValidTransition("resolving", "synced")).toBe(false);
    expect(isValidTransition("done", "processing")).toBe(false);
  });

  it("allows terminal states to be reached from anywhere", () => {
    expect(isValidTransition("detected", "failed")).toBe(true);
    expect(isValidTransition("posting", "failed")).toBe(true);
    expect(isValidTransition("extracted", "persisted")).toBe(true);
    expect(isValidTransition("resolving", "archived")).toBe(true);
  });

  it("locks persisted/done/archived documents", () => {
    expect(isValidTransition("persisted", "detected")).toBe(false);
    expect(isValidTransition("done", "resolving")).toBe(false);
    expect(isValidTransition("archived", "processing")).toBe(false);
  });

  it("allows failed documents to be retried", () => {
    expect(isValidTransition("failed", "detected")).toBe(true);
    expect(isValidTransition("failed", "resolving")).toBe(true);
  });

  it("treats agent_processing as a handoff, not a hard lock", () => {
    // Handoff state can be reached from the document pipeline…
    expect(isValidTransition("synced", "agent_processing")).toBe(true);
    expect(isValidTransition("validated", "agent_processing")).toBe(true);
    // …and the ingestion engine resumes from it.
    expect(isValidTransition("agent_processing", "resolving")).toBe(true);
    expect(isValidTransition("agent_processing", "posting")).toBe(true);
    // But it cannot jump backwards out of the handoff.
    expect(isValidTransition("agent_processing", "synced")).toBe(false);
    expect(isValidTransition("agent_processing", "detected")).toBe(true); // retry re-entry
  });

  it("allows pipeline entry re-entry for retries and recovery", () => {
    // Task retries re-run stage 1 even if the doc is mid-pipeline.
    expect(isValidTransition("extracted", "detected")).toBe(true);
    // Ingestion recovery restarts at resolving.
    expect(isValidTransition("mapping_accounts", "resolving")).toBe(true);
  });

  it("allows same-stage transitions (idempotent retries)", () => {
    expect(isValidTransition("posting", "posting")).toBe(true);
    expect(isValidTransition("detected", "detected")).toBe(true);
    expect(isValidTransition("failed", "failed")).toBe(true);
  });

  it("treats legacy/unknown source statuses as pipeline entry", () => {
    expect(isValidTransition("uploaded" as never, "processing")).toBe(true);
  });

  it("rejects unknown destinations", () => {
    expect(isValidTransition("detected", "bogus" as never)).toBe(false);
  });
});

describe("getStageNumber", () => {
  it("returns the stage position for known stages", () => {
    expect(getStageNumber("detected")).toBe(1);
    expect(getStageNumber("posting")).toBe(13);
    expect(getStageNumber("failed")).toBe(-1);
    expect(getStageNumber("done")).toBe(101);
  });

  it("returns -2 for unknown statuses", () => {
    expect(getStageNumber("bogus")).toBe(-2);
  });
});

describe("isTerminalStage", () => {
  it("classifies terminal stages", () => {
    expect(isTerminalStage("failed")).toBe(true);
    expect(isTerminalStage("persisted")).toBe(true);
    expect(isTerminalStage("done")).toBe(true);
    expect(isTerminalStage("archived")).toBe(true);
    expect(isTerminalStage("agent_processing")).toBe(true);
  });

  it("classifies pipeline stages as non-terminal", () => {
    expect(isTerminalStage("detected")).toBe(false);
    expect(isTerminalStage("posting")).toBe(false);
    expect(isTerminalStage("resolving")).toBe(false);
  });
});

describe("getOrderedStages", () => {
  it("returns stages in canonical order, excluding terminals", () => {
    const stages = getOrderedStages();
    expect(stages[0].key).toBe("detected");
    expect(stages[1].key).toBe("processing");
    // Numbers must be strictly ascending.
    for (let i = 1; i < stages.length; i++) {
      expect(stages[i].number).toBeGreaterThan(stages[i - 1].number);
    }
    // No terminal states in the ordered list.
    const keys = stages.map((s) => s.key);
    expect(keys).not.toContain("failed");
    expect(keys).not.toContain("done");
    expect(keys).not.toContain("archived");
    expect(keys).not.toContain("agent_processing");
  });
});
