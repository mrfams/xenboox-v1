// Static + behavioral coverage for the canonical report-math module.
// Imports the REAL module (packages/db/lib/report-math.ts) — pure functions,
// no DB — and asserts the accounting invariants that production reports rely
// on. Regression guard for the P9-A audit (fabricated COGS ratios, inverted
// revenue sign, non-cumulative balance sheets, missing equity folding).

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

import {
  aggregateReportRows,
  derivePnl,
  deriveBalanceSheet,
} from "../../../packages/db/lib/report-math";

const SRC = resolve(__dirname, "../../../packages/db/lib/report-math.ts");
const ROUTER = resolve(__dirname, "../server/routers/reports.ts");

describe("report-math module", () => {
  it("exports the canonical builders", () => {
    const src = readFileSync(SRC, "utf8");
    for (const name of [
      "aggregateReportRows",
      "derivePnl",
      "deriveBalanceSheet",
      "isDebitNormal",
      "signedByNormal",
    ]) {
      expect(src).toContain(`export function ${name}`);
    }
  });

  it("is pure — no db or schema imports", () => {
    const src = readFileSync(SRC, "utf8");
    expect(src).not.toMatch(/from ["']@xenboox\/db/);
    expect(src).not.toMatch(/drizzle/);
  });

  it("uses raw debit−credit internally and normal-balance flips for display", () => {
    const src = readFileSync(SRC, "utf8");
    expect(src).toContain("raw: t.debit - t.credit");
    expect(src).toContain("export function signedByNormal");
  });
});

// ─── Behavioral: real derivation on a small balanced ledger ────────────────

const ASSET_CASH = "a-cash";
const LIAB_VAT = "l-vat";
const EQUITY_OWNER = "e-owner";
const REV_SALES = "r-sales";
const EXP_COGS = "x-cogs";
const EXP_RENT = "x-rent";

const ACCOUNTS = [
  {
    id: ASSET_CASH,
    code: "1001",
    name: "Cash",
    type: "asset",
    subtype: "bank_account",
  },
  {
    id: LIAB_VAT,
    code: "2100",
    name: "VAT Payable",
    type: "liability",
    subtype: "tax_liability",
  },
  {
    id: EQUITY_OWNER,
    code: "3001",
    name: "Owner Equity",
    type: "equity",
    subtype: "owner_equity",
  },
  {
    id: REV_SALES,
    code: "4001",
    name: "Sales Revenue",
    type: "revenue",
    subtype: "sales_revenue",
  },
  {
    id: EXP_COGS,
    code: "5001",
    name: "COGS",
    type: "expense",
    subtype: "cost_of_goods_sold",
  },
  {
    id: EXP_RENT,
    code: "6001",
    name: "Rent",
    type: "expense",
    subtype: "operating_expense",
  },
];

/** One balanced journal entry helper: pairs of [accountId, debit, credit]. */
function linesOf(
  ...pairs: Array<[string, number, number]>
): Array<{ accountId: string; debit: string; credit: string }> {
  return pairs.map(([accountId, debit, credit]) => ({
    accountId,
    debit: String(debit),
    credit: String(credit),
  }));
}

describe("aggregateReportRows", () => {
  it("rolls per-account totals with raw = debit − credit", () => {
    const lines = linesOf([ASSET_CASH, 1000, 0], [REV_SALES, 0, 1000]);
    const rows = aggregateReportRows(lines, ACCOUNTS);
    const cash = rows.find((r) => r.accountId === ASSET_CASH)!;
    const rev = rows.find((r) => r.accountId === REV_SALES)!;
    expect(cash.debit).toBe(1000);
    expect(cash.raw).toBe(1000); // debit-normal
    expect(rev.credit).toBe(1000);
    expect(rev.raw).toBe(-1000); // credit-normal → negative raw
  });

  it("aggregates multiple lines per account", () => {
    const lines = linesOf(
      [ASSET_CASH, 500, 0],
      [ASSET_CASH, 300, 0],
      [ASSET_CASH, 0, 100],
      [REV_SALES, 0, 700],
    );
    const rows = aggregateReportRows(lines, ACCOUNTS);
    const cash = rows.find((r) => r.accountId === ASSET_CASH)!;
    expect(cash.debit).toBe(800);
    expect(cash.credit).toBe(100);
    expect(cash.raw).toBe(700);
  });

  it("includes zero-activity accounts with raw 0", () => {
    const rows = aggregateReportRows([], ACCOUNTS);
    expect(rows).toHaveLength(ACCOUNTS.length);
    expect(rows.every((r) => r.raw === 0)).toBe(true);
  });
});

describe("derivePnl", () => {
  it("derives revenue, REAL COGS split, and net income from the ledger", () => {
    const lines = linesOf(
      [ASSET_CASH, 1200, 0],
      [REV_SALES, 0, 1200],
      [EXP_COGS, 400, 0],
      [EXP_RENT, 200, 0],
      [ASSET_CASH, 0, 600],
    );
    const pnl = derivePnl(aggregateReportRows(lines, ACCOUNTS));

    expect(pnl.totalRevenue).toBe(1200);
    expect(pnl.totalCogs).toBe(400); // from subtype, NOT 65% of expenses
    expect(pnl.totalOperatingExpenses).toBe(200); // NOT 35% of expenses
    expect(pnl.grossProfit).toBe(800);
    expect(pnl.operatingProfit).toBe(600);
    expect(pnl.netIncome).toBe(600);

    expect(pnl.revenue).toHaveLength(1);
    expect(pnl.revenue[0].amount).toBe(1200);
    expect(pnl.cogs).toHaveLength(1);
    expect(pnl.cogs[0].accountId).toBe(EXP_COGS);
    expect(pnl.operatingExpenses).toHaveLength(1);
    expect(pnl.operatingExpenses[0].accountId).toBe(EXP_RENT);
  });

  it("nets contra entries per account instead of abs-ing per line", () => {
    // Sale 1000, then a credit memo (refund) of 100 on the same revenue acct.
    const lines = linesOf(
      [ASSET_CASH, 1000, 0],
      [REV_SALES, 0, 1000],
      [REV_SALES, 100, 0],
      [ASSET_CASH, 0, 100],
    );
    const pnl = derivePnl(aggregateReportRows(lines, ACCOUNTS));
    expect(pnl.totalRevenue).toBe(900); // 1000 − 100, not 1100
  });
});

describe("deriveBalanceSheet", () => {
  it("balances with equity folding when the ledger is balanced", () => {
    // Owner contributes 5,000; sale 1,200 cash; COGS 400; rent 200.
    const lines = linesOf(
      [ASSET_CASH, 5000, 0],
      [EQUITY_OWNER, 0, 5000],
      [ASSET_CASH, 1200, 0],
      [REV_SALES, 0, 1200],
      [EXP_COGS, 400, 0],
      [EXP_RENT, 200, 0],
      [ASSET_CASH, 0, 600],
    );
    const bs = deriveBalanceSheet(aggregateReportRows(lines, ACCOUNTS));

    expect(bs.totalAssets).toBe(5600); // 5000 + 1200 − 600
    expect(bs.totalLiabilities).toBe(0);
    expect(bs.totalEquity).toBe(5000); // explicit owner equity
    expect(bs.currentEarnings).toBe(600); // 1200 − 400 − 200
    expect(bs.totalEquityWithEarnings).toBe(5600);
    expect(bs.balanced).toBe(true); // the fundamental equation HOLDS
  });

  it("is balanced true even when a liability exists", () => {
    const lines = linesOf(
      [ASSET_CASH, 1180, 0],
      [REV_SALES, 0, 1000],
      [LIAB_VAT, 0, 180],
      [EXP_COGS, 300, 0],
      [ASSET_CASH, 0, 300],
    );
    const bs = deriveBalanceSheet(aggregateReportRows(lines, ACCOUNTS));
    expect(bs.totalAssets).toBe(880);
    expect(bs.totalLiabilities).toBe(180);
    expect(bs.currentEarnings).toBe(700); // 1000 − 300
    expect(bs.balanced).toBe(true);
  });

  it("reports unbalanced when the ledger itself is unbalanced", () => {
    // Cash debited 1000 but revenue only credited 900 — books don't balance.
    const lines = linesOf([ASSET_CASH, 1000, 0], [REV_SALES, 0, 900]);
    const bs = deriveBalanceSheet(aggregateReportRows(lines, ACCOUNTS));
    expect(bs.balanced).toBe(false);
  });
});

// ─── Regression guards against the router's fabricated math ───────────────

describe("router report-math regression guards (P9-A)", () => {
  it("router no longer fabricates COGS with 0.65 / 0.35 ratios", () => {
    const router = readFileSync(ROUTER, "utf8");
    expect(router).not.toMatch(/\*\s*0\.65/);
    expect(router).not.toMatch(/\*\s*0\.35/);
    expect(router).not.toMatch(/Approximate COGS/);
  });

  it("router balance sheet is cumulative (date <= period end), not single-period", () => {
    const router = readFileSync(ROUTER, "utf8");
    // The cumulative-window query must be date-based, not periodId-equality.
    const bsBlock = router.slice(
      router.indexOf("getBalanceSheet"),
      router.indexOf("getBalanceSheet") + 4000,
    );
    expect(bsBlock).toMatch(/journalEntries\.date/);
  });

  it("report surfaces consume the shared canonical builders", () => {
    const router = readFileSync(ROUTER, "utf8");
    const importsCanonical = /aggregateReportRows|derivePnl|deriveBalanceSheet/;
    expect(importsCanonical.test(router)).toBe(true);
  });
});
