# Pipeline 2: Bank Connection → Transaction Import → Categorization

## Sub-Part H — Background Jobs & Scheduling — Deep Audit

**Scope:** the scheduled + triggered job graph that keeps bank data moving —
Vercel cron → `bank-feed-auto-sync` scheduler → per-provider sync tasks,
statement-upload → `process-document` → `import-bank-statement`, on-demand UI
sync, and every dispatch's retry/dedup/DLQ semantics.

---

### 🔴 CRITICAL (2)

| #      | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Location                                                                                                                                                                                          | Impact                                                                                      |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **H1** | **Bank statements are double-booked: `process-document` triggers BOTH `import-bank-statement` AND `run-document-ingestion`.** The ingestion pipeline's `classifyWorkflow` maps `bank_statement` docs to `deposit`/`withdrawal`/`bank_transfer`/`loan_disbursement`/`equity_injection` workflows and auto-posts JEs (≥95% confidence). The same money is also imported to `bank_transactions` (P2-D posts it to the GL). One source document feeds the ledger **twice via two independent pipelines** — duplicate revenue/expense on the books. | `packages/jobs/document-processing.ts` (always triggers `run-document-ingestion`), `packages/ingestion/index.ts` `classifyWorkflow`, `engine/accounting-treatment.ts` (bank_statement treatments) | Duplicated financials; TrustGuard can't catch it because each path is internally consistent |
| **H2** | **On-demand "Sync" dispatches every connection to the Mono task.** `integrations.syncBankTransactions` hard-codes `mono-sync-transactions` regardless of `connection.provider` — a Plaid connection gets its Plaid access token sent to the Mono API. Sync always fails for Plaid; with P2-G notifications this now also alarms users. Additionally the router rejects `status: "error"`, which **blocks the in-place retry button added in P2-G (M1)** — a UX dead-end.                                                                       | `apps/web/server/routers/integrations.ts` (`syncBankTransactions`)                                                                                                                                | Plaid users can never sync on demand; retry button broken                                   |

### 🟠 HIGH (1)

| #      | Finding                                                                                                                                                                                                                                                                                                                                                   | Location                                                        | Impact                                                           |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------- |
| **H3** | **Scheduler swallows dispatch failures and reports success.** Per-connection `tasks.trigger` failures are caught, counted, and logged — then the run returns `success: true`. No task retry, no DLQ, no notification; the audit row records only counts, not which connections failed. A Trigger.dev outage means a silent partial sync that looks green. | `packages/jobs/bank-feed-auto-sync.ts` (dispatch loop + return) | Silent partial syncs; failures invisible to ops and entity users |

### 🟡 MEDIUM (1)

| #      | Finding                                                                                                                                                                                                                                                                                   | Location                                               | Impact                   |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------ |
| **M1** | **Scheduler dispatches sequentially.** One `await` per connection in a single loop. Each trigger is a network round-trip; with hundreds of active connections the loop can exceed the task's 600s `maxDuration`, and every connection after the cutoff silently misses that 6-hour cycle. | `packages/jobs/bank-feed-auto-sync.ts` (dispatch loop) | Sync starvation at scale |

---

### Verified-clean notes (checked, no change needed)

- Vercel `vercel.json` crons → `/api/cron/*` routes all exist (bank-feed-sync every 6h, auth via `x-cron-secret`).
- Cron route idempotency key `cron:bank-feed-sync:${triggeredAt}`; per-connection task triggers use tenant-scoped `concurrencyKey` + `idempotencyKey` — a scheduler re-run after retry dedupes already-triggered syncs.
- `process-document` → `import-bank-statement` dispatch carries `concurrencyKey: entityId` + `idempotencyKey: import-bank-statement:${documentId}` — no double import on re-run.
- Provider sync tasks: bounded retries (2), per-tenant concurrency, DLQ on retry exhaustion (sub-parts B/C/E audited); bank-import fail-fast guard prevents wasted re-parses (sub-part E).
