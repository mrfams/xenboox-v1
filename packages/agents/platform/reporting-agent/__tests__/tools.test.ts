import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@xenboox/db", () => ({
  db: {
    query: {
      journalEntries: { findMany: vi.fn() },
      journalEntryLines: { findMany: vi.fn() },
      chartOfAccounts: { findFirst: vi.fn(), findMany: vi.fn() },
    },
  },
}));

import { db } from "@xenboox/db";
import {
  generateProfitLoss,
  generateBalanceSheet,
  generateTrialBalance,
} from "../tools";

const ENTITY_ID = "entity-1";
const PERIOD_ID = "period-1";

function mockJournalEntries(entries: Array<Record<string, unknown>>) {
  vi.mocked(db.query.journalEntries.findMany).mockResolvedValue(entries as any);
}

function mockJournalEntryLines(
  callback: (entryId: string) => Array<Record<string, unknown>>,
) {
  vi.mocked(db.query.journalEntryLines.findMany).mockImplementation(
    async (opts?: { where?: unknown }) => {
      return [] as any;
    },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("generateProfitLoss", () => {
  it("calculates revenue and expenses from posted journal entries", async () => {
    mockJournalEntries([
      {
        id: "entry-1",
        entityId: ENTITY_ID,
        periodId: PERIOD_ID,
        status: "posted",
      },
      {
        id: "entry-2",
        entityId: ENTITY_ID,
        periodId: PERIOD_ID,
        status: "posted",
      },
    ]);

    const allLines = [
      {
        id: "line-1",
        journalEntryId: "entry-1",
        accountId: "rev-1",
        debit: "0",
        credit: "1000",
      },
      {
        id: "line-2",
        journalEntryId: "entry-1",
        accountId: "exp-1",
        debit: "300",
        credit: "0",
      },
      {
        id: "line-3",
        journalEntryId: "entry-2",
        accountId: "rev-1",
        debit: "0",
        credit: "500",
      },
    ];
    vi.mocked(db.query.journalEntryLines.findMany).mockResolvedValue(
      allLines as any,
    );

    vi.mocked(db.query.chartOfAccounts.findMany).mockResolvedValue([
      {
        id: "rev-1",
        code: "4000",
        name: "Sales Revenue",
        type: "revenue",
        entityId: ENTITY_ID,
        isActive: true,
      },
      {
        id: "exp-1",
        code: "5000",
        name: "Operating Expense",
        type: "expense",
        entityId: ENTITY_ID,
        isActive: true,
      },
    ] as any);

    const result = await generateProfitLoss(ENTITY_ID, PERIOD_ID);

    expect(result.revenue).toBe(1500);
    expect(result.expenses).toBe(300);
    expect(result.netProfit).toBe(1200);
    expect(result.revenueByAccount).toHaveLength(1);
    expect(result.revenueByAccount[0].accountCode).toBe("4000");
    expect(result.expensesByAccount).toHaveLength(1);
    expect(result.expensesByAccount[0].amount).toBe(300);
  });

  it("returns zeroes when no entries exist", async () => {
    mockJournalEntries([]);

    const result = await generateProfitLoss(ENTITY_ID, PERIOD_ID);

    expect(result.revenue).toBe(0);
    expect(result.expenses).toBe(0);
    expect(result.netProfit).toBe(0);
    expect(result.revenueByAccount).toHaveLength(0);
    expect(result.expensesByAccount).toHaveLength(0);
  });

  it("uses batch queries instead of N+1 (single findMany for lines, no per-line findFirst)", async () => {
    mockJournalEntries([
      {
        id: "entry-1",
        entityId: ENTITY_ID,
        periodId: PERIOD_ID,
        status: "posted",
      },
      {
        id: "entry-2",
        entityId: ENTITY_ID,
        periodId: PERIOD_ID,
        status: "posted",
      },
    ]);

    const allLines = [
      {
        id: "line-1",
        journalEntryId: "entry-1",
        accountId: "rev-1",
        debit: "0",
        credit: "1000",
      },
      {
        id: "line-2",
        journalEntryId: "entry-1",
        accountId: "exp-1",
        debit: "300",
        credit: "0",
      },
    ];
    vi.mocked(db.query.journalEntryLines.findMany).mockResolvedValue(
      allLines as any,
    );
    vi.mocked(db.query.chartOfAccounts.findMany).mockResolvedValue([
      {
        id: "rev-1",
        code: "4000",
        name: "Sales Revenue",
        type: "revenue",
        entityId: ENTITY_ID,
      } as any,
    ]);

    await generateProfitLoss(ENTITY_ID, PERIOD_ID);

    expect(
      vi.mocked(db.query.journalEntryLines.findMany).mock.calls.length,
    ).toBeLessThanOrEqual(1);
    expect(
      vi.mocked(db.query.chartOfAccounts.findFirst).mock.calls.length,
    ).toBe(0);
  });
});

describe("generateBalanceSheet", () => {
  it("calculates assets, liabilities, and equity from posted entries", async () => {
    vi.mocked(db.query.chartOfAccounts.findMany).mockResolvedValue([
      {
        id: "asset-1",
        code: "1000",
        name: "Cash",
        type: "asset",
        entityId: ENTITY_ID,
        isActive: true,
      },
      {
        id: "liab-1",
        code: "2000",
        name: "Loan Payable",
        type: "liability",
        entityId: ENTITY_ID,
        isActive: true,
      },
      {
        id: "eq-1",
        code: "3000",
        name: "Retained Earnings",
        type: "equity",
        entityId: ENTITY_ID,
        isActive: true,
      },
    ] as any);

    mockJournalEntries([
      { id: "entry-3", entityId: ENTITY_ID, status: "posted" },
    ]);

    vi.mocked(db.query.journalEntryLines.findMany).mockResolvedValue([
      {
        id: "line-4",
        journalEntryId: "entry-3",
        accountId: "asset-1",
        debit: "5000",
        credit: "0",
      },
      {
        id: "line-5",
        journalEntryId: "entry-3",
        accountId: "liab-1",
        debit: "0",
        credit: "2000",
      },
      {
        id: "line-6",
        journalEntryId: "entry-3",
        accountId: "eq-1",
        debit: "0",
        credit: "3000",
      },
    ] as any);

    const result = await generateBalanceSheet(ENTITY_ID);

    expect(result.assets).toBe(5000);
    expect(result.liabilities).toBe(2000);
    expect(result.equity).toBe(3000);
    expect(result.assetsByAccount).toHaveLength(1);
    expect(result.liabilitiesByAccount).toHaveLength(1);
    expect(result.equityByAccount).toHaveLength(1);
  });

  it("returns zeroes when no entries exist", async () => {
    vi.mocked(db.query.chartOfAccounts.findMany).mockResolvedValue([] as any);
    mockJournalEntries([]);

    const result = await generateBalanceSheet(ENTITY_ID);

    expect(result.assets).toBe(0);
    expect(result.liabilities).toBe(0);
    expect(result.equity).toBe(0);
  });

  it("uses batch query for journal entry lines (not N+1)", async () => {
    vi.mocked(db.query.chartOfAccounts.findMany).mockResolvedValue([
      {
        id: "asset-1",
        code: "1000",
        name: "Cash",
        type: "asset",
        entityId: ENTITY_ID,
        isActive: true,
      },
    ] as any);
    mockJournalEntries([
      { id: "entry-a", entityId: ENTITY_ID, status: "posted" },
      { id: "entry-b", entityId: ENTITY_ID, status: "posted" },
    ]);
    vi.mocked(db.query.journalEntryLines.findMany).mockResolvedValue([
      {
        id: "line-x",
        journalEntryId: "entry-a",
        accountId: "asset-1",
        debit: "1000",
        credit: "0",
      },
    ] as any);

    vi.mocked(db.query.chartOfAccounts.findFirst).mockClear();

    await generateBalanceSheet(ENTITY_ID);

    expect(
      vi.mocked(db.query.journalEntryLines.findMany).mock.calls.length,
    ).toBeLessThanOrEqual(1);
  });
});

describe("generateTrialBalance", () => {
  it("returns balanced trial balance with account totals", async () => {
    mockJournalEntries([
      {
        id: "entry-4",
        entityId: ENTITY_ID,
        periodId: PERIOD_ID,
        status: "posted",
      },
    ]);

    vi.mocked(db.query.journalEntryLines.findMany).mockResolvedValue([
      {
        id: "line-7",
        journalEntryId: "entry-4",
        accountId: "cash-1",
        debit: "5000",
        credit: "0",
      },
      {
        id: "line-8",
        journalEntryId: "entry-4",
        accountId: "rev-1",
        debit: "0",
        credit: "5000",
      },
    ] as any);

    vi.mocked(db.query.chartOfAccounts.findMany).mockResolvedValue([
      { id: "cash-1", code: "1000", name: "Cash", type: "asset" },
      { id: "rev-1", code: "4000", name: "Revenue", type: "revenue" },
    ] as any);

    const result = await generateTrialBalance(ENTITY_ID, PERIOD_ID);

    expect(result.accounts).toHaveLength(2);
    expect(result.totalDebits).toBe(5000);
    expect(result.totalCredits).toBe(5000);
    expect(result.balanced).toBe(true);
  });

  it("uses batch queries for lines and accounts (not N+1)", async () => {
    mockJournalEntries([
      {
        id: "entry-a",
        entityId: ENTITY_ID,
        periodId: PERIOD_ID,
        status: "posted",
      },
      {
        id: "entry-b",
        entityId: ENTITY_ID,
        periodId: PERIOD_ID,
        status: "posted",
      },
    ]);
    vi.mocked(db.query.journalEntryLines.findMany).mockResolvedValue([
      {
        id: "line-x",
        journalEntryId: "entry-a",
        accountId: "cash-1",
        debit: "5000",
        credit: "0",
      },
      {
        id: "line-y",
        journalEntryId: "entry-b",
        accountId: "rev-1",
        debit: "0",
        credit: "5000",
      },
    ] as any);
    vi.mocked(db.query.chartOfAccounts.findMany).mockResolvedValue([
      { id: "cash-1", code: "1000", name: "Cash", type: "asset" },
      { id: "rev-1", code: "4000", name: "Revenue", type: "revenue" },
    ] as any);
    vi.mocked(db.query.chartOfAccounts.findFirst).mockClear();

    await generateTrialBalance(ENTITY_ID, PERIOD_ID);

    expect(
      vi.mocked(db.query.journalEntryLines.findMany).mock.calls.length,
    ).toBeLessThanOrEqual(1);
    expect(
      vi.mocked(db.query.chartOfAccounts.findFirst).mock.calls.length,
    ).toBe(0);
  });

  it("detects unbalanced trial balance", async () => {
    mockJournalEntries([
      {
        id: "entry-5",
        entityId: ENTITY_ID,
        periodId: PERIOD_ID,
        status: "posted",
      },
    ]);

    vi.mocked(db.query.journalEntryLines.findMany).mockResolvedValue([
      {
        id: "line-9",
        journalEntryId: "entry-5",
        accountId: "cash-1",
        debit: "5000",
        credit: "0",
      },
      {
        id: "line-10",
        journalEntryId: "entry-5",
        accountId: "exp-1",
        debit: "3000",
        credit: "0",
      },
      {
        id: "line-11",
        journalEntryId: "entry-5",
        accountId: "rev-1",
        debit: "0",
        credit: "7000",
      },
    ] as any);

    vi.mocked(db.query.chartOfAccounts.findMany).mockResolvedValue([
      { id: "cash-1", code: "1000", name: "Cash", type: "asset" },
      { id: "exp-1", code: "5000", name: "Expense", type: "expense" },
      { id: "rev-1", code: "4000", name: "Revenue", type: "revenue" },
    ] as any);

    const result = await generateTrialBalance(ENTITY_ID, PERIOD_ID);

    expect(result.totalDebits).toBe(8000);
    expect(result.totalCredits).toBe(7000);
    expect(result.balanced).toBe(false);
  });
});
