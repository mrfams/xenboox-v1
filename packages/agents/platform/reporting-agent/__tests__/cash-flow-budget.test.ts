import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@xenboox/db", () => ({
  db: {
    query: {
      fiscalPeriods: { findFirst: vi.fn(), findMany: vi.fn() },
      journalEntries: { findMany: vi.fn() },
      journalEntryLines: { findMany: vi.fn() },
      chartOfAccounts: { findMany: vi.fn() },
      budgets: { findFirst: vi.fn() },
      budgetLines: { findMany: vi.fn() },
      budgetAlertThresholds: { findMany: vi.fn() },
    },
  },
}));

import { db } from "@xenboox/db";
import { generateCashFlow, generateBudgetVsActual } from "../tools";

const ENTITY_ID = "entity-1";
const PERIOD_ID = "period-2026-06";

const PERIODS = [
  {
    id: "period-2026-05",
    entityId: ENTITY_ID,
    year: 2026,
    month: 5,
    status: "closed",
  },
  { id: PERIOD_ID, entityId: ENTITY_ID, year: 2026, month: 6, status: "open" },
  {
    id: "period-2026-07",
    entityId: ENTITY_ID,
    year: 2026,
    month: 7,
    status: "open",
  },
];

const ACCOUNTS: Record<
  string,
  {
    id: string;
    code: string;
    name: string;
    type: string;
    subtype: string;
    entityId: string;
  }
> = {
  "cash-1": {
    id: "cash-1",
    code: "1010",
    name: "Bank Account",
    type: "asset",
    subtype: "bank_account",
    entityId: ENTITY_ID,
  },
  "rev-1": {
    id: "rev-1",
    code: "4000",
    name: "Sales Revenue",
    type: "revenue",
    subtype: "sales_revenue",
    entityId: ENTITY_ID,
  },
  "exp-1": {
    id: "exp-1",
    code: "6000",
    name: "Operating Expense",
    type: "expense",
    subtype: "operating_expense",
    entityId: ENTITY_ID,
  },
  "asset-1": {
    id: "asset-1",
    code: "1500",
    name: "Machinery",
    type: "asset",
    subtype: "fixed_asset",
    entityId: ENTITY_ID,
  },
  "loan-1": {
    id: "loan-1",
    code: "2200",
    name: "Bank Loan",
    type: "liability",
    subtype: "long_term_liability",
    entityId: ENTITY_ID,
  },
};

function mockPeriods() {
  vi.mocked(db.query.fiscalPeriods.findMany).mockResolvedValue(PERIODS as any);
}

function mockEntries(entries: Array<Record<string, unknown>>) {
  vi.mocked(db.query.journalEntries.findMany).mockResolvedValue(entries as any);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPeriods();
  vi.mocked(db.query.fiscalPeriods.findFirst).mockImplementation((() => {
    const opts = (vi
      .mocked(db.query.fiscalPeriods.findFirst)
      .mock.calls.at(-1) ?? [{}])[0] as any;
    const id = opts?.where?.[0]?.value ?? PERIOD_ID;
    return Promise.resolve(PERIODS.find((p) => p.id === id) ?? null);
  }) as any);
});

describe("generateCashFlow", () => {
  it("classifies revenue credits as operating inflow and expense debits as outflow", async () => {
    mockEntries([
      { id: "e1", entityId: ENTITY_ID, periodId: PERIOD_ID, status: "posted" },
    ]);
    vi.mocked(db.query.journalEntryLines.findMany).mockResolvedValue([
      {
        id: "l1",
        journalEntryId: "e1",
        accountId: "rev-1",
        debit: "0",
        credit: "5000",
      },
      {
        id: "l2",
        journalEntryId: "e1",
        accountId: "exp-1",
        debit: "1200",
        credit: "0",
      },
    ] as any);
    vi.mocked(db.query.chartOfAccounts.findMany).mockImplementation((() =>
      Promise.resolve(Object.values(ACCOUNTS))) as any);

    const cf = await generateCashFlow(ENTITY_ID, PERIOD_ID);

    expect(cf.operating.total).toBeCloseTo(3800, 2);
    expect(cf.investing.total).toBeCloseTo(0, 2);
    expect(cf.financing.total).toBeCloseTo(0, 2);
    expect(cf.period).toBe("2026-06");
  });

  it("classifies fixed-asset purchases as investing outflow and loans as financing inflow", async () => {
    mockEntries([
      { id: "e1", entityId: ENTITY_ID, periodId: PERIOD_ID, status: "posted" },
    ]);
    vi.mocked(db.query.journalEntryLines.findMany).mockResolvedValue([
      {
        id: "l1",
        journalEntryId: "e1",
        accountId: "asset-1",
        debit: "10000",
        credit: "0",
      },
      {
        id: "l2",
        journalEntryId: "e1",
        accountId: "loan-1",
        debit: "0",
        credit: "8000",
      },
    ] as any);
    vi.mocked(db.query.chartOfAccounts.findMany).mockImplementation((() =>
      Promise.resolve(Object.values(ACCOUNTS))) as any);

    const cf = await generateCashFlow(ENTITY_ID, PERIOD_ID);

    expect(cf.investing.total).toBeCloseTo(-10000, 2);
    expect(cf.financing.total).toBeCloseTo(8000, 2);
    expect(cf.netCashChange).toBeCloseTo(-2000, 2);
  });

  it("computes opening and closing cash balances across periods", async () => {
    mockEntries([
      {
        id: "e0",
        entityId: ENTITY_ID,
        periodId: "period-2026-05",
        status: "posted",
      },
      { id: "e1", entityId: ENTITY_ID, periodId: PERIOD_ID, status: "posted" },
      {
        id: "e2",
        entityId: ENTITY_ID,
        periodId: "period-2026-07",
        status: "posted",
      },
    ]);
    vi.mocked(db.query.journalEntryLines.findMany).mockResolvedValue([
      // Opening balance in May: 20,000 in bank
      {
        id: "l0",
        journalEntryId: "e0",
        accountId: "cash-1",
        debit: "20000",
        credit: "0",
      },
      // June: bank deposit of 5,000
      {
        id: "l1",
        journalEntryId: "e1",
        accountId: "cash-1",
        debit: "5000",
        credit: "0",
      },
      // July: spend 3,000 (should NOT affect June closing)
      {
        id: "l2",
        journalEntryId: "e2",
        accountId: "cash-1",
        debit: "0",
        credit: "3000",
      },
    ] as any);
    vi.mocked(db.query.chartOfAccounts.findMany).mockImplementation((() =>
      Promise.resolve(Object.values(ACCOUNTS))) as any);

    const cf = await generateCashFlow(ENTITY_ID, PERIOD_ID);

    expect(cf.openingCash).toBeCloseTo(20000, 2);
    expect(cf.closingCash).toBeCloseTo(25000, 2);
    // July activity excluded
    expect(cf.closingCash).toBe(25000);
  });

  it("returns a zeroed statement when no entries exist", async () => {
    mockEntries([]);
    const cf = await generateCashFlow(ENTITY_ID, PERIOD_ID);
    expect(cf.openingCash).toBe(0);
    expect(cf.closingCash).toBe(0);
    expect(cf.netCashChange).toBe(0);
    expect(cf.operating.lines).toHaveLength(0);
  });

  it("throws when the fiscal period does not exist", async () => {
    vi.mocked(db.query.fiscalPeriods.findFirst).mockResolvedValue(null as any);
    await expect(generateCashFlow(ENTITY_ID, "missing-period")).rejects.toThrow(
      /not found/,
    );
  });
});

describe("generateBudgetVsActual", () => {
  beforeEach(() => {
    vi.mocked(db.query.budgets.findFirst).mockResolvedValue({
      id: "budget-1",
      entityId: ENTITY_ID,
      name: "FY2026 Budget",
      fiscalYear: 2026,
      status: "active",
      totalBudgeted: "0",
    } as any);
    vi.mocked(db.query.budgetAlertThresholds.findMany).mockResolvedValue(
      [] as any,
    );
  });

  it("uses the monthly budget column and computes variance from actuals", async () => {
    mockEntries([
      { id: "e1", entityId: ENTITY_ID, periodId: PERIOD_ID, status: "posted" },
    ]);
    vi.mocked(db.query.journalEntryLines.findMany).mockResolvedValue([
      {
        id: "l1",
        journalEntryId: "e1",
        accountId: "exp-1",
        debit: "900",
        credit: "0",
      },
    ] as any);
    vi.mocked(db.query.budgetLines.findMany).mockResolvedValue([
      {
        id: "bl-1",
        budgetId: "budget-1",
        entityId: ENTITY_ID,
        accountId: "exp-1",
        lineDescription: "Ops",
        annualAmount: "12000",
        jun: "1000", // budgeted 1000 for June
        isActive: true,
      },
    ] as any);
    vi.mocked(db.query.chartOfAccounts.findMany).mockImplementation((() =>
      Promise.resolve(Object.values(ACCOUNTS))) as any);

    const report = await generateBudgetVsActual(ENTITY_ID, PERIOD_ID);

    expect(report.period).toBe("2026-06");
    expect(report.lines).toHaveLength(1);
    const line = report.lines[0];
    expect(line.budgetedAmount).toBeCloseTo(1000, 2);
    expect(line.actualAmount).toBeCloseTo(900, 2);
    expect(line.variance).toBeCloseTo(-100, 2);
    expect(line.status).toBe("on_track");
  });

  it("flags exceeded budgets when spend passes the 100% threshold", async () => {
    mockEntries([
      { id: "e1", entityId: ENTITY_ID, periodId: PERIOD_ID, status: "posted" },
    ]);
    vi.mocked(db.query.journalEntryLines.findMany).mockResolvedValue([
      {
        id: "l1",
        journalEntryId: "e1",
        accountId: "exp-1",
        debit: "2200",
        credit: "0",
      },
    ] as any);
    vi.mocked(db.query.budgetLines.findMany).mockResolvedValue([
      {
        id: "bl-1",
        budgetId: "budget-1",
        entityId: ENTITY_ID,
        accountId: "exp-1",
        lineDescription: "Ops",
        annualAmount: "12000",
        jun: "1000",
        isActive: true,
      },
    ] as any);
    vi.mocked(db.query.chartOfAccounts.findMany).mockImplementation((() =>
      Promise.resolve(Object.values(ACCOUNTS))) as any);

    const report = await generateBudgetVsActual(ENTITY_ID, PERIOD_ID);
    expect(report.lines[0].status).toBe("exceeded");
    expect(report.lines[0].variancePct).toBe(120); // 2200/1000 - 1
  });

  it("flags unbudgeted accounts as no_budget", async () => {
    mockEntries([
      { id: "e1", entityId: ENTITY_ID, periodId: PERIOD_ID, status: "posted" },
    ]);
    vi.mocked(db.query.journalEntryLines.findMany).mockResolvedValue([
      {
        id: "l1",
        journalEntryId: "e1",
        accountId: "exp-1",
        debit: "300",
        credit: "0",
      },
    ] as any);
    vi.mocked(db.query.budgetLines.findMany).mockResolvedValue([] as any);
    vi.mocked(db.query.chartOfAccounts.findMany).mockImplementation((() =>
      Promise.resolve(Object.values(ACCOUNTS))) as any);

    const report = await generateBudgetVsActual(ENTITY_ID, PERIOD_ID);
    expect(report.lines).toHaveLength(1);
    expect(report.lines[0].status).toBe("no_budget");
    expect(report.budgetName).toBe("FY2026 Budget");
  });

  it("returns empty when there is no active budget", async () => {
    vi.mocked(db.query.budgets.findFirst).mockResolvedValue(null as any);
    mockEntries([
      { id: "e1", entityId: ENTITY_ID, periodId: PERIOD_ID, status: "posted" },
    ]);
    vi.mocked(db.query.journalEntryLines.findMany).mockResolvedValue([
      {
        id: "l1",
        journalEntryId: "e1",
        accountId: "exp-1",
        debit: "50",
        credit: "0",
      },
    ] as any);
    vi.mocked(db.query.budgetLines.findMany).mockResolvedValue([] as any);
    vi.mocked(db.query.chartOfAccounts.findMany).mockImplementation((() =>
      Promise.resolve(Object.values(ACCOUNTS))) as any);

    const report = await generateBudgetVsActual(ENTITY_ID, PERIOD_ID);
    expect(report.budgetName).toBe("No active budget");
    expect(report.lines).toHaveLength(1); // unbudgeted spend still flagged
  });
});
