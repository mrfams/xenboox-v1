# P6-A — Expense Record Layer — Audit & Fixes

## Findings

| #      | Severity | Finding                                                                                                                                                                                                                           | Fix                                                                                                                                                                                                                                        |
| ------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **A1** | Critical | `createExpense` inserted an AP header with **no line items** — `invoiceApLines.accountId` is NOT NULL and `postApBillToLedger` requires lines, so every expense was **structurally unpostable** and invisible to the P&L forever. | The expense now creates its line item with the header (sequential + compensation — header deleted if the line fails).                                                                                                                      |
| **A2** | High     | **No entity-scope check on `supplierId`** — a cross-tenant supplier uuid silently recorded a payable to another tenant.                                                                                                           | Supplier must exist and belong to the entity (NOT_FOUND otherwise).                                                                                                                                                                        |
| **A3** | High     | Category was free text stored **nowhere** (only in the audit log) — no account linkage, so the line had nothing to book against.                                                                                                  | New `resolveExpenseAccountId()`: category/description keyword + subtype match against the entity's expense accounts → first expense account → **refuses to guess** with a clear "add an expense account" error (never silently mis-books). |
| **A4** | Medium   | Amount regex accepted `"0"`/`"0.00"` (zero-amount expenses); dates were bare strings with no ordering check.                                                                                                                      | `positiveMoneyString` + `isoDateString` (shared P3 validators) + `dueDate >= expenseDate` superRefine.                                                                                                                                     |
| **A5** | Medium   | (from P5-E follow-up) The ISO/money regexes shipped in P5-E were **double-escaped** (`/^\\d…/` matched literal backslashes — validation never fired).                                                                             | Corrected to single-escape in `reconciliation.ts`.                                                                                                                                                                                         |

## Files

- `apps/web/server/routers/expenses.ts` — record-layer hardening + line creation + account resolution.
- `apps/web/server/routers/reconciliation.ts` — P5-E regex correction.

## Verification

- esbuild parse → clean.
- New `apps/web/__tests__/expense-record-layer.test.ts` → **5 passed**; all five fast suites → **83 passed**. (After P6-A, approval → posting is possible — P6-C wires it.)
