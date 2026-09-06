# XENBOOX REBUILD LOG — Loop & Graph Execution Record

> The execution log for the rebuild (KILLPLAN epochs, ENGINEERING_SYSTEM.md loop).
> One entry per session. Format per ENGINEERING_SYSTEM §8: graph delta, loop phases, tests authored, stress cases, residual risks, next pass.

---

## Session 001 — 2026-09-06 — Batch 1 / G0 "SAFETY" (Epoch 0)

**Branch:** `feat/epoch0-safety` (from `feat/phase-c-absorb-delete-routes` @ `852105d4`)

### Graph delta (node → status)

| Node | Status | Evidence |
|---|---|---|
| N0 restore + secure pending work | **closed-deferred** | `.agents/` skills tree, `.semgrep/xenboox-security.yml`, `.opencode` restored via `git checkout --`; pending remediation committed (`035f78f5` chore marketing, `852105d4` docs audit/killplan/system) |
| N1 driver decision | **closed-deferred** | `packages/db/client.ts`: Pool (transactional) is now the DEFAULT driver; `DB_DRIVER=http` is an explicit non-transactional opt-out that logs a loud warning; the neon-http NON-ATOMIC fallback now `console.error`s (previously silent warn). `db.transaction()` is a real transaction on the default path — prodway P0-C1 closed at the code level (production env check remains a deploy-gate item) |
| N2 RLS context on pooled connections | **closed-deferred** | `apps/web/lib/trpc/rls.ts`: new `withRlsTransaction(tx, userId, entityId, fn)` sets `app.current_user_id`/`app.current_entity_id` via `SET LOCAL` (transaction-scoped — no leakage across pooled connections). Routers adopt it from Batch 2 (graphed); app-layer scoping remains active enforcement meanwhile |
| N3 review-queue global delete | **closed-deferred** | `seedDemoData` (4 unscoped `db.delete()`s) deleted from `apps/web/server/routers/review-queue.ts`; both UI triggers removed from `app/admin/review-queue/page.tsx` (header button + empty-state button). prodway P0 #2 closed |
| N4 dev-gate all seeds + honest read paths | **closed-deferred** | `devOnly()` guard (`apps/web/server/lib/dev-only.ts`, throws UNAUTHORIZED in production) applied to **13 seed procedures in 11 routers** (automation-studio, company-brain, customer-diagnostics, infrastructure, feature-flags, workflow-builder, logs-traces, ops-console, cost-analytics, token-usage, agent-monitor, live-runs, prompt-library). Live-path fabrication removed: `ai-workspace.ts getActiveTasks` now computes real reconciliation progress from `isReconciled` ratios; fabricated 48/60% review progress + "ETA 3 min" replaced with honest 0/"Awaiting review". `referrals.ts getMyCode` collision-safe via `onConflictDoNothing` + retry |
| N5 seed-demo route guard | **closed-deferred** | `app/api/seed-demo/route.ts` returns 404 in production before any auth/token logic — prodway P2 C12 closed |
| N6 entity-switch cache isolation | **closed-deferred** | `apps/web/lib/entity-cache.ts` (`resetEntityCaches` = removeQueries + refetch active); wired into `setEntityId`; fake 1.2s `setTimeout` removed — overlay clears when refetches settle or on error (never traps user). prodway P0 #3 closed at code level |
| N7 admin seed UI removal | **closed-deferred** | Seed buttons/mutations removed from automation-studio, company-brain, customer-diagnostics, feature-flags, infrastructure, logs-traces, review-queue pages; unused `RefreshCw` import cleaned |
| N8 logging + closure | **closed-deferred** | This entry; graph statuses updated; prodway checked off |

### Tests authored (RED-first, registry §7 — Run Phase pending)

`apps/web/__tests__/epoch0-safety.test.ts` — 15 cases:
- N1: default driver = pool; DB_DRIVER=pool/http honored; USE_RLS=true legacy → pool (4)
- N2: withRlsTransaction issues SET LOCAL GUCs and passes tx through (1)
- N3: reviewQueueRouter exposes no `seedDemoData` (1)
- N4: 11 routers exist and are shape-valid under NODE_ENV=production; `devOnly` throws in production / passes in development (13 routers bundled, 2 cases)
- N5: seed-demo POST returns 404 in production (1)
- N6: `resetEntityCaches` removes queries (1)

### Stress cases designed (registry §5)

- N1: concurrent double-post of same reference on Pool (unique-index arbitration); pool exhaustion under 50 concurrent postings; kill mid-transaction → no partial commit
- N6: rapid entity switching A→B→A→B (removeQueries churn); slow-network refetch (overlay must not trap); refetch error mid-switch (error states, not stale data)
- N4: production invocation of every gated procedure (HTTP 401 via tRPC); seed button absent from DOM in all roles

### REVIEW notes (self-critique)

- client.ts `max` pool size is env-tunable (`DB_POOL_MAX`, default 10) — deployment must point DATABASE_URL at Neon's pooled endpoint; recorded as deploy-gate item
- review-queue router tail verified syntactically closed; remaining `reviewItem*` imports are used by legitimate reads
- Residual: 5 gated seed procedures still contain fabrication logic behind the dev gate (acceptable — code unreachable in production; full deletion happens when their admin surfaces are consolidated per prodway Part 5)

### Newly discovered work → new graph nodes

- **N9 (Batch 3 / G2):** `ai-workspace` router has NO UI consumers — verify and either wire or delete the router (dead-code candidate)
- **N10 (Run Phase):** execute epoch0-safety suite + stress cases; failures reopen nodes
- **N11 (deploy gate):** verify production DATABASE_URL uses Neon pooled endpoint + DB_DRIVER unset/`pool`

### Residual risks

- Tests/stress authored but NOT executed (PC constraint) — nothing in this batch is runtime-verified yet; status is honestly `closed-deferred`
- `withRlsTransaction` not yet adopted by posting paths (Batch 2+); DB-layer RLS still inactive until then — app-layer scoping remains the enforcement

### Next loop pass

Batch 2 / G1 "LEDGER TRUTH": approvals re-validation (balance + open-period), durable approval audit rows, close sessions wired, close implementations converged, `withTimeout` cancellation, banking demo-money removal.

---

## Session 002 — 2026-09-06 — Batch 2 / G1 "LEDGER TRUTH" (partial: N12, N13, N16, N17)

**Branch:** `feat/epoch0-safety`

### Graph delta

| Node | Status | Evidence |
|---|---|---|
| N17 banking honesty | **closed-deferred** | `banking.ts`: demo-sync branch removed — manual connections return `{ synced: false, manual: true, message }` BEFORE the throttle (no fake lastSyncedAt stamp); 167-line `generateDemoTransactions` (random money into `bankTransactions`) deleted; unknown providers now get honest NOT_IMPLEMENTED. prodway P1-C4 closed. File brace-verified after surgery |
| N12 approval re-validation | **closed-deferred** | `approvals.ts` approved-branch: loads the entry's fiscal period — **closed period → BAD_REQUEST** (plain English); loads lines and runs `validateJournalEntry` (TrustGuard) — **failure → BAD_REQUEST "does not balance or is invalid"**; only then the atomic draft→posted flip. The post-into-closed-period hole (prodway P1-C2) is closed |
| N13 durable approval audit | **closed-deferred** | `approvals.resolve` now writes a durable `auditLog` row (entityId, user, action `approval_{type}_{action}`, entityRef, reason) for EVERY decision — the 0025 DB trigger computes the tamper-evident chain fields (seq/prevHash/eventHash). The in-memory `createAuditEntry` theater removed from the return shape (no UI consumers — verified) |
| N16 cancellation-correct timeouts | **closed-deferred** | `retry.ts withTimeout` gains `onTimeout` (fires before reject); `close-pipeline.ts` holds a shared abort flag; **5 step-boundary checks** (validation/adjustments/trial-balance/period-close/verify) halt the close as `awaiting_human` before further writes; the outer pipeline timeout flips the same flag. A timed-out close can no longer keep posting depreciation in the background (prodway P1-C5 closed) |
| N14/N15 close sessions + convergence | **backlog → next pass** | Deliberately deferred to a focused pass: wiring `closeSessions` into the executing path requires converging the two close implementations first (design-heavy, 2,300 lines combined) |

### Tests authored (added to Deferred Test Registry)

`apps/web/__tests__/epoch0-batch2-ledger-truth.test.ts` — 9 cases:
- N17: no `generateDemoTransactions`/`demo_sync`/`Math.random` in banking source; manual response contract present in source (2)
- N12: TrustGuard + fiscalPeriods + "open" check present in the journal branch; validation precedes the status flip; plain-English closed/balance errors (2)
- N13: `db.insert(auditLog)` with entityRef; `createAuditEntry` gone (1)
- N16: onTimeout fires before TimeoutError; silent on success; pipeline checks abort before adjustments/period-close and wires the outer timeout to the flag (3)

### Stress cases designed

- N12: approve racing period-close (close wins → approval rejected); concurrent double-approve (second gets CONFLICT, unchanged); approve with lines edited between read and validate (re-read inside validation path)
- N16: timeout mid-adjustments → pipeline stops before TB/close steps; timeout mid-period-close → awaiting_human, no further writes; onTimeout observer throwing must not mask TimeoutError (test)
- N17: manual sync at 100 clicks/min (no throttle needed — pure read-only response); sync response consumed by old UI builds (tolerant — verified bank-connection-dialog.tsx:287,335)

### REVIEW notes

- `validateJournalEntry` signature requires `description: string` — fixed during review (`?? "Journal entry approval"`); `date` is schema `text` — string pass-through correct
- banking.ts surgery verified by brace-balance (depth 0) + residual grep (0 random/demo refs) + full read of the repaired categorize helper
- Chain fields on `auditLog` are computed by the 0025 DB trigger — insert supplies payload columns only (matches ar.ts pattern)

### Residual risks

- All nodes `closed-deferred` — no runtime verification yet (Run Phase N10)
- The `closeState.errors` push uses string messages (schema `string[]`) — consistent
- Month-end job (`packages/jobs/month-end-close.ts`) still diverges — that IS N15, next pass

### Next loop pass

**N15 then N14:** converge `packages/jobs/month-end-close.ts` onto `close-pipeline.ts` semantics (period-end JE dates, TrustGuard, TB snapshot), then wire `openCloseSession`/durable sessions into the executing close; DB-backed idempotency keys replace the in-memory maps.
