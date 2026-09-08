# Pipeline 9 (Reporting) — Sub-Part A: Report Math Correctness — Deep Audit

**Campaign:** Deep-audit-to-production-grade · **Date:** 2026-09-05
**Scope:** P&L / Balance Sheet / Cash Flow correctness — posted-only filters, period vs cumulative semantics, equity folding, real COGS, formula integrity, sign conventions.

---

## Executive Summary

**The reporting layer has systemic math defects.** Three independent re-implementations of financial statements (interactive router, Trigger.dev jobs core, platform reporting-agent tools) disagree with each other and with accounting reality. Worse, the Financial Pulse surface that humans read **fabricates COGS and operating expenses from fixed 65/35 ratios** instead of the ledger. A balance sheet drawn for a specific month is not cumulative (shows only that month's activity), net income is never folded into equity so the sheet cannot balance, and the AI narrative inverts revenue sign. Every one of these is a production-grade accounting error.

---

## Findings

### 🔴 A1 — COGS / Operating Profit are FABRICATED with fixed 0.65 / 0.35 ratios (2 sites)

**Locations:**
- `apps/web/server/routers/reports.ts` → `getOverview` (lines 164–169): `const cogs = currentTotals.expense.debit * 0.65;` and `const operatingExpenses = currentTotals.expense.debit * 0.35;` — presented to the user on Financial Pulse AND the QBR report.
- `apps/web/server/routers/reports.ts` → `getPnlOverview` (lines 360–361): same `expenses * 0.65` / `expenses * 0.35` fabrication, rendered into the P&L report card and bar chart.

**Impact:** A company with zero inventory still shows "COGS" at 65% of every expense and a fake "Gross Profit". The numbers are not approximations of anything in the ledger — they are invented and labeled as financial results. The CoA actually carries a `cost_of_goods_sold` subtype and `getReportNarrative` (line 585) already splits it correctly, proving the data exists.

**Fix:** Derive COGS from accounts whose `subtype === "cost_of_goods_sold"`; everything else under expense is operating expense. Wire both overviews through a shared canonical splitter.

### 🔴 A2 — Balance Sheet is NOT cumulative for a chosen month

**Location:** `apps/web/server/routers/reports.ts` → `getBalanceSheet` (line 877) and `getProfitAndLoss` (line 764): when `periodId` is provided they add `eq(journalEntries.periodId, input.periodId)` — returning only entries **posted in that single month**.

**Impact:** A balance sheet dated 2026-07 shows only July's activity, not balances as of July 31. Assets/liabilities/equity would exclude every prior month's effect — wildly wrong for any company older than the selected month. P&L is correctly a *period* statement (activity in the window) but BS is a *point-in-time* statement (cumulative through period end). The jobs-core `generateBalanceSheet(entityId, asOfDate)` (report-generation.ts) does it right — cumulative `date <= asOfDate`. The interactive router does not.

**Fix:** BS = all posted entries with `date <= period.endDate` (or entity currency date), classified by CoA; P&L = posted entries within the period window. Shared canonical module.

### 🔴 A3 — Net income never folded into equity ⇒ balance sheet can never balance

**Locations:** `reports.ts` getBalanceSheet; `packages/jobs/report-generation.ts` `generateBalanceSheet`; `packages/agents/platform/reporting-agent/tools.ts` `generateBalanceSheet`; `packages/agents/core/reporting-pipeline.ts` `buildBalanceSheet`.

**Impact:** No production flow posts closing entries (verified: month-end-close job only runs depreciation; demo seeds alone contain manual closing entries). Revenue/expense balances therefore live in open P&L accounts. Every BS builder buckets only `asset` / `liability` / `equity` account *types* — so the accumulated profit sits in neither assets-side total nor equity → `Assets − (Liabilities + Equity)` is never ≈ 0, and `isBalanced` reports false for every healthy company. The statements are mathematically unable to balance by construction.

**Fix:** Fold cumulative net income (revenue − cogs − expenses through the as-of date) into equity as a "Current Earnings / Retained Earnings (current period)" line so the fundamental equation holds. A balance sheet that can never balance is worse than no balance sheet.

### 🔴 A4 — `getReportNarrative` revenue is sign-flipped (debit − credit for a credit-normal account)

**Location:** `apps/web/server/routers/reports.ts` → `getReportNarrative` inner `load()` (line ~576): `if (acct.type === "revenue") revenue += amt;` where `amt = debit − credit`.

**Impact:** Revenue accounts are credit-normal (seed data: `credit: rev`, `debit: 0`). Summing `debit − credit` makes every revenue line **negative** — the AI narrative reports negative revenue and a nonsense net figure to the user. Everywhere else in the file revenue is `credit − debit` (correct), proving the sign is inverted here.

**Fix:** Shared sign-aware accumulation: revenue `credit − debit`, expense/COGS `debit − credit`, with abs only applied after netting per account.

### 🟡 A5 — `getAiInsights` / `getPnlOverview` use `Math.abs` per line before summing

**Location:** `getPnlOverview` (`const abs = Math.abs(amount); revenue += abs;`).

**Impact:** Abs-per-line inflates totals when a reversal or contra entry exists in the window (a credit memo would *add* revenue instead of netting it). Correct is per-account netting first, then abs on the net only if needed for display.

### 🟡 A6 — jobs-core BS ignores `isActive` and normal-balance sign for liability/equity display

**Location:** `packages/jobs/report-generation.ts` `generateBalanceSheet`.

**Impact:** Uses a single `SUM(debit) − SUM(credit)` as "balance" for all types, then sums asset/liability/equity buckets with no normal-balance flip — a liability with credit balance renders negative, so `balanced` is a coin flip. Same class of sign error as A4.

---

## Canonical Fix Architecture

All consumers share one pure derivation module (no DB imports) so every surface reports identical, correct numbers:

1. **`packages/agents/core/reporting-math.ts`** (or web server lib, exported for jobs/agents/web) exposing:
   - `classifyAccountBalance(rows)` → per-account `netAmount` using **normal balance sign** (asset/expense = debit−credit; liability/equity/revenue = credit−debit).
   - `buildPnl(rows, accounts)` → revenue, real COGS (subtype), operating expenses, gross profit, operating profit, net income.
   - `buildBalanceSheet(rows, accounts)` → asset/liability/equity with current earnings folded in and a meaningful `isBalanced`.
2. Router `getProfitAndLoss` / `getBalanceSheet` / `getOverview` / `getPnlOverview` / `getReportNarrative` all delegate.
3. Jobs core + reporting-agent tools delegate to the same builders.

## Files to Change (P9-A)

| File | Change |
|---|---|
| `apps/web/server/report-math.ts` (new) | Canonical pure builders |
| `apps/web/server/routers/reports.ts` | Delegate all 5 procedures; kill fabricated ratios |
| `packages/jobs/report-generation.ts` | BS via canonical builder (cumulative as-of, equity fold) |
| `packages/agents/platform/reporting-agent/tools.ts` | BS + P&L via canonical builder |
| `apps/web/__tests__/report-math.test.ts` (new) | Deterministic coverage |

## Fix Implementation (all applied, tests pending final pass)

| # | Fix | Files |
|---|---|---|
| A1 | COGS derived from real `cost_of_goods_sold` subtype; killed `0.65/0.35` fabrication in `getOverview` + `getPnlOverview` | `apps/web/server/routers/reports.ts` |
| A2 | BS/P&L routed through canonical date-window derivation — BS cumulative `date <= period end`, P&L within window | `reports.ts`, new canonical module |
| A3 | Equity folds current earnings in every BS surface (router, jobs core, agents tools, agents-core pipeline) | `reports.ts`, `packages/db/lib/report-math.ts`, `packages/jobs/report-generation.ts`, `packages/agents/platform/reporting-agent/tools.ts`, `packages/agents/core/reporting-pipeline.ts` |
| A4 | `getReportNarrative` revenue sign fixed (credit-normal) via canonical derivation | `reports.ts` |
| A5 | Per-account netting replaces per-line `Math.abs` in `getPnlOverview`, platform `generateProfitLoss`, jobs P&L | above |
| A6 | Jobs-core BS uses canonical normal-balance builder; UI totals now COGS + operating | `report-generation.ts`, `financial-pulse/page.tsx`, `qbr-report.tsx` |

**Canonical module:** `packages/db/lib/report-math.ts` (pure; exported via `@xenboox/db` and `@xenboox/db/lib`) with `aggregateReportRows` / `derivePnl` / `deriveBalanceSheet` / `isDebitNormal` / `signedByNormal`. Raw `debit−credit` convention preserves the ledger identity so `Assets − (Liabilities + Equity + CurrentEarnings) ≈ 0` holds exactly when books balance.

**Coverage:** `apps/web/__tests__/report-math.test.ts` — 14 deterministic tests (pure derivation + regression guards).

## Status

✅ **P9-A implemented.** Test suites (web canary, jobs, agents reporting) verified green before the no-run phase; full re-run scheduled in the final pass.
