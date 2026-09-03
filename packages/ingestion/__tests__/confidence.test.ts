/**
 * Confidence Scoring Tests
 *
 * Tests the composite confidence scoring engine that determines whether
 * a document should be auto-posted, reviewed, or escalated.
 */

import { describe, it, expect } from "vitest";
import { computeIngestionConfidence, getReviewItems } from "../core/confidence";
import type { IngestionState } from "../core/types";
import type { TrustGuardResult } from "../engine/trust-guard";

// ─── Test Helpers ───────────────────────────────────────────────────────────

function makeState(overrides?: Partial<IngestionState>): IngestionState {
  return {
    documentId: "doc-test-001",
    entityId: "entity-test-001",
    mimeType: "application/pdf",
    ocrText: "test document",
    ocrConfidence: 0.95,
    classification: {
      category: "invoice",
      confidence: 0.9,
      reasoning: "test",
    },
    extraction: {
      type: "invoice",
      confidence: 0.85,
      fieldConfidence: {
        vendorName: 0.95,
        invoiceNumber: 0.9,
        totalAmount: 0.92,
      },
      data: {
        vendorName: "Acme Corp",
        invoiceNumber: "INV-001",
        totalAmount: 1000,
        subtotal: 1000,
      },
    },
    ...overrides,
  } as IngestionState;
}

function makeTrustGuardResult(
  overrides?: Partial<TrustGuardResult>,
): TrustGuardResult {
  return {
    passed: true,
    checks: [
      {
        name: "test_check",
        description: "test",
        passed: true,
        expected: 100,
        actual: 100,
        difference: 0,
        severity: "error",
        message: "passed",
      },
    ],
    passedCount: 1,
    totalCount: 1,
    confidenceImpact: 1.0,
    summary: "All checks passed",
    ...overrides,
  };
}

// ─── Composite Score Tests ──────────────────────────────────────────────────

describe("computeIngestionConfidence", () => {
  it("returns high confidence for a well-extracted document", () => {
    const state = makeState({
      trustGuard: makeTrustGuardResult(),
      resolvedEntities: {
        vendor: { id: "v1", name: "Acme Corp", confidence: 0.95 },
      },
      coaMapping: {
        debitLines: [
          {
            accountId: "a1",
            accountCode: "5000",
            accountName: "Expense",
            amount: 1000,
            description: "test",
            confidence: 0.9,
          },
        ],
        creditLines: [
          {
            accountId: "a2",
            accountCode: "2000",
            accountName: "AP",
            amount: 1000,
            description: "test",
            confidence: 0.9,
          },
        ],
        lineConfidence: {},
        unmapped: [],
      },
      validation: {
        doubleEntryValid: true,
        accountsExist: true,
        periodOpen: true,
        noDuplicates: true,
        amountsValid: true,
        taxValid: true,
        errors: [],
        warnings: [],
      },
      proposedJournal: {
        description: "test",
        date: "2026-09-01",
        reference: "JE-001",
        lines: [
          {
            accountId: "a1",
            accountCode: "5000",
            accountName: "Expense",
            debit: 1000,
            credit: 0,
            description: "test",
            lineConfidence: 0.9,
          },
          {
            accountId: "a2",
            accountCode: "2000",
            accountName: "AP",
            debit: 0,
            credit: 1000,
            description: "test",
            lineConfidence: 0.9,
          },
        ],
        totalDebit: 1000,
        totalCredit: 1000,
        balanced: true,
        source: "document_upload",
        reasoning: "test",
      },
    });

    const result = computeIngestionConfidence(state);

    expect(result.overall).toBeGreaterThanOrEqual(0.8);
    expect(result.autoPostReady).toBe(true);
    expect(result.signals.length).toBe(10);
    expect(result.dominantSignal).toBeDefined();
  });

  it("returns low confidence when TrustGuard fails", () => {
    const state = makeState({
      trustGuard: makeTrustGuardResult({
        passed: false,
        checks: [
          {
            name: "check1",
            description: "test",
            passed: false,
            expected: 100,
            actual: 200,
            difference: 100,
            severity: "error",
            message: "failed",
          },
          {
            name: "check2",
            description: "test",
            passed: false,
            expected: 100,
            actual: 150,
            difference: 50,
            severity: "error",
            message: "failed",
          },
        ],
        passedCount: 0,
        totalCount: 2,
        confidenceImpact: 0.0,
        summary: "2 errors",
      }),
    });

    const result = computeIngestionConfidence(state);

    expect(result.overall).toBeLessThan(0.8);
    expect(result.autoPostReady).toBe(false);
  });

  it("returns 0.3 when TrustGuard hasn't run", () => {
    const state = makeState();
    delete state.trustGuard;

    const result = computeIngestionConfidence(state);

    const tgSignal = result.signals.find((s) => s.name === "trust_guard");
    expect(tgSignal).toBeDefined();
    expect(tgSignal!.value).toBe(0.3);
  });
});

// ─── Duplicate Signal Tests ─────────────────────────────────────────────────

describe("Duplicate Signal", () => {
  it("returns 1.0 when no duplicates", () => {
    const state = makeState();
    const result = computeIngestionConfidence(state, 0);
    const signal = result.signals.find((s) => s.name === "duplicate_check");
    expect(signal!.value).toBe(1.0);
  });

  it("scales inversely with count", () => {
    const state = makeState();
    const r1 = computeIngestionConfidence(state, 1);
    const r5 = computeIngestionConfidence(state, 5);
    const r10 = computeIngestionConfidence(state, 10);

    const s1 = r1.signals.find((s) => s.name === "duplicate_check")!;
    const s5 = r5.signals.find((s) => s.name === "duplicate_check")!;
    const s10 = r10.signals.find((s) => s.name === "duplicate_check")!;

    expect(s1.value).toBeGreaterThan(s5.value);
    expect(s5.value).toBeGreaterThan(s10.value);
    expect(s10.value).toBeGreaterThanOrEqual(0.1); // floor
  });
});

// ─── Custom Weights Tests ───────────────────────────────────────────────────

describe("Custom Weights", () => {
  it("does not mutate DEFAULT_WEIGHTS", () => {
    const state = makeState();
    const original = computeIngestionConfidence(state);

    // Call with custom weights
    computeIngestionConfidence(state, 0, { trust_guard: 0.5 });

    // Call again without custom weights — should use defaults
    const after = computeIngestionConfidence(state);

    const tgOriginal = original.signals.find((s) => s.name === "trust_guard")!;
    const tgAfter = after.signals.find((s) => s.name === "trust_guard")!;

    expect(tgOriginal.weight).toBe(tgAfter.weight);
  });

  it("applies custom weights when provided", () => {
    const state = makeState();
    const result = computeIngestionConfidence(state, 0, {
      trust_guard: 0.5,
      ocr_quality: 0.1,
    });

    const tgSignal = result.signals.find((s) => s.name === "trust_guard");
    const ocrSignal = result.signals.find((s) => s.name === "ocr_quality");

    expect(tgSignal!.weight).toBe(0.5);
    expect(ocrSignal!.weight).toBe(0.1);
  });
});

// ─── Credit Note Tests ─────────────────────────────────────────────────────

describe("Credit Notes (negative amounts)", () => {
  it("handles negative totalAmount in amount consistency", () => {
    const state = makeState({
      extraction: {
        type: "invoice",
        confidence: 0.85,
        fieldConfidence: {},
        data: { totalAmount: -500 },
      },
      proposedJournal: {
        description: "credit note",
        date: "2026-09-01",
        reference: "CN-001",
        lines: [
          {
            accountId: "a1",
            accountCode: "2000",
            accountName: "AP",
            debit: 0,
            credit: 500,
            description: "test",
            lineConfidence: 0.9,
          },
          {
            accountId: "a2",
            accountCode: "5000",
            accountName: "Expense",
            debit: 500,
            credit: 0,
            description: "test",
            lineConfidence: 0.9,
          },
        ],
        totalDebit: 500,
        totalCredit: 500,
        balanced: true,
        source: "document_upload",
        reasoning: "test",
      },
    });

    const result = computeIngestionConfidence(state);
    const amountSignal = result.signals.find(
      (s) => s.name === "amount_consistency",
    );

    // Should not fail due to negative amount
    expect(amountSignal!.value).toBeGreaterThanOrEqual(0.5);
  });
});

// ─── Review Items Tests ─────────────────────────────────────────────────────

describe("getReviewItems", () => {
  it("returns low-confidence fields", () => {
    const state = makeState({
      extraction: {
        type: "invoice",
        confidence: 0.85,
        fieldConfidence: {
          vendorName: 0.95,
          totalAmount: 0.5, // low
          invoiceDate: 0.4, // low
        },
        data: {
          vendorName: "Acme Corp",
          totalAmount: 1000,
          invoiceDate: "2026-09-01",
        },
      },
    });

    const items = getReviewItems(state);

    expect(items.length).toBeGreaterThanOrEqual(2);
    expect(items.some((i) => i.field === "totalAmount")).toBe(true);
    expect(items.some((i) => i.field === "invoiceDate")).toBe(true);
    expect(items.some((i) => i.field === "vendorName")).toBe(false); // high confidence
  });

  it("returns unmatched entities", () => {
    const state = makeState({
      resolvedEntities: {
        unmatched: [
          { type: "vendor", name: "Unknown Corp" },
          { type: "customer", name: "New Client" },
        ],
      },
    });

    const items = getReviewItems(state);

    expect(items.some((i) => i.field === "unmatched_vendor")).toBe(true);
    expect(items.some((i) => i.field === "unmatched_customer")).toBe(true);
  });

  it("returns low-confidence COA mappings", () => {
    const state = makeState({
      coaMapping: {
        debitLines: [
          {
            accountId: "a1",
            accountCode: "5000",
            accountName: "Expense",
            amount: 1000,
            description: "test",
            confidence: 0.4,
          },
        ],
        creditLines: [
          {
            accountId: "a2",
            accountCode: "2000",
            accountName: "AP",
            amount: 1000,
            description: "test",
            confidence: 0.9,
          },
        ],
        lineConfidence: {},
        unmapped: [],
      },
    });

    const items = getReviewItems(state);

    expect(items.some((i) => i.field === "coa_5000")).toBe(true);
    expect(items.some((i) => i.field === "coa_2000")).toBe(false); // high confidence
  });
});
