# P6-C — Expense GL Posting — Audit & Fixes

## Findings

| #      | Severity     | Finding                                                                                                                                                                                   | Fix                                                                                                                                                                                                                                                                                                                                                       |
| ------ | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **C1** | **Critical** | `reimburseClaim` paid the employee but **never posted** — the reimbursement (Dr expense / Cr bank) never reached the ledger, so every claim cost was invisible to the P&L.                | Reimbursement now posts FIRST via the shared `createPostedJournal` (TrustGuard-validated, idempotent by reference `exp-claim-{id}`): Dr expense accounts (one per line, category-resolved) / Cr cash-or-bank (by method, canonical account auto-created). Post failure leaves the claim approved with a clear closed-period error — nothing half-records. |
| **C2** | High         | No foot-check — line amounts were never verified against the claim total.                                                                                                                 | Lines must foot exactly to `claim.totalAmount` (cents) or the reimbursement is refused.                                                                                                                                                                                                                                                                   |
| **C3** | Medium       | Line resolution reused the expense keyword matcher but the receipt resolver needed asset accounts — the initial fetch was expense-only, so receipt resolution always fell to auto-create. | Full COA fetched once; lines resolve against the expense subset, receipt against the whole chart.                                                                                                                                                                                                                                                         |

## Files

- `apps/web/server/routers/expenses.ts`.

## Verification

- esbuild parse → clean.
- `vitest run` (expense/ap/ar) → **58 passed** (4 new P6-C assertions).
