/**
 * TrustGuard Cross-Validation Tests
 *
 * Tests the deterministic math checks that verify LLM-extracted figures
 * before GL write. Every test uses known inputs and expected outputs.
 */

import { describe, it, expect } from "vitest";
import { runTrustGuard } from "../engine/trust-guard";
import type { IngestionState } from "../core/types";

// ─── Test Helpers ───────────────────────────────────────────────────────────

function makeState(overrides: {
  classification?: {
    category: string;
    confidence?: number;
    reasoning?: string;
    metadata?: Record<string, unknown>;
  };
  extraction?: {
    type?: string;
    confidence?: number;
    fieldConfidence?: Record<string, number>;
    data?: Record<string, unknown>;
  };
}): IngestionState {
  const {
    classification: classOverrides,
    extraction: extrOverrides,
    ...rest
  } = overrides as Record<string, unknown>;
  return {
    documentId: "doc-test-001",
    entityId: "entity-test-001",
    mimeType: "application/pdf",
    ocrText: "test document text",
    ocrConfidence: 0.95,
    classification: {
      category: "invoice",
      confidence: 0.9,
      reasoning: "test",
      ...(classOverrides as Record<string, unknown>),
    },
    extraction: {
      type: "invoice",
      confidence: 0.85,
      fieldConfidence: {},
      data: {},
      ...(extrOverrides as Record<string, unknown>),
    },
    ...rest,
  } as IngestionState;
}

// ─── Invoice Tests ──────────────────────────────────────────────────────────

describe("TrustGuard — Invoice Validation", () => {
  it("passes when line items × qty × unitPrice match amounts, and subtotal + tax = total", () => {
    const state = makeState({
      classification: { category: "invoice" },
      extraction: {
        data: {
          lineItems: [
            {
              description: "Widget A",
              quantity: 10,
              unitPrice: 25.0,
              amount: 250.0,
            },
            {
              description: "Widget B",
              quantity: 5,
              unitPrice: 50.0,
              amount: 250.0,
            },
          ],
          subtotal: 500.0,
          taxAmount: 75.0,
          totalAmount: 575.0,
        },
      },
    });

    const result = runTrustGuard(state);

    expect(result.passed).toBe(true);
    expect(result.checks.length).toBeGreaterThanOrEqual(3);
    expect(result.checks.every((c) => c.passed)).toBe(true);
    expect(result.confidenceImpact).toBe(1.0);
  });

  it("fails when line item math is wrong (qty × unitPrice ≠ amount)", () => {
    const state = makeState({
      classification: { category: "invoice" },
      extraction: {
        data: {
          lineItems: [
            {
              description: "Widget A",
              quantity: 10,
              unitPrice: 25.0,
              amount: 200.0,
            }, // Should be 250
          ],
          subtotal: 200.0,
          totalAmount: 200.0,
        },
      },
    });

    const result = runTrustGuard(state);

    expect(result.passed).toBe(false);
    const failedChecks = result.checks.filter((c) => !c.passed);
    expect(failedChecks.some((c) => c.name === "invoice_line_1_math")).toBe(
      true,
    );
  });

  it("fails when subtotal + tax ≠ totalAmount", () => {
    const state = makeState({
      classification: { category: "invoice" },
      extraction: {
        data: {
          subtotal: 500.0,
          taxAmount: 75.0,
          totalAmount: 600.0, // Should be 575
        },
      },
    });

    const result = runTrustGuard(state);

    expect(result.passed).toBe(false);
    const totalCheck = result.checks.find(
      (c) => c.name === "invoice_total_formula",
    );
    expect(totalCheck).toBeDefined();
    expect(totalCheck!.passed).toBe(false);
    expect(totalCheck!.expected).toBe(575.0);
    expect(totalCheck!.actual).toBe(600.0);
    expect(totalCheck!.difference).toBe(25.0);
  });

  it("warns when tax rate is implausible (>50%)", () => {
    const state = makeState({
      classification: { category: "invoice" },
      extraction: {
        data: {
          subtotal: 100.0,
          taxAmount: 60.0, // 60% tax rate
          totalAmount: 160.0,
        },
      },
    });

    const result = runTrustGuard(state);

    // The total formula passes, but tax rate check warns
    const taxRateCheck = result.checks.find(
      (c) => c.name === "invoice_tax_rate_plausible",
    );
    expect(taxRateCheck).toBeDefined();
    expect(taxRateCheck!.passed).toBe(false);
    expect(taxRateCheck!.severity).toBe("warning");
  });

  it("handles invoice with no tax (subtotal = total)", () => {
    const state = makeState({
      classification: { category: "invoice" },
      extraction: {
        data: {
          subtotal: 500.0,
          totalAmount: 500.0,
          // No taxAmount
        },
      },
    });

    const result = runTrustGuard(state);

    const noTaxCheck = result.checks.find(
      (c) => c.name === "invoice_total_no_tax",
    );
    expect(noTaxCheck).toBeDefined();
    expect(noTaxCheck!.passed).toBe(true);
  });

  it("warns when no-tax invoice has subtotal ≠ total", () => {
    const state = makeState({
      classification: { category: "invoice" },
      extraction: {
        data: {
          subtotal: 500.0,
          totalAmount: 510.0, // 10 off, no tax
        },
      },
    });

    const result = runTrustGuard(state);

    const noTaxCheck = result.checks.find(
      (c) => c.name === "invoice_total_no_tax",
    );
    expect(noTaxCheck).toBeDefined();
    expect(noTaxCheck!.passed).toBe(false);
    expect(noTaxCheck!.severity).toBe("warning");
  });
});

// ─── Receipt Tests ──────────────────────────────────────────────────────────

describe("TrustGuard — Receipt Validation", () => {
  it("passes when item amounts + tax = totalAmount", () => {
    const state = makeState({
      classification: { category: "receipt" },
      extraction: {
        data: {
          items: [
            { description: "Coffee", amount: 5.0 },
            { description: "Sandwich", amount: 12.0 },
          ],
          taxAmount: 1.7,
          totalAmount: 18.7,
        },
      },
    });

    const result = runTrustGuard(state);

    expect(result.passed).toBe(true);
    const itemCheck = result.checks.find(
      (c) => c.name === "receipt_item_total",
    );
    expect(itemCheck).toBeDefined();
    expect(itemCheck!.passed).toBe(true);
  });

  it("fails when item sum + tax ≠ totalAmount", () => {
    const state = makeState({
      classification: { category: "receipt" },
      extraction: {
        data: {
          items: [
            { description: "Coffee", amount: 5.0 },
            { description: "Sandwich", amount: 12.0 },
          ],
          taxAmount: 1.7,
          totalAmount: 20.0, // Should be 18.7
        },
      },
    });

    const result = runTrustGuard(state);

    expect(result.passed).toBe(false);
    const itemCheck = result.checks.find(
      (c) => c.name === "receipt_item_total",
    );
    expect(itemCheck!.passed).toBe(false);
  });

  it("fails when receipt has negative item amounts", () => {
    const state = makeState({
      classification: { category: "receipt" },
      extraction: {
        data: {
          items: [
            { description: "Coffee", amount: 5.0 },
            { description: "Refund", amount: -3.0 },
          ],
          totalAmount: 2.0,
        },
      },
    });

    const result = runTrustGuard(state);

    const negCheck = result.checks.find(
      (c) => c.name === "receipt_no_negatives",
    );
    expect(negCheck).toBeDefined();
    expect(negCheck!.passed).toBe(false);
    expect(negCheck!.severity).toBe("error");
  });
});

// ─── Bank Statement Tests ──────────────────────────────────────────────────

describe("TrustGuard — Bank Statement Validation", () => {
  it("passes when balance equation holds: opening + credits - debits = closing", () => {
    const state = makeState({
      classification: { category: "bank_statement" },
      extraction: {
        data: {
          openingBalance: 1000.0,
          closingBalance: 1500.0,
          totalCredits: 2000.0,
          totalDebits: 1500.0,
        },
      },
    });

    const result = runTrustGuard(state);

    expect(result.passed).toBe(true);
    const balanceCheck = result.checks.find(
      (c) => c.name === "bank_balance_equation",
    );
    expect(balanceCheck).toBeDefined();
    expect(balanceCheck!.passed).toBe(true);
  });

  it("fails when balance equation doesn't hold", () => {
    const state = makeState({
      classification: { category: "bank_statement" },
      extraction: {
        data: {
          openingBalance: 1000.0,
          closingBalance: 1200.0, // Should be 1500
          totalCredits: 2000.0,
          totalDebits: 1500.0,
        },
      },
    });

    const result = runTrustGuard(state);

    expect(result.passed).toBe(false);
    const balanceCheck = result.checks.find(
      (c) => c.name === "bank_balance_equation",
    );
    expect(balanceCheck!.passed).toBe(false);
    expect(balanceCheck!.expected).toBe(1500.0);
    expect(balanceCheck!.actual).toBe(1200.0);
  });

  it("verifies credits/debits sums from individual transactions", () => {
    const state = makeState({
      classification: { category: "bank_statement" },
      extraction: {
        data: {
          openingBalance: 0,
          closingBalance: 500,
          totalCredits: 1000,
          totalDebits: 500,
          transactions: [
            {
              date: "2026-01-01",
              description: "Deposit",
              amount: 1000,
              type: "credit",
            },
            {
              date: "2026-01-02",
              description: "ATM",
              amount: 300,
              type: "debit",
            },
            {
              date: "2026-01-03",
              description: "Wire",
              amount: 200,
              type: "debit",
            },
          ],
        },
      },
    });

    const result = runTrustGuard(state);

    const creditsCheck = result.checks.find(
      (c) => c.name === "bank_credits_sum",
    );
    expect(creditsCheck).toBeDefined();
    expect(creditsCheck!.passed).toBe(true);

    const debitsCheck = result.checks.find((c) => c.name === "bank_debits_sum");
    expect(debitsCheck).toBeDefined();
    expect(debitsCheck!.passed).toBe(true);
  });

  it("warns when transaction sums don't match stated totals", () => {
    const state = makeState({
      classification: { category: "bank_statement" },
      extraction: {
        data: {
          openingBalance: 0,
          closingBalance: 500,
          totalCredits: 1200, // Mismatch: transactions sum to 1000
          totalDebits: 500,
          transactions: [
            {
              date: "2026-01-01",
              description: "Deposit",
              amount: 1000,
              type: "credit",
            },
            {
              date: "2026-01-02",
              description: "ATM",
              amount: 300,
              type: "debit",
            },
            {
              date: "2026-01-03",
              description: "Wire",
              amount: 200,
              type: "debit",
            },
          ],
        },
      },
    });

    const result = runTrustGuard(state);

    const creditsCheck = result.checks.find(
      (c) => c.name === "bank_credits_sum",
    );
    expect(creditsCheck).toBeDefined();
    expect(creditsCheck!.passed).toBe(false);
    expect(creditsCheck!.severity).toBe("warning");
  });
});

// ─── Payroll Tests ──────────────────────────────────────────────────────────

describe("TrustGuard — Payroll Validation", () => {
  it("passes when gross - deductions = net", () => {
    const state = makeState({
      classification: { category: "payroll_report" },
      extraction: {
        data: {
          grossPay: 5000.0,
          netPay: 3800.0,
          taxAmount: 750.0,
          deductions: [
            { name: "Pension", amount: 250.0 },
            { name: "Health Insurance", amount: 200.0 },
          ],
        },
      },
    });

    const result = runTrustGuard(state);

    expect(result.passed).toBe(true);
    const payCheck = result.checks.find(
      (c) => c.name === "payroll_gross_deductions_net",
    );
    expect(payCheck).toBeDefined();
    expect(payCheck!.passed).toBe(true);
  });

  it("fails when gross - deductions ≠ net", () => {
    const state = makeState({
      classification: { category: "payroll_report" },
      extraction: {
        data: {
          grossPay: 5000.0,
          netPay: 4000.0, // Should be 3800
          taxAmount: 750.0,
          deductions: [
            { name: "Pension", amount: 250.0 },
            { name: "Health Insurance", amount: 200.0 },
          ],
        },
      },
    });

    const result = runTrustGuard(state);

    expect(result.passed).toBe(false);
    const payCheck = result.checks.find(
      (c) => c.name === "payroll_gross_deductions_net",
    );
    expect(payCheck!.passed).toBe(false);
    expect(payCheck!.expected).toBe(3800.0);
    expect(payCheck!.actual).toBe(4000.0);
  });

  it("warns when tax rate is implausible", () => {
    const state = makeState({
      classification: { category: "payroll_report" },
      extraction: {
        data: {
          grossPay: 5000.0,
          netPay: 2000.0,
          taxAmount: 3000.0, // 60% tax rate
        },
      },
    });

    const result = runTrustGuard(state);

    const taxCheck = result.checks.find(
      (c) => c.name === "payroll_tax_plausible",
    );
    expect(taxCheck).toBeDefined();
    expect(taxCheck!.passed).toBe(false);
    expect(taxCheck!.severity).toBe("warning");
  });

  it("fails when net pay is negative", () => {
    const state = makeState({
      classification: { category: "payroll_report" },
      extraction: {
        data: {
          grossPay: 5000.0,
          netPay: -200.0,
          taxAmount: 750.0,
          deductions: [{ name: "Overpayment recovery", amount: 4450.0 }],
        },
      },
    });

    const result = runTrustGuard(state);

    const posCheck = result.checks.find(
      (c) => c.name === "payroll_net_positive",
    );
    expect(posCheck).toBeDefined();
    expect(posCheck!.passed).toBe(false);
    expect(posCheck!.severity).toBe("error");
  });
});

// ─── Cross-Field Amount Consistency Tests ───────────────────────────────────

describe("TrustGuard — Amount Consistency", () => {
  it("passes when subtotal + tax = total for any document type", () => {
    const state = makeState({
      classification: { category: "contract" },
      extraction: {
        data: {
          subtotal: 1000.0,
          taxAmount: 150.0,
          totalAmount: 1150.0,
        },
      },
    });

    const result = runTrustGuard(state);

    const formulaCheck = result.checks.find(
      (c) => c.name === "amount_subtotal_tax_total",
    );
    expect(formulaCheck).toBeDefined();
    expect(formulaCheck!.passed).toBe(true);
  });

  it("fails when subtotal + tax ≠ total", () => {
    const state = makeState({
      classification: { category: "contract" },
      extraction: {
        data: {
          subtotal: 1000.0,
          taxAmount: 150.0,
          totalAmount: 1200.0, // Should be 1150
        },
      },
    });

    const result = runTrustGuard(state);

    const formulaCheck = result.checks.find(
      (c) => c.name === "amount_subtotal_tax_total",
    );
    expect(formulaCheck!.passed).toBe(false);
    expect(formulaCheck!.difference).toBe(50.0);
  });

  it("warns when totalAmount is zero or negative", () => {
    const state = makeState({
      classification: { category: "other" },
      extraction: {
        data: {
          totalAmount: 0,
        },
      },
    });

    const result = runTrustGuard(state);

    const posCheck = result.checks.find(
      (c) => c.name === "amount_total_positive",
    );
    expect(posCheck).toBeDefined();
    expect(posCheck!.passed).toBe(false);
    expect(posCheck!.severity).toBe("warning");
  });
});

// ─── Edge Cases & Summary Tests ─────────────────────────────────────────────

describe("TrustGuard — Edge Cases", () => {
  it("returns passed=true with no checks for unknown document types without amounts", () => {
    const state = makeState({
      classification: { category: "other" },
      extraction: {
        data: {},
      },
    });

    const result = runTrustGuard(state);

    // Only the amount_total_positive check applies (warning)
    expect(result.checks.length).toBeGreaterThanOrEqual(0);
    expect(result.passed).toBe(true); // No error-severity checks
  });

  it("produces correct summary for all-passing result", () => {
    const state = makeState({
      classification: { category: "invoice" },
      extraction: {
        data: {
          lineItems: [
            { description: "Item", quantity: 1, unitPrice: 100, amount: 100 },
          ],
          subtotal: 100,
          totalAmount: 100,
        },
      },
    });

    const result = runTrustGuard(state);

    expect(result.summary).toContain("All");
    expect(result.summary).toContain("passed");
  });

  it("produces correct summary for failing result", () => {
    const state = makeState({
      classification: { category: "invoice" },
      extraction: {
        data: {
          subtotal: 100,
          taxAmount: 15,
          totalAmount: 200, // Wrong
        },
      },
    });

    const result = runTrustGuard(state);

    expect(result.summary).toContain("error");
    expect(result.summary).toContain("failed");
  });

  it("confidenceImpact is 1.0 when all checks pass", () => {
    const state = makeState({
      classification: { category: "invoice" },
      extraction: {
        data: {
          subtotal: 100,
          totalAmount: 100,
        },
      },
    });

    const result = runTrustGuard(state);

    expect(result.confidenceImpact).toBe(1.0);
  });

  it("confidenceImpact drops when checks fail", () => {
    const state = makeState({
      classification: { category: "invoice" },
      extraction: {
        data: {
          subtotal: 100,
          taxAmount: 15,
          totalAmount: 500, // Way off
        },
      },
    });

    const result = runTrustGuard(state);

    expect(result.confidenceImpact).toBeLessThan(1.0);
  });

  it("counting is correct (passedCount / totalCount)", () => {
    const state = makeState({
      classification: { category: "invoice" },
      extraction: {
        data: {
          subtotal: 100,
          totalAmount: 100,
        },
      },
    });

    const result = runTrustGuard(state);

    expect(result.passedCount).toBe(
      result.checks.filter((c) => c.passed).length,
    );
    expect(result.totalCount).toBe(result.checks.length);
    expect(
      result.passedCount + result.checks.filter((c) => !c.passed).length,
    ).toBe(result.totalCount);
  });
});
