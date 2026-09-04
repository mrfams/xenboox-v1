# P6-B — Approval Workflow — Audit & Fixes

## Findings

| #      | Severity     | Finding                                                                                                                                                                                   | Fix                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------ | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B1** | **Critical** | `approveExpense` was a **status flip to "paid"** — no journal entry, no payment record. The P&L never saw the expense and the books never showed cash leaving, yet the UI claimed "paid". | Approval now **recognizes and settles**: (1) `postApBillToLedger` (Dr expense / Cr AP), (2) records the full payment row, (3) `postApPaymentToLedger` (Dr AP / Cr cash-or-bank by method). Any failure **rolls everything back** — payment deleted, invoice restored to pending, the recognized JE **reversed and the link cleared** (`journalEntryId: null` so a re-approval posts fresh, never trusting a reversed entry). |
| **B2** | High         | Approval posts money but had **no role gate** — any permissioned user could approve.                                                                                                      | `requireRole("owner", "admin", "finance_director")`.                                                                                                                                                                                                                                                                                                                                                                         |
| **B3** | Medium       | Rejection produced only a generic audit action.                                                                                                                                           | Distinct `expense.rejected` action; rejection voids (terminal) without ever posting.                                                                                                                                                                                                                                                                                                                                         |

> ⚠️ **Needs review (per standing instruction):** approval defaults `paymentMethod` to `bank_transfer` when the caller doesn't supply one. If an approved expense was actually paid by cash/card, that changes which receipt account the settlement hits. The detail-panel UI will expose the method (P6-D); meanwhile the default is the common case.

## Files

- `apps/web/server/routers/expenses.ts`.

## Verification

- esbuild parse → clean.
- `vitest run` (expense/ap/ar suites) → **54 passed** (4 new P6-B assertions).
