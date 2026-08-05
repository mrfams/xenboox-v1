// ─── MVP Agent Integration Tests ─────────────────────────────────────────────
// Tests the 4 core MVP agents' tools directly (not through LangGraph graphs).
// Validates: Ledger (post entry, trial balance), AP (process invoice, aging),
// AR (aging, overdue alerts, payment matching), Reconciliation (match, ingest, report).

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── DB Mock ─────────────────────────────────────────────────────────────────
// Each test file gets a fresh mock. All DB queries are mocked to return controlled data.

const mockDb = {
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([{ id: "mock-id", entryNumber: 1 }]),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  query: {
    chartOfAccounts: {
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    journalEntries: {
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    journalEntryLines: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    fiscalPeriods: {
      findFirst: vi.fn(),
    },
    suppliers: {
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    invoicesAp: {
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    customers: {
      findFirst: vi.fn(),
    },
    salesInvoices: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    paymentsAr: {
      insert: vi.fn().mockReturnThis(),
    },
    bankTransactions: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn(),
    },
    reconciliations: {
      findFirst: vi.fn(),
    },
    reconciliationItems: {
      insert: vi.fn().mockReturnThis(),
    },
  },
};

vi.mock("@xenboox/db", () => ({ db: mockDb }));

// Mock accounting-rules validateDoubleEntry
vi.mock("../core/accounting-rules", () => ({
  validateDoubleEntry: vi.fn().mockReturnValue({
    valid: true,
    balanced: true,
    lineCount: 2,
    errors: [],
  }),
}));

// ─── Test Data Factories ─────────────────────────────────────────────────────

const ENTITY_ID = "550e8400-e29b-41d4-a716-446655440000";
const PERIOD_ID = "550e8400-e29b-41d4-a716-446655440001";
const ACCOUNT_ID_1 = "550e8400-e29b-41d4-a716-446655440010";
const ACCOUNT_ID_2 = "550e8400-e29b-41d4-a716-446655440011";
const SUPPLIER_ID = "550e8400-e29b-41d4-a716-446655440020";
const CUSTOMER_ID = "550e8400-e29b-41d4-a716-446655440030";
const INVOICE_ID = "550e8400-e29b-41d4-a716-446655440040";
const BANK_ACCOUNT_ID = "550e8400-e29b-41d4-a716-446655440050";
const RECONCILIATION_ID = "550e8400-e29b-41d4-a716-446655440060";

function makeJournalEntry(overrides?: Partial<any>) {
  return {
    id: "je-" + crypto.randomUUID().slice(0, 8),
    entityId: ENTITY_ID,
    entryNumber: 1,
    description: "Test entry",
    reference: null,
    date: "2026-06-15",
    periodId: PERIOD_ID,
    status: "posted",
    postedBy: "ledger-agent",
    postedAt: new Date(),
    source: "test",
    confidence: "0.95",
    ...overrides,
  };
}

function makeAccount(overrides?: Partial<any>) {
  return {
    id: ACCOUNT_ID_1,
    entityId: ENTITY_ID,
    code: "1000",
    name: "Cash at Bank",
    type: "asset",
    isActive: true,
    ...overrides,
  };
}

function makePeriod(overrides?: Partial<any>) {
  return {
    id: PERIOD_ID,
    entityId: ENTITY_ID,
    year: 2026,
    month: 6,
    status: "open",
    ...overrides,
  };
}

function makeSupplier(overrides?: Partial<any>) {
  return {
    id: SUPPLIER_ID,
    entityId: ENTITY_ID,
    name: "Test Supplier Ltd",
    isActive: true,
    ...overrides,
  };
}

function makeApInvoice(overrides?: Partial<any>) {
  return {
    id: INVOICE_ID,
    entityId: ENTITY_ID,
    supplierId: SUPPLIER_ID,
    invoiceNumber: "INV-001",
    invoiceDate: "2026-06-01",
    dueDate: "2026-07-01",
    totalAmount: "5000",
    balance: "5000",
    currency: "GMD",
    status: "pending",
    notes: null,
    paidAmount: "0",
    ...overrides,
  };
}

function makeCustomer(overrides?: Partial<any>) {
  return {
    id: CUSTOMER_ID,
    entityId: ENTITY_ID,
    name: "Test Customer Corp",
    ...overrides,
  };
}

function makeSalesInvoice(overrides?: Partial<any>) {
  return {
    id: "si-" + crypto.randomUUID().slice(0, 8),
    entityId: ENTITY_ID,
    customerId: CUSTOMER_ID,
    invoiceNumber: "SINV-001",
    invoiceDate: "2026-05-01",
    dueDate: "2026-06-01",
    totalAmount: "10000",
    balance: "10000",
    paidAmount: "0",
    currency: "GMD",
    status: "pending",
    ...overrides,
  };
}

function makeBankTransaction(overrides?: Partial<any>) {
  return {
    id: "btx-" + crypto.randomUUID().slice(0, 8),
    entityId: ENTITY_ID,
    bankAccountId: BANK_ACCOUNT_ID,
    transactionDate: "2026-06-15",
    type: "deposit",
    amount: "5000",
    description: "Customer payment",
    reference: "REF-001",
    isReconciled: false,
    source: "statement_import",
    ...overrides,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// LEDGER AGENT
// ═════════════════════════════════════════════════════════════════════════════

describe("Ledger Agent — Post Journal Entry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: accounts exist and are active
    mockDb.query.chartOfAccounts.findFirst.mockResolvedValue(makeAccount());
    mockDb.query.fiscalPeriods.findFirst.mockResolvedValue(makePeriod());
    mockDb.query.journalEntries.findFirst.mockResolvedValue(null); // no duplicate
  });

  it("posts a valid double-entry journal entry", async () => {
    const { validateDoubleEntry, postEntry } = await import(
      "../tier3/ledger-agent/tools"
    );

    const entry = {
      id: crypto.randomUUID(),
      sourceAgent: "ap-agent",
      approvedByController: true,
      entries: [
        {
          accountId: ACCOUNT_ID_1,
          accountCode: "1000",
          debit: 5000,
          credit: 0,
        },
        {
          accountId: ACCOUNT_ID_2,
          accountCode: "2100",
          debit: 0,
          credit: 5000,
        },
      ],
      totalDebit: 5000,
      totalCredit: 5000,
      reference: "INV-001",
      description: "Office supplies purchase",
      periodId: PERIOD_ID,
      date: "2026-06-15",
    };

    // Validate
    const validation = await validateDoubleEntry(entry.entries);
    expect(validation.valid).toBe(true);

    // Post
    mockDb.returning.mockResolvedValueOnce([
      makeJournalEntry({ entryNumber: 1 }),
    ]);
    const posted = await postEntry(entry, ENTITY_ID);

    expect(posted).toBeTruthy();
    expect(posted.entryNumber).toBe(1);
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("rejects unbalanced entry (debits ≠ credits)", async () => {
    const { validateDoubleEntry } = await import("../tier3/ledger-agent/tools");

    // Override the mock to return unbalanced
    const accountingRules = await import("../core/accounting-rules");
    (accountingRules.validateDoubleEntry as any).mockReturnValueOnce({
      valid: false,
      balanced: false,
      lineCount: 2,
      errors: ["Entry does not balance. Debits: 5000, Credits: 4000"],
    });

    const entries = [
      { accountId: ACCOUNT_ID_1, accountCode: "1000", debit: 5000, credit: 0 },
      { accountId: ACCOUNT_ID_2, accountCode: "2100", debit: 0, credit: 4000 },
    ];

    const result = await validateDoubleEntry(entries);
    expect(result.valid).toBe(false);
    expect(result.constraint).toBe("double_entry_balance");
  });

  it("rejects entry with negative amounts", async () => {
    const { validateDoubleEntry } = await import("../tier3/ledger-agent/tools");

    const accountingRules = await import("../core/accounting-rules");
    (accountingRules.validateDoubleEntry as any).mockReturnValueOnce({
      valid: false,
      balanced: true,
      lineCount: 2,
      errors: ["negative amounts not allowed"],
    });

    const entries = [
      { accountId: ACCOUNT_ID_1, accountCode: "1000", debit: -500, credit: 0 },
      { accountId: ACCOUNT_ID_2, accountCode: "2100", debit: 0, credit: -500 },
    ];

    const result = await validateDoubleEntry(entries);
    expect(result.valid).toBe(false);
    expect(result.constraint).toBe("no_negative_amounts");
  });

  it("rejects single-line entry", async () => {
    const { validateDoubleEntry } = await import("../tier3/ledger-agent/tools");

    const accountingRules = await import("../core/accounting-rules");
    (accountingRules.validateDoubleEntry as any).mockReturnValueOnce({
      valid: false,
      balanced: true,
      lineCount: 1,
      errors: ["Entry must have at least 2 lines"],
    });

    const entries = [
      { accountId: ACCOUNT_ID_1, accountCode: "1000", debit: 500, credit: 0 },
    ];

    const result = await validateDoubleEntry(entries);
    expect(result.valid).toBe(false);
    expect(result.constraint).toBe("min_lines");
  });

  it("rejects entry with both debit and credit on same line", async () => {
    const { validateDoubleEntry } = await import("../tier3/ledger-agent/tools");

    const accountingRules = await import("../core/accounting-rules");
    (accountingRules.validateDoubleEntry as any).mockReturnValueOnce({
      valid: false,
      balanced: true,
      lineCount: 2,
      errors: ["Line cannot have both debit and credit"],
    });

    const entries = [
      { accountId: ACCOUNT_ID_1, accountCode: "1000", debit: 500, credit: 500 },
      { accountId: ACCOUNT_ID_2, accountCode: "2100", debit: 0, credit: 1000 },
    ];

    const result = await validateDoubleEntry(entries);
    expect(result.valid).toBe(false);
    expect(result.constraint).toBe("no_mixed_lines");
  });

  it("validates accounts exist in chart of accounts", async () => {
    const { validateAccountsExist } = await import(
      "../tier3/ledger-agent/tools"
    );

    // Account not found
    mockDb.query.chartOfAccounts.findFirst.mockResolvedValueOnce(null);

    const entries = [
      {
        accountId: "nonexistent-id",
        accountCode: "9999",
        debit: 500,
        credit: 0,
      },
      { accountId: ACCOUNT_ID_2, accountCode: "2100", debit: 0, credit: 500 },
    ];

    const result = await validateAccountsExist(entries, ENTITY_ID);
    expect(result.valid).toBe(false);
    expect(result.constraint).toBe("account_validity");
  });

  it("validates period is open", async () => {
    const { validatePeriodOpen } = await import("../tier3/ledger-agent/tools");

    // Period is closed
    mockDb.query.fiscalPeriods.findFirst.mockResolvedValueOnce(
      makePeriod({ status: "closed" }),
    );

    const result = await validatePeriodOpen(PERIOD_ID);
    expect(result.valid).toBe(false);
    expect(result.constraint).toBe("period_integrity");
  });

  it("detects duplicate entry by reference", async () => {
    const { validateNoDuplicate } = await import("../tier3/ledger-agent/tools");

    mockDb.query.journalEntries.findFirst.mockResolvedValueOnce(
      makeJournalEntry({ entryNumber: 42 }),
    );

    const result = await validateNoDuplicate("INV-001", ENTITY_ID);
    expect(result.valid).toBe(false);
    expect(result.constraint).toBe("no_duplicate");
    expect(result.error).toContain("INV-001");
    expect(result.error).toContain("JE-42");
  });
});

describe("Ledger Agent — Trial Balance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.query.fiscalPeriods.findFirst.mockResolvedValue(makePeriod());
  });

  it("generates balanced trial balance from posted entries", async () => {
    const { generateTrialBalance } = await import(
      "../tier3/ledger-agent/tools"
    );

    const entries = [
      makeJournalEntry({ id: "je-1", entryNumber: 1 }),
      makeJournalEntry({ id: "je-2", entryNumber: 2 }),
    ];
    mockDb.query.journalEntries.findMany.mockResolvedValueOnce(entries);

    const lines = [
      {
        journalEntryId: "je-1",
        accountId: ACCOUNT_ID_1,
        debit: "5000",
        credit: "0",
      },
      {
        journalEntryId: "je-1",
        accountId: ACCOUNT_ID_2,
        debit: "0",
        credit: "5000",
      },
      {
        journalEntryId: "je-2",
        accountId: ACCOUNT_ID_1,
        debit: "3000",
        credit: "0",
      },
      {
        journalEntryId: "je-2",
        accountId: ACCOUNT_ID_2,
        debit: "0",
        credit: "3000",
      },
    ];
    mockDb.query.journalEntryLines.findMany.mockResolvedValueOnce(lines);

    const accounts = [
      makeAccount({ id: ACCOUNT_ID_1, code: "1000", name: "Cash at Bank" }),
      makeAccount({ id: ACCOUNT_ID_2, code: "2100", name: "Accounts Payable" }),
    ];
    mockDb.query.chartOfAccounts.findMany.mockResolvedValueOnce(accounts);

    const tb = await generateTrialBalance(ENTITY_ID, PERIOD_ID);

    expect(tb.balanced).toBe(true);
    expect(tb.totalDebits).toBe(8000);
    expect(tb.totalCredits).toBe(8000);
    expect(tb.accounts).toHaveLength(2);
    expect(tb.accounts[0].accountCode).toBe("1000");
    expect(tb.accounts[0].debitBalance).toBe(8000);
  });

  it("detects unbalanced trial balance", async () => {
    const { generateTrialBalance } = await import(
      "../tier3/ledger-agent/tools"
    );

    mockDb.query.journalEntries.findMany.mockResolvedValueOnce([
      makeJournalEntry({ id: "je-1" }),
    ]);

    // Unbalanced lines
    mockDb.query.journalEntryLines.findMany.mockResolvedValueOnce([
      {
        journalEntryId: "je-1",
        accountId: ACCOUNT_ID_1,
        debit: "5000",
        credit: "0",
      },
      {
        journalEntryId: "je-1",
        accountId: ACCOUNT_ID_2,
        debit: "0",
        credit: "4000",
      },
    ]);

    mockDb.query.chartOfAccounts.findMany.mockResolvedValueOnce([
      makeAccount({ id: ACCOUNT_ID_1, code: "1000" }),
      makeAccount({ id: ACCOUNT_ID_2, code: "2100" }),
    ]);

    const tb = await generateTrialBalance(ENTITY_ID, PERIOD_ID);

    expect(tb.balanced).toBe(false);
    expect(tb.totalDebits).toBe(5000);
    expect(tb.totalCredits).toBe(4000);
  });

  it("returns empty trial balance when no entries exist", async () => {
    const { generateTrialBalance } = await import(
      "../tier3/ledger-agent/tools"
    );

    mockDb.query.journalEntries.findMany.mockResolvedValueOnce([]);

    const tb = await generateTrialBalance(ENTITY_ID, PERIOD_ID);

    expect(tb.balanced).toBe(true);
    expect(tb.totalDebits).toBe(0);
    expect(tb.totalCredits).toBe(0);
    expect(tb.accounts).toHaveLength(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// AP AGENT
// ═════════════════════════════════════════════════════════════════════════════

describe("AP Agent — Process Invoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.query.suppliers.findFirst.mockResolvedValue(makeSupplier());
    mockDb.query.invoicesAp.findFirst.mockResolvedValue(null); // no duplicate
    mockDb.returning.mockResolvedValueOnce([{ id: "ap-inv-1" }]);
  });

  it("processes a valid supplier invoice", async () => {
    const { processInvoice } = await import("../tier3/ap-agent/tools");

    const result = await processInvoice(ENTITY_ID, {
      supplierId: SUPPLIER_ID,
      invoiceNumber: "INV-001",
      invoiceDate: "2026-06-01",
      dueDate: "2026-07-01",
      totalAmount: 5000,
      currency: "GMD",
    });

    expect(result.success).toBe(true);
    expect(result.invoiceId).toBe("ap-inv-1");
    expect(result.duplicateFound).toBe(false);
    expect(result.errors).toHaveLength(0);
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("rejects invoice with zero amount", async () => {
    const { processInvoice } = await import("../tier3/ap-agent/tools");

    const result = await processInvoice(ENTITY_ID, {
      supplierId: SUPPLIER_ID,
      invoiceNumber: "INV-002",
      invoiceDate: "2026-06-01",
      dueDate: "2026-07-01",
      totalAmount: 0,
      currency: "GMD",
    });

    expect(result.success).toBe(false);
    expect(result.errors).toContain("Invoice amount must be positive, got 0");
  });

  it("rejects duplicate invoice", async () => {
    const { processInvoice } = await import("../tier3/ap-agent/tools");

    mockDb.query.invoicesAp.findFirst.mockResolvedValueOnce(
      makeApInvoice({ id: "existing-inv" }),
    );

    const result = await processInvoice(ENTITY_ID, {
      supplierId: SUPPLIER_ID,
      invoiceNumber: "INV-001",
      invoiceDate: "2026-06-01",
      dueDate: "2026-07-01",
      totalAmount: 5000,
      currency: "GMD",
    });

    expect(result.success).toBe(false);
    expect(result.duplicateFound).toBe(true);
    expect(result.errors[0]).toContain("Duplicate invoice");
  });

  it("rejects invoice with missing invoice number", async () => {
    const { processInvoice } = await import("../tier3/ap-agent/tools");

    const result = await processInvoice(ENTITY_ID, {
      supplierId: SUPPLIER_ID,
      invoiceNumber: "",
      invoiceDate: "2026-06-01",
      dueDate: "2026-07-01",
      totalAmount: 5000,
      currency: "GMD",
    });

    expect(result.success).toBe(false);
    expect(result.errors).toContain("Invoice number is required");
  });

  it("rejects invoice for non-existent supplier", async () => {
    const { processInvoice } = await import("../tier3/ap-agent/tools");

    mockDb.query.suppliers.findFirst.mockResolvedValueOnce(null);

    const result = await processInvoice(ENTITY_ID, {
      supplierId: "nonexistent-supplier",
      invoiceNumber: "INV-003",
      invoiceDate: "2026-06-01",
      dueDate: "2026-07-01",
      totalAmount: 5000,
      currency: "GMD",
    });

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain("not found or inactive");
  });
});

describe("AP Agent — Aging Report", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates aging report with correct buckets", async () => {
    const { generateAgingReport } = await import("../tier3/ap-agent/tools");

    const today = new Date();
    const overdue30 = new Date(today);
    overdue30.setDate(overdue30.getDate() - 15); // 15 days overdue
    const overdue60 = new Date(today);
    overdue60.setDate(overdue60.getDate() - 45); // 45 days overdue
    const future = new Date(today);
    future.setDate(future.getDate() + 10); // not yet due

    mockDb.query.invoicesAp.findMany.mockResolvedValueOnce([
      makeApInvoice({
        id: "inv-1",
        balance: "3000",
        dueDate: future.toISOString().split("T")[0],
      }),
      makeApInvoice({
        id: "inv-2",
        balance: "2000",
        dueDate: overdue30.toISOString().split("T")[0],
      }),
      makeApInvoice({
        id: "inv-3",
        balance: "4000",
        dueDate: overdue60.toISOString().split("T")[0],
      }),
      makeApInvoice({ id: "inv-4", balance: "0", status: "paid" }), // paid, should be excluded
    ]);

    const report = await generateAgingReport(ENTITY_ID);

    expect(report.invoiceCount).toBe(3); // only unpaid
    expect(report.totalOutstanding).toBe(9000);
    expect(report.overdueCount).toBe(2);
    expect(report.buckets.current).toBe(3000); // not yet due
    expect(report.buckets.days30).toBe(2000); // 15 days overdue
    expect(report.buckets.days60).toBe(4000); // 45 days overdue
  });

  it("returns zero when no outstanding invoices", async () => {
    const { generateAgingReport } = await import("../tier3/ap-agent/tools");

    mockDb.query.invoicesAp.findMany.mockResolvedValueOnce([
      makeApInvoice({ status: "paid", balance: "0" }),
    ]);

    const report = await generateAgingReport(ENTITY_ID);

    expect(report.invoiceCount).toBe(0);
    expect(report.totalOutstanding).toBe(0);
    expect(report.overdueCount).toBe(0);
  });
});

describe("AP Agent — Payment Schedule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns invoices due within 30 days sorted by due date", async () => {
    const { getPaymentSchedule } = await import("../tier3/ap-agent/tools");

    const today = new Date();
    const in10Days = new Date(today);
    in10Days.setDate(in10Days.getDate() + 10);
    const in20Days = new Date(today);
    in20Days.setDate(in20Days.getDate() + 20);
    const in45Days = new Date(today);
    in45Days.setDate(in45Days.getDate() + 45); // beyond 30 days

    mockDb.query.invoicesAp.findMany.mockResolvedValueOnce([
      makeApInvoice({
        id: "inv-later",
        dueDate: in20Days.toISOString().split("T")[0],
        balance: "3000",
      }),
      makeApInvoice({
        id: "inv-sooner",
        dueDate: in10Days.toISOString().split("T")[0],
        balance: "2000",
      }),
      makeApInvoice({
        id: "inv-far",
        dueDate: in45Days.toISOString().split("T")[0],
        balance: "5000",
      }),
    ]);

    mockDb.query.suppliers.findFirst.mockResolvedValue(makeSupplier());

    const schedule = await getPaymentSchedule(ENTITY_ID);

    expect(schedule).toHaveLength(2); // only within 30 days
    expect(schedule[0].invoiceId).toBe("inv-sooner"); // sorted by due date
    expect(schedule[1].invoiceId).toBe("inv-later");
    expect(schedule[0].supplierName).toBe("Test Supplier Ltd");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// AR AGENT
// ═════════════════════════════════════════════════════════════════════════════

describe("AR Agent — Aging Report", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates aging report for open sales invoices", async () => {
    const { generateAgingReport } = await import("../tier3/ar-agent/tools");

    const today = new Date();
    const overdue10 = new Date(today);
    overdue10.setDate(overdue10.getDate() - 10);
    const overdue40 = new Date(today);
    overdue40.setDate(overdue40.getDate() - 40);
    const future = new Date(today);
    future.setDate(future.getDate() + 5);

    // Pending invoices
    mockDb.query.salesInvoices.findMany
      .mockResolvedValueOnce([
        makeSalesInvoice({
          id: "si-1",
          balance: "8000",
          dueDate: future.toISOString().split("T")[0],
          status: "pending",
        }),
        makeSalesInvoice({
          id: "si-2",
          balance: "3000",
          dueDate: overdue10.toISOString().split("T")[0],
          status: "pending",
        }),
      ])
      // Partial invoices
      .mockResolvedValueOnce([
        makeSalesInvoice({
          id: "si-3",
          balance: "2000",
          dueDate: overdue40.toISOString().split("T")[0],
          status: "partial",
        }),
      ]);

    const report = await generateAgingReport(ENTITY_ID);

    expect(report.invoiceCount).toBe(3);
    expect(report.totalOutstanding).toBe(13000);
    expect(report.overdueCount).toBe(2);
    expect(report.buckets.current).toBe(8000);
    expect(report.buckets.days30).toBe(3000);
    expect(report.buckets.days60).toBe(2000);
  });
});

describe("AR Agent — Overdue Alerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates overdue alerts with correct escalation levels", async () => {
    const { getOverdueAlerts } = await import("../tier3/ar-agent/tools");

    const today = new Date();
    const overdue5 = new Date(today);
    overdue5.setDate(overdue5.getDate() - 5);
    const overdue35 = new Date(today);
    overdue35.setDate(overdue35.getDate() - 35);
    const overdue95 = new Date(today);
    overdue95.setDate(overdue95.getDate() - 95);

    // Pending invoices
    mockDb.query.salesInvoices.findMany
      .mockResolvedValueOnce([
        makeSalesInvoice({
          id: "si-1",
          balance: "1000",
          dueDate: overdue5.toISOString().split("T")[0],
          status: "pending",
        }),
        makeSalesInvoice({
          id: "si-2",
          balance: "2000",
          dueDate: overdue35.toISOString().split("T")[0],
          status: "pending",
        }),
        makeSalesInvoice({
          id: "si-3",
          balance: "5000",
          dueDate: overdue95.toISOString().split("T")[0],
          status: "pending",
        }),
      ])
      // Partial invoices
      .mockResolvedValueOnce([]);

    mockDb.query.customers.findFirst.mockResolvedValue(makeCustomer());

    const alerts = await getOverdueAlerts(ENTITY_ID);

    expect(alerts).toHaveLength(3);
    // Sorted by days overdue descending
    expect(alerts[0].daysOverdue).toBeGreaterThan(alerts[1].daysOverdue);
    expect(alerts[0].escalationLevel).toBe("90d+");
    expect(alerts[1].escalationLevel).toBe("30d");
    expect(alerts[2].escalationLevel).toBe("7d");
    expect(alerts[0].customerName).toBe("Test Customer Corp");
  });

  it("returns empty when no overdue invoices", async () => {
    const { getOverdueAlerts } = await import("../tier3/ar-agent/tools");

    const future = new Date();
    future.setDate(future.getDate() + 10);

    mockDb.query.salesInvoices.findMany
      .mockResolvedValueOnce([
        makeSalesInvoice({
          dueDate: future.toISOString().split("T")[0],
          status: "pending",
        }),
      ])
      .mockResolvedValueOnce([]);

    const alerts = await getOverdueAlerts(ENTITY_ID);
    expect(alerts).toHaveLength(0);
  });
});

describe("AR Agent — Payment Matching (FIFO)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("matches payment to oldest invoice first (FIFO)", async () => {
    const { matchPayment } = await import("../tier3/ar-agent/tools");

    const inv1 = makeSalesInvoice({
      id: "si-old",
      invoiceNumber: "SINV-001",
      invoiceDate: "2026-04-01",
      totalAmount: "5000",
      balance: "5000",
      paidAmount: "0",
      status: "pending",
    });
    const inv2 = makeSalesInvoice({
      id: "si-new",
      invoiceNumber: "SINV-002",
      invoiceDate: "2026-05-01",
      totalAmount: "8000",
      balance: "8000",
      paidAmount: "0",
      status: "pending",
    });

    mockDb.query.salesInvoices.findMany.mockResolvedValueOnce([inv2, inv1]); // out of order

    const result = await matchPayment(ENTITY_ID, {
      paymentId: "pay-1",
      customerId: CUSTOMER_ID,
      amount: 5000,
      paymentDate: "2026-06-15",
    });

    expect(result.matchedInvoices).toHaveLength(1);
    expect(result.matchedInvoices[0].invoiceId).toBe("si-old"); // oldest first
    expect(result.matchedInvoices[0].amountApplied).toBe(5000);
    expect(result.remainingAmount).toBe(0);
    expect(result.totalApplied).toBe(5000);

    // Verify invoice was updated
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("splits payment across multiple invoices when amount exceeds first", async () => {
    const { matchPayment } = await import("../tier3/ar-agent/tools");

    const inv1 = makeSalesInvoice({
      id: "si-small",
      totalAmount: "3000",
      balance: "3000",
      paidAmount: "0",
      status: "pending",
    });
    const inv2 = makeSalesInvoice({
      id: "si-large",
      totalAmount: "10000",
      balance: "10000",
      paidAmount: "0",
      status: "pending",
    });

    mockDb.query.salesInvoices.findMany.mockResolvedValueOnce([inv1, inv2]);

    const result = await matchPayment(ENTITY_ID, {
      paymentId: "pay-2",
      customerId: CUSTOMER_ID,
      amount: 5000,
      paymentDate: "2026-06-15",
    });

    expect(result.matchedInvoices).toHaveLength(2);
    expect(result.matchedInvoices[0].amountApplied).toBe(3000); // fully paid
    expect(result.matchedInvoices[1].amountApplied).toBe(2000); // partial
    expect(result.remainingAmount).toBe(0);
  });

  it("returns remaining amount when payment exceeds all invoices", async () => {
    const { matchPayment } = await import("../tier3/ar-agent/tools");

    const inv1 = makeSalesInvoice({
      totalAmount: "2000",
      balance: "2000",
      paidAmount: "0",
      status: "pending",
    });

    mockDb.query.salesInvoices.findMany.mockResolvedValueOnce([inv1]);

    const result = await matchPayment(ENTITY_ID, {
      paymentId: "pay-3",
      customerId: CUSTOMER_ID,
      amount: 10000,
      paymentDate: "2026-06-15",
    });

    expect(result.matchedInvoices).toHaveLength(1);
    expect(result.matchedInvoices[0].amountApplied).toBe(2000);
    expect(result.remainingAmount).toBe(8000);
    expect(result.totalApplied).toBe(2000);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// RECONCILIATION AGENT
// ═════════════════════════════════════════════════════════════════════════════

describe("Reconciliation Agent — Ingest Statement Transactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ingests valid bank statement transactions", async () => {
    const { ingestStatementTransactions } = await import(
      "../tier3/reconciliation-agent/tools"
    );

    mockDb.returning.mockResolvedValueOnce([{ id: "btx-1" }]);
    mockDb.returning.mockResolvedValueOnce([{ id: "btx-2" }]);

    const result = await ingestStatementTransactions(ENTITY_ID, [
      {
        bankAccountId: BANK_ACCOUNT_ID,
        transactionDate: "2026-06-15",
        type: "deposit",
        amount: "5000",
        description: "Customer payment",
        reference: "REF-001",
      },
      {
        bankAccountId: BANK_ACCOUNT_ID,
        transactionDate: "2026-06-16",
        type: "withdrawal",
        amount: "2000",
        description: "Office rent",
      },
    ]);

    expect(result.success).toBe(true);
    expect(result.insertedIds).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects transaction with missing date", async () => {
    const { ingestStatementTransactions } = await import(
      "../tier3/reconciliation-agent/tools"
    );

    const result = await ingestStatementTransactions(ENTITY_ID, [
      {
        bankAccountId: BANK_ACCOUNT_ID,
        transactionDate: "",
        type: "deposit",
        amount: "5000",
        description: "No date transaction",
      },
    ]);

    expect(result.success).toBe(false);
    expect(result.errors).toContain(
      'Missing transaction date for "No date transaction"',
    );
  });

  it("rejects transaction with invalid type", async () => {
    const { ingestStatementTransactions } = await import(
      "../tier3/reconciliation-agent/tools"
    );

    const result = await ingestStatementTransactions(ENTITY_ID, [
      {
        bankAccountId: BANK_ACCOUNT_ID,
        transactionDate: "2026-06-15",
        type: "invalid_type" as any,
        amount: "5000",
        description: "Bad type",
      },
    ]);

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain("Invalid transaction type");
  });
});

describe("Reconciliation Agent — Match Transactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("matches statement transactions to ledger entries by amount and date", async () => {
    const { matchTransactions } = await import(
      "../tier3/reconciliation-agent/tools"
    );

    const ledgerEntries = [
      makeJournalEntry({
        id: "je-1",
        date: "2026-06-15",
        reference: "REF-001",
      }),
      makeJournalEntry({
        id: "je-2",
        date: "2026-06-16",
        reference: "REF-002",
      }),
    ];
    mockDb.query.journalEntries.findMany.mockResolvedValueOnce(ledgerEntries);

    const stmtTx = [
      {
        id: "stx-1",
        amount: "5000",
        transactionDate: "2026-06-15",
        reference: "REF-001",
        description: "Customer payment",
        type: "deposit",
      },
    ];

    const results = await matchTransactions(ENTITY_ID, BANK_ACCOUNT_ID, stmtTx);

    expect(results).toHaveLength(1);
    expect(results[0].matchType).toBe("exact");
    expect(results[0].confidence).toBeGreaterThanOrEqual(0.95);
    expect(results[0].ledgerEntryId).toBe("je-1");
  });

  it("returns unmatched when no close match found", async () => {
    const { matchTransactions } = await import(
      "../tier3/reconciliation-agent/tools"
    );

    mockDb.query.journalEntries.findMany.mockResolvedValueOnce([
      makeJournalEntry({
        id: "je-1",
        date: "2026-01-01",
        reference: "OLD-REF",
      }),
    ]);

    const stmtTx = [
      {
        id: "stx-1",
        amount: "99999",
        transactionDate: "2026-06-15",
        reference: "NEW-REF",
        description: "Unknown payment",
        type: "deposit",
      },
    ];

    const results = await matchTransactions(ENTITY_ID, BANK_ACCOUNT_ID, stmtTx);

    expect(results).toHaveLength(1);
    expect(results[0].matchType).toBe("unmatched");
    expect(results[0].ledgerEntryId).toBeNull();
    expect(results[0].confidence).toBe(0);
  });
});

describe("Reconciliation Agent — Reconciliation Report", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates report with matched/unmatched counts", async () => {
    const { generateReconciliationReport } = await import(
      "../tier3/reconciliation-agent/tools"
    );

    mockDb.query.bankTransactions.findMany.mockResolvedValueOnce([
      makeBankTransaction({ id: "btx-1", amount: "5000", isReconciled: true }),
      makeBankTransaction({ id: "btx-2", amount: "3000", isReconciled: true }),
      makeBankTransaction({ id: "btx-3", amount: "2000", isReconciled: false }),
    ]);

    const report = await generateReconciliationReport(
      ENTITY_ID,
      BANK_ACCOUNT_ID,
    );

    expect(report.matchedCount).toBe(2);
    expect(report.unmatchedCount).toBe(1);
    expect(report.totalAmount).toBe(10000);
    expect(report.matchedAmount).toBe(8000);
    expect(report.unmatchedAmount).toBe(2000);
  });

  it("returns zeros when no transactions exist", async () => {
    const { generateReconciliationReport } = await import(
      "../tier3/reconciliation-agent/tools"
    );

    mockDb.query.bankTransactions.findMany.mockResolvedValueOnce([]);

    const report = await generateReconciliationReport(
      ENTITY_ID,
      BANK_ACCOUNT_ID,
    );

    expect(report.matchedCount).toBe(0);
    expect(report.unmatchedCount).toBe(0);
    expect(report.totalAmount).toBe(0);
  });
});

describe("Reconciliation Agent — Flag Unmatched", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("flags unmatched transactions for review", async () => {
    const { flagUnmatched } = await import(
      "../tier3/reconciliation-agent/tools"
    );

    mockDb.query.bankTransactions.findFirst.mockResolvedValue(
      makeBankTransaction({ id: "btx-unmatched" }),
    );

    const result = await flagUnmatched(ENTITY_ID, RECONCILIATION_ID, [
      {
        bankTransactionId: "btx-unmatched",
        notes: "Could not match to any entry",
      },
    ]);

    expect(result.success).toBe(true);
    expect(result.createdCount).toBe(1);
    expect(result.errors).toHaveLength(0);
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("reports error for non-existent transaction", async () => {
    const { flagUnmatched } = await import(
      "../tier3/reconciliation-agent/tools"
    );

    mockDb.query.bankTransactions.findFirst.mockResolvedValueOnce(null);

    const result = await flagUnmatched(ENTITY_ID, RECONCILIATION_ID, [
      { bankTransactionId: "nonexistent-btx" },
    ]);

    expect(result.success).toBe(false);
    expect(result.createdCount).toBe(0);
    expect(result.errors[0]).toContain("not found");
  });
});
