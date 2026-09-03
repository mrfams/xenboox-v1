# Pipeline 2: Bank Connection → Transaction Import → Categorization

## Sub-Part B — Transaction Sync & Import — Deep Audit

**Scope:** plaid-sync job, mono-sync job, the unified manual-sync dispatch (built in A), cursor handling, amount/type conventions, dedup efficiency, sign correctness.

---

### 🔴 CRITICAL (3)

| #      | Finding                                                                    | Location                                                                                            | Impact                                                                                                                                                                                                                                                                                                                                                                               |
| ------ | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **C1** | **Plaid direction mapping is INVERTED**                                    | `plaid-sync.ts:174-175` + `paginatePlaidSync` (both added/modified)                                 | Plaid docs: **positive `amount` = cash debited (money OUT/purchase); negative = money IN/credit**. Code does `tx.amount >= 0 ? "deposit" : "withdrawal"` — every withdrawal stored as deposit and every deposit as withdrawal. **All cash flow direction is wrong at the source.**                                                                                                   |
| **C2** | **Canonical amount convention is violated by the transactions UI + stats** | `transactions.ts` (`amount > 0` → "+"), `banking.ts getAccountDetails` SQL (`CASE WHEN amount > 0`) | Schema convention (seeds, demo, sync, statement import, treasury all agree): **amount = positive magnitude, `type` carries direction**. But the ledger UI formats `+`/`-` from the amount _sign_ (always positive → every row shows "+"), and `getAccountDetails` counts deposits/withdrawals by amount sign (all deposits, zero withdrawals). Readers must derive sign from `type`. |
| **C3** | **`getCashPosition` running balance double-counts direction**              | `banking.ts getCashPosition`                                                                        | Stored amounts are positive magnitudes; `runningBalance += amount` for _every_ transaction means withdrawals ADD to the balance instead of subtracting. Cash position is fiction. Also starts at 0 (ignores opening balance).                                                                                                                                                        |

### 🟠 HIGH (4)

| #   | Finding                                                                  | Location               | Impact                                                                                                                                                                                                                                                                                                       |
| --- | ------------------------------------------------------------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| H1  | **`paginatePlaidSync` re-queries ALL entity transactions on every page** | `plaid-sync.ts:425`    | O(pages × all tx). A 24-month first sync (many pages × 10k+ rows) becomes quadratic. Should query only the page's Plaid IDs (batch `IN`).                                                                                                                                                                    |
| H2  | **Mono dedup loop re-queries ALL entity transactions per chunk**         | `mono-sync.ts:156-170` | The `CHUNK` loop runs `findMany` of the _entire_ entity transaction set inside every chunk — the chunk is never applied to the query. N-chunks × full table. Same quadratic blowup + the dedup is wrong (matches rows from later chunks against full history each time, but misses nothing — just wasteful). |
| H3  | **Mono amounts divided by 100 unconditionally**                          | `mono-sync.ts:189`     | Assumes all Mono accounts are kobo-based (NGN). USD/other-currency Mono accounts return whole units — dividing by 100 destroys the value. Must use the account currency / Mono's returned unit convention.                                                                                                   |
| H4  | **Mono sync never stores its cursor/update-id; full re-fetch each run**  | `mono-sync.ts`         | Mono paginates via `page` param and reports `last_update_id`/`page` semantics; the job fetches one page and never advances. Large accounts silently get a truncated import.                                                                                                                                  |

### 🟡 MEDIUM (3) + 🟢 LOW (2)

| #   | Finding                                                                                                                                                                 |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | Sync jobs don't scope the bank-account lookup/creation to the connection (match by `accountNumber` only — the same accountNumber can exist across entities).            |
| M2  | `modified` updates in plaid-sync only update description/amount/type, silently dropping `plaidCategory`/`merchantName` refresh (job) vs router previously kept them.    |
| M3  | No audit of _who_ triggered sync (manual vs cron vs webhook) — all write the same audit action.                                                                         |
| L1  | Mono pagination loop missing entirely (`monoData.data` only, no `page` handling).                                                                                       |
| L2  | `balance` column: Plaid job stores `undefined`, Mono stores signed running balance — inconsistent; running balance should be derived, not trusted from either provider. |

### ✅ What's Solid

- Cursor-based incremental Plaid sync (job) with `next_cursor` persisted
- Modified + removed handling (Plaid) with soft-delete flag
- Batch dedup within a page (single query) in the plaid job main run
- 500-tx page size + `has_more` pagination loop (recursive)
- Retry/DLQ on all three jobs

---

## Canonical Convention (chosen)

**`bank_transactions.amount` = POSITIVE magnitude. `type` ∈ deposit/withdrawal/transfer/fee/interest carries direction.** This matches every existing writer (seeds, demo, statement import, treasury manual, sync jobs after C1 fix) and the schema. Readers must derive sign: deposit/interest → +, withdrawal/transfer/fee → −.

| Writer fix                | Mapping                                                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| plaid-sync added/modified | Plaid amount ≥ 0 (money out) → type `withdrawal`, store abs; < 0 (money in) → `deposit`, store abs. Wait — verify per docs. |
| mono-sync                 | Mono `type: credit` → deposit; `debit` → withdrawal; amount units per currency.                                             |

---

## Proposed Fix Plan — Sub-Part B

| #     | Fix                                                                                                                                                                                           |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1    | Flip Plaid type mapping in `plaid-sync.ts` (added + modified) and `paginatePlaidSync`; add unit tests asserting direction from a Plaid-shaped payload                                         |
| C2    | Introduce a shared `signedBankAmount(tx)` helper used by `transactions.ts` list/detail, `getAccountDetails` stats, and overview cards — sign derived from `type`, never from stored magnitude |
| C3    | `getCashPosition`: subtract withdrawals/transfers/fees, add deposits/interest; start running balance from the account's opening/current balance before the period                             |
| H1    | `paginatePlaidSync`: query existing IDs with a single `IN` on the page's Plaid IDs (id+metadata only) instead of all entity tx                                                                |
| H2    | Mono dedup: single query with `IN` on the fetched monoIds (chunked SQL), not full-table scans per chunk                                                                                       |
| H3    | Mono amount: divide by 100 only when the account currency implies minor units (NGN etc.)                                                                                                      |
| H4    | Mono pagination: follow `page`/`meta` cursor until exhausted; store last page in metadata                                                                                                     |
| M1    | Scope bank-account find/create to (entityId + connection's account identity)                                                                                                                  |
| M2    | Preserve full Plaid category/merchant metadata on modified updates                                                                                                                            |
| M3    | Include trigger source (`manual`/`cron`/`webhook`/`initial`) in the sync audit + lastSynced metadata                                                                                          |
| L1/L2 | Fix mono pagination + balance handling notes                                                                                                                                                  |

**Headline:** every synced transaction currently has its deposit/withdrawal direction **inverted at the source** (Plaid), and even when fixed, the ledger UI and cash-position stats misread the amount convention — so cash flow, running balances, and deposit/withdrawal splits are all wrong today.
