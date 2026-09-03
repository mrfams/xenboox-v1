/**
 * Journal Generator Tests
 *
 * Covers the auto-balance rounding path (totals MUST be recomputed), rounding
 * line integrity (real account code/name, never "9999"), unbalanced rejection,
 * and source propagation into the entry.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@xenboox/db", () => ({
  db: {
    query: {
      fiscalPeriods: {
        findFirst: vi.fn().mockResolvedValue({ id: "period-2026-09" }),
      },
    },
    transaction: vi.fn(),
  },
}));

import { generateJournalEntry } from "../engine/journal-generator";
import type { AccountingTreatment, CoaMapping } from "../core/types";

const treatment: AccountingTreatment = {
  workflow: "ap_invoice",
  description: "AP Invoice from Acme Supplies",
  debitAccounts: [],
  creditAccounts: [],
  taxTreatment: "no_tax",
  reasoning: "test",
};

const mapping: CoaMapping = {
  debitLines: [
    {
      accountId: "acc-expense-1",
      accountCode: "7000",
      accountName: "Other Operating Expense",
      amount: 100,
      description: "Expense",
      confidence: 0.95,
    },
  ],
  creditLines: [
    {
      accountId: "acc-ap-1",
      accountCode: "2000",
      accountName: "Accounts Payable",
      amount: 100,
      description: "Accounts Payable",
      confidence: 0.95,
    },
  ],
  lineConfidence: { "7000": 0.95, "2000": 0.95 },
  unmapped: [],
};

describe("Journal Generator — Balanced Entries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("produces a balanced entry with correct totals", async () => {
    const { entry, validation } = await generateJournalEntry(
      "entity-1",
      treatment,
      mapping,
      "document_upload",
      "2026-09-15",
    );

    expect(entry.balanced).toBe(true);
    expect(entry.totalDebit).toBe(100);
    expect(entry.totalCredit).toBe(100);
    expect(entry.lines).toHaveLength(2);
    expect(validation.doubleEntryValid).toBe(true);
    expect(validation.periodOpen).toBe(true);
    expect(entry.periodId).toBe("period-2026-09");
  });

  it("records the provided source on the entry", async () => {
    const { entry } = await generateJournalEntry(
      "entity-1",
      treatment,
      mapping,
      "bank_import",
      "2026-09-15",
    );

    expect(entry.source).toBe("bank_import");
  });
});

describe("Journal Generator — Auto-Balance Rounding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("recomputes totals and balance after adding a rounding line", async () => {
    const offMapping: CoaMapping = {
      ...mapping,
      debitLines: [
        {
          ...mapping.debitLines[0]!,
          amount: 100.03,
        },
      ],
      creditLines: [
        {
          ...mapping.creditLines[0]!,
          amount: 100,
        },
      ],
      lineConfidence: { "7000": 0.95, "2000": 0.95 },
    };

    const { entry, validation } = await generateJournalEntry(
      "entity-1",
      treatment,
      offMapping,
      "document_upload",
      "2026-09-15",
    );

    // Rounding line must make the entry balance
    expect(entry.lines).toHaveLength(3);
    expect(entry.totalDebit).toBeCloseTo(100.03, 2);
    expect(entry.totalCredit).toBeCloseTo(100.03, 2);
    expect(entry.balanced).toBe(true);
    expect(validation.doubleEntryValid).toBe(true);
    expect(validation.errors).toHaveLength(0);

    // The rounding line must carry the REAL account code/name — never "9999"
    const roundingLine = entry.lines.find(
      (l) => l.description === "Rounding adjustment for balanced entry",
    );
    expect(roundingLine).toBeDefined();
    expect(roundingLine!.accountCode).toBe("7000");
    expect(roundingLine!.accountName).toBe("Other Operating Expense");
    expect(roundingLine!.accountId).toBe("acc-expense-1");

    // A warning should explain the adjustment
    expect(validation.warnings.some((w) => w.field === "balance")).toBe(true);
  });

  it("rejects entries unbalanced beyond the rounding threshold", async () => {
    const badMapping: CoaMapping = {
      ...mapping,
      creditLines: [
        {
          ...mapping.creditLines[0]!,
          amount: 80,
        },
      ],
      lineConfidence: { "7000": 0.95, "2000": 0.95 },
    };

    const { entry, validation } = await generateJournalEntry(
      "entity-1",
      treatment,
      badMapping,
      "document_upload",
      "2026-09-15",
    );

    expect(entry.balanced).toBe(false);
    expect(entry.lines).toHaveLength(2); // no rounding line added
    expect(validation.doubleEntryValid).toBe(false);
    expect(validation.errors.some((e) => e.field === "balance")).toBe(true);
  });
});

describe("Journal Generator — Validation Guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("flags negative amounts", async () => {
    const negMapping: CoaMapping = {
      ...mapping,
      creditLines: [
        {
          ...mapping.creditLines[0]!,
          amount: -100,
        },
      ],
      lineConfidence: { "7000": 0.95, "2000": 0.95 },
    };

    const { validation } = await generateJournalEntry(
      "entity-1",
      treatment,
      negMapping,
      "document_upload",
      "2026-09-15",
    );

    expect(validation.amountsValid).toBe(false);
    expect(validation.errors.some((e) => e.field === "amounts")).toBe(true);
  });

  it("requires at least two lines (debit and credit)", async () => {
    const oneLineMapping: CoaMapping = {
      ...mapping,
      creditLines: [],
      lineConfidence: { "7000": 0.95 },
    };

    const { validation } = await generateJournalEntry(
      "entity-1",
      treatment,
      oneLineMapping,
      "document_upload",
      "2026-09-15",
    );

    expect(validation.errors.some((e) => e.field === "lines")).toBe(true);
  });

  it("warns when accounts could not be mapped", async () => {
    const unmappedMapping: CoaMapping = {
      ...mapping,
      unmapped: [
        {
          label: "Mystery Account",
          accountType: "expense",
          amount: 10,
        },
      ],
    };

    const { validation } = await generateJournalEntry(
      "entity-1",
      treatment,
      unmappedMapping,
      "document_upload",
      "2026-09-15",
    );

    expect(validation.warnings.some((w) => w.field === "accounts")).toBe(true);
  });
});
