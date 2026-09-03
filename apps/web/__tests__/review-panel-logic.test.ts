import { describe, it, expect } from "vitest";

// Pure logic extracted from the review panel: totals + balance checks that
// gate the Approve button. Keeping them here (vs inline in the component)
// makes the production-critical gating testable.
import {
  computeLineTotals,
  isBalanced,
} from "@/components/ingestion/review-panel-logic";

type TestLine = { debit: number; credit: number };

describe("computeLineTotals", () => {
  it("sums debits and credits across lines", () => {
    const lines: TestLine[] = [
      { debit: 100, credit: 0 },
      { debit: 50.25, credit: 0 },
      { debit: 0, credit: 150.25 },
    ];
    expect(computeLineTotals(lines)).toEqual({
      totalDebit: 150.25,
      totalCredit: 150.25,
    });
  });

  it("handles empty lines", () => {
    expect(computeLineTotals([])).toEqual({ totalDebit: 0, totalCredit: 0 });
  });
});

describe("isBalanced", () => {
  it("accepts balanced entries", () => {
    expect(isBalanced(150.25, 150.25)).toBe(true);
    expect(isBalanced(0, 0)).toBe(true);
  });

  it("rejects unbalanced entries", () => {
    expect(isBalanced(100, 99.99)).toBe(false);
    expect(isBalanced(0, 5)).toBe(false);
  });

  it("allows rounding tolerance of one cent", () => {
    // 0.1 + 0.2 = 0.30000000000000004 style drift
    expect(isBalanced(0.3, 0.1 + 0.2)).toBe(true);
    // 10.02 - 10.0 = 0.02 — beyond one cent, rejected
    expect(isBalanced(10.0, 10.02)).toBe(false);
  });
});
