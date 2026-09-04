# P5-C — Reconciliation GL Integrity — Audit & Fixes

## Findings

| #      | Severity | Finding                                                                                                                                                                                                              | Fix                                                                                                                                                                                                                                                                                                                                                          |
| ------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **C1** | High     | `finalizeReconciliation` recorded `bookBalance = account.currentBalance` — that's the **bank's** stored balance, so the persisted "book balance" and "difference" were **bank-vs-bank**, not book-vs-statement.      | New `computeBookBalance()`: when the account is linked to a COA row (`glAccountId`), book = GL-side net of that account — `sum(debit) − sum(credit)` over **posted** journal lines **up to the statement date**, entity-scoped. Fallback (no GL link): net of the account's **reconciled** transactions. `difference = book − statement`, recorded honestly. |
| **C2** | Medium   | `getReconciliationCenter`'s headline gauge compared the **sum of ALL period transactions** against the bank's **current** balance — apples-to-oranges (a period net is not a balance, and current ≠ statement-date). | Book balance now = **last closed statement balance (opening) + reconciled activity this period** — the correct opening + activity construction. Difference gauge is now meaningful.                                                                                                                                                                          |

## Files

- `apps/web/server/routers/reconciliation.ts` — `computeBookBalance` helper, finalize wiring (`glAccountId` in the account fetch), center summary formula.

## Verification

- esbuild parse → clean.
- `vitest run __tests__/reconciliation-record-layer.test.ts` → **16 passed** (4 new P5-C assertions: finalize uses computeBookBalance, helper is entity-scoped + posted + date-bounded, center uses opening + reconciled net).
