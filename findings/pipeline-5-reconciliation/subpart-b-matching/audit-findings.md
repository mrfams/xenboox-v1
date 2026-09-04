# P5-B — Matching Engine — Audit & Fixes

## Findings

| #      | Severity | Finding                                                                                                                                                                                                                                                | Fix                                                                                                                                                                                                                                                  |
| ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B1** | High     | `autoReconcile`/`findCandidateMatches` could link the **same journal entry to multiple bank transactions** (candidates included already-linked JEs) — double-linking corrupts the one-entry↔one-transaction invariant and inflates reconciled totals. | `findCandidateMatches` now excludes any JE already linked to a bank transaction (`NOT IN (SELECT journal_entry_id FROM bank_transactions WHERE ...)`), so all three callers (center suggestions, autoReconcile, single-match) inherit the guarantee. |
| **B2** | Medium   | Amount tolerance was a **flat $5** — a $10 transaction could match a $15 entry (50% off).                                                                                                                                                              | Proportional tolerance: `max(0.50, 2% of amount)`.                                                                                                                                                                                                   |
| **B3** | Medium   | Auto-links from `autoReconcile` wrote **no audit trail** (only manual match/unreconcile did).                                                                                                                                                          | Batch `auditLog` insert per link with `journalEntryId`, `confidence`, `reason` (actor = requesting user).                                                                                                                                            |

Verified clean: `getAiMatches` already exact-amount + ≤7-day date proximity, batch JE-line totals (no N+1), one match per bank transaction, entity-scoped; confidence gate 75 for auto-persist.

## Files

- `apps/web/server/routers/reconciliation.ts` — candidate exclusion, tolerance, auto-link audit.

## Verification

- esbuild parse → clean.
- `vitest run __tests__/reconciliation-record-layer.test.ts __tests__/banking-ui-integrity.test.ts` → **23 passed** (3 new P5-B assertions).
