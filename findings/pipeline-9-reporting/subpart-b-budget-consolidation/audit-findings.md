# Pipeline 9 (Reporting) — Sub-Part B: Budget vs Actual + Consolidation — Deep Audit

**Campaign:** Deep-audit-to-production-grade · **Date:** 2026-09-05
**Scope:** budget-vs-actual correctness (real ledger actuals), entity/period scoping, and the multi-entity consolidation pipeline.

---

## Findings & Fixes

### 🔴 B1 — `generateBudgetVsActual` surfaced unbudgeted spend as "Unknown / ???" and polluted totals with balance-sheet noise — FIXED

**Location:** `packages/agents/platform/reporting-agent/tools.ts`

The unbudgeted-accounts loop looked names/codes up in a map that only contained **budget-line accounts**, so any account with activity but no budget line rendered as `accountName: "Unknown"`, `accountCode: "???"`. Worse, it flagged **every** active account — including pure balance-sheet movements (cash, AR) — as unbudgeted "spend", corrupting the variance totals for every period.

**Fix:**
- Fetch CoA rows for budget-line **and** actual-bearing account ids (union) so names/codes resolve.
- Only revenue/expense accounts can be flagged `no_budget` — budget-vs-actual is an income-statement comparison; BS movements are excluded.

### 🟡 B2 — `checkBudgetImpact` and budget-pipeline actuals used `${period}-31` as month end — FIXED

**Location:** `packages/agents/core/budget-pipeline.ts` (2 query sites), `checkBudgetImpact` in the same file.

`periodEnd = ${period}-31` is wrong for Feb/Apr/Jun/Sep/Nov. It worked by lexical luck (any real date ≤ "31" string-compares before next month), but is fragile and misleading.

**Fix:** real last-day via `new Date(year, month, 0).getDate()` at all three sites.

### 🟡 B3 — variance-narrative update lacked entity scope — FIXED

**Location:** `packages/agents/core/budget-pipeline.ts` step 6.

The narrative `update(varianceRecords)` keyed only on `(budgetLineId, period)` — no `entityId`. Added the entity condition.

### 🔴 B4 — Consolidation pipeline FABRICATED every subsidiary number — FIXED (real ledger derivation)

**Location:** `packages/agents/core/consolidation-pipeline.ts` (steps 4–6) and its shared helpers.

The pipeline invented financials instead of reading the ledger:
- **Step 4 (translation):** `plAmount = bsTotal * 0.3` — "Approximate P&L as 30% of balance sheet". bsTotal came from trial-balance snapshots filtered only by `generatedAt >= Jan 1` (no period end, no account-type handling).
- **Step 5 (minority interest):** `subNetIncome = 500000 * pct`, `subEquity = 2000000 * pct` — fixed constants, no ledger.
- **Step 6 (assembly):** parent revenue/expenses "guessed" from the **sign of snapshot balances**; subsidiary revenue = `translatedPl * 0.6`, expenses = `translatedPl * 0.4`; and worst of all `totalAssets = revenue + subRevenue`, `totalLiabilities = expenses` — the consolidated balance sheet was meaningless.

**Fix:** added `loadEntityFinancials(entityId, period)` — resolves the entity's fiscal period, then derives real P&L (posted entries within the period window) and a real cumulative balance sheet (all posted entries ≤ period end) through the canonical `report-math` builders. Steps 4–6 rewired:
- Translation: real net income + assets translated at the stored FX rate (1:1 when same currency). Missing-rate subsidiaries are **excluded with a warning**, never silently translated at 1.0.
- Minority interest: real net income and equity-with-earnings × minority %.
- Assembly: parent + translated-subs P&L and BS sums, eliminations applied to both sides, minority interest shown on equity.

**Test impact:** the consolidation test's shared fixture pointed at `trialBalanceSnapshots`, which the real pipeline no longer queries. Fixture rework (fiscalPeriods + CoA + journal entries/lines per entity) is queued for the final test pass, where failures are observable.

---

## Files Changed (P9-B)

| File | Change |
|---|---|
| `packages/agents/platform/reporting-agent/tools.ts` | Budget-vs-actual account resolution + P&L-only unbudgeted flags |
| `packages/agents/core/budget-pipeline.ts` | Real month ends (×3), entity scope on narrative update |
| `packages/agents/core/consolidation-pipeline.ts` | Real ledger financials; steps 4–6 de-fabricated |

## Status

✅ **P9-B fixes written.** Test verification queued for the final pass.
