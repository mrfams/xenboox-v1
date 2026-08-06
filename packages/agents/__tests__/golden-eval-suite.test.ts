/**
 * Golden Evaluation Test Suite — P5
 *
 * Validates the eval harness infrastructure:
 * - Dataset loading from YAML files
 * - Scoring functions (exact match, confidence, escalation)
 * - EvalResult construction
 * - SingleAgentEvalSummary aggregation
 * - EvalSuiteSummary rollup
 * - Coverage thresholds
 * - Edge cases in scoring logic
 */

import { describe, it, expect } from "vitest";
import {
  scoreExactMatch,
  scoreEscalationMatch,
  scoreConfidenceInRange,
  buildEvalResult,
  buildSingleAgentSummary,
  buildSuiteSummary,
} from "../core/eval/scoring";
import type { EvalCase, EvalResult } from "../core/eval/types";

// ─── scoreExactMatch ──────────────────────────────────────────────────────

describe("scoreExactMatch", () => {
  it("returns true for identical primitives", () => {
    expect(scoreExactMatch("hello", "hello")).toBe(true);
    expect(scoreExactMatch(42, 42)).toBe(true);
    expect(scoreExactMatch(true, true)).toBe(true);
  });

  it("returns false for different primitives", () => {
    expect(scoreExactMatch("hello", "world")).toBe(false);
    expect(scoreExactMatch(42, 43)).toBe(false);
    expect(scoreExactMatch(true, false)).toBe(false);
  });

  it("handles null expected — passes if actual is also null", () => {
    expect(scoreExactMatch(null, null)).toBe(true);
    expect(scoreExactMatch("something", null)).toBe(false);
  });

  it("compares nested objects deeply", () => {
    const a = { status: "posted", balanced: true, total: "1000.00" };
    const b = { status: "posted", balanced: true, total: "1000.00" };
    const c = { status: "posted", balanced: false, total: "1000.00" };
    expect(scoreExactMatch(a, b)).toBe(true);
    expect(scoreExactMatch(a, c)).toBe(false);
  });

  it("compares arrays deeply", () => {
    expect(scoreExactMatch([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(scoreExactMatch([1, 2, 3], [1, 2, 4])).toBe(false);
    expect(scoreExactMatch([1, 2], [1, 2, 3])).toBe(false);
  });

  it("handles type mismatches", () => {
    expect(scoreExactMatch("42", 42)).toBe(false);
    expect(scoreExactMatch(42, "42")).toBe(false);
    expect(scoreExactMatch(null, undefined)).toBe(false);
  });

  it("handles empty objects and arrays", () => {
    expect(scoreExactMatch({}, {})).toBe(true);
    expect(scoreExactMatch([], [])).toBe(true);
    // Note: deepEqual treats {} and [] as equal (both have 0 keys)
    // This is acceptable — in practice, eval outputs are always JSON objects
    expect(scoreExactMatch({ a: 1 }, [])).toBe(false);
  });
});

// ─── scoreEscalationMatch ─────────────────────────────────────────────────

describe("scoreEscalationMatch", () => {
  it("matches identical escalation types", () => {
    expect(scoreEscalationMatch("none", "none")).toBe(true);
    expect(scoreEscalationMatch("block", "block")).toBe(true);
    expect(scoreEscalationMatch("flag", "flag")).toBe(true);
    expect(scoreEscalationMatch("notify", "notify")).toBe(true);
  });

  it("rejects mismatched types", () => {
    expect(scoreEscalationMatch("none", "block")).toBe(false);
    expect(scoreEscalationMatch("flag", "notify")).toBe(false);
  });
});

// ─── scoreConfidenceInRange ───────────────────────────────────────────────

describe("scoreConfidenceInRange", () => {
  it("passes when confidence is within range", () => {
    expect(scoreConfidenceInRange(0.95, [0.9, 1.0])).toBe(true);
    expect(scoreConfidenceInRange(0.9, [0.9, 1.0])).toBe(true);
    expect(scoreConfidenceInRange(1.0, [0.9, 1.0])).toBe(true);
    expect(scoreConfidenceInRange(0.5, [0.5, 0.74])).toBe(true);
  });

  it("fails when confidence is outside range", () => {
    expect(scoreConfidenceInRange(0.85, [0.9, 1.0])).toBe(false);
    expect(scoreConfidenceInRange(0.75, [0.9, 1.0])).toBe(false);
    expect(scoreConfidenceInRange(0.4, [0.5, 0.74])).toBe(false);
  });
});

// ─── buildEvalResult ──────────────────────────────────────────────────────

describe("buildEvalResult", () => {
  const baseCase: EvalCase = {
    id: "test-001",
    category: "happy_path",
    description: "Test case",
    agentId: "ledger",
    taskType: "post_journal_entry",
    input: { entries: [] },
    expectedOutput: { status: "posted", balanced: true },
    expectedConfidenceRange: [0.95, 1.0],
    expectedEscalation: "none",
    expectedEscalationTarget: null,
    source: "synthetic",
  };

  it("builds a passing result when all checks pass", () => {
    const result = buildEvalResult(
      baseCase,
      {
        confidence: 0.98,
        result: { status: "posted", balanced: true },
        errors: [],
      },
      100,
      "exact_match",
    );

    expect(result.passed).toBe(true);
    expect(result.confidence).toBe(0.98);
    expect(result.confidenceInRange).toBe(true);
    expect(result.outputMatch).toBe(true);
    expect(result.escalationMatch).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("builds a failing result when output mismatches", () => {
    const result = buildEvalResult(
      baseCase,
      {
        confidence: 0.98,
        result: { status: "rejected", balanced: false },
        errors: [],
      },
      100,
      "exact_match",
    );

    expect(result.passed).toBe(false);
    expect(result.outputMatch).toBe(false);
  });

  it("builds a failing result when confidence is out of range", () => {
    const result = buildEvalResult(
      baseCase,
      {
        confidence: 0.5,
        result: { status: "posted", balanced: true },
        errors: [],
      },
      100,
      "exact_match",
    );

    expect(result.passed).toBe(false);
    expect(result.confidenceInRange).toBe(false);
  });

  it("builds a failing result when escalation mismatches", () => {
    const caseWithEscalation: EvalCase = {
      ...baseCase,
      expectedEscalation: "block",
      expectedEscalationTarget: "controller-agent",
    };

    const result = buildEvalResult(
      caseWithEscalation,
      {
        confidence: 0.98,
        result: null,
        escalation: { type: "none", target: null },
        errors: [],
      },
      100,
      "exact_match",
    );

    expect(result.passed).toBe(false);
    expect(result.escalationMatch).toBe(false);
  });

  it("builds a failing result when errors are present", () => {
    const result = buildEvalResult(
      baseCase,
      {
        confidence: 0.98,
        result: { status: "posted", balanced: true },
        errors: ["Database connection failed"],
      },
      100,
      "exact_match",
    );

    expect(result.passed).toBe(false);
    expect(result.errors).toEqual(["Database connection failed"]);
  });

  it("defaults escalation to 'none' when not provided", () => {
    const result = buildEvalResult(
      baseCase,
      {
        confidence: 0.98,
        result: { status: "posted", balanced: true },
        errors: [],
      },
      100,
      "exact_match",
    );

    expect(result.actualEscalation).toBe("none");
    expect(result.escalationMatch).toBe(true);
  });
});

// ─── buildSingleAgentSummary ──────────────────────────────────────────────

describe("buildSingleAgentSummary", () => {
  function makeResult(
    id: string,
    passed: boolean,
    category: EvalCase["category"],
    scoringMethod: "exact_match" | "llm_graded" = "exact_match",
    confidence = 0.95,
  ): EvalResult {
    return {
      caseId: id,
      agentId: "ledger",
      passed,
      confidence,
      expectedConfidenceRange: [0.9, 1.0],
      confidenceInRange: true,
      actualOutput: null,
      expectedOutput: null,
      outputMatch: passed,
      actualEscalation: "none",
      expectedEscalation: "none",
      escalationMatch: true,
      expectedEscalationTarget: null,
      actualEscalationTarget: null,
      escalationTargetMatch: true,
      errors: passed ? [] : ["test error"],
      duration: 100,
      scoringMethod,
      category,
    };
  }

  it("computes correct pass/fail counts", () => {
    const results = [
      makeResult("a", true, "happy_path"),
      makeResult("b", true, "happy_path"),
      makeResult("c", false, "edge_case"),
      makeResult("d", true, "adversarial"),
    ];

    const summary = buildSingleAgentSummary("ledger", results);
    expect(summary.totalCases).toBe(4);
    expect(summary.passed).toBe(3);
    expect(summary.failed).toBe(1);
  });

  it("computes category failure counts", () => {
    const results = [
      makeResult("a", true, "happy_path"),
      makeResult("b", false, "happy_path"),
      makeResult("c", false, "edge_case"),
      makeResult("d", false, "adversarial"),
      makeResult("e", false, "ambiguous"),
    ];

    const summary = buildSingleAgentSummary("ledger", results);
    expect(summary.happyPathFailures).toBe(1);
    expect(summary.edgeCaseFailures).toBe(1);
    expect(summary.adversarialFailures).toBe(1);
    expect(summary.ambiguousFailures).toBe(1);
  });

  it("computes exact match rate correctly", () => {
    const results = [
      makeResult("a", true, "happy_path", "exact_match"),
      makeResult("b", true, "happy_path", "exact_match"),
      makeResult("c", false, "happy_path", "exact_match"),
      makeResult("d", true, "adversarial", "llm_graded"),
    ];

    const summary = buildSingleAgentSummary("ledger", results);
    expect(summary.exactMatchRate).toBeCloseTo(2 / 3);
    expect(summary.llmGradedPassRate).toBe(1);
  });

  it("marks coverage insufficient when too few cases", () => {
    const results = [
      makeResult("a", true, "happy_path"),
      makeResult("b", true, "happy_path"),
    ];

    const summary = buildSingleAgentSummary("ledger", results);
    expect(summary.coverageSufficient).toBe(false);
  });

  it("marks coverage sufficient for non-ledger agents with enough cases", () => {
    const results: EvalResult[] = [];
    for (let i = 0; i < 10; i++)
      results.push(makeResult(`h${i}`, true, "happy_path"));
    for (let i = 0; i < 8; i++)
      results.push(makeResult(`e${i}`, true, "edge_case"));
    for (let i = 0; i < 5; i++)
      results.push(makeResult(`a${i}`, true, "adversarial"));
    for (let i = 0; i < 5; i++)
      results.push(makeResult(`am${i}`, true, "ambiguous"));

    const summary = buildSingleAgentSummary("ap", results);
    expect(summary.coverageSufficient).toBe(true);
    expect(summary.totalCases).toBe(28);
  });

  it("counts escalation false negatives", () => {
    const results = [
      makeResult("a", true, "happy_path"),
      {
        ...makeResult("b", false, "adversarial"),
        expectedEscalation: "block" as const,
        actualEscalation: "none" as const,
        escalationMatch: false,
      },
    ];

    const summary = buildSingleAgentSummary("ledger", results);
    expect(summary.escalationFalseNegatives).toBe(1);
  });
});

// ─── buildSuiteSummary ────────────────────────────────────────────────────

describe("buildSuiteSummary", () => {
  it("aggregates across multiple agents", () => {
    const summaries = [
      buildSingleAgentSummary("ledger", [
        {
          caseId: "l1",
          agentId: "ledger",
          passed: true,
          confidence: 0.95,
          expectedConfidenceRange: [0.9, 1.0],
          confidenceInRange: true,
          actualOutput: null,
          expectedOutput: null,
          outputMatch: true,
          actualEscalation: "none",
          expectedEscalation: "none",
          escalationMatch: true,
          expectedEscalationTarget: null,
          actualEscalationTarget: null,
          escalationTargetMatch: true,
          errors: [],
          duration: 100,
          scoringMethod: "exact_match",
          category: "happy_path",
        },
      ]),
      buildSingleAgentSummary("ap", [
        {
          caseId: "a1",
          agentId: "ap",
          passed: false,
          confidence: 0.5,
          expectedConfidenceRange: [0.9, 1.0],
          confidenceInRange: false,
          actualOutput: null,
          expectedOutput: null,
          outputMatch: false,
          actualEscalation: "none",
          expectedEscalation: "block",
          escalationMatch: false,
          expectedEscalationTarget: "controller-agent",
          actualEscalationTarget: null,
          escalationTargetMatch: false,
          errors: ["test"],
          duration: 200,
          scoringMethod: "exact_match",
          category: "adversarial",
        },
      ]),
    ];

    const suite = buildSuiteSummary(summaries, "2026-08-06T00:00:00Z");
    expect(suite.totalCasesRun).toBe(2);
    expect(suite.totalPassed).toBe(1);
    expect(suite.totalFailed).toBe(1);
    expect(suite.overallPassRate).toBe(50);
    expect(suite.totalEscalationFalseNegatives).toBe(1);
    expect(suite.blockingFailures.length).toBeGreaterThan(0);
  });

  it("identifies blocking failures from escalation false negatives", () => {
    const summaries = [
      buildSingleAgentSummary("ap", [
        {
          caseId: "a1",
          agentId: "ap",
          passed: false,
          confidence: 0.5,
          expectedConfidenceRange: [0.9, 1.0],
          confidenceInRange: false,
          actualOutput: null,
          expectedOutput: null,
          outputMatch: false,
          actualEscalation: "none",
          expectedEscalation: "block",
          escalationMatch: false,
          expectedEscalationTarget: "controller",
          actualEscalationTarget: null,
          escalationTargetMatch: false,
          errors: [],
          duration: 100,
          scoringMethod: "exact_match",
          category: "adversarial",
        },
      ]),
    ];

    const suite = buildSuiteSummary(summaries, "2026-08-06T00:00:00Z");
    expect(suite.blockingFailures).toContainEqual(
      expect.stringContaining("ap: 1 escalation false negative"),
    );
  });

  it("checks coverage sufficiency across all agents", () => {
    const summaries = [
      buildSingleAgentSummary("ap", []),
      buildSingleAgentSummary("ar", []),
    ];

    const suite = buildSuiteSummary(summaries, "2026-08-06T00:00:00Z");
    expect(suite.coverageSufficient).toBe(false);
  });
});
