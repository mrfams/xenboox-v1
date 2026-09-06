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

---

## Session 003 — 2026-09-06 — Batch 3 / G2 "TRUTHFUL UI" (partial: N18)

### Graph delta

| Node | Status | Evidence |
|---|---|---|
| N18 SSE truth + tenant isolation | **closed-deferred** | `agent-events/route.ts`: runs query scoped by `entityId` (the writer-set column) — `organizationId=entityId as any` predicate that matched NOTHING removed, so real agent runs are now visible to the Tasks rail (prodway B8/P1 closed). `opsLiveRunEvents` query scoped through `entityRunIds` subquery — the previously UNFILTERED events feed (cross-tenant step-message leak) is closed. `orchestrator.ts` runId now uses the full taskId — the 6-char prefix collided on the UNIQUE runId column, silently failing inserts inside the observability catch (double bug: invisible runs + failed writes) |

### Tests authored (registry)

`apps/web/__tests__/epoch0-batch3-sse-truth.test.ts` — 4 cases (scoping, subquery, runId format, schema-unique rationale).

### Stress cases designed

- N18: two tenants connected simultaneously — each stream receives ONLY its entity's run events; 6-char-prefix collision repro (two taskIds sharing a prefix → one insert fails under old code, both succeed under new); SSE reconnect loop with 20-run lookback (bounded, no leak).

### Residual risks

- `as any` remains on `event.metadata` (line ~236) — benign typed-metadata access, cleanup candidate.
- Notifications stitching on the Tasks page (prodway Part 4 #10) + batch approve + loading gates → next Batch 3 nodes (N19+).

### Next loop pass

N19: server-side unified Needs-you queue (end client stitching of listAgentApprovals + notifications.list + tasks.list); N20: batch approve; N21: loading/error gates on Financial Pulse numerics.

---

## Session 004 — 2026-09-06 — Batch 3 (cont.) / N15 + N14: CLOSE CONVERGENCE + DURABLE SESSIONS

### Graph delta

| Node | Status | Evidence |
|---|---|---|
| N15 one close implementation | **closed-deferred** | `packages/jobs/month-end-close.ts` rewritten (277→~160 lines): resolves period+entity, then **delegates to `executeClosePipeline`** (`triggerSource: "scheduled"`, timeout budget 480s/90s-step sized to the job's 600s maxDuration). The duplicate flow — no TrustGuard, no TB snapshot, `new Date()` JE dates, job-local depreciation posting — is deleted. Outcome mapping is honest: completed → deduped notification + success; awaiting_human/failed → throw with the pipeline's own errors → Trigger.dev retry → DLQ. `executeClosePipeline` + `CloseTriggerSource`/`PipelineTimeoutConfig` re-exported from the agents root index |
| N14 durable close sessions wired | **closed-deferred** | `executeClosePipeline` now: (1) opens a durable `closeSessions` row via `openCloseSession` after validation; (2) **refuses a second close** for the same entity+period while a session is in_progress/ready within a 30-min window (durable concurrency guard — the in-memory map remains only as the cheap first layer); (3) replays idempotently when a locked/notified session + closed period exist (double-run protection across restarts); (4) finalizes the session on EVERY exit path (`guardedPipeline.then`) — completed→locked, else→blocked — with errors/warnings persisted; finalization is catch-isolated so it never masks the close result |

### Tests authored (registry)

`apps/web/__tests__/epoch0-batch3-close-convergence.test.ts` — 8 cases (delegation, duplicate deletion incl. no direct journal-table writes from the job, honest outcome mapping, session open/finalize/refuse/replay/finalize-isolation).

### Stress cases designed

- N15: Trigger.dev retry after pipeline timeout → session gate replays or refuses (no double close); DLQ payload carries the pipeline's real step errors
- N14: two concurrent close triggers (job + manual Close Center) → second is refused with session pointer; kill -9 mid-close → session stays in_progress → retry within 30min refuses, after 30min re-opens; close completes then a second run → idempotent replay, no double depreciation

### REVIEW notes

- Codemod escaping bug mangled `packages/agents/index.ts` mid-edit — repaired and verified via git diff (net change: +executeClosePipeline in core export block, +type re-exports, block split only)
- `closeSessions.errors` is jsonb string[] — pipeline errors shape matches; `openedAt` (not startedAt) used for the recency window
- Residual: no partial unique index on (entityId, fiscalPeriodId, active-status) — the guard is query-then-insert; the race window is acceptable now (job concurrencyLimit:1) and dies entirely with Engine v2 (migration to be generated in Epoch 1)

### Next loop pass

N19: server-side unified Needs-you queue (end the client stitching of listAgentApprovals + notifications.list + tasks.list); N20: batch approve; N21: Financial Pulse loading/error gates.

---

## Session 005 — 2026-09-06 — Batch 3 (cont.) / N19 + N20: UNIFIED QUEUE + BATCH APPROVE

### Graph delta

| Node | Status | Evidence |
|---|---|---|
| N19 server-side needs-you queue | **closed-deferred** | New `tasks.needsYou` procedure: agent-activity review items (same conditions as ingestion.listAgentApprovals, resolved excluded) + decision-typed notifications folded and deduped SERVER-side, newest first. Tasks page now runs ONE queue query (`tasks.needsYou`) — the client stitching of `ingestion.listAgentApprovals` + `notifications.list` + `tasks.list` is deleted (toAInative §4 contract finally met). Honest loading state added before "All clear" |
| N20 batch approve | **closed-deferred** | `batchApproveVisible` uses `Promise.allSettled` over visible items; ingestion items with a documentId are EXCLUDED (they need human document review); successes leave the queue + one data-changed emit; failures stay with an honest "N approved, M failed — try those again" toast. Header gets a disabled-aware "Approve all" button |

### Tests authored (registry)

`apps/web/__tests__/epoch0-batch3-needsyou-queue.test.ts` — 6 cases.

### Stress cases designed

- N19: 100+ queue items (limit bounded at 50); resolved item race (resolved between query and render → server excludes on refetch); notification data as string vs object vs malformed JSON
- N20: 30-item batch where 5 fail (5 stay visible, 25 leave); approve racing resolve from another tab (CONFLICT → counted as failed, stays); double-click Approve all (batchRunning guard)

### Residual risks

- N21 (Financial Pulse loading/error gates on every numeric block) — next pass
- `ingestion.listAgentApprovals` still exists for its other consumers; unify it to delegate to `tasks.needsYou` internals later (dedupe of query conditions)
- agent_activity output-shape heuristics (title/message/description fallbacks) mirror ingestion.ts — unify in the same later pass

### Next loop pass

N21 loading/error gates; then N22+ security hardening batch (G3): token hashing, MFA throttle, SCIM constant-time, device/session UI.

---

## Session 006 — 2026-09-06 — Batch 3 (cont.) / G3 SECURITY HARDENING: N21–N24

### Graph delta

| Node | Status | Evidence |
|---|---|---|
| N21 Pulse honest states | **closed-deferred** | `financial-pulse/page.tsx`: core queries now extract isLoading/isError; the KPI strip renders `aria-busy` skeletons while loading and an explicit "Couldn't load your numbers" card on failure — **zeros are never rendered as data** (prodway Part 4 #12 closed for the primary surface) |
| N22 tokens hashed at rest | **closed-deferred** | `auth.ts`: `hashToken()` (SHA-256) applied to all 3 creation sites (2× verificationTokens, resetPasswordToken) and all 3 consumption sites (reset lookup, verify lookup, post-verify delete) — raw tokens exist only inside the email link. DB leak no longer yields working account-takeover links (prodway P2 closed) |
| N23 MFA attempt throttle | **closed-deferred** | `completeMfaChallenge`: locked accounts rejected with TOO_MANY_REQUESTS before verification; failures increment `failedLoginAttempts` durably on the user row with the same 5-strikes/30-min policy as passwords (documented field reuse — no migration); TOTP and backup-code success reset the counter. TOTP's 1M keyspace is not guessable at 5 tries per half hour |
| N24 SCIM timing-safe compare | **closed-deferred** | `scim/v2/route.ts`: `timingSafeEqual` with a same-length dummy compare on length mismatch so wrong-length guesses keep the same timing profile (prodway P3 closed) |

### Tests authored (registry)

`apps/web/__tests__/epoch0-batch3-security-hardening.test.ts` — 11 cases across N21–N24.

### Stress cases designed

- N22: legacy plaintext tokens in DB become invalid after deploy (accepted — dev stage); email link with raw token still verifies (round-trip)
- N23: 5 rapid wrong TOTP codes → locked; correct code after lockout → rejected until expiry; correct code within attempts → counter resets
- N21: slow 3G → skeletons, then values; API 500 → error card, never zeros; entity switch mid-load → N6 cache reset re-gates

### Residual risks

- N23 reuses password-lockout fields (documented; dedicated `mfaFailedAttempts` columns would need a Drizzle migration — fold into Epoch 1 migration batch if desired)
- Remaining G3 item: device/session management UI (N25) — needs a small surface; scheduled with the Epoch 1 UX work
- All statuses remain `closed-deferred` until the Run Phase executes the registry (now 5 suites / 53 cases)

### Next loop pass

**Engine v2 prep (G4)** or **N25 device/session UI** + P2 leftovers (`cleanupJournal` transactional inserts, `statusCode` column migration) — owner's call on sequencing.
