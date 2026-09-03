import { describe, it, expect } from "vitest";
import {
  balanceEquationError,
  runningBalanceIssues,
  type BalanceRow,
} from "../lib/bank-statement-validation";

describe("balanceEquationError", () => {
  it("returns undefined when opening/closing balances are absent", () => {
    expect(
      balanceEquationError({
        totalCredits: 100,
        totalDebits: 50,
      }),
    ).toBeUndefined();
    expect(
      balanceEquationError({
        openingBalance: 1000,
        totalCredits: 100,
        totalDebits: 50,
      }),
    ).toBeUndefined();
  });

  it("returns undefined when the equation reconciles", () => {
    expect(
      balanceEquationError({
        openingBalance: 10000,
        closingBalance: 11350,
        totalCredits: 2000,
        totalDebits: 650,
      }),
    ).toBeUndefined();
  });

  it("returns an error naming the mismatch when it does not reconcile", () => {
    const err = balanceEquationError({
      openingBalance: 10000,
      closingBalance: 11200,
      totalCredits: 2000,
      totalDebits: 650,
    });
    expect(err).toBeDefined();
    expect(err).toContain("Balance equation mismatch");
    expect(err).toContain("11350.00"); // expected closing (10000 + 2000 - 650)
    expect(err).toContain("11200"); // actual closing
  });

  it("allows sub-cent drift within tolerance", () => {
    expect(
      balanceEquationError({
        openingBalance: 10000,
        closingBalance: 11349.99,
        totalCredits: 2000,
        totalDebits: 650.01,
      }),
    ).toBeUndefined();
  });
});

describe("runningBalanceIssues", () => {
  const consistent: BalanceRow[] = [
    { amount: 500, type: "debit", balance: 9500 },
    { amount: 2000, type: "credit", balance: 11500 },
    { amount: 150, type: "debit", balance: 11350 },
  ];

  it("reports no issues when every row reconciles", () => {
    const { fatal, warnings } = runningBalanceIssues(consistent);
    expect(fatal).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it("skips rows without balances (nothing to check)", () => {
    const rows: BalanceRow[] = [
      { amount: 500, type: "debit" },
      { amount: 2000, type: "credit" },
    ];
    const { fatal, warnings } = runningBalanceIssues(rows);
    expect(fatal).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it("warns (non-fatal) on a low inconsistency rate", () => {
    // A single bad row corrupts the pair ending at it AND the pair starting
    // at it, so 1 bad row in 21 rows = 2 bad pairs of 20 = 10% → warning.
    const rows: BalanceRow[] = [];
    let balance = 10000;
    for (let i = 0; i < 21; i++) {
      rows.push({ amount: 100, type: "debit", balance });
      balance -= 100;
    }
    // Corrupt exactly one row: make the middle row's balance wrong.
    rows[10] = {
      amount: 100,
      type: "debit",
      balance: rows[10]!.balance! + 500,
    };
    const { fatal, warnings } = runningBalanceIssues(rows);
    expect(fatal).toEqual([]);
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toContain("inconsistent");
  });

  it("flags fatal when the inconsistency rate exceeds 10%", () => {
    // 3 bad rows out of 10 pairs → 30% → fatal
    const rows: BalanceRow[] = [];
    let balance = 10000;
    for (let i = 0; i < 11; i++) {
      rows.push({ amount: 100, type: "debit", balance });
      balance -= 100;
    }
    rows[3] = { amount: 100, type: "debit", balance: rows[3]!.balance! + 500 };
    rows[6] = { amount: 100, type: "debit", balance: rows[6]!.balance! + 500 };
    rows[9] = { amount: 100, type: "debit", balance: rows[9]!.balance! + 500 };
    const { fatal, warnings } = runningBalanceIssues(rows);
    expect(fatal.length).toBe(1);
    expect(fatal[0]).toContain("inconsistent");
    expect(warnings).toEqual([]);
  });

  it("catches wrong direction inference (debit stored as credit)", () => {
    // Row 2's balance implies a debit, but it's typed as a credit → mismatch.
    const rows: BalanceRow[] = [
      { amount: 500, type: "debit", balance: 9500 },
      { amount: 2000, type: "credit", balance: 11500 },
      { amount: 150, type: "credit", balance: 11350 }, // should be debit
    ];
    const { fatal, warnings } = runningBalanceIssues(rows);
    expect(fatal.length + warnings.length).toBeGreaterThan(0);
  });
});
