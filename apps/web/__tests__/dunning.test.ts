// ─── Dunning & Collections Engine Tests ───────────────────────────────────
//
// Tests the core dunning functions: aging reports, collection priority scoring,
// dunning letter generation, bad debt write-off, and summary aggregation.
// All functions are entity-scoped and operate on mocked db queries.

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────

let dbInsertReturning: unknown[] = [];
let dbUpdateReturning: unknown[] = [];

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn().mockReturnThis(),
      returning: vi
        .fn()
        .mockImplementation(() => Promise.resolve(dbInsertReturning)),
    })),
    update: vi.fn(() => ({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi
        .fn()
        .mockImplementation(() => Promise.resolve(dbUpdateReturning)),
    })),
    query: {
      salesInvoices: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      customers: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      paymentsAr: {
        findMany: vi.fn(),
      },
      chartOfAccounts: {
        findFirst: vi.fn(),
      },
      journalEntries: {
        findFirst: vi.fn(),
      },
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

import { db } from "@/lib/db";
import {
  generateARAgingReport,
  calculateCollectionPriorities,
  generateDunningLetter,
  writeOffBadDebt,
  getDunningSummary,
} from "@/lib/dunning";

// ─── Test Data Helpers ────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function makeInvoice(overrides: {
  id?: string;
  customerId?: string;
  status?: string;
  balance?: string;
  totalAmount?: string;
  dueDate?: string;
  invoiceNumber?: string;
}) {
  return {
    id: overrides.id ?? "inv-1",
    entityId: "entity-1",
    customerId: overrides.customerId ?? "cust-1",
    invoiceNumber: overrides.invoiceNumber ?? "SI-2026-0001",
    totalAmount: overrides.totalAmount ?? "5000.00",
    balance: overrides.balance ?? "5000.00",
    status: overrides.status ?? "pending",
    currency: "GMD",
    invoiceDate: daysAgo(60),
    dueDate: overrides.dueDate ?? daysAgo(10),
    paidAmount: "0.00",
  };
}

function makeCustomer(id: string, name: string) {
  return {
    id,
    name,
    contactEmail: `${name.toLowerCase().replace(/\s/g, "")}@test.com`,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  dbInsertReturning = [];
  dbUpdateReturning = [];
});

// ─── Aging Report Tests ───────────────────────────────────────────────────

describe("generateARAgingReport", () => {
  it("categorizes invoices into correct aging buckets", async () => {
    const invoices = [
      // Current (not yet due)
      makeInvoice({ id: "inv-1", dueDate: daysFromNow(10), balance: "1000" }),
      // 1-30 days overdue
      makeInvoice({ id: "inv-2", dueDate: daysAgo(15), balance: "2000" }),
      // 31-60 days overdue
      makeInvoice({ id: "inv-3", dueDate: daysAgo(45), balance: "3000" }),
      // 61-90 days overdue
      makeInvoice({ id: "inv-4", dueDate: daysAgo(75), balance: "4000" }),
      // 90+ days overdue
      makeInvoice({ id: "inv-5", dueDate: daysAgo(120), balance: "5000" }),
    ];

    vi.mocked(db.query.salesInvoices.findMany).mockResolvedValue(
      invoices as never,
    );
    vi.mocked(db.query.customers.findMany).mockResolvedValue([] as never);
    vi.mocked(db.query.paymentsAr.findMany).mockResolvedValue([] as never);

    const buckets = await generateARAgingReport("entity-1");

    expect(buckets).toHaveLength(5);
    expect(buckets[0].label).toBe("Current");
    expect(buckets[0].amount).toBe(1000);
    expect(buckets[0].count).toBe(1);

    expect(buckets[1].label).toBe("1-30 Days");
    expect(buckets[1].amount).toBe(2000);
    expect(buckets[1].count).toBe(1);

    expect(buckets[2].label).toBe("31-60 Days");
    expect(buckets[2].amount).toBe(3000);
    expect(buckets[2].count).toBe(1);

    expect(buckets[3].label).toBe("61-90 Days");
    expect(buckets[3].amount).toBe(4000);
    expect(buckets[3].count).toBe(1);

    expect(buckets[4].label).toBe("90+ Days");
    expect(buckets[4].amount).toBe(5000);
    expect(buckets[4].count).toBe(1);
  });

  it("returns empty buckets when no unpaid invoices exist", async () => {
    vi.mocked(db.query.salesInvoices.findMany).mockResolvedValue([] as never);
    vi.mocked(db.query.customers.findMany).mockResolvedValue([] as never);
    vi.mocked(db.query.paymentsAr.findMany).mockResolvedValue([] as never);

    const buckets = await generateARAgingReport("entity-1");

    expect(buckets).toHaveLength(5);
    for (const bucket of buckets) {
      expect(bucket.amount).toBe(0);
      expect(bucket.count).toBe(0);
      expect(bucket.invoices).toHaveLength(0);
    }
  });

  it("enriches invoices with customer names", async () => {
    const invoices = [
      makeInvoice({ id: "inv-1", customerId: "cust-1", dueDate: daysAgo(5) }),
      makeInvoice({ id: "inv-2", customerId: "cust-2", dueDate: daysAgo(25) }),
    ];

    vi.mocked(db.query.salesInvoices.findMany).mockResolvedValue(
      invoices as never,
    );
    vi.mocked(db.query.customers.findMany).mockResolvedValue([
      makeCustomer("cust-1", "Acme Corp"),
      makeCustomer("cust-2", "Beta LLC"),
    ] as never);
    vi.mocked(db.query.paymentsAr.findMany).mockResolvedValue([] as never);

    const buckets = await generateARAgingReport("entity-1");

    const allInvoices = buckets.flatMap((b) => b.invoices);
    expect(allInvoices[0].customerName).toBe("Acme Corp");
    expect(allInvoices[1].customerName).toBe("Beta LLC");
  });

  it("includes payment history on invoices", async () => {
    const invoices = [
      makeInvoice({ id: "inv-1", dueDate: daysAgo(10), balance: "3000" }),
    ];

    vi.mocked(db.query.salesInvoices.findMany).mockResolvedValue(
      invoices as never,
    );
    vi.mocked(db.query.customers.findMany).mockResolvedValue([] as never);
    vi.mocked(db.query.paymentsAr.findMany).mockResolvedValue([
      {
        salesInvoiceId: "inv-1",
        paymentDate: daysAgo(5),
        amount: "2000",
        method: "bank_transfer",
      },
    ] as never);

    const buckets = await generateARAgingReport("entity-1");

    const inv = buckets[1].invoices[0]; // 1-30 days bucket
    expect(inv.paymentHistory).toHaveLength(1);
    expect(inv.paymentHistory[0].amount).toBe(2000);
    expect(inv.paymentHistory[0].method).toBe("bank_transfer");
  });
});

// ─── Collection Priority Tests ────────────────────────────────────────────

describe("calculateCollectionPriorities", () => {
  it("returns priorities sorted by risk score descending", async () => {
    const invoices = [
      // Customer A: large amount, old debt
      makeInvoice({
        id: "inv-1",
        customerId: "cust-a",
        dueDate: daysAgo(100),
        balance: "10000",
      }),
      // Customer B: small amount, recent debt
      makeInvoice({
        id: "inv-2",
        customerId: "cust-b",
        dueDate: daysAgo(10),
        balance: "500",
      }),
    ];

    vi.mocked(db.query.salesInvoices.findMany).mockResolvedValue(
      invoices as never,
    );
    vi.mocked(db.query.customers.findMany).mockResolvedValue([
      makeCustomer("cust-a", "Alpha Corp"),
      makeCustomer("cust-b", "Beta LLC"),
    ] as never);
    vi.mocked(db.query.paymentsAr.findMany).mockResolvedValue([] as never);

    const priorities = await calculateCollectionPriorities("entity-1");

    expect(priorities).toHaveLength(2);
    // Alpha should be higher risk (larger amount, older debt)
    expect(priorities[0].customerName).toBe("Alpha Corp");
    expect(priorities[0].riskScore).toBeGreaterThan(priorities[1].riskScore);
  });

  it("returns empty array when no overdue invoices exist", async () => {
    const invoices = [
      makeInvoice({ id: "inv-1", dueDate: daysFromNow(10), balance: "1000" }),
    ];

    vi.mocked(db.query.salesInvoices.findMany).mockResolvedValue(
      invoices as never,
    );
    vi.mocked(db.query.customers.findMany).mockResolvedValue([] as never);
    vi.mocked(db.query.paymentsAr.findMany).mockResolvedValue([] as never);

    const priorities = await calculateCollectionPriorities("entity-1");

    expect(priorities).toHaveLength(0);
  });

  it("aggregates multiple invoices per customer", async () => {
    const invoices = [
      makeInvoice({
        id: "inv-1",
        customerId: "cust-a",
        dueDate: daysAgo(40),
        balance: "3000",
      }),
      makeInvoice({
        id: "inv-2",
        customerId: "cust-a",
        dueDate: daysAgo(15),
        balance: "2000",
      }),
    ];

    vi.mocked(db.query.salesInvoices.findMany).mockResolvedValue(
      invoices as never,
    );
    vi.mocked(db.query.customers.findMany).mockResolvedValue([
      makeCustomer("cust-a", "Alpha Corp"),
    ] as never);
    vi.mocked(db.query.paymentsAr.findMany).mockResolvedValue([] as never);

    const priorities = await calculateCollectionPriorities("entity-1");

    expect(priorities).toHaveLength(1);
    expect(priorities[0].totalOwed).toBe(5000);
    expect(priorities[0].invoiceCount).toBe(2);
    expect(priorities[0].oldestDaysOverdue).toBeGreaterThanOrEqual(40);
  });

  it("assigns recommended actions based on days overdue", async () => {
    const invoices = [
      makeInvoice({
        id: "inv-1",
        customerId: "cust-a",
        dueDate: daysAgo(5), // friendly
        balance: "1000",
      }),
      makeInvoice({
        id: "inv-2",
        customerId: "cust-b",
        dueDate: daysAgo(100), // legal
        balance: "5000",
      }),
    ];

    vi.mocked(db.query.salesInvoices.findMany).mockResolvedValue(
      invoices as never,
    );
    vi.mocked(db.query.customers.findMany).mockResolvedValue([
      makeCustomer("cust-a", "Friendly Corp"),
      makeCustomer("cust-b", "Legal Corp"),
    ] as never);
    vi.mocked(db.query.paymentsAr.findMany).mockResolvedValue([] as never);

    const priorities = await calculateCollectionPriorities("entity-1");

    const friendly = priorities.find((p) => p.customerName === "Friendly Corp");
    const legal = priorities.find((p) => p.customerName === "Legal Corp");

    expect(friendly?.recommendedAction).toContain("reminder");
    expect(legal?.recommendedAction).toContain("collections");
  });
});

// ─── Dunning Letter Tests ────────────────────────────────────────────────

describe("generateDunningLetter", () => {
  const mockInvoices = [
    {
      invoiceId: "inv-1",
      invoiceNumber: "SI-2026-0001",
      customerId: "cust-1",
      customerName: "Acme Corp",
      totalAmount: 5000,
      balance: 3000,
      dueDate: daysAgo(15),
      daysOverdue: 15,
      agingBucket: "1-30 Days",
      lastPaymentDate: null,
      paymentHistory: [],
    },
  ];

  it("generates a friendly letter with correct subject", () => {
    const letter = generateDunningLetter("Acme Corp", mockInvoices, "friendly");

    expect(letter.level).toBe("friendly");
    expect(letter.subject).toContain("Friendly Reminder");
    expect(letter.body).toContain("Acme Corp");
    expect(letter.body).toContain("SI-2026-0001");
  });

  it("generates a firm letter with deadline language", () => {
    const letter = generateDunningLetter("Acme Corp", mockInvoices, "firm");

    expect(letter.level).toBe("firm");
    expect(letter.subject).toContain("Overdue Payment");
    expect(letter.body).toContain("7 days");
  });

  it("generates a final letter with demand language", () => {
    const letter = generateDunningLetter("Acme Corp", mockInvoices, "final");

    expect(letter.level).toBe("final");
    expect(letter.subject).toContain("Final");
    expect(letter.body).toContain("final notice");
  });

  it("generates a legal letter with escalation language", () => {
    const letter = generateDunningLetter("Acme Corp", mockInvoices, "legal");

    expect(letter.level).toBe("legal");
    expect(letter.subject).toContain("Debt Recovery");
    expect(letter.body).toContain("recovery");
  });

  it("includes all invoice details in the letter body", () => {
    const letter = generateDunningLetter("Acme Corp", mockInvoices, "friendly");

    expect(letter.body).toContain("SI-2026-0001");
    expect(letter.body).toContain("3,000"); // formatted balance
  });

  it("calculates correct daysOverdue from invoices", () => {
    const letter = generateDunningLetter("Acme Corp", mockInvoices, "friendly");

    expect(letter.daysOverdue).toBe(15);
  });
});

// ─── Bad Debt Write-Off Tests ────────────────────────────────────────────

describe("writeOffBadDebt", () => {
  it("creates a journal entry and marks invoice as voided", async () => {
    const invoice = makeInvoice({ id: "inv-1", balance: "5000" });
    const badDebtAccount = { id: "acct-bad-debt", code: "6600" };
    const arAccount = { id: "acct-ar", code: "1200" };
    const journalEntry = { id: "je-1", entityId: "entity-1" };

    vi.mocked(db.query.salesInvoices.findFirst).mockResolvedValue(
      invoice as never,
    );
    vi.mocked(db.query.chartOfAccounts.findFirst)
      .mockResolvedValueOnce(badDebtAccount as never) // bad debt account
      .mockResolvedValueOnce(arAccount as never); // AR account
    dbInsertReturning = [journalEntry];

    const result = await writeOffBadDebt("entity-1", "inv-1", "user-1");

    expect(result.success).toBe(true);
    expect(result.journalEntryId).toBe("je-1");
    // Should insert: journal entry + 2 lines (debit + credit)
    expect(db.insert).toHaveBeenCalledTimes(3);
    // Should update invoice to voided
    expect(db.update).toHaveBeenCalled();
  });

  it("returns error when invoice not found", async () => {
    vi.mocked(db.query.salesInvoices.findFirst).mockResolvedValue(undefined);

    const result = await writeOffBadDebt("entity-1", "nonexistent", "user-1");

    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });

  it("returns error when invoice has zero balance", async () => {
    const invoice = makeInvoice({ id: "inv-1", balance: "0" });

    vi.mocked(db.query.salesInvoices.findFirst).mockResolvedValue(
      invoice as never,
    );

    const result = await writeOffBadDebt("entity-1", "inv-1", "user-1");

    expect(result.success).toBe(false);
    expect(result.error).toContain("no outstanding balance");
  });

  it("creates Bad Debt Expense account if it doesn't exist", async () => {
    const invoice = makeInvoice({ id: "inv-1", balance: "5000" });
    const arAccount = { id: "acct-ar", code: "1200" };
    const createdAccount = { id: "acct-new", code: "6600" };
    const journalEntry = { id: "je-1" };

    vi.mocked(db.query.salesInvoices.findFirst).mockResolvedValue(
      invoice as never,
    );
    vi.mocked(db.query.chartOfAccounts.findFirst)
      .mockResolvedValueOnce(undefined) // no existing bad debt account
      .mockResolvedValueOnce(arAccount as never); // AR account exists
    dbInsertReturning = [createdAccount, journalEntry];

    const result = await writeOffBadDebt("entity-1", "inv-1", "user-1");

    expect(result.success).toBe(true);
    // Should have created the account
    expect(db.insert).toHaveBeenCalled();
  });

  it("returns error when AR GL account not found", async () => {
    const invoice = makeInvoice({ id: "inv-1", balance: "5000" });

    vi.mocked(db.query.salesInvoices.findFirst).mockResolvedValue(
      invoice as never,
    );
    vi.mocked(db.query.chartOfAccounts.findFirst)
      .mockResolvedValueOnce({ id: "acct-bad", code: "6600" } as never) // bad debt exists
      .mockResolvedValueOnce(undefined); // no AR account

    const result = await writeOffBadDebt("entity-1", "inv-1", "user-1");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Accounts Receivable");
  });
});

// ─── Dunning Summary Tests ────────────────────────────────────────────────

describe("getDunningSummary", () => {
  it("aggregates aging buckets and priorities into summary", async () => {
    const invoices = [
      makeInvoice({ id: "inv-1", dueDate: daysAgo(15), balance: "2000" }),
      makeInvoice({ id: "inv-2", dueDate: daysAgo(45), balance: "3000" }),
    ];

    vi.mocked(db.query.salesInvoices.findMany).mockResolvedValue(
      invoices as never,
    );
    vi.mocked(db.query.customers.findMany).mockResolvedValue([] as never);
    vi.mocked(db.query.paymentsAr.findMany).mockResolvedValue([] as never);

    const summary = await getDunningSummary("entity-1");

    expect(summary.totalOverdue).toBe(5000);
    expect(summary.totalOverdueCount).toBe(2);
    expect(summary.agingBuckets).toHaveLength(5);
    expect(summary.priorities).toBeDefined();
    expect(summary.needsAttention).toBeDefined();
    expect(summary.needsAttention.friendly).toBeGreaterThanOrEqual(0);
  });

  it("counts invoices needing each escalation level", async () => {
    const invoices = [
      // Friendly level (7-30 days overdue)
      makeInvoice({ id: "inv-1", dueDate: daysAgo(15), balance: "1000" }),
      // Firm level (30-60 days overdue)
      makeInvoice({ id: "inv-2", dueDate: daysAgo(45), balance: "2000" }),
      // Final level (60-90 days overdue)
      makeInvoice({ id: "inv-3", dueDate: daysAgo(75), balance: "3000" }),
      // Legal level (90+ days overdue)
      makeInvoice({ id: "inv-4", dueDate: daysAgo(120), balance: "4000" }),
    ];

    vi.mocked(db.query.salesInvoices.findMany).mockResolvedValue(
      invoices as never,
    );
    vi.mocked(db.query.customers.findMany).mockResolvedValue([] as never);
    vi.mocked(db.query.paymentsAr.findMany).mockResolvedValue([] as never);

    const summary = await getDunningSummary("entity-1");

    expect(summary.needsAttention.friendly).toBeGreaterThanOrEqual(1);
    expect(summary.needsAttention.firm).toBeGreaterThanOrEqual(1);
    expect(summary.needsAttention.final).toBeGreaterThanOrEqual(1);
    expect(summary.needsAttention.legal).toBeGreaterThanOrEqual(1);
  });

  it("returns zeros when no overdue invoices", async () => {
    vi.mocked(db.query.salesInvoices.findMany).mockResolvedValue([] as never);
    vi.mocked(db.query.customers.findMany).mockResolvedValue([] as never);
    vi.mocked(db.query.paymentsAr.findMany).mockResolvedValue([] as never);

    const summary = await getDunningSummary("entity-1");

    expect(summary.totalOverdue).toBe(0);
    expect(summary.totalOverdueCount).toBe(0);
    expect(summary.needsAttention.friendly).toBe(0);
    expect(summary.needsAttention.legal).toBe(0);
  });
});
