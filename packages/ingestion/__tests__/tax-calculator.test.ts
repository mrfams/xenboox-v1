/**
 * Tax Calculator Tests
 *
 * Covers: output VAT honoring zero-rated/exempt categories, deterministic
 * validation of LLM-extracted tax amounts (never trust blindly), jurisdiction
 * handling, and negative-subtotal clamping.
 */

import { describe, it, expect } from "vitest";
import { calculateTax } from "../engine/tax-calculator";
import type { AccountingTreatment, IngestionState } from "../core/types";

function makeState(data: Record<string, unknown>): IngestionState {
  return {
    documentId: "doc-test-001",
    entityId: "entity-test-001",
    mimeType: "application/pdf",
    ocrText: "",
    ocrConfidence: 0.9,
    classification: { category: "invoice", confidence: 0.9, reasoning: "t" },
    extraction: {
      type: "invoice",
      confidence: 0.85,
      fieldConfidence: {},
      data,
    },
  } as IngestionState;
}

function makeTreatment(
  taxTreatment: AccountingTreatment["taxTreatment"],
): AccountingTreatment {
  return {
    workflow: "ap_invoice",
    description: "test",
    debitAccounts: [],
    creditAccounts: [],
    taxTreatment,
    reasoning: "test",
  };
}

describe("Tax Calculator — Input VAT", () => {
  it("computes standard VAT when no tax amount is extracted", () => {
    const state = makeState({ subtotal: 100, totalAmount: 100 });
    const result = calculateTax(state, makeTreatment("input_vat"), "GM");

    expect(result.taxAmount).toBe(15);
    expect(result.taxRate).toBe(0.15);
  });

  it("trusts an extracted tax amount whose rate matches the jurisdiction", () => {
    const state = makeState({ subtotal: 100, taxAmount: 15, totalAmount: 115 });
    const result = calculateTax(state, makeTreatment("input_vat"), "GM");

    expect(result.taxAmount).toBe(15);
    expect(result.confidence).toBe(0.95);
  });

  it("recomputes a hallucinated tax amount instead of trusting it", () => {
    // 45% implied rate — not a legitimate Gambian rate (15% standard, 10% reduced)
    const state = makeState({ subtotal: 100, taxAmount: 45, totalAmount: 145 });
    const result = calculateTax(state, makeTreatment("input_vat"), "GM");

    expect(result.taxAmount).toBe(15); // recomputed deterministically
    expect(result.confidence).toBe(0.45); // flagged, not trusted
  });

  it("zeros tax on exempt categories even when a tax amount was extracted", () => {
    const state = makeState({
      description: "School tuition fees",
      subtotal: 100,
      taxAmount: 15,
      totalAmount: 115,
    });
    const result = calculateTax(state, makeTreatment("input_vat"), "GM");

    expect(result.taxAmount).toBe(0);
    expect(result.confidence).toBe(0.4);
  });
});

describe("Tax Calculator — Output VAT", () => {
  it("charges standard output VAT on standard-rated sales", () => {
    const state = makeState({ subtotal: 100, totalAmount: 100 });
    const result = calculateTax(state, makeTreatment("output_vat"), "GM");

    expect(result.taxAmount).toBe(15);
  });

  it("charges zero VAT on exports (zero-rated)", () => {
    const state = makeState({
      description: "Export to overseas customer",
      subtotal: 100,
      totalAmount: 100,
    });
    const result = calculateTax(state, makeTreatment("output_vat"), "GM");

    expect(result.taxAmount).toBe(0);
    expect(result.taxRate).toBe(0);
  });

  it("charges zero VAT on exempt services", () => {
    const state = makeState({
      description: "Medical consultation",
      subtotal: 100,
      totalAmount: 100,
    });
    const result = calculateTax(state, makeTreatment("output_vat"), "GM");

    expect(result.taxAmount).toBe(0);
  });
});

describe("Tax Calculator — Jurisdiction", () => {
  it("uses the entity jurisdiction instead of inferring from the document", () => {
    const state = makeState({
      currency: "USD",
      subtotal: 100,
      totalAmount: 100,
    });
    // US config: 0% federal rate — NOT Gambia's 15%
    const result = calculateTax(state, makeTreatment("input_vat"), "US");

    expect(result.taxRate).toBe(0);
    expect(result.taxAmount).toBe(0);
  });

  it("applies reduced rate when the category rule requests it", () => {
    const state = makeState({ subtotal: 100, totalAmount: 100 });
    const result = calculateTax(state, makeTreatment("withholding_tax"), "NG");

    expect(result.taxAmount).toBe(10); // NG withholding 10%
  });
});

describe("Tax Calculator — Edge Cases", () => {
  it("clamps a negative subtotal to zero", () => {
    // taxAmount > totalAmount with no subtotal → subtotal would be -100
    const state = makeState({ totalAmount: 100, taxAmount: 200 });
    const result = calculateTax(state, makeTreatment("input_vat"), "GM");

    expect(result.taxableAmount).toBe(0);
    expect(result.taxAmount).toBe(0);
  });

  it("no_tax yields zero tax at full confidence", () => {
    const state = makeState({ subtotal: 100, totalAmount: 100 });
    const result = calculateTax(state, makeTreatment("no_tax"), "GM");

    expect(result.taxAmount).toBe(0);
    expect(result.confidence).toBe(1.0);
  });
});
