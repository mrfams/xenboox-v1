# Sub-Part D — Propagation & GL Posting — Fix Verification

**Status:** ✅ Complete — all findings fixed, tested, committed & pushed.

---

## Fixes Executed

### 🔴 CRITICAL — C1: Categorized bank transactions never reached the GL

**The fix: `banking.postToLedger` + shared `bank-ledger` module.** Previously nothing in the repo created a journal entry from a bank transaction — P&L, trial balance, and reports read only posted JEs, so imported money never touched the financial statements.

| Piece                                        | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/db/lib/bank-ledger.ts` (new, pure) | `buildBankJournalLines` — balanced double-entry (deposit/interest → Dr Bank / Cr Category; withdrawal/fee/transfer → Cr Bank / Dr Category). `resolveBankGlAccount` — finds the entity's `asset/bank_account` COA row by name, falls back to any bank account row, else returns a deterministic `toCreate` (stable code via `deriveBankCode`). `resolveCategoryGlAccount` — rule `glAccountId` wins, else exact/substring/longest-token name match on income/expense accounts only (never assets); returns null rather than inventing an account. |
| `banking.postToLedger` mutation              | Entity-scoped fetch → skip guards (already-posted / uncategorized / no bank GL / no category GL / no fiscal period / closed period) → TrustGuard `validateJournalEntry` → insert JE + lines inside a transaction with `reference = bank-tx-{id}` (idempotent even racing) + computed `entryNumber` → link `bankTransactions.journalEntryId` → audit trail.                                                                                                                                                                                        |
| UI                                           | "Post to Ledger" button in banking-view batch bar (only for categorized, unposted selections); surfaces skip reasons via toast.                                                                                                                                                                                                                                                                                                                                                                                                                   |

### 🟠 HIGH

| #   | Fix                                                                                                                                                                                                                                            |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1  | `bankAccounts.glAccountId` now gets assigned — `postToLedger` resolves (and creates, deterministically) the asset COA row and persists the link. Single source of truth instead of duplicating resolution across the 7 account-creation sites. |
| H2  | Deterministic propagation path now exists and is unit-tested (13 tests).                                                                                                                                                                       |
| H3  | The bank pipeline now has a real posting path. (Full Ledger-Agent integration is out of scope for P2 — the deterministic TrustGuard-validated path is the correct primitive for bank feeds.)                                                   |

### 🟡 MEDIUM

| #   | Fix                                                                                                                                                                                                                                                                                             |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | Category → GL resolution handles rule-linked accounts and heuristic categories via COA name matching; unresolvable categories are skipped with an explicit reason (`no_category_gl_account`), never guessed.                                                                                    |
| M2  | **`finalizeReconciliation` no longer fakes it** — previously wrote `bookBalance = statementBalance`, `difference: "0"`, `status: "closed"` unconditionally. Now it verifies zero unreconciled transactions (throws otherwise), records the honest book-vs-statement difference, and audit-logs. |
| M3  | Idempotency: `postToLedger` skips rows with `journalEntryId` set + unique `reference` on the JE + explicit conflict handling inside the transaction.                                                                                                                                            |

---

## Verification

| Check                                                                         | Result                                                                                                                                                                  |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bank-ledger.test.ts`                                                         | ✅ 13/13 — balanced lines all directions, bank resolver fallbacks + deterministic creation, category resolver (rule-wins / exact / substring / token / asset-exclusion) |
| db full suite                                                                 | ✅ 34 tests                                                                                                                                                             |
| jobs full suite                                                               | ✅ 10 tests                                                                                                                                                             |
| web banking suites                                                            | ✅ 31 tests                                                                                                                                                             |
| web tsc — `banking.ts`, `reconciliation.ts`, `banking-view.tsx` changed lines | ✅ clean (only pre-existing banking-view errors from Sub-Part F remain)                                                                                                 |
| db tsc — changed libs                                                         | ✅ clean                                                                                                                                                                |

> **Pre-existing (not regressions):** `create-transaction-router.test.ts` fails on the agents `@/server/lib/tax-install` import issue (fails identically at HEAD). banking-view's 6 pre-existing type errors remain for the Sub-Part F UI audit.
