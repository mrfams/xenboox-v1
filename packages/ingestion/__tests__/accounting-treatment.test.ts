/**
 * Accounting Treatment Classification Tests
 *
 * Regression tests for the wildcard field-pattern bug: `ap_payment` and
 * `ar_invoice` previously used always-matching wildcard patterns that matched
 * EVERY document, forcing every receipt to be booked as an AP payment and
 * every invoice as AR/sales. These tests lock in correct money-direction
 * classification.
 */

import { describe, it, expect } from "vitest";
import { determineAccountingTreatment } from "../engine/accounting-treatment";
import type { IngestionState } from "../core/types";

function makeState(overrides: {
  category: string;
  data?: Record<string, unknown>;
}): IngestionState {
  return {
    documentId: "doc-test-001",
    entityId: "entity-test-001",
    mimeType: "application/pdf",
    ocrText: "test document text",
    ocrConfidence: 0.95,
    classification: {
      category: overrides.category,
      confidence: 0.9,
      reasoning: "test",
    },
    extraction: {
      type: overrides.category,
      confidence: 0.85,
      fieldConfidence: {},
      data: overrides.data ?? {},
    },
  } as IngestionState;
}

describe("Accounting Treatment - Invoice Direction", () => {
  it("classifies a supplier invoice as ap_invoice (money owed), not AR/sales", () => {
    const state = makeState({
      category: "invoice",
      data: {
        vendorName: "Acme Supplies Ltd",
        description: "Invoice for office goods",
        totalAmount: 115,
        taxAmount: 15,
        subtotal: 100,
      },
    });

    const treatment = determineAccountingTreatment(state);
    expect(treatment.workflow).toBe("ap_invoice");
    expect(treatment.debitAccounts[0]?.accountType).toBe("expense");
    expect(treatment.creditAccounts[0]?.suggestedCode).toBe("2000"); // AP
  });

  it("classifies a customer invoice as ar_invoice (money owed to us)", () => {
    const state = makeState({
      category: "invoice",
      data: {
        customerName: "Acme Corp",
        description: "Sales invoice for consulting",
        totalAmount: 100,
      },
    });

    const treatment = determineAccountingTreatment(state);
    expect(treatment.workflow).toBe("ar_invoice");
    expect(treatment.debitAccounts[0]?.suggestedCode).toBe("1100"); // AR
    expect(treatment.creditAccounts[0]?.suggestedCode).toBe("4000"); // Revenue
  });
});

describe("Accounting Treatment - Receipt Direction", () => {
  it("classifies a customer receipt as ar_payment (money in), not AP payment", () => {
    const state = makeState({
      category: "receipt",
      data: {
        customerName: "Acme Corp",
        description: "Payment received from customer",
        totalAmount: 100,
      },
    });

    const treatment = determineAccountingTreatment(state);
    expect(treatment.workflow).toBe("ar_payment");
    expect(treatment.debitAccounts[0]?.suggestedCode).toBe("1000"); // Cash
    expect(treatment.creditAccounts[0]?.suggestedCode).toBe("1100"); // AR
  });

  it("classifies a vendor payment as ap_payment (money out)", () => {
    const state = makeState({
      category: "receipt",
      data: {
        vendorName: "Acme Supplies Ltd",
        description: "Payment to vendor by check",
        totalAmount: 50,
      },
    });

    const treatment = determineAccountingTreatment(state);
    expect(treatment.workflow).toBe("ap_payment");
    expect(treatment.debitAccounts[0]?.suggestedCode).toBe("2000"); // AP
    expect(treatment.creditAccounts[0]?.suggestedCode).toBe("1000"); // Cash
  });

  it("classifies a cash purchase as cash_expense, not AP payment", () => {
    const state = makeState({
      category: "receipt",
      data: {
        merchantName: "Corner Shop",
        expenseNature: "cash purchase",
        description: "paid cash for office supplies",
        totalAmount: 20,
      },
    });

    const treatment = determineAccountingTreatment(state);
    expect(treatment.workflow).toBe("cash_expense");
    expect(treatment.debitAccounts[0]?.accountType).toBe("expense");
    expect(treatment.creditAccounts[0]?.suggestedCode).toBe("1010"); // Petty cash
  });

  it("defaults an ambiguous plain receipt to ar_payment (money in)", () => {
    const state = makeState({
      category: "receipt",
      data: { totalAmount: 10 },
    });

    const treatment = determineAccountingTreatment(state);
    expect(treatment.workflow).toBe("ar_payment");
  });
});

describe("Accounting Treatment - Tax Rate Guards", () => {
  it("does not produce Infinity taxRate when totalAmount equals taxAmount", () => {
    const state = makeState({
      category: "invoice",
      data: {
        vendorName: "Acme Supplies Ltd",
        totalAmount: 100,
        taxAmount: 100,
      },
    });

    const treatment = determineAccountingTreatment(state);
    expect(treatment.workflow).toBe("ap_invoice");
    expect(treatment.taxRate).toBeUndefined();
    expect(Number.isFinite(treatment.taxRate ?? 0)).toBe(true);
  });

  it("does not produce Infinity taxRate when subtotal is zero", () => {
    const state = makeState({
      category: "invoice",
      data: {
        customerName: "Acme Corp",
        totalAmount: 100,
        taxAmount: 15,
        subtotal: 0,
      },
    });

    const treatment = determineAccountingTreatment(state);
    expect(treatment.workflow).toBe("ar_invoice");
    expect(Number.isFinite(treatment.taxRate ?? 0)).toBe(true);
  });
});
