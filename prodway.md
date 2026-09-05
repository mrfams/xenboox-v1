# Xenboox Production Way

> Production execution plan and release gate for the Xenboox AI-native accounting platform.
>
> **Scope:** production readiness of the web application, dashboard surfaces, admin surface, accounting execution, agent workflows, and operational reliability. Marketing is out of scope.
>
> **Status:** Re-audited 2026-09-05 (second pass). Remediation P0–P8 partially landed (see git log: AR/AP/reconciliation/expenses/journal/close commits). Several P0 findings remain OPEN and new P0s were found — see "Deep Re-Audit Findings" below. Not production-ready.
>
> **Last audited:** 2026-09-05 (deep code re-audit, working tree with uncommitted remediation)
>
> **Live deployment audited:** https://xenboox.vercel.app

---

## Release Standard

Xenboox is ready to ship only when all of the following are true:

- No user-visible action claims success without a durable backend result.
- No agent can create, modify, approve, or post financial data outside the validated accounting paths.
- Every financial mutation is entity-scoped, authorized, atomic, idempotent, and audited.
- Human approval actions perform the underlying business operation and have a durable status.
- AI answers and actions show uncertainty honestly and escalate when required.
- Long-running work survives retries, request timeouts, process restarts, and multiple Vercel instances.
- Dashboard numbers reconcile to the ledger and respect the selected entity and period.
- Admin actions are permission-gated, actor-attributed, audited, and safe against destructive mistakes.
- The core user workflows pass against a clean production-like database.
- Simulated, random, seed-only, or hardcoded operational data is removed from production paths or explicitly marked as unavailable.
- No known critical or high-severity blocker remains open.

This document is the execution source of truth for the production pass. `BUILD_LOG.md` is a historical log and may lag behind this document.

---

## Current Audit Verdict

**Not production-ready.** The product is a substantial working system with real authentication, entity scoping, tRPC procedures, database-backed dashboard queries, agent execution, ingestion, journal posting, AP/AR posting, and admin authentication. It is not merely a static toy.

However, the current system has critical correctness and trust failures:

1. The month-end close path can post fabricated depreciation to the general ledger.
2. Onboarding displays simulated setup results and can report success after setup failure.
3. Several dashboard AI handoffs silently discard the user prompt.
4. Activity Hub agent approvals use incompatible ID spaces and fail at runtime.
5. Some admin review approvals change only status and perform no accounting operation.
6. Several admin mutations lack the required permission matrix, transaction boundary, or actor audit.
7. Streaming chat can lose events when network chunks split SSE lines.
8. Close idempotency and close audit state are not durable across process restarts.
9. Several admin operational metrics are random, hardcoded, or seed-only.
10. Some posting paths are not atomic and can leave inconsistent ledger state.

**Do not ship financial production use until Phase 1 is complete.**

---

# Deep Re-Audit Findings (2026-09-05, second pass)

> Verified by direct code tracing of the working tree (which contains ~19
> uncommitted files of remediation on top of commits through `cc249990`).
> Every finding below cites file:line evidence. Status legend:
> **FIXED** = verified in code; **OPEN** = old finding still broken;
> **NEW** = not in the original audit.

## A. Verified FIXED (do not re-do)

1. **[FIXED] 1.1/1.2 Depreciation fabrication.** `packages/agents/core/close-pipeline.ts:949-1031` and `packages/jobs/month-end-close.ts:167-237` now derive amounts from `depreciationSchedule` joined to real `fixedAssets` (rejects missing accounts/non-finite amounts), use deterministic reference `depreciation:{entityId}:{periodId}:{assetId}` with pre-check + unique index `je_entity_reference` (schema/accounting.ts:167), post header+lines+schedule link inside one `db.transaction`, and close-pipeline marks the close `awaiting_human` instead of proceeding when adjustments fail (close-pipeline.ts:498-516).
2. **[FIXED] 1.3 Atomic posting core.** `apps/web/server/journal-posting-core.ts:107-167`: header+lines in one transaction, race-safe entry numbering on conflict (retry against `je_entity_entry_number`, accounting.ts:168), TrustGuard pre-validation, open-period check. AP/AR posting both route through it (`ar-posting.ts:133`, `ap-posting.ts:119`).
3. **[FIXED] 2.7 SSE chunk splitting.** `apps/web/lib/hooks/use-streaming-chat.ts:442-456`: streaming TextDecoder, partial-line buffering across chunks, flush at stream end; regression test exists (`apps/web/__tests__/use-streaming-chat.test.ts`, 9 cases).
4. **[FIXED] 2.3 (partially — see B) Approvals atomicity.** `apps/web/server/routers/approvals.ts:163-214`: resolution uses atomic conditional UPDATE (`humanResponse IS NULL` / `status='draft'` guards) with CONFLICT on double-resolution.
5. **[FIXED] 8-D Reopen ownership gate.** `close-pipeline.ts:1701-1717` verifies close-session entity ownership before writing reopen rows.
6. **[FIXED] Money types.** All ledger money columns are `numeric(15,2)` (accounting.ts:203-204, 283-286). No float money columns anywhere (only `confidence`/`ocrConfidence` use `real`, which is acceptable).
7. **[FIXED] Schema business keys.** Unique indexes exist: `coa_entity_code`, `fp_entity_year_month`, `je_entity_reference`, `je_entity_entry_number`, `jes_unique_source`, `tbs_entity_period_account` (accounting.ts:89-296).
8. **[FIXED] Financial Pulse period selector + dashboard scoping.** `apps/web/app/dashboard/financial-pulse/page.tsx:104-145` wires selectedPeriod into report/anomaly queries; `get-dashboard-data.ts` scopes every query by `ctx.entityId`.
9. **[FIXED] Admin route gating + edge rate limiting.** `apps/web/middleware.ts:200-216` enforces a separate admin session for all `/admin` routes; edge rate limiting applies to all `/api/*` (middleware.ts:121); admin tRPC uses a distinct control-plane session check.
10. **[FIXED] Month-end close notifications deduped** with failure isolation (`packages/jobs/month-end-close.ts:141-155`), DLQ on failure via `dlqOnFailure` (month-end-close.ts:26-37).
11. **[FIXED] Module AI architecture exists** — `ModulePageShell` + `module-page-copilot.tsx:120-127` consumes `focusRequest` and auto-sends prompts with nonce-based exactly-once. Works on pages that use the shell (knowledge-graph, donor-reporting). See B3 for the pages that don't.

## B. OLD findings still OPEN (verified broken in current code)

1. **[OPEN][P0] 2.3 Activity Hub agent approvals still fail at runtime — incompatible ID spaces.**
   `apps/web/server/routers/ingestion.ts:921-1000` (`listAgentApprovals`) returns **`agentActivity`** IDs, but the Activity Hub sends them to `approvals.resolve` (`activity-hub/page.tsx:362-368`, `itemType: "agent_escalation"`), which looks the ID up in **`agentRoutingLogs`** (`approvals.ts:163-171`) → NOT_FOUND every time. The two tables are never reconciled. Also `approvals.ts:163` fetches the routing log **without an entityId filter** (cross-tenant write on `humanResponse` — see D2).

2. **[OPEN][P0] 2.1 Command Center `?prompt=` handoff still missing.**
   Eight surfaces still navigate to `/dashboard?prompt=...` (`dashboard/layout.tsx`, `activity-hub/page.tsx`, `financial-pulse/page.tsx`, `help/page.tsx`, `components/dashboard/ai-chat-input.tsx`, `components/shared/ai-command-bar.tsx`, `selection-actions.tsx`, `command-palette.tsx`), but `apps/web/app/dashboard/page.tsx` (1,253 lines) contains **no `useSearchParams`/prompt consumption at all**. Every one of these AI handoffs silently discards the user's prompt.

3. **[OPEN][P0] 2.2 Ledger/Operations AI actions are silent no-ops.**
   `apps/web/app/dashboard/ledger/page.tsx:90,481,584` calls `useModuleAi().openWithFocus` (e.g. the "Set up with AI" button, ledger/page.tsx:582-592) but the page does **not** render inside `ModulePageShell`, so `useModuleAi` returns the documented no-op fallback (`components/module/module-ai-context.tsx:71-80`: "the button just won't do anything"). Only knowledge-graph and donor-reporting use the shell. Operations pages use neither.

4. **[OPEN][P0] 3.1 Onboarding is still fully simulated and lies about success.**
   `apps/web/components/onboarding/ai-onboarding.tsx`: header comment at line 49 says "AI Responses (simulated — wire to real LLM later)"; fake setup progress via `setTimeout` (lines 303, 328, 332, 375); hardcoded "47 accounts" (line 224); hardcoded `currency: "USD"`, `country: "GM"` (lines 361-362) ignoring user selection; and on mutation failure it toasts _"Setup had a hiccup, but you can continue"_ then still shows **"All done! Here's what I set up…"** (lines 370-390). Entity creation failure is swallowed, never retried, never blocks "completion".

5. **[OPEN][P0] 4.4 Admin telemetry still fabricates data with `Math.random()`.**
   Confirmed in production read paths: `apps/web/server/routers/logs-traces.ts:705-713` (fake p50/p95/p99 latency, request/error counts), `ops-console.ts:472-489` (fake MRR `$700k+`, org count, gross margin), `live-runs.ts:595-680` (fabricates 10 agent runs with random progress/duration/confidence and inserts them into `opsLiveRuns` attached to placeholder entity `00000000-…-0001`), `ai-workspace.ts:75` (random progress). This is admin operator-facing misinformation about real infrastructure.

6. **[OPEN][P1] 4.1/4.2 Admin mutations still use broad guard, no audit, no transaction, wrong actor.**
   `apps/web/server/routers/admin.ts` — every mutation uses `adminProtectedProcedure`, none use a permission matrix (lines 620, 679, 745, 791, 802, 836, 857). `createUser` (679-743): user insert + `userEntityAccess` grant are **two separate non-transactional writes**, no admin audit row, and `grantedBy: input.entityId` records the **entity UUID as the granting actor** (line ~737) — the actor is wrong. `deleteUser`/`deleteOrganization` (791, 857) are hard-deletes.

7. **[OPEN][P1] 4.3 Review-queue demo seed deletes ALL tenants' data.**
   `apps/web/server/routers/review-queue.ts:330-335`: `seedDemoData` runs `db.delete(reviewItemEvidence)` etc. **with no WHERE clause and no entity/org scoping** — an admin clicking "seed demo" in production wipes every organization's review queue. Reachable via `adminProtectedProcedure` in production.

8. **[OPEN][P1] 5.3 Live agent runs never reach the UI (org/entity mismatch + unsafe cast).**
   `apps/web/app/api/agent-events/route.ts:154-156` filters `eq(opsLiveRuns.organizationId, entityId) as any`, but the writer (`packages/agents/core/orchestrator.ts:625-648`) sets only `entityId`, never `organizationId` (schema has both, ops-live-runs.ts:55-59). The predicate can never match → real runs are invisible. The `as any` cast hides the type error. Bonus: `runId: RUN-${taskId.slice(0,6)}` (orchestrator.ts:626) is **not globally unique** — two tasks sharing a 6-char prefix collide.

9. **[OPEN][P1] 2.6 Fake undo / local-only snooze in Activity Hub.**
   `apps/web/app/dashboard/activity-hub/page.tsx:393-405`: the "Undo" toast action only removes the id from a local `dismissed` Set — the server mutation (approve/reject) is **not reverted**; "Snoozed for 1 hour" (line ~427) is likewise local state only and the item reappears on refresh.

10. **[OPEN][P1] 1.4 Close idempotency still in-memory; durable session machinery unused.**
    `close-pipeline.ts:265-298` gates the whole close on `checkIdempotency`/`setIdempotencyResult` (module-level Map in `retry.ts`) — does not survive restart and is per-instance on Vercel. The durable `closeSessions` schema and helpers (`openCloseSession`, `collectCloseConfirmations`, `processPassiveApproval`, close-pipeline.ts:1439-1996) exist but `executeClosePipeline` **never calls them** — the 12-step durable flow and the 7-step in-memory flow are two divergent implementations, and only the in-memory one runs.

## C. NEW issues (not in the original audit)

1. **[NEW][P0] `db.transaction()` silently runs WITHOUT atomicity on the default driver.**
   `packages/db/client.ts:20-71`: default driver is neon-http, which has no transaction support; the shim catches the error and **executes the callback sequentially with no rollback**, logging only a console warning. Every "atomic" posting path (journal header+lines in journal-posting-core.ts:109, close snapshots + period close in close-pipeline.ts:1122, depreciation in month-end-close.ts:208, AP/AR) is non-atomic unless `USE_RLS=true` (Pool) is set in the environment. The P7/P8 "money safety" guarantees are **conditional on an env var that defaults off**. This must be resolved (force Pool driver, or verify USE_RLS=true in prod) before any posting guarantee can be claimed.

2. **[NEW][P0] Approving a journal entry skips TrustGuard/balance validation.**
   `apps/web/server/routers/approvals.ts:203-231`: `resolve(itemType: journal_entry, approved)` flips `status: draft → posted` with a bare UPDATE — no `validateJournalEntry`, no debits=credits check, no period-open re-check at approval time. A draft that became unbalanced (or whose period closed while pending) posts straight to the GL.

3. **[NEW][P1] Cross-tenant write path in escalation resolution.**
   `approvals.ts:163-171`: the `agentRoutingLogs` fetch has **no entityId condition** (unlike the journal-entry branch at 195-199). Combined with B1, a crafted `itemId` writes `humanResponse` onto another entity's escalation row. Entity-scoping rule violation on a mutation.

4. **[NEW][P1] Banking "sync" fabricates random transactions into the real ledger feed.**
   `apps/web/server/routers/banking.ts:780-800 + 2053-2220`: for manual/demo connections, sync generates 15-20 **random-amount** transactions (`Math.random()`, templates like "SALARY PAYROLL $2000-6000") and inserts them into `bankTransactions` with `source: "demo_sync"`. These rows are entity-scoped real bank transactions that reconciliation, matching, and dashboards will treat as money that exists.

5. **[NEW][P1] `withTimeout` does not cancel work — a timed-out close keeps running.**
   `packages/agents/core/retry.ts` (`withTimeout`): race-style reject; the underlying promise is not aborted. `executeClosePipeline` (close-pipeline.ts:742-746) can report timeout/failure to the caller while the pipeline continues in the background and may still post depreciation and close the period. Combined with in-memory idempotency (B10), a retry can double-run.

6. **[NEW][P1] `statusCode` column is a timestamp.**
   `packages/db/schema/idempotency.ts:9`: `statusCode: timestamp("status_code")` — clearly intended to be an integer HTTP status. The DB idempotency wrapper (`apps/web/lib/trpc/server.ts:629-678`) uses this table; the column type is wrong (and `lockedAt` cleanup deletes keys rather than expiring them by status).

7. **[NEW][P1] Fabricated confidence values across the agent tiers.**
   184 hardcoded `confidence: 0.x` literals in `packages/agents/tier2`, `tier3`, `platform` (e.g. `tier3/ar-agent/nodes.ts:47` `confidence: 0.95`, `:167` `0.9`). Confidence drives HITL escalation thresholds (<0.7 supervisor, <0.4 human), so hardcoded confidence means the escalation policy is decorative on those paths. Close pipeline also hardcodes `overallConfidence: 0.95/0.6` (close-pipeline.ts:679, 698-699).

8. **[NEW][P1] Two close implementations diverge on guarantees.**
   `close-pipeline.ts` (validates, snapshots TB, uses period endDate, writes awaiting_human) vs `packages/jobs/month-end-close.ts` (no TrustGuard, no TB snapshots, JE `date: new Date()…` = today rather than period end (line 220), never touches `closeSessions`). A close run via the job and via the pipeline produce different ledger/audit states for the same business action. 1.2's "converge implementations" is only half-done.

9. **[NEW][P1] Orchestrator observability writes swallow all errors.**
   `packages/agents/core/orchestrator.ts:648-651`: `catch {}` around `opsLiveRuns` insert ("observability must never break agent execution") — acceptable goal, but there is no fallback log, so run-visibility failures are invisible. Similar bare `catch { return { success: false … } }` in `close-pipeline.ts:1029-1031` and `executePeriodClose` (1184-1186) discard the error object entirely — the failure reason never reaches logs, LangFuse, or the operator.

10. **[NEW][P2] `cleanupJournal` hard-deletes posted entries with swallowed errors.**
    `journal-posting-core.ts:177-186`: `.catch(() => {})` on both deletes. If the link/audit step failed and cleanup also fails, a posted orphan JE remains with no trace. Should be a transactional insert of link+audit alongside posting, or an immutable reversal.

11. **[NEW][P2] Documented commands don't work; uncommitted remediation at risk.**
    `pnpm typecheck --filter=web` fails — package is `@xenboox/web`, not `web` ("No package found with name 'web' in workspace"). AGENTS.md commands need correcting. Additionally the working tree holds ~19 uncommitted files of financial remediation (journal-posting-core, close-pipeline, month-end-close, reports, streaming chat + test) plus **deletions of `.semgrep/xenboox-security.yml` and the whole `.agents/` tree** — this work must be committed (and the semgrep rules restored or deliberately retired) before anything else builds on it.

12. **[NEW][P2] `seed-demo` route is token-gated but unscoped.**
    `apps/web/app/api/seed-demo/route.ts:13-20,22`: requires `SEED_DEMO_TOKEN`, but if that token is set in production it seeds a hardcoded entity (`f19095a8-…`) directly into the production database with a 300s budget. Needs an explicit NODE_ENV≠production guard.

13. **[NEW][P2] Surface sprawl.**
    `apps/web/app/dashboard/` now contains 14+ route groups (people, qbr, referrals, donor-reporting, knowledge, knowledge-graph, ingestion, auto-approve, audit-trail, hidden, settings, help + the 5 core surfaces) — far beyond the locked 5-surface model, increasing the untested-AI-action surface area (see B3 pattern).

## D. Security posture summary

1. **RLS is opt-in and off by default.** `packages/db/client.ts:20` — DB-layer RLS (FORCE RLS migrations exist: `0006_enable_rls`, `0010_rls_remaining_tables`, `0030_force_rls`) only activates with `USE_RLS=true`; default relies on app-layer scoping only. Whether production sets `USE_RLS=true` is **unverified** — this is a release-gate question.
2. Cross-tenant write path in approvals (C3) and global delete in review-queue seed (B7) are the concrete scoping violations found; sampled financial routers (journal, ar, ap, banking, dashboard) consistently scope by entityId.
3. No committed `.env` files (only `.env.example`); password hashing is bcrypt cost 12 (admin.ts:707); edge rate limiting on `/api/*`; admin control-plane on a separate session — these are sound.
4. Middleware matcher covers everything except static assets (middleware.ts:248).

## E. Priority order for remediation (updated)

1. **Driver decision (C1)** — make `db.transaction()` real everywhere or prove `USE_RLS=true` in prod. Everything else's guarantees depend on this.
2. **B1 + C2 + C3** — fix the approvals ID space, add entity scope to the escalation fetch, route journal approval through TrustGuard/canonical posting.
3. **B7** — remove/gate the global review-queue demo delete.
4. **B2 + B3** — Command Center `?prompt=` consumer + shell-mount or route Ledger/Operations AI actions.
5. **C4** — remove random transaction generation from banking sync.
6. **B4** — real onboarding.
7. **B5, B6** — truthful admin telemetry and permission/audit matrix.
8. **B8, B9, B10, C5–C9** — live-run propagation, fake undo, durable close sessions, timeout semantics, error swallowing, confidence honesty.
9. **C11** — commit the working tree, fix/restore semgrep + commands.

---

## What Was Verified

### Live application

- `https://xenboox.vercel.app` is reachable.
- Public landing page renders.
- Login route renders.
- Demo credentials authenticate successfully.
- Authenticated dashboard route loads.
- First-run onboarding wizard appears.
- The onboarding flow contains a difficult/unreliable skip path and requires remediation before a clean user journey can be claimed.

### Code and execution paths

Verified by tracing dashboard components into tRPC routers, database access, agent orchestration, and posting code:

- Authentication and entity context are real.
- Entity-scoped dashboard queries exist.
- Command Center chat uses a real stream and agent path.
- Ingestion and several accounting posting paths are real and durable.
- AP/AR posting has real server-side implementations.
- Agent tool execution has validation, grants, HITL policy, and audit behavior.
- Admin authentication performs session and database checks.
- Some dashboard and admin surfaces still contain simulated or incomplete behavior listed below.

### Existing validation baseline

- Full web test run previously reported approximately **2,794 passing and 48 failing tests** across 216 files.
- Monorepo typecheck currently fails before completing all packages, including ingestion configuration/type errors and web memory pressure.
- Targeted dashboard/onboarding test processes completed without a failing process exit, but targeted tests do not prove live business correctness.
- Local dev server can boot when launched detached, but local verification is constrained by the available PC memory. Vercel/live verification is therefore required for release confidence.

---

# Execution Plan

## Phase 0 — Audit and safety baseline

**Goal:** Establish a reliable baseline before changing accounting behavior.

### Tasks

- [ ] Preserve this file as the production checklist.
- [ ] Record the current git commit before each remediation batch.
- [ ] Confirm production and preview databases are separate.
- [ ] Confirm no production database can be targeted by demo seed/delete actions.
- [ ] Capture representative clean-entity fixtures for:
  - [ ] one empty entity;
  - [ ] one entity with chart of accounts;
  - [ ] one entity with invoices, bills, bank transactions, and journal entries;
  - [ ] one entity with a fixed asset and depreciation schedule;
  - [ ] two entities owned by the same user for isolation tests.
- [ ] Add a release evidence folder or equivalent CI artifact location for test output, screenshots, and reconciliation results.

### Exit criteria

- A repeatable clean test entity can be created.
- Production data cannot be deleted by test/demo paths.
- Every following phase can be verified against durable data, not only rendered UI.

---

## Phase 1 — Financial integrity and ledger safety [P0]

**Goal:** Prevent false, duplicated, unbalanced, unauthorized, or non-recoverable accounting entries.

### 1.1 Close pipeline depreciation

**Problem:** `packages/agents/core/close-pipeline.ts` calculates depreciation using account-code-derived fake asset cost, creates random entry numbers, inserts posted entries outside the normal validation path, lacks period/source deduplication, and can swallow failure while allowing close to complete.

### Required work

- [ ] Remove account-code-derived depreciation amounts.
- [ ] Derive depreciation only from real fixed-asset metadata and the depreciation schedule.
- [ ] Route depreciation through the canonical validated posting implementation.
- [ ] Ensure journal lines are balanced before insertion.
- [ ] Enforce open-period and entity checks.
- [ ] Remove random entry-number generation.
- [ ] Use the race-safe entity entry-number allocation already used by the canonical posting path.
- [ ] Add database-backed idempotency for `(entityId, periodId, source, reference)` or an equivalent unique business key.
- [ ] Ensure a retry after partial completion returns the original result instead of posting again.
- [ ] Ensure required adjustment failure blocks close or leaves it explicitly awaiting human intervention.
- [ ] Log the failure with entity, period, close session, and source context.

**Primary files:**

- `packages/agents/core/close-pipeline.ts`
- `packages/jobs/month-end-close.ts`
- `apps/web/server/journal-posting-core.ts`
- `packages/ingestion/engine/journal-generator.ts`
- Fixed asset/depreciation schema and routers
- Generated Drizzle migration only if a new uniqueness/idempotency constraint is required

### 1.2 Converge duplicate depreciation implementations

- [ ] Identify every depreciation implementation.
- [ ] Select one canonical implementation.
- [ ] Make close pipeline and Trigger.dev month-end job call the same posting function.
- [ ] Remove or isolate the divergent implementation.
- [ ] Prove both direct invocation and retry invocation produce one journal entry.

### 1.3 Atomic journal posting

**Problem:** Some posting paths insert a posted journal header and lines separately, relying on cleanup deletion if line insertion fails.

- [ ] Wrap journal header and all journal lines in one database transaction.
- [ ] Do not expose a posted header before its lines exist.
- [ ] Replace hard-delete cleanup of posted entries with transaction rollback before commit or an immutable reversal after posting.
- [ ] Preserve reference-based idempotency.
- [ ] Keep TrustGuard, balanced-entry, open-period, and entity validation in the transaction boundary.
- [ ] Add failure-injection tests for header success/line failure/process interruption scenarios.

**Primary files:**

- `apps/web/server/journal-posting-core.ts`
- `apps/web/server/ap-posting.ts`
- `apps/web/server/ar-posting.ts`
- Expense posting consumers
- `packages/ingestion/engine/journal-generator.ts`

### 1.4 Durable close sessions and recovery

**Problem:** Durable close-session machinery exists but the active close execution does not consistently create/use it. In-memory idempotency does not survive restart or multiple instances.

- [ ] Open a durable close session at the start of every close.
- [ ] Persist close ownership, entity, period, initiating user/agent, and status.
- [ ] Persist close step events and outcomes.
- [ ] Make resume/retry/reopen use persisted state.
- [ ] Ensure an interrupted close cannot silently appear complete.
- [ ] Ensure reopen checks ownership and writes only after authorization/validation.
- [ ] Replace module-level idempotency maps for financial work with database-backed keys.
- [ ] Add concurrency tests for two close requests for the same entity/period.

**Primary files:**

- `packages/agents/core/close-pipeline.ts`
- `packages/agents/core/retry.ts`
- `apps/web/server/routers/fiscal.ts`
- `packages/db/schema/close.ts`
- Close migrations/schema only through Drizzle generation

### Phase 1 acceptance tests

- [ ] Depreciation amount matches real asset schedule.
- [ ] Depreciation never uses account code as an amount source.
- [ ] Re-running close creates no duplicate depreciation.
- [ ] Two concurrent close requests cannot double-post.
- [ ] Unbalanced entries cannot post.
- [ ] A failure between journal header and lines leaves no posted orphan.
- [ ] A closed period cannot receive a normal posting.
- [ ] A failed adjustment does not falsely report a successful close.
- [ ] Close can be resumed or safely reported as failed/awaiting human after timeout.
- [ ] Every close and posting has a durable audit record.

---

## Phase 2 — Core dashboard workflows [P0]

**Goal:** Every action visible on Command Center, Activity Hub, Financial Pulse, Ledger, and Operations performs the action it claims to perform.

### 2.1 Command Center prompt handoff

**Problem:** Multiple surfaces navigate to `/dashboard?prompt=...`, but the Command Center consumer is missing or inconsistent in the current deployed path.

- [ ] Read the `prompt` search parameter in the Command Center.
- [ ] Auto-send it exactly once after entity/chat initialization.
- [ ] Preserve the originating page context where applicable.
- [ ] Remove the parameter after consumption without creating a history loop.
- [ ] Do not send a prompt before entity context is ready.
- [ ] Add tests for direct load, refresh, back/forward, and duplicate render.

**Primary files:**

- `apps/web/app/dashboard/page.tsx`
- `apps/web/app/dashboard/layout.tsx`
- `apps/web/lib/hooks/use-dashboard-chat.ts`
- `apps/web/components/shared/command-palette.tsx`
- Activity Hub, Financial Pulse, Ledger, Operations, Help, and selection-action callers

### 2.2 Ledger and Operations AI actions

**Problem:** Several `useModuleAI().openWithFocus` calls run outside a mounted `ModuleAiProvider`, making visible AI controls no-ops.

- [ ] Decide one architecture: mount the provider at the dashboard layout level, or route all module actions through Command Center.
- [ ] Implement the chosen architecture consistently.
- [ ] Verify Ledger actions:
  - [ ] explain entry;
  - [ ] explain account;
  - [ ] trial balance question;
  - [ ] chart-of-accounts setup.
- [ ] Verify Operations actions:
  - [ ] invoices;
  - [ ] bills;
  - [ ] customers;
  - [ ] vendors;
  - [ ] expenses;
  - [ ] banking.
- [ ] Ensure prompt includes entity and record context without leaking cross-entity data.

**Primary files:**

- `apps/web/components/module/module-ai-context.tsx`
- `apps/web/components/module/module-page-shell.tsx`
- `apps/web/app/dashboard/layout.tsx`
- `apps/web/app/dashboard/page.tsx`
- `apps/web/app/dashboard/ledger/page.tsx`
- `apps/web/app/dashboard/operations/page.tsx`
- `apps/web/components/operations/*`

### 2.3 Activity Hub approval resolution

**Problem:** Agent approval list returns `agentActivity` IDs while `approvals.resolve` searches `agentRoutingLogs` IDs. Approvals fail.

- [ ] Define one canonical approval identity.
- [ ] Return the ID required by the resolver, or resolve against the actual source table.
- [ ] Preserve entity scope and item type.
- [ ] Make approve/reject outcomes durable and visible after refresh.
- [ ] Add tests for single approval, rejection, batch approval, and stale item.

**Primary files:**

- `apps/web/app/dashboard/activity-hub/page.tsx`
- `apps/web/server/routers/ingestion.ts`
- `apps/web/server/routers/approvals.ts`
- Approval schema and audit tables

### 2.4 Approval permission parity

- [ ] Use the same permission capability in UI and server.
- [ ] Hide or disable approval buttons for roles that cannot approve.
- [ ] Return plain-English permission errors.
- [ ] Test owner, admin, finance director, accountant, read-only auditor, and employee behavior.

### 2.5 Real approval effects

**Problem:** Some chat approval cards and admin review actions only send a chat message or update a status.

- [ ] Require every approval action to identify its durable item and operation.
- [ ] Route approval to the domain mutation: journal approval/posting, match application, bill/payment change, categorization, or escalation.
- [ ] Do not treat a missing item ID as an approval. Escalate it as an invalid action.
- [ ] Write actor, timestamp, decision, note, confidence, and resulting record IDs.
- [ ] Make actions idempotent.

### 2.6 Activity Hub snooze, dismiss, undo, and batch

- [ ] Persist snooze state and expiry server-side.
- [ ] Persist dismiss state with actor and reason.
- [ ] Remove fake undo or implement an actual reversible state transition.
- [ ] Make batch actions report individual successes and failures.
- [ ] Never hide an item locally when its server mutation failed.
- [ ] Ensure notifications do not reappear incorrectly after refresh.

### 2.7 SSE and streaming correctness

**Problem:** The streaming parser can drop data when a network chunk splits a line.

- [ ] Use streaming decoder mode.
- [ ] Buffer partial SSE lines across chunks.
- [ ] Parse only complete events.
- [ ] Handle `[DONE]`, malformed events, disconnects, and reconnect/cancel state explicitly.
- [ ] Preserve approvals, tables, charts, citations, tool traces, and final assistant message.
- [ ] Add a deterministic chunk-splitting test.

**Primary files:**

- `apps/web/lib/hooks/use-streaming-chat.ts`
- `apps/web/app/api/chat/stream/route.ts`
- Chat components and stream event schemas

### 2.8 Attachments

- [ ] Keep upload list and send payload in one source of truth.
- [ ] Removing a displayed attachment must remove it from the payload.
- [ ] Clear failed uploads or mark them explicitly failed and unsendable.
- [ ] Prevent concurrent upload index collisions.
- [ ] Verify entity ownership of every attachment at send time.

### Phase 2 acceptance tests

- [ ] Ask AI from every core surface reaches Command Center exactly once.
- [ ] Every Ledger and Operations Ask AI action opens or sends a real request.
- [ ] Activity Hub approval persists and changes the intended domain record.
- [ ] Unauthorized roles cannot approve.
- [ ] Batch action does not falsely dismiss failed items.
- [ ] Chat stream preserves all event types under chunk fragmentation.
- [ ] Attachment removal is reflected in the actual request.
- [ ] Dashboard refresh shows the same durable state as before refresh.

---

## Phase 3 — Truthful onboarding and entity setup [P0]

**Goal:** New users receive only results that were actually created and can reach a usable dashboard reliably.

### 3.1 Remove simulated AI setup

**Problem:** `apps/web/components/onboarding/ai-onboarding.tsx` uses simulated responses and timer-based setup. It displays 47 accounts and tax rules without proving they exist, hardcodes `USD`/`GM`, and reports completion after setup errors.

- [ ] Remove timer-based fake setup progress as a substitute for real work.
- [ ] Use real onboarding procedures for entity creation, COA suggestions/confirmation, tax presets, opening balances, and completion.
- [ ] Carry the user’s selected country, currency, fiscal year, industry, and business type through the flow.
- [ ] Display actual counts and IDs returned from the server.
- [ ] Show partial completion honestly.
- [ ] Stop progression when a required mutation fails.
- [ ] Provide retry for failed steps.
- [ ] Make skip setup produce an explicit minimal state and explain what remains incomplete.
- [ ] Remove or retire dead duplicate wizard steps.

**Primary files:**

- `apps/web/components/onboarding/ai-onboarding.tsx`
- `apps/web/components/onboarding/onboarding-wizard.tsx`
- `apps/web/app/(auth)/register/onboarding/page.tsx`
- `apps/web/lib/hooks/use-onboarding.ts`
- `apps/web/lib/hooks/use-onboarding-v2.ts`
- `apps/web/server/routers/onboarding.ts`
- `apps/web/server/routers/organization.ts`

### 3.2 Onboarding acceptance tests

- [ ] New user can complete onboarding from a clean database.
- [ ] Entity is created exactly once on retry.
- [ ] User-selected currency and country are persisted.
- [ ] Chart of accounts shown in UI equals database count.
- [ ] Tax presets shown as installed are present in the database.
- [ ] Failed entity/COA/tax mutation does not show “All done”.
- [ ] Skip path is clickable, durable, and returns to a usable dashboard.
- [ ] Refresh during each step resumes safely.
- [ ] Duplicate submissions are idempotent.

---

## Phase 4 — Admin production safety and truthful operations [P0/P1]

**Goal:** Admin is a real operational console, not a demo dashboard, and cannot perform unsafe untracked mutations.

### 4.1 Admin authorization and audit

**Problem:** `apps/web/server/routers/admin.ts` uses broad `adminProtectedProcedure` for sensitive mutations instead of the permission matrix; several mutations have no admin audit record.

- [ ] Apply `adminPermissionProcedure` to every admin mutation.
- [ ] Define capabilities for read, support, user management, organization management, billing, security, and destructive operations.
- [ ] Record authenticated admin user ID and admin session ID.
- [ ] Write audit records in the same transaction as the mutation.
- [ ] Protect last-super-admin and security-sensitive operations.
- [ ] Use soft-delete/deactivation for users and organizations where possible.
- [ ] Require explicit confirmation and recent authentication for destructive operations.

**Primary files:**

- `apps/web/server/routers/admin.ts`
- `apps/web/server/routers/admin-access.ts`
- `apps/web/lib/admin/roles.ts`
- Admin audit schema and helpers

### 4.2 Admin mutation atomicity and correctness

- [ ] Wrap user creation plus entity access grant in one transaction.
- [ ] Record the real `grantedBy` actor, not the entity ID or target user ID.
- [ ] Ensure organization creation grants or creates usable entity access as intended.
- [ ] Validate that referenced entities belong to the intended organization.
- [ ] Replace hard-delete user/org operations with safe lifecycle states.
- [ ] Implement settings persistence or remove the save controls.
- [ ] Do not return success from a no-op mutation.

### 4.3 Review queue

- [ ] Remove production-accessible demo seed/delete behavior.
- [ ] Keep review item listing entity/organization scoped according to the intended admin role.
- [ ] Implement real effects for approve match, create new record, dismiss, escalate, and request information.
- [ ] Record the actual actor.
- [ ] Replace hardcoded resolution KPIs with computed values or explicit no-data states.
- [ ] Add transaction and idempotency behavior.

**Primary file:** `apps/web/server/routers/review-queue.ts`

### 4.4 Admin telemetry

**Problem:** Multiple admin views use random, hardcoded, or seed-only values.

- [ ] Remove `Math.random()` from production read paths.
- [ ] Remove hardcoded provider spend/comparison data from production metrics.
- [ ] Separate development/demo fixtures from production routers.
- [ ] Implement real writers for agent runs, health, token usage, model cost, workload, and system metrics.
- [ ] Return an honest no-data state when telemetry is unavailable.
- [ ] Add timestamps and source/provenance to operational metrics.
- [ ] Add pagination and database filtering to admin list queries.
- [ ] Correct average calculations, including confidence averages.

**Primary areas:**

- `apps/web/server/routers/agent-monitor.ts`
- `apps/web/server/routers/ops-console.ts`
- `apps/web/server/routers/infrastructure.ts`
- `apps/web/server/routers/logs-traces.ts`
- `apps/web/server/routers/token-usage.ts`
- `apps/web/server/routers/cost-analytics.ts`
- `apps/web/server/routers/live-runs.ts`
- `apps/web/server/routers/admin.ts`
- Admin pages under `apps/web/app/admin/**`

### 4.5 Admin acceptance tests

- [ ] Read-only admin cannot mutate users, orgs, review items, settings, or security state.
- [ ] Every sensitive admin mutation produces an audit row with actor and session.
- [ ] Failed multi-step mutation leaves no orphaned user/org/access record.
- [ ] Demo seed cannot delete production review data.
- [ ] Admin metrics never display random values.
- [ ] No-data telemetry is clearly represented.
- [ ] Admin list endpoints remain bounded for large tables.

---

## Phase 5 — Agent execution and job reliability [P0/P1]

**Goal:** AI agents do assigned work durably, safely, and observably.

### 5.1 Agent execution contract

- [ ] Every agent action has entity context from state, never a hardcoded entity.
- [ ] Every action has a confidence value and plain-English reasoning.
- [ ] Confidence below 0.7 routes to supervisor review.
- [ ] Confidence below 0.4 escalates to human review.
- [ ] Every write action has a durable audit record.
- [ ] Workers do not bypass Ledger Agent/canonical posting for GL writes.
- [ ] Tool grants are default-deny and entity-scoped.
- [ ] Failed tool calls produce visible task failure/escalation, not silent success.

### 5.2 Job and timeout behavior

- [ ] Move long-running close and agent workflows out of synchronous Vercel request paths.
- [ ] Use Trigger.dev for close and other work that can exceed request limits.
- [ ] Store task state, attempt, progress, and failure reason durably.
- [ ] Retry only idempotent steps or use durable business keys.
- [ ] Ensure a timeout after a financial write cannot trigger a duplicate on retry.
- [ ] Add dead-letter handling and human-visible recovery.
- [ ] Ensure cancellation leaves an explicit safe state.

### 5.3 Live run propagation

**Problem:** SSE filters by `organizationId` while the writer sets only `entityId`; live agent runs do not reliably reach the UI.

- [ ] Populate the same organization/entity fields used by the reader.
- [ ] Remove unsafe casts around the filter.
- [ ] Ensure run IDs are globally unique.
- [ ] Verify agent run start, step, completion, failure, and escalation events in the Agent rail.

**Primary files:**

- `packages/agents/core/orchestrator.ts`
- `apps/web/app/api/agent-events/route.ts`
- `apps/web/components/ai-native-v2/stream-feed.tsx`
- Live-run schema and router

### Phase 5 acceptance tests

- [ ] Mission launch creates a durable task/run.
- [ ] Task progress reflects real agent events.
- [ ] Agent failure is visible and recoverable.
- [ ] Retry does not duplicate financial writes.
- [ ] Approval and escalation are visible in Activity Hub.
- [ ] Agent audit includes entity, actor/agent, confidence, input/output summary, and resulting record IDs.
- [ ] Trigger.dev retry and Vercel timeout simulations pass.

---

## Phase 6 — Financial truth and reporting reconciliation [P1]

**Goal:** Every number users see is derived from the correct entity, period, and ledger state.

- [ ] Financial Pulse period selector affects P&L, cash flow, trial balance, tax, narrative, and anomaly queries consistently.
- [ ] Follow-up prompts use actual loaded metrics, never fabricated zero context.
- [ ] Report export cannot produce a blank report while data is still loading.
- [ ] Cash, AR, AP, revenue, expenses, and runway reconcile to ledger/database records.
- [ ] Ledger search behavior matches the UI promise; either implement semantic/structured search or label it as text filtering.
- [ ] Account detail shows actual balance/activity or clearly states unavailable data.
- [ ] Trial balance debits equal credits for every displayed period.
- [ ] Multi-currency values identify source currency, rate, and base currency.
- [ ] Financial reports are entity-scoped and period-scoped at every query.

**Primary areas:**

- `apps/web/app/dashboard/financial-pulse/page.tsx`
- `apps/web/app/dashboard/ledger/page.tsx`
- Reporting routers and reporting agent
- `packages/agents/platform/reporting-agent/**`

### Acceptance tests

- [ ] Two entities never see each other’s financial data.
- [ ] Switching entity invalidates all relevant cached queries.
- [ ] Switching period changes every applicable report consistently.
- [ ] Dashboard totals equal independently computed database totals.
- [ ] Exported report equals visible report data.
- [ ] Empty data produces an honest empty state, not invented values.

---

## Phase 7 — Security, privacy, and operational controls [P1]

**Goal:** Production data and operations are protected beyond happy-path authorization.

- [ ] Verify RLS/entity isolation for every financial table and database connection path.
- [ ] Audit all admin and user mutations for actor, entity, reason, confidence, and result.
- [ ] Verify rate limits on auth, chat, uploads, admin, and expensive agent operations.
- [ ] Verify account lockout/brute-force protection.
- [ ] Verify upload MIME/type/size validation and malware/scanning strategy.
- [ ] Verify no secrets, tokens, or sensitive financial data appear in logs.
- [ ] Verify Sentry is configured in Vercel and receives a test error with PII redacted.
- [ ] Verify LangFuse/observability credentials and trace retention.
- [ ] Verify backups, restore procedure, and database migration rollback procedure.
- [ ] Verify GDPR/data export/deletion behavior where applicable.
- [ ] Verify incident response and alert routing.

---

## Phase 8 — Release verification on Vercel [P0]

**Goal:** Prove the deployed system works in a production-like environment despite local memory constraints.

### Preview deployment gate

- [ ] Create a Vercel preview deployment from the remediation branch.
- [ ] Use a separate staging database.
- [ ] Run database migrations through the approved migration workflow.
- [ ] Seed only staging fixtures.
- [ ] Run anonymous smoke tests.
- [ ] Run authenticated smoke tests.
- [ ] Run core workflow tests against the preview URL.
- [ ] Inspect Vercel function logs for errors and timeouts.
- [ ] Inspect browser console/network errors on all five dashboard surfaces.
- [ ] Verify Sentry events and agent telemetry.

### Production deployment gate

- [ ] Confirm production environment variables are present and correct.
- [ ] Confirm production database backup/restore point.
- [ ] Confirm migrations are reviewed and generated by Drizzle.
- [ ] Confirm no demo seed route is enabled.
- [ ] Confirm release commit and migration version.
- [ ] Deploy only after all P0 acceptance tests pass.
- [ ] Run post-deploy smoke tests.
- [ ] Verify login, entity selection, Command Center, Activity Hub, Financial Pulse, Ledger, Operations, and admin authorization.
- [ ] Monitor errors and financial write outcomes after deploy.

---

# Core End-to-End Test Matrix

Each test must verify both the UI result and the database/resulting business state.

## Authentication and onboarding

- [ ] Register new user.
- [ ] Login with credentials.
- [ ] OAuth login if enabled.
- [ ] Complete onboarding.
- [ ] Skip onboarding.
- [ ] Refresh/resume onboarding.
- [ ] Duplicate-submit onboarding mutations.
- [ ] Logout/session expiry.
- [ ] Unauthorized dashboard/admin access.

## Command Center and agents

- [ ] Ask for P&L.
- [ ] Ask for cash position.
- [ ] Launch month-end close mission.
- [ ] Launch overdue receivables mission.
- [ ] Launch bank categorization mission.
- [ ] Upload a document and ask the AI to process it.
- [ ] Receive tool trace, confidence, citation, and final answer.
- [ ] Receive human escalation for low confidence.
- [ ] Cancel a stream.
- [ ] Retry a failed task.
- [ ] Reopen conversation and verify persistence.

## Activity Hub

- [ ] Approve a real agent proposal.
- [ ] Reject with note.
- [ ] Batch approve mixed success/failure items.
- [ ] Snooze and reload.
- [ ] Dismiss and reload.
- [ ] Verify unauthorized role behavior.
- [ ] Verify resulting accounting/business record.

## Financial Pulse

- [ ] View current period.
- [ ] Switch period.
- [ ] Inspect P&L.
- [ ] Inspect cash flow.
- [ ] Inspect forecast.
- [ ] Investigate anomaly.
- [ ] Ask follow-up.
- [ ] Export report.
- [ ] Reconcile all visible values to database.

## Ledger

- [ ] View journal register.
- [ ] Search/filter entries.
- [ ] Open entry detail.
- [ ] Explain entry through AI.
- [ ] Open account detail.
- [ ] View trial balance.
- [ ] Verify debits equal credits.
- [ ] Verify closed-period protections.
- [ ] Verify reversal behavior.

## Operations

- [ ] Create invoice.
- [ ] Record AR payment.
- [ ] Create bill.
- [ ] Record AP payment.
- [ ] View customers/vendors.
- [ ] View bank transactions.
- [ ] Categorize/reconcile a transaction.
- [ ] Use every Ask AI action.
- [ ] Verify postings and balances.

## Month-end close

- [ ] Start close.
- [ ] Observe durable progress.
- [ ] Complete all valid steps.
- [ ] Require approval where appropriate.
- [ ] Post real depreciation.
- [ ] Retry after injected failure.
- [ ] Retry after timeout.
- [ ] Run concurrently from two clients.
- [ ] Reopen only with valid authorization and recovery state.
- [ ] Verify period, journal, audit, and notification state.

## Admin

- [ ] Admin login.
- [ ] Session revalidation.
- [ ] Read-only access.
- [ ] User management.
- [ ] Organization management.
- [ ] Review queue action.
- [ ] Agent monitor.
- [ ] Cost/usage view.
- [ ] Settings persistence.
- [ ] Audit log inspection.
- [ ] Destructive-action protection.
- [ ] Demo seed disabled in production.

---

# Explicitly Out of Scope for This Production Pass

- Marketing pages and marketing copy.
- New sidebar surfaces without explicit approval.
- Mobile or desktop applications.
- Unrequested product expansion.
- Cosmetic redesign unrelated to a broken workflow or accessibility requirement.
- Replacing the AI-native five-surface model with traditional page-per-function navigation.

---

# Required Working Rules

- Follow the Xenboox entity-scoping rule on every query.
- Use Zod validation on every procedure.
- Use `protectedProcedure` for authenticated entity-scoped user operations.
- Use the admin permission procedure for admin mutations.
- Use database transactions for related financial writes.
- Use Drizzle-generated migrations only; never hand-write migration SQL.
- Never hardcode entity context, currency, business totals, confidence, or operational metrics.
- Never use random values in production data or read paths.
- Never hide a failed mutation behind a success state.
- Never allow an agent to guess financial facts.
- Never declare completion without deployment or targeted verification evidence.
- Update `BUILD_LOG.md` after each approved implementation batch.

---

# Implementation Order

1. [ ] Phase 1 — financial integrity and ledger safety.
2. [ ] Phase 2 — core dashboard workflows.
3. [ ] Phase 3 — truthful onboarding.
4. [ ] Phase 4 — admin safety and truthful operations.
5. [ ] Phase 5 — agent execution and job reliability.
6. [ ] Phase 6 — financial/reporting reconciliation.
7. [ ] Phase 7 — security/privacy/operations.
8. [ ] Phase 8 — Vercel preview and production release verification.

No later phase can override a failed earlier phase. If implementation reveals a change to scope or architecture, stop and update this document before continuing.

---

# Approval Gate

This document is the production plan. Code changes begin only after explicit approval of this plan or of a clearly scoped phase.

Recommended first approval scope:

> Approve Phase 1 and Phase 2 of `prodway.md`: financial integrity/ledger safety and core dashboard workflow correctness. Do not change onboarding or admin yet except where required to keep those phases safe.

---

# Change Log

- **2026-09-05:** Created from live Vercel verification, dashboard/admin code tracing, agent execution audit, accounting posting audit, architecture reference, and database reference.
- **2026-09-05 (2nd pass):** Deep code re-audit of the working tree. Recorded verified-fixed items (A), still-open original findings (B), and 13 new issues (C) including the neon-http transaction-shim P0 (db.transaction silently non-atomic by default), TrustGuard bypass on journal approval, cross-tenant escalation write, random bank-transaction fabrication, and Math.random admin telemetry. Updated remediation priority order (E).
