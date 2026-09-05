// Report Math — Canonical Financial Statement Derivation
//
// Pipeline 9 (Reporting) Sub-Part A. Before this module, every report surface
// re-implemented financial statements differently and several were wrong:
//   - COGS / operating profit FABRICATED from fixed 0.65/0.35 expense ratios
//     (reports.ts getOverview + getPnlOverview)
//   - balance sheets filtered to a SINGLE period (activity, not position)
//   - net income never folded into equity ⇒ the fundamental equation could
//     never hold ⇒ isBalanced was always false for healthy companies
//   - revenue summed with inverted sign in the AI narrative
//   - liability/equity balances rendered without their normal-balance flip
//
// This module is the SINGLE source of truth for statement derivation. It is
// pure (no DB client) and structural — callers pass journal-line rows and
// CoA rows they have already fetched. Shared by the web routers, the jobs
// report-generation task, and the reporting agents so every surface reports
// identical, correct numbers.
//
// Internal convention — RAW balances (debit − credit) for every account.
// Raw is uniform, so the ledger identity survives:
//     Σ raw over ALL accounts = Σ debit − Σ credit = 0   (books balanced)
// Display sign is applied at derivation time by normal balance:
//     asset / expense           → debit-normal  → display +raw
//     liability / equity / revenue → credit-normal → display −raw
// Because revenue/expense are credit/debit-normal respectively, the sheet
// folds current earnings into equity automatically:
//     Assets = Liabilities + Equity(accts) + CurrentEarnings   ⟺ books balanced

/** Structural journal-line row (debit/credit as string or number). */
export interface ReportLineLike {
  accountId: string;
  debit?: string | number | null;
  credit?: string | number | null;
}

/** Structural chart-of-accounts row. */
export interface ReportAccountLike {
  id: string;
  code: string;
  name: string;
  type: string;
  subtype: string | null;
}

/** Per-account rolled totals. `raw` is ALWAYS debit − credit. */
export interface ReportBalanceRow {
  accountId: string;
  code: string;
  name: string;
  type: string;
  subtype: string | null;
  debit: number; // rolled debit total across the window/as-of set
  credit: number; // rolled credit total
  raw: number; // debit − credit (uniform; NOT normal-balance signed)
}

/** A single displayed statement line (amount already normal-balance signed). */
export interface ReportStatementLine {
  accountId: string;
  code: string;
  name: string;
  type: string;
  subtype: string | null;
  amount: number; // positive when the account sits in its normal direction
}

const DEBIT_NORMAL_TYPES = new Set(["asset", "expense"]);

/** True when the account type is debit-normal (asset, expense). */
export function isDebitNormal(type: string): boolean {
  return DEBIT_NORMAL_TYPES.has(type);
}

/** Display-signed net for a raw balance: positive = normal direction. */
export function signedByNormal(type: string, raw: number): number {
  return isDebitNormal(type) ? raw : -raw;
}

function num(v: string | number | null | undefined): number {
  const n = typeof v === "number" ? v : parseFloat(v ?? "");
  return Number.isFinite(n) ? n : 0;
}

/**
 * Roll journal lines into one row per account.
 * @param lines    journal lines for the window/as-of set
 * @param accounts CoA rows (id/code/name/type/subtype) covering those ids
 */
export function aggregateReportRows(
  lines: ReportLineLike[],
  accounts: ReportAccountLike[],
): ReportBalanceRow[] {
  const totals = new Map<string, { debit: number; credit: number }>();
  for (const l of lines) {
    const t = totals.get(l.accountId) ?? { debit: 0, credit: 0 };
    t.debit += num(l.debit);
    t.credit += num(l.credit);
    totals.set(l.accountId, t);
  }

  const rows: ReportBalanceRow[] = [];
  for (const a of accounts) {
    const t = totals.get(a.id) ?? { debit: 0, credit: 0 };
    rows.push({
      accountId: a.id,
      code: a.code,
      name: a.name,
      type: a.type,
      subtype: a.subtype,
      debit: t.debit,
      credit: t.credit,
      raw: t.debit - t.credit,
    });
  }
  return rows;
}

/**
 * Derive a P&L from rolled rows.
 *
 * Splits expenses on the REAL `cost_of_goods_sold` subtype — no fabricated
 * ratios. COGS = Σ expense accounts with subtype cost_of_goods_sold;
 * operating expenses = Σ the remaining expense accounts.
 */
export function derivePnl(rows: ReportBalanceRow[]): {
  revenue: ReportStatementLine[];
  cogs: ReportStatementLine[];
  operatingExpenses: ReportStatementLine[];
  totalRevenue: number;
  totalCogs: number;
  totalOperatingExpenses: number;
  grossProfit: number;
  operatingProfit: number;
  netIncome: number;
} {
  const revenue: ReportStatementLine[] = [];
  const cogs: ReportStatementLine[] = [];
  const operatingExpenses: ReportStatementLine[] = [];

  for (const r of rows) {
    const signed = signedByNormal(r.type, r.raw);
    if (signed === 0) continue;
    if (r.type === "revenue") {
      revenue.push({ ...r, amount: signed });
    } else if (r.type === "expense") {
      const line: ReportStatementLine = { ...r, amount: signed };
      if (r.subtype === "cost_of_goods_sold") cogs.push(line);
      else operatingExpenses.push(line);
    }
  }

  const totalRevenue = revenue.reduce((s, l) => s + l.amount, 0);
  const totalCogs = cogs.reduce((s, l) => s + l.amount, 0);
  const totalOperatingExpenses = operatingExpenses.reduce(
    (s, l) => s + l.amount,
    0,
  );
  const grossProfit = totalRevenue - totalCogs;
  const operatingProfit = grossProfit - totalOperatingExpenses;

  return {
    revenue,
    cogs,
    operatingExpenses,
    totalRevenue,
    totalCogs,
    totalOperatingExpenses,
    grossProfit,
    operatingProfit,
    netIncome: operatingProfit,
  };
}

/**
 * Derive a balance sheet from rolled rows.
 *
 * Buckets by CoA type with normal-balance display signs and folds current
 * earnings (open revenue − open expense) into equity. When the underlying
 * books are balanced the identity holds exactly:
 *     totalAssets − (totalLiabilities + totalEquityWithEarnings) ≈ 0
 * so `balanced` is a MEANINGFUL ledger-integrity check.
 */
export function deriveBalanceSheet(rows: ReportBalanceRow[]): {
  assets: ReportStatementLine[];
  liabilities: ReportStatementLine[];
  equity: ReportStatementLine[];
  currentEarnings: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number; // explicit equity accounts only (display signed)
  totalEquityWithEarnings: number;
  balanced: boolean;
} {
  const assets: ReportStatementLine[] = [];
  const liabilities: ReportStatementLine[] = [];
  const equity: ReportStatementLine[] = [];
  // Current earnings = revenue (credit-normal) − expense (debit-normal).
  // With raw convention: earnings = −Σ raw over P&L accounts.
  let pnlRaw = 0;

  for (const r of rows) {
    if (r.raw === 0) continue;
    const signed = signedByNormal(r.type, r.raw);
    if (r.type === "asset") {
      assets.push({ ...r, amount: signed });
    } else if (r.type === "liability") {
      liabilities.push({ ...r, amount: signed });
    } else if (r.type === "equity") {
      equity.push({ ...r, amount: signed });
    } else if (r.type === "revenue" || r.type === "expense") {
      pnlRaw += r.raw; // revenue raw<0 reduces, expense raw>0 reduces
    }
  }

  const totalAssets = assets.reduce((s, l) => s + l.amount, 0);
  const totalLiabilities = liabilities.reduce((s, l) => s + l.amount, 0);
  const totalEquity = equity.reduce((s, l) => s + l.amount, 0);
  const currentEarnings = -pnlRaw;
  const totalEquityWithEarnings = totalEquity + currentEarnings;

  return {
    assets,
    liabilities,
    equity,
    currentEarnings,
    totalAssets,
    totalLiabilities,
    totalEquity,
    totalEquityWithEarnings,
    balanced:
      Math.abs(totalAssets - (totalLiabilities + totalEquityWithEarnings)) <
      0.01,
  };
}
