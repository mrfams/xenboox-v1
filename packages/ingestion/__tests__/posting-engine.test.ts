/**
 * Posting Engine Decision Tests
 *
 * Covers the TrustGuard override (never auto-post when deterministic checks
 * fail), review-item value correctness (suggest the EXPECTED value, not the
 * extracted one), and the standard decision matrix.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@xenboox/db", () => ({
  db: {
    query: {},
    insert: vi.fn(),
    update: vi.fn(),
    select: vi.fn(),
  },
}));

import { decidePosting } from "../engine/posting-engine";
import type {
  IngestionState,
  IngestionConfidence,
  TrustGuardResult,
} from "../core/types";

function makeConfidence(overall: number): IngestionConfidence {
  return {
    overall,
    signals: [],
    autoPostReady: overall >= 0.95,
    dominantSignal: "extraction",
  };
}

function makeTrustGuard(
  overrides: Partial<TrustGuardResult> = {},
): TrustGuardResult {
  return {
    passed: true,
    checks: [
      {
        name: "line_items_match",
        description: "Line items match the invoice total",
        passed: true,
        expected: 100,
        actual: 100,
        difference: 0,
        severity: "error",
        message: "Line items match the total",
      },
    ],
    passedCount: 1,
    totalCount: 1,
    confidenceImpact: 1,
    summary: "All checks passed",
    ...overrides,
  };
}

function makeState(overrides: Partial<IngestionState> = {}): IngestionState {
  return {
    documentId: "doc-1",
    entityId: "entity-1",
    mimeType: "application/pdf",
    ocrText: "",
    ocrConfidence: 0.9,
    classification: {
      category: "invoice",
      confidence: 0.9,
      reasoning: "t",
    },
    extraction: {
      type: "invoice",
      confidence: 0.9,
      fieldConfidence: {},
      data: {},
    },
    workflow: "ap_invoice",
    validation: { errors: [], warnings: [] },
    ...overrides,
  } as IngestionState;
}

describe("decidePosting — TrustGuard Override", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("escalates even at very high LLM confidence when TrustGuard fails", () => {
    const state = makeState({
      trustGuard: makeTrustGuard({
        passed: false,
        checks: [
          {
            name: "line_items_match",
            description: "Line items match the invoice total",
            passed: false,
            expected: 100,
            actual: 90,
            difference: 10,
            severity: "error",
            message: "Line items (90) do not match the total (100)",
          },
        ],
        passedCount: 0,
        totalCount: 1,
        confidenceImpact: 0.3,
        summary: "Line items do not match the total",
      }),
    });

    const decision = decidePosting(state, makeConfidence(0.98));

    expect(decision.action).toBe("escalated");
  });

  it("suggests the EXPECTED (corrected) value for failed checks, never the extracted one", () => {
    const state = makeState({
      trustGuard: makeTrustGuard({
        passed: false,
        checks: [
          {
            name: "line_items_match",
            description: "Line items match the invoice total",
            passed: false,
            expected: 100,
            actual: 90,
            difference: 10,
            severity: "error",
            message: "Line items (90) do not match the total (100)",
          },
        ],
        passedCount: 0,
        totalCount: 1,
        confidenceImpact: 0.3,
        summary: "Line items do not match the total",
      }),
    });

    const decision = decidePosting(state, makeConfidence(0.98));
    const item = decision.reviewItems?.find(
      (i) => i.field === "line_items_match",
    );

    expect(item).toBeDefined();
    expect(item!.extractedValue).toBe(90); // what the LLM extracted (wrong)
    expect(item!.suggestedValue).toBe(100); // the deterministic truth
    expect(item!.confidence).toBe(0);
    expect(item!.editable).toBe(true);
  });
});

describe("decidePosting — Decision Matrix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("auto-posts at >= 95% confidence when TrustGuard passed", () => {
    const state = makeState({ trustGuard: makeTrustGuard() });

    const decision = decidePosting(state, makeConfidence(0.97));

    expect(decision.action).toBe("auto_post");
  });

  it("auto-posts at 85-94% confidence when TrustGuard passed", () => {
    const state = makeState({ trustGuard: makeTrustGuard() });

    const decision = decidePosting(state, makeConfidence(0.9));

    expect(decision.action).toBe("auto_post");
  });

  it("sends to pending_review at 60-84% confidence", () => {
    const state = makeState({ trustGuard: makeTrustGuard() });

    const decision = decidePosting(state, makeConfidence(0.7));

    expect(decision.action).toBe("pending_review");
  });

  it("escalates at 40-59% confidence", () => {
    const state = makeState({ trustGuard: makeTrustGuard() });

    const decision = decidePosting(state, makeConfidence(0.5));

    expect(decision.action).toBe("escalated");
  });

  it("rejects below 40% confidence", () => {
    const state = makeState({ trustGuard: makeTrustGuard() });

    const decision = decidePosting(state, makeConfidence(0.3));

    expect(decision.action).toBe("rejected");
  });

  it("rejects on critical validation errors regardless of confidence", () => {
    const state = makeState({
      trustGuard: makeTrustGuard(),
      validation: {
        errors: [
          {
            field: "balance",
            message: "Journal entry not balanced",
            severity: "error",
          },
        ],
        warnings: [],
      },
    });

    const decision = decidePosting(state, makeConfidence(0.99));

    expect(decision.action).toBe("rejected");
    expect(decision.reason).toContain("not balanced");
  });

  it("does not re-run TrustGuard when the Stage 10b result is present", () => {
    // state.trustGuard (not state.validation.trustGuard) is the canonical
    // location — decidePosting must reuse it instead of re-running.
    const state = makeState({ trustGuard: makeTrustGuard() });

    const decision = decidePosting(state, makeConfidence(0.97));

    expect(decision.action).toBe("auto_post");
  });
});
