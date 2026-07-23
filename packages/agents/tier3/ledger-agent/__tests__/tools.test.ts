import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@xenboox/db", () => ({
  db: {
    query: {
      journalEntries: { findMany: vi.fn(), findFirst: vi.fn() },
      journalEntryLines: { findMany: vi.fn() },
      chartOfAccounts: { findMany: vi.fn(), findFirst: vi.fn() },
      fiscalPeriods: { findFirst: vi.fn() },
    },
  },
}));

import { db } from "@xenboox/db";
import { validateAccountsExist, generateTrialBalance } from "../tools";

const ENTITY_ID = "entity-1";
const PERIOD_ID = "period-1";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("validateAccountsExist", () => {
  const makeEntry = (accountId: string, accountCode: string) => ({
    accountId,
    accountCode,
    debit: 100,
    credit: 0,
  });

  it("returns valid when all accounts exist and are active", async () => {
    vi.mocked(db.query.chartOfAccounts.findMany).mockResolvedValue([
      {
        id: "acc-1",
        isActive: true,
        entityId: ENTITY_ID,
        code: "1000",
        name: "Cash",
      },
    ] as any);

    const result = await validateAccountsExist(
      [makeEntry("acc-1", "1000")],
      ENTITY_ID,
    );

    expect(result.valid).toBe(true);
  });

  it("returns invalid when an account is not found", async () => {
    vi.mocked(db.query.chartOfAccounts.findMany).mockResolvedValue([] as any);

    const result = await validateAccountsExist(
      [makeEntry("acc-missing", "9999")],
      ENTITY_ID,
    );

    expect(result.valid).toBe(false);
    expect(result.error).toContain("not found");
    expect(result.constraint).toBe("account_validity");
  });

  it("returns invalid when an account is inactive", async () => {
    vi.mocked(db.query.chartOfAccounts.findMany).mockResolvedValue([
      {
        id: "acc-inactive",
        isActive: false,
        name: "Old Account",
        entityId: ENTITY_ID,
        code: "2000",
      },
    ] as any);

    const result = await validateAccountsExist(
      [makeEntry("acc-inactive", "2000")],
      ENTITY_ID,
    );

    expect(result.valid).toBe(false);
    expect(result.error).toContain("inactive");
    expect(result.constraint).toBe("account_active");
  });

  it("uses batch query (single findMany, zero findFirst)", async () => {
    vi.mocked(db.query.chartOfAccounts.findMany).mockResolvedValue([
      {
        id: "acc-1",
        isActive: true,
        entityId: ENTITY_ID,
        code: "1000",
        name: "Cash",
      },
      {
        id: "acc-2",
        isActive: true,
        entityId: ENTITY_ID,
        code: "2000",
        name: "Bank",
      },
    ] as any);

    await validateAccountsExist(
      [makeEntry("acc-1", "1000"), makeEntry("acc-2", "2000")],
      ENTITY_ID,
    );

    expect(vi.mocked(db.query.chartOfAccounts.findMany).mock.calls.length).toBe(
      1,
    );
    expect(
      vi.mocked(db.query.chartOfAccounts.findFirst).mock.calls.length,
    ).toBe(0);
  });
});

describe("generateTrialBalance", () => {
  it("returns trial balance with account totals from batch queries", async () => {
    vi.mocked(db.query.fiscalPeriods.findFirst).mockResolvedValue({
      id: PERIOD_ID,
      year: 2026,
      month: 7,
    } as any);
    vi.mocked(db.query.journalEntries.findMany).mockResolvedValue([
      {
        id: "entry-1",
        entityId: ENTITY_ID,
        periodId: PERIOD_ID,
        status: "posted",
      },
    ] as any);

    vi.mocked(db.query.journalEntryLines.findMany).mockResolvedValue([
      {
        id: "line-1",
        journalEntryId: "entry-1",
        accountId: "cash-1",
        debit: "5000",
        credit: "0",
      },
      {
        id: "line-2",
        journalEntryId: "entry-1",
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
    expect(result.periodLabel).toBe("2026-07");
  });

  it("uses batch query for lines (single findMany, zero findFirst)", async () => {
    vi.mocked(db.query.fiscalPeriods.findFirst).mockResolvedValue({
      id: PERIOD_ID,
      year: 2026,
      month: 7,
    } as any);
    vi.mocked(db.query.journalEntries.findMany).mockResolvedValue([
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
    ] as any);
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
    vi.mocked(db.query.chartOfAccounts.findMany).mockResolvedValue([] as any);

    await generateTrialBalance(ENTITY_ID, PERIOD_ID);

    expect(
      vi.mocked(db.query.journalEntryLines.findMany).mock.calls.length,
    ).toBeLessThanOrEqual(1);
    expect(
      vi.mocked(db.query.chartOfAccounts.findFirst).mock.calls.length,
    ).toBe(0);
  });
});
