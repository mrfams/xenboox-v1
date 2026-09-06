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

---

## Session 007 — 2026-09-06 — Batch 3 (cont.) / P2 LEFTOVERS: N26 + N27

### Graph delta

| Node | Status | Evidence |
|---|---|---|
| N26 posting hygiene | **closed-deferred** | `createPostedJournal` gains `linkInsideTx` — source-document linking + audit commit **inside** the posting transaction; a link failure rolls back the whole posting so a posted JE can never exist without its source doc. Converted all 4 sites (AR invoice, AR payment, AP bill, AP payment). Void reversals (AR + AP) now commit reversal header + lines + original-status flip in ONE transaction. `cleanupJournal` (hard-deletes posted rows with swallowed errors) **deleted repo-wide** — prodway P2 closed |
| N27 statusCode column | **closed-deferred** | Schema: `integer("status_code")` (was a copy-paste timestamp). Migration 0040 generated via drizzle-kit, then corrected: Postgres can't auto-cast timestamp→integer, so the generated SQL got `USING NULL::integer` (column never written — all NULL). Deviation from "never hand-edit migrations" documented and justified in the migration header + this log |

### Tests authored (registry)

`apps/web/__tests__/epoch0-batch3-p2-hardening.test.ts` — 6 cases (no cleanup refs anywhere, linkInsideTx present + used ×4, no linkErr catch blocks, one-tx reversals, integer schema + USING cast).

### Stress cases designed

- N26: fail the invoice-link update mid-posting → JE + lines rolled back, invoice unlinked, retry succeeds exactly once (reference idempotency); kill between reversal header and lines → no partial reversal (single tx)
- N27: migrate on a DB with rows in idempotency_keys → NULL cast passes

### Residual risks

- Migration 0040 must run before/at next deploy (drizzle migrate step)
- `linkInsideTx` callback runs inside the posting transaction — callers must not perform slow external I/O in it (documented by signature; all current uses are single-row updates + audit inserts)

### Next loop pass

N25 (device/session management UI) + Engine v2 prep (G4) — the immutable hash-chained journal build begins per KILLPLAN §4.

---

## Session 008 — 2026-09-06 — Batch 3 (cont.) / N29 + N30 + N25: VERIFIED AI + STATEMENT RAILS + SESSIONS

**Owner directives applied:** (1) dashboards stay AI-native, no SaaS drift; (2) typecheck owned by CI, not this PC; (3) **LLM claims verified by deterministic code — no hallucinated money**; (4) PDF statement upload is the rail where APIs don't exist.

### Graph delta

| Node | Status | Evidence |
|---|---|---|
| N29 deterministic verification | **passed (Run Phase)** | Verified the ingestion boundary already enforces the doctrine: TrustGuard failure → `action: "escalated"` with the deterministic expected values — "requires human review regardless of LLM confidence" (posting-engine.ts). Closed the two chat-path hallucination windows: (a) `confirmCreation` gains `sourceDocumentId` + `verifyAgainstSource` — a suggested total that doesn't tally with the document's TrustGuard-extracted total (±0.05) is REFUSED with both numbers shown; (b) AI-suggested journal entries must **balance at creation** — unbalanced = refused with the exact difference, never stored as a failing draft. NOTE: the ingestion pipeline's invoice/statement validators (line math, subtotal, balance equation) were already deterministic — verified, not assumed |
| N30 statement rail | **passed (Run Phase)** | Found the real gap: extracted statement transactions posted to the GL but **never became `bankTransactions` rows** — unreconcilable for statement-based markets. `materializeStatementTransactions` now runs after a successful statement posting: TrustGuard-verified extraction → deterministic rows (`source: "bank_import"`, `isReconciled: false`, `metadata.documentId`) → idempotent per document (retry finds existing rows) → bank account resolution by account number → bank name → create. GL entry already posted stands even if materialization fails (catch-isolated, logged) |
| N25 device/session management | **passed (Run Phase)** | Discovered the UI already existed (`settings/sessions-section.tsx`) but called `trpc.auth.listSessions`/`revokeSession` — **procedures that never existed** (half-wired feature, runtime errors). Backend landed: `listSessions` (live sessions + `isCurrent`), `revokeSession` (ownership-scoped, current session protected — "use sign out instead"), `revokeOtherSessions` (keeps current sid). Revocation deletes the sessions row; the tRPC sid re-check kills the JWT within one request. Backend adapted to the existing UI contract (array return, `isCurrent`, `{ sessionId }` input) |

### Run Phase (executed THIS session, not deferred)

- **67/67 → 71/71 tests passing** across all 9 suites (epoch0-safety, batch2 ledger-truth, batch3 sse/close-convergence/needsyou/security/p2/verification-rails/sessions) in ~23s
- Failures found and fixed during the run: 3 test-infrastructure bugs (cwd-relative paths, `__dirname`→`import.meta.url`, dropped encoding arg producing Buffer comparisons), 1 wrong test list (named seed procedures ≠ seedDemoData), 1 shell-mangled message body in chat.ts (caught by test + typecheck), 2 JSX bugs from the Pulse codemod (caught by typecheck)
- Full web typecheck: hits the PC's 2GB heap limit (OOM) — **relaunched detached with 6GB heap; authoritative gate moves to GitHub/Vercel CI per owner directive**. The pre-fix run reported exactly 1 error (chat.ts:1617 — since fixed); CI will confirm zero
- Discovered debt graphed: pipeline depreciation still posts inline → N28 routes it through the canonical poster when the posting core moves to a shared package (Engine v2 prerequisite); pre-existing test break in `__tests__/posting-engine.test.ts` (TrustGuardResult import path)

### Next loop pass

**Engine v2 prep (G4)** — immutable hash-chained journal schema + posting service extraction into a shared package (unblocks N28), dual-write shadow verifier design. This is the KILLPLAN §4 core.

---

## Session 009 — 2026-09-06 — Batch 3 (cont.) / N32: REVIEWERS SEE THE DOCUMENT

**Owner directive:** when an extraction doesn't tally and escalates to a human, the user must be able to VIEW the actual uploaded file (stored in R2) before accepting or rejecting — they may never have seen it.

### Graph delta

| Node | Status | Evidence |
|---|---|---|
| N32 document viewer for escalated review | **passed (Run Phase)** | New `GET /api/documents/[id]/file` — authenticated, entity-access-verified (via `resolveEntityAccess`; cross-entity probes indistinguishable from nonexistent), streams the R2 object with `Content-Disposition: inline` + `nosniff` + private cache so PDFs/images render in the reviewer's tab. Honest 404s: no stored file / storage unconfigured / object missing (driver internals never leak). `IngestionReviewPanel` now renders a **"View document"** action beside the accept/reject decision. Note: uploads were already persisted to R2 (`upload/route.ts` writes r2Key/r2Bucket) — the viewer closes the visibility gap |

### Run Phase

- **75/75 tests passing** across all 10 suites (new: `epoch0-batch3-document-viewer.test.ts`, 4 cases)
- Also this session: N29 ordering fix — the tally gate now runs BEFORE customer find-or-create, so a refused creation leaves zero orphans (committed `9df3c963`, 71/71 → then 75/75 with viewer tests)

### Residual risks

- Decision cards for document-backed notification items deep-link into the review panel (which now has the viewer); a richer inline preview (page thumbnails, zoom) arrives with the design-system rebuild — inline browser rendering covers PDF/images today
- `/pay/[token]` and donor-portal file flows use their own authorization paths — untouched here

### Next loop pass

**Engine v2 prep (G4)** — immutable hash-chained journal schema, posting service extraction to a shared package (absorbs N28), dual-write shadow verifier.

---

## Session 010 — 2026-09-06 — G4 BEGINS: LEDGER ENGINE v2 FOUNDATION (KILLPLAN §4)

### Graph delta

| Node | Status | Evidence |
|---|---|---|
| N33 ledger schema | **passed (Run Phase)** | `packages/db/schema/ledger.ts`: `journal_events` — append-only event store (per-entity `seq` unique, `(entity_id, idempotency_key)` unique, jsonb lines in **integer minor units**, `prev_event_hash`/`event_hash` chain columns); `ledger_account_balances` — CQRS per-period deltas. Migration `0041` generated via drizzle-kit + documented hand-addition: **append-only trigger** (UPDATE/DELETE raise) + note that app-role grant revocation lands with force-RLS role wiring (Epoch 1) |
| N34 posting service | **passed (Run Phase)** | New package **`@xenboox/ledger`**: `postToLedger()` — deterministic validation FIRST (balanced, integer minor units, one-side-per-line, ≥2 lines — with a proof-by-exploding-proxy test that the DB is never touched for invalid entries), open-period gate, idempotency (committed key returns the ORIGINAL result), hash-chained append + balance projection upserts in ONE transaction. Single writer per entity via the `seq` unique index — race conditions eliminated by construction |
| N35 chain + enforcement | **passed (Run Phase)** | `computeEventHash` — SHA-256 over canonical (key-sorted, versioned) serialization of the stored fields + prev hash; `verifyChain(entityId)` — full ordered scan proving seq contiguity + prev linkage + hash integrity; `rebuildBalances(entityId)` — CQRS projection rebuilt from events (self-healing proof). Tamper-evidence tests: 7 mutation classes each change the hash; chain propagation verified (tampering event N changes N+1's expected hash) |
| N28 (carried) | noted | Pipeline depreciation re-routing onto the poster becomes possible now that `@xenboox/ledger` is a dependency of agents — cut-over pass work |
| Pre-existing debt fixed | — | `packages/db/schema/analytics.ts:451` — dead `conditions` array with a type error (built, never used) removed; `packages/db` + `packages/ledger` now both typecheck clean |

### Run Phase (executed this session)

- **10/10 ledger engine tests passing**: hash determinism, tamper evidence (7 classes), key-order independence, chain propagation, version pinning, genesis, 4 validation classes with DB-untouched proof
- `packages/ledger` tsc: **zero errors** (this package is fully clean, unlike the monorepo at large)
- Consumers wired: `@xenboox/ledger: workspace:*` added to web, agents, jobs

### Residual risks

- Migration 0041 must run before cut-over (drizzle migrate)
- Cut-over (next passes): shadow dual-write from `journal-posting-core`, nightly parity verifier, module-by-module posting cutover, then Engine v2 becomes the only write path
- `ledger.ts` jsonb `lines` carries accountCode snapshots — COA renames never corrupt history

### Next loop pass

N36: shadow dual-write (posting core mirrors every commit into journal_events behind a flag) + nightly parity verifier; N37: cut AR invoice posting onto `postToLedger` behind the flag with parity checks; N28 closes when the pipeline's depreciation routes through it.

---

## Session 011 — 2026-09-06 — G4: SHADOW DUAL-WRITE + PARITY VERIFIER (N36)

### Graph delta

| Node | Status | Evidence |
|---|---|---|
| N36 shadow dual-write + parity | **passed (Run Phase)** | `packages/ledger/src/shadow.ts`: `majorToMinor` (legacy 2dp strings → exact integer minor units), `toLedgerLines`, `shadowMirror` (idempotencyKey = legacy reference — old and new books are bound by the same key), `isShadowEnabled` (strict `LEDGER_SHADOW=true`). `packages/ledger/src/parity.ts`: `compareEntry` (pure — missing_event / total_mismatch / period_mismatch, both sides reported), `verifyParity(entityId)` (legacy posted JEs vs mirrored events, bounded). Hook: `createPostedJournal` mirrors every commit post-hoc when `LEDGER_SHADOW=true` — failure-isolated (a shadow failure can never break the real posting; the verifier reports it as missing, which is the signal). Entity currency resolved by lookup, never hardcoded. Cron: `GET /api/cron/ledger-parity` (x-cron-secret) — nightly tail walk (50 newest entities × 300 entries) or `?entityId=` operator deep-scan |

### Run Phase (executed this session)

- **19/19 ledger package tests passing** (10 engine + 9 shadow/parity), package tsc clean
- **75/75 dashboard suites still green** (shadow hook introduced no regressions)
- Newly discovered: none — the parity SQL sums only the debit side (cleaner than divide-by-2)

### Cut-over sequence from here (graphed)

1. N37: staging/prod runs `LEDGER_SHADOW=true` → parity cron walks the tail nightly → mismatches drive fixes
2. N38: parity proven → AR invoice posting flips onto `postToLedger` (legacy write becomes the shadow) → verify → next module
3. N28 closes automatically when the close pipeline's depreciation routes through the engine
4. Legacy tables frozen read-only after the last module cut over

### Residual risks

- Shadow mirror doubles write volume per posting while enabled (bounded — serverless posting path, not bulk)
- Parity scans are per-entry queries (N+1) — fine at nightly tail-walk volume; bulk scan gets a set-based rewrite if operators need full sweeps
- The parity cron must be registered in vercel.json cron config at deploy (same as audit-archive)

### Next loop pass

N37: AR invoice cut-over behind the flag + staging parity evidence; then per-module cut-overs to close G4.

---

## Session 012 — 2026-09-06 — G4: AR INVOICE CUT-OVER BEHIND THE FLAG (N37)

### Graph delta

| Node | Status | Evidence |
|---|---|---|
| N37 AR cut-over | **passed (Run Phase)** | `postArInvoiceToLedger` now branches on `LEDGER_PRIMARY_AR=true`: **engine-first** (`postToLedger` with the same `ar-inv-<id>` idempotency key, real invoice currency, TrustGuard-equivalent validation inside the engine) → legacy mirror via `createPostedJournal` (so legacy readers stay consistent during the transition) → invoice link + audit. Failure semantics are asymmetric by design: engine failure aborts everything (nothing posted, reason journal_skipped); legacy-mirror failure after an engine commit leaves the event standing and is caught by the parity verifier. Default remains legacy-primary until staging parity evidence accumulates. Invoice fetch now selects `currency` (the engine refuses hardcoded money). Shared `linkInvoice` helper serves both branches |

### Run Phase (executed this session)

- **80/80 tests passing** across all 11 suites (new: `epoch0-batch3-ar-cutover.test.ts`, 5 cases)
- One stale assertion updated honestly (N26 counted 2 linkInsideTx in ar-posting; the cut-over mirror legitimately makes it 3 — invariant relaxed to ≥2 with the reason recorded in the test)
- `packages/ledger` tsc clean

### Residual risks

- With `LEDGER_PRIMARY_AR=true`, a legacy-mirror failure leaves `salesInvoices.journalEntryId` unset while money stands in the engine — the parity verifier detects it; a repair backfill is listed for the ops runbook
- Cut-over rollout order: staging (shadow + parity evidence) → prod shadow → prod flip per module

### Next loop pass

Same pattern for AP bill + payments cut-overs (mechanical, same shape as N37); then expenses + close depreciation routing (N28 closes); then legacy freeze → G4 complete.

---

## Session 013 — 2026-09-06 — G4: AP BILL + PAYMENT CUT-OVERS (N38)

### Graph delta

| Node | Status | Evidence |
|---|---|---|
| N38 AP cut-over | **passed (Run Phase)** | `postApBillToLedger` and `postApPaymentToLedger` both branch on `LEDGER_PRIMARY_AP=true` — engine-first (`postToLedger`, same `ap-inv-`/`ap-pay-` reference keys, bill currency — never hardcoded), legacy mirror via `createPostedJournal` after the engine commit, shared `linkBill`/`linkPayment` helpers serving both branches. Same asymmetric failure semantics as N37: engine failure aborts everything; mirror failure leaves the event standing for the parity verifier. Legacy-primary remains the default until staging parity evidence lands |

### Run Phase (executed this session)

- **85/85 tests passing** across all 12 suites (new: `epoch0-batch3-ap-cutover.test.ts`, 5 cases)
- Two stale count assertions updated with reasons (N26: AP now has 4 linkInsideTx sites — bill legacy + bill mirror + payment legacy + payment mirror; invariant stays "no post-then-cleanup anywhere")

### Next loop pass

Expenses posting cut-over + close-pipeline depreciation routing (N28 closes) → G4 complete → legacy freeze.
