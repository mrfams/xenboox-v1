# Sub-Part B — Transaction Sync & Import — Fix Verification

**Status:** ✅ Complete — all findings fixed, tested, committed & pushed.

---

## Fixes Executed

### 🔴 CRITICAL

| #         | Fix                                                                                                                                                                                                                                                                                                                                      | Files                                                                             |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **C1**    | **Plaid direction mapping inverted** → extracted tested mapping to `plaid-mapping.ts` (`plaidType`: amount ≥ 0 → `withdrawal`, < 0 → `deposit`; `plaidMagnitude`: `Math.abs`). Verified against Plaid docs sample ("Apple Store" purchase `amount: 2307.21` = positive = money OUT). Wired into both insert paths (main run + paginate). | `packages/jobs/lib/plaid-mapping.ts` (new), `packages/jobs/plaid-sync.ts`         |
| **C2**    | **UI/stats derived direction from amount sign** (always positive → every row "+") → `transactions.ts` list + detail now derive sign from `type` via shared helper `bank-amount.ts` (`signedAmount(type, amount)`).                                                                                                                       | `packages/db/lib/bank-amount.ts` (new), `apps/web/server/routers/transactions.ts` |
| **C3**    | **`getCashPosition` double-counted direction** (`runningBalance += amount` for withdrawals) + ignored opening balance → rewritten: anchor = current account balance, sign-aware backward-walk to day-before-range, then forward-walk with `deposit/interest → +`, `withdrawal/transfer/fee → −`.                                         | `apps/web/server/routers/banking.ts`                                              |
| **C-new** | **`daily-close-pipeline.ts` committed TRUNCATED** (file ended mid-signature — TS1005 blocked all agents typecheck). Reconstructed `runAgentStep` per orchestrator's graph-invoke + langfuse-span pattern; fixed 13 strict-null errors the truncation had masked.                                                                         | `packages/agents/core/daily-close-pipeline.ts`                                    |

### 🟠 HIGH

| #   | Fix                                                                                                                                                                                                |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1  | `paginatePlaidSync` re-queried ALL entity tx per page → now batch `IN` query on page's Plaid IDs only (shared `fetchTxByPlaidIds`, chunked, entity-scoped). Both main-run dedup + paginate use it. |
| H2  | Mono dedup chunk bug (query ignored chunk, full-table scan per chunk) → real chunked `IN` query.                                                                                                   |
| H3  | Mono amounts divided by 100 unconditionally → currency-aware: NGN/GHS (kobo/pesewa) ÷100; all others kept whole.                                                                                   |
| H4  | Mono pagination truncated (page 1 only) → full `meta.next` paginated loop.                                                                                                                         |

### 🟡 MEDIUM

| #   | Fix                                                                                                                                                                                                               |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | Sync jobs matched bank account by `accountNumber` only (cross-entity risk) → resolution scoped to the connection's accounts (find by `id`/`plaidAccountId` in connection's account set, create under connection). |
| M2  | `modified` updates dropped `plaidCategory` refresh → now preserves + refreshes category, merchant name, pending on both main-run and paginate paths.                                                              |
| M3  | (Deferred to Sub-Part G — notifications/audit layer.)                                                                                                                                                             |

### 🟢 LOW

| #   | Fix                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------ |
| L1  | Mono pagination loop (folded into H4).                                                                       |
| L2  | `balance` never trusted from providers — derived on read by `getCashPosition` anchor logic (folded into C3). |

---

## Verification

| Check                                                                            | Result                                                           |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `bank-amount.test.ts` (db)                                                       | ✅ 7/7 — sign derivation, magnitude, unknown-type guard          |
| `plaid-mapping.test.ts` (jobs)                                                   | ✅ 5/5 — type per Plaid sign semantics, magnitude abs, roundtrip |
| jobs full suite                                                                  | ✅ 3 files / 10 tests                                            |
| web banking suites (bank-auto-matching, bank-feed-import, bank-token-encryption) | ✅ 31/31                                                         |
| web tsc — changed files (`transactions.ts`, `banking.ts`)                        | ✅ clean                                                         |
| jobs tsc — changed files (`plaid-sync.ts`, `mono-sync.ts`, `plaid-mapping.ts`)   | ✅ clean                                                         |
| agents tsc — `daily-close-pipeline.ts`                                           | ✅ clean (was: TS1005 + 13 strict-null)                          |

> **Note on pre-existing web failures:** 58 tests across 35 files fail at HEAD too (agents `tool-registry.ts` imports `@/server/lib/tax-install` — a web alias unresolvable from the agents package; also a11y/rbac assertion gaps). Verified identical at clean HEAD via stash — **not regressions from this sub-part**. Tracked for the repo-wide fix pass.

---

## Convention Locked

**`bank_transactions.amount` = POSITIVE magnitude; `type` ∈ {deposit, withdrawal, transfer, fee, interest} carries direction.**
All writers (seeds, demo, statement import, plaid, mono, manual) now conform. All readers derive sign from `type` via `packages/db/lib/bank-amount.ts`.
