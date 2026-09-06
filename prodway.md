# Xenboox Production Way

> **THIRD-PASS DEEP AUDIT (2026-09-06) — COMPLETE.** Full-stack audit after the AI-native redesign. Executive synthesis below; per-layer evidence in "Third-Pass Audit Log" (Parts 1–6) further down. Prior passes preserved below.

---

# Executive Synthesis (2026-09-06)

## The verdict

**Not production-ready — but this is NOT a rebuild situation.** The owner asked whether huge parts must be redone. The answer after auditing every layer is **no**: Xenboox is a real system — real auth (MFA, session revocation, separate admin control plane), real multi-tenant entity scoping enforced server-side, real double-entry posting with validation/atomicity/idempotency, real LLM inference with cost governance, real RAG, 2,700+ tests. The redesign work (phases A/B/C) landed and functions.

What separates Xenboox from shippable is a **bounded list**: 3 P0s, ~13 P1s, ~10 P2s — concentrated in four clusters: (1) the DB driver that quietly voids every atomicity/RLS claim, (2) demo/fake data still reachable in production (one admin click wipes all tenants' review data), (3) observability plumbing that hides real agent runs and leaks events across tenants, (4) close-path durability. Fix the list; do not rewrite the platform.

## What you HAVE (real, production-grade — stop worrying about these)

| Layer | Evidence |
|---|---|
| AuthN/AuthZ | Real TOTP MFA w/ single-use backup codes; lockout; sid-verified session revocation on every request; idle timeout; SSO + domain enforcement; separate admin identity w/ per-call DB session recheck + role×epic permission matrix |
| Multi-tenancy | Server-enforced entity scoping (org_roles → user_entity_access); FORBIDDEN on arbitrary entityId; customer routers consistently scoped |
| Posting core | Journal/AR/AP/expenses route through TrustGuard + open-period checks + race-safe numbering + reference idempotency; overpayment guards; payment state machines; void-and-reverse instead of delete; audit rows on mutations |
| AI inference | Real provider adapters (Anthropic/OpenAI/Vertex/Bedrock), honest error propagation, per-entity budget gateway + kill-switch + alerts, LangFuse with PII redaction, semantic cache, hybrid RAG |
| UX redesign | `?prompt=` consumed once; tasks rail unified (Needs-you/Running/Done); task→conversation inline loading; inline Ask drawer wired on all core surfaces; thinking shows human sentences only; keyboard triage |

## What is BROKEN (fix before ship — evidence per part below)

| # | Severity | Finding | Where |
|---|---|---|---|
| 1 | **P0** | `db.transaction()` silently non-atomic on default driver; RLS context a no-op; all atomicity claims conditional on `USE_RLS=true` | Part 1 #6–7 |
| 2 | **P0** | `reviewQueue.seedDemoData` — global DELETE, no WHERE, one admin click wipes every tenant's review data (plus ~8 sibling unscoped seeds) | Part 3 #1 |
| 3 | **P0** | Entity switch renders previous entity's cached financials (no cache invalidation, staleTime 30s) | Part 4 #9 |
| 4 | P1 | Journal approval bypasses balance/period re-check → can post into a CLOSED period | Part 1 #8 |
| 5 | P1 | Close: durable sessions are dead code; in-memory idempotency; two divergent close implementations; `withTimeout` doesn't cancel | Part 1 #9–11 |
| 6 | P1 | Banking demo sync inserts fabricated random money into real `bankTransactions`, returns `synced: true` | Part 1 #12 |
| 7 | P1 | SSE: real agent runs invisible (`organizationId` vs `entityId` mismatch) **and** `opsLiveRunEvents` unscoped → cross-tenant leak | Part 6 #6–7 |
| 8 | P1 | 210 hardcoded `confidence:` literals — HITL escalation thresholds decorative on most paths | Part 6 #8 |
| 9 | P1 | Embeddings fall back to deterministic mock vectors — knowledge search silently returns nonsense | Part 6 #9 |
| 10 | P1 | Admin user/org mutations: non-transactional, wrong actor (`grantedBy: entityId`), hard deletes, no audit, no permission matrix | Part 3 #3 |
| 11 | P1 | Fake business metrics persisted via production-reachable seed mutations (MRR $700k+, fake latency, fake runs) | Part 3 #2 |
| 12 | P1 | Approval "audit trail" is an in-memory object, never persisted | Part 1 #13 |
| 13 | P1 | Tasks page stitches 3 client sources (notifications re-enter the queue) against the redesign's own spec | Part 4 #10 |

P2s: `statusCode` timestamp column; `cleanupJournal` swallowed deletes; seed-demo missing prod guard; plaintext reset tokens; no MFA attempt throttle; non-timing-safe SCIM compare; `RUN-` prefix collisions; no batch approve; loading-state zeros on Pulse; hardcoded USD/GM in JIT provisioning; unbounded period export query.

## What you LACK (to be the real accounting department for 1-person → SME → corporation)

**Table-stakes accounting not yet built:** fiscal-year lock + retained-earnings rollforward; bank **statement** reconciliation workflow (statement vs feed, matched/adjusted states); sales-tax/VAT return reports; credit notes as first-class documents; 1099/vendor year-end reporting; year-end close (beyond monthly).
**Enterprise platform:** multi-entity consolidation w/ eliminations (router is a stub); Stripe billing (zero billing provider exists — plans exist in schema, no money movement); tamper-evident (hash-chained, exportable) audit trail; org-level MFA enforcement; user device/session management UI; DR/backup runbook + restore drills; data-residency options; accountant/auditor read-only seats (role enum exists — verify UI gating).
**AI-native ops:** computed (not literal) confidence feeding the HITL gate; prompt versioning + CI-wired eval suite per agent; durable agent work on Trigger.dev; prompt-injection hardening for ingested documents; token-level streaming through the router.

## The path to production (ordered; no wave starts before the previous passes)

**Wave 0 — Safety (days).** Commit the working tree; restore/replace semgrep config. Delete or dev-gate **every** `seedDemoData` (start with review-queue.ts:330) and remove the UI buttons. Make the driver decision: default `USE_RLS=true` (Pool) for all serverless posting paths or split read/report traffic — then `db.transaction()` is real everywhere. Fix entity-switch cache invalidation (`queryClient.removeQueries()` on switch, remove fake 1.2s timer). Add NODE_ENV=production guards to seed-demo + all seeds.
**Wave 1 — Ledger truth (1–2 wks).** Approval-time re-validation (balance, period-open) in `approvals.resolve`; route JE approval through canonical posting. Wire `closeSessions` into the executing close; converge `jobs/month-end-close.ts` onto the pipeline (period-end dates, TrustGuard, TB snapshot); replace in-memory idempotency with DB keys; `withTimeout` → AbortSignal. Remove demo money from banking sync (explicit demo surface or nothing). Durable audit rows for every approval.
**Wave 2 — Truth in the UI (1 wk).** Fix SSE (writer sets `organizationId` or reader filters `entityId`; scope `opsLiveRunEvents`; full-length runIds). Delete every `Math.random()` from read paths → honest empty states. Remove notifications stitching from the Tasks page (server-side unified queue). Add batch approve. Loading/error gates on every numeric block.
**Wave 3 — Security hardening (1 wk).** Hash reset/verification tokens at rest; MFA attempt throttle; constant-time SCIM compare; device/session management UI; org-level MFA policy; document backup/restore + run a restore drill.
**Wave 4 — Admin that can run the company (per Part 5).** `adminPermissionProcedure` everywhere; transactional user/org lifecycle with soft-delete + audit + correct actor; impersonation-with-audit; Customer 360; consolidate 35 pages → ~15 (Customers / AI Ops / Platform / Access / Money / Content); real writers for runs/cost; Stripe when billing is scheduled (keep honest stub until then).
**Wave 5 — Accounting completeness.** Fiscal-year lock + retained earnings; statement-based reconciliation; credit notes; VAT/tax reports (market-first); consolidation when multi-entity customers demand it; 1099/vendor reporting.
**Wave 6 — Release gate.** Run the Phase 8 Vercel preview/production gate already specified below (staging DB, migrations, smoke tests, reconciliation of dashboard numbers to DB, Sentry/LangFuse checks). Ship when the Release Standard at the top of this document is provably met.

## Straight answers to the owner's questions

- **"Do you get what's at stake?"** Yes — customers will trust this platform with their books. That's why findings are flagged, not hedged: fabricated money, fake metrics, and a global delete have no place in an accounting product regardless of how small they look.
- **"Is the AI real or a chatbot claim?"** The inference is real (real providers, budgets, RAG, honest errors). What's fake is the *confidence reporting* and *run visibility* — fix those and the AI-native story is truthful.
- **"Does admin need a full redo?"** No — consolidate and de-fake it (Part 5). Its identity/permission core is the best-built subsystem in the repo; its telemetry is the worst.
- **"Can we serve a 1-person business today?"** After Waves 0–2, yes for core books (invoicing, expenses, bank, close, reports). The SME/corporation features (consolidation, fiscal lock, VAT) are Waves 5+ and should gate which customers you onboard first.

---

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

---

# Third-Pass Audit Log (2026-09-06)

> Full-stack audit after the AI-native redesign (commits `875d5ae1` tasks unification, `80c31a9f`/`85ae67dd`/`8c4d9184` phases A/B/C). Method: direct code tracing of the current working tree, one layer at a time. Every finding cites file:line. Prior finding IDs (A/B/C series from the 2026-09-05 second pass) are re-verified.

## Part 1 — Accounting Core

### Verified FIXED since second pass

1. **[FIXED] C3 cross-tenant escalation write.** `approvals.ts:162-167` now filters `agentRoutingLogs` by `entityId`; the `agentActivity` fallback branch is also entity-scoped (`approvals.ts:229-234`). Escalation IDs from another entity are indistinguishable from nonexistent ones.
2. **[FIXED] B1 approval ID-space mismatch (partially).** `approvals.ts:209-259` implements the dual resolver: routing-log ID first, `agentActivity` fallback with atomic `status!=='resolved'` claim + honest CONFLICT vs NOT_FOUND errors. Approvals from the ingestion path can now succeed.
3. **[FIXED] Depreciation fabrication (both implementations).** `close-pipeline.ts:954-957` and `packages/jobs/month-end-close.ts:170-173` both derive amounts from `depreciationSchedule` joined to `fixedAssets`.
4. **[FIXED] AR/AP record layer is genuinely production-grade.** `ar.ts` recordPayment has an overpayment guard (`ar.ts:669` "Payment amount exceeds invoice balance") with a race re-check (`ar.ts:694`), partial-payment state machine (`paid`/`partial`/`overdue` via payments + overdue job, `ar.ts:440`), payment delete restores balance/status from remaining payments (`ar.ts:1059-1079`), posted invoices/payments protected from hard delete with void-and-reverse flow (`ar.ts:940-972`), permission-gated (`requirePermission("accounts_receivable", …)`) and every mutation writes an `auditLog` row.
5. **[FIXED] Race-safe entry numbering** in `journal-posting-core.ts:114-178` (retry on `je_entity_entry_number`/`je_entity_reference` conflicts; returns the winner's durable result).

### Still OPEN

6. **[P0 — unchanged, C1] `db.transaction()` is not atomic on the default driver.** `packages/db/client.ts:20-37`: default is neon-http unless `USE_RLS=true`. The shim at `client.ts:51-70` catches "No transactions support" and executes the callback **sequentially with no rollback**. Consequently every atomicity guarantee in `journal-posting-core.ts:116`, AP/AR posting, close snapshots, FX revaluation, expenses, and admin multi-writes is **conditional on an env var that defaults off**.
7. **[P0 — unchanged, C1 consequence] RLS session context is a no-op on the default driver.** `setRlsContext` (`apps/web/lib/trpc/server.ts`) issues `set_config('app.current_entity_id', …, true)` — transaction-scoped — but on neon-http each statement is its own HTTP request/implicit transaction, so the GUC is set and immediately discarded. DB-layer entity isolation exists only under `USE_RLS=true` (Pool + WebSocket). Whether production sets it is unverifiable from the repo → **release-gate question**. (RLS migrations `0006`, `0010`, `0030 FORCE` exist.)
8. **[P1 — narrowed from P0, C2] Journal approval still bypasses validation at approval time.** `approvals.ts:282-297`: `draft → posted` via bare conditional UPDATE. No `validateJournalEntry`, no debits=credits re-check, **no open-period re-check** — a draft whose fiscal period closed while pending approval posts into the **closed period**. (Drafts are validated at creation — `journal.ts:956,1043` — and there is no line-edit API, which narrows the window; the closed-period hole remains.)
9. **[P1 — unchanged, C8] Two divergent close implementations.** `packages/jobs/month-end-close.ts` still has **zero** TrustGuard / trial-balance-snapshot usage (grep count 0) and stamps the JE with `date: new Date()` (`month-end-close.ts:237`) — today's date, not the period end. The pipeline (`close-pipeline.ts`) validates, snapshots, and uses period end. Same business action, two ledger outcomes depending on trigger path.
10. **[P1 — unchanged, B10] Durable close sessions are dead code.** `openCloseSession` (`close-pipeline.ts:1484`) has **no caller** outside its own test. The executing close still gates on in-memory idempotency maps (`close-pipeline.ts:272,377,466,514` → `packages/agents/core/retry.ts`) — lost on restart, per-instance on Vercel; a retried close can double-run.
11. **[P1 — unchanged, C5] `withTimeout` does not cancel work** (`packages/agents/core/retry.ts:235` race-style reject). A timed-out close keeps running and may still post adjustments while the caller reports failure.
12. **[P1 — unchanged, C4] Banking demo sync fabricates real-looking money.** `banking.ts:2191-2216` (`generateDemoTransactions`) creates 15–20 random-amount transactions ("SALARY PAYROLL" $2k–6k etc.) and inserts them into `bankTransactions` for `provider="manual"` connections (`banking.ts:780-793`); `sync` returns `{ synced: true, added: N }`. Guarded to insert only when the account has zero transactions, but these rows feed reconciliation, dashboards, and matching as if real. Demo data must be explicit, labeled, and excluded from financial aggregation — or removed.
13. **[P1 — new] Approval audit trail is not durable.** `approvals.ts:331-341` builds `createAuditEntry` — an **in-memory object factory** (`packages/agents/core/state.ts:60-68`) — and returns it to the client. Nothing is persisted. The only durable trace is `postedBy`/`postedAt` on the JE and `humanResponse` on the escalation log. Enterprise requirement: durable, immutable audit row (actor, action, reason, timestamp, result) for every approval.
14. **[P2 — unchanged, C6] `statusCode` column is a timestamp.** `packages/db/schema/idempotency.ts:9`: `statusCode: timestamp("status_code")` — intended integer HTTP status. The DB idempotency wrapper writes through it; cleanup logic is therefore wrong-typed.
15. **[P2 — unchanged] `cleanupJournal` hard-deletes posted rows with swallowed errors.** `journal-posting-core.ts:188-197` (`.catch(() => {})` on both deletes).

### Verdict (Part 1)

The record layer (journal/AR/AP/expenses posting, payment state machines, overpayment guards, entity scoping, permissions, audit rows) is **real and close to production-grade**. The remaining accounting risks are concentrated in: (a) the transaction/RLS driver decision that underwrites every atomicity claim, (b) close-path durability + divergence, (c) approval-time revalidation, (d) demo money in the banking feed.

**Missing for a real accounting platform (enterprise):** fiscal-year lock and retained-earnings rollforward; multi-entity consolidation with eliminations; bank reconciliation *statement* workflow (import statement vs feed, matched/adjusted/unmatched states); sales tax/VAT return reports; 1099/vendor tax reporting; credit notes as first-class documents (AR has partial flows); budget-vs-actual committed to ledger snapshots; accountant/auditor read-only seats; period-lock exceptions (legal hold). Consolidation exists as a router stub only — verify before claiming.

## Part 2 — Auth & Security

### Verified solid (do not rebuild)

1. **Credentials auth is real**: bcrypt compare, lockout after 5 failures/30 min (`auth.ts:154-174`, `lib/auth/index.ts:199-242`), email-verification gating on writes via `requireVerifiedEmail` middleware, password strength policy at registration (`auth.ts:228-235`).
2. **MFA is a real TOTP flow**, not theater: otplib + QR provisioning, bcrypt-hashed single-use backup codes (`lib/auth/totp.ts`), password-verified challenge token → `/mfa-challenge` → `completeMfaChallenge` → direct-auth token → session (`auth.ts:125-188`, `949-1051`; `mfa-challenge/page.tsx`).
3. **Server-side session revocation works**: every tRPC request re-checks the JWT's `sid` against the `sessions` table (`lib/trpc/server.ts:186-190`); `session-revocation.ts` revokes on password change (keeps actor session) / reset / role change. Not a stateless-only JWT setup.
4. **Idle timeout** (`applyIdleTimeout` in jwt callback) + hard-expiry re-login flow with `callbackUrl&expired=1` handling in middleware (`middleware.ts:227-234`).
5. **Admin control plane is genuinely separate**: `admin_users`/`admin_sessions` tables, JWT + DB session re-check on **every** admin call (`lib/trpc/server.ts:860-922`), inactivity touch, revocation on role change (`revokeAdminSessions`), isolated cookie names with httpOnly/secure/sameSite (`lib/auth/admin.ts:33-48`), edge gating of all `/admin` routes to `/admin-login` (`middleware.ts:203-219`). An `adminPermissionProcedure(epic, mode)` role×epic matrix exists (`lib/trpc/server.ts:930-943`).
6. **Entity scoping is server-enforced, not client-trusted**: `entityScopingMiddleware` resolves the `x-entity-id` header against `org_roles` then `user_entity_access`, else FORBIDDEN (`lib/trpc/server.ts`). Arbitrary-tenant probes fail closed.
7. **Edge middleware is production-grade**: strict CSP with per-request nonce set on request+response headers (`middleware.ts:95-112`), origin validation on all mutations (`:115-119`), categorized rate limiting — credentials-POST-only login limiting, webhook, api-read, api write buckets with trusted-proxy-safe client IP (`:128-193`).
8. **Webhooks verify signatures**: Plaid verification header, Mono/email HMAC (`api/webhooks/*`). Cron routes require `x-cron-secret` (`api/cron/month-end-close/route.ts:34-37`). Public API v1 uses SHA-256-hashed keys with prefix lookup + tier rate limits (`api/v1/[[...params]]/route.ts:47-105`). Donor portal uses single-use magic links; `/pay/[token]` tokens expire. Uploads validate type + size.
9. **No hardcoded secrets found** in source.

### Still OPEN / new

10. **[P2 — C12 unchanged] `seed-demo` lacks a NODE_ENV guard.** `api/seed-demo/route.ts:17` checks only `SEED_DEMO_TOKEN`; if that env var is ever set in production, a bearer-token holder seeds a hardcoded entity into the production DB. Add an explicit `NODE_ENV !== "production"` rejection.
11. **[P2 — new] Password-reset and email-verification tokens are stored plaintext** (`auth.ts:420-431`, `290-303` — `nanoid(32)` written as-is). A DB leak enables account takeover. Store SHA-256 hashes; look up by hash. (Entropy is fine; this is about at-rest exposure.)
12. **[P2 — new] `completeMfaChallenge` has no dedicated attempt counter.** `auth.ts:949` is a publicProcedure; TOTP guessing is throttled only by the general edge API limit. Add per-mfaToken failure counting (e.g. 5 fails invalidates the challenge token, mirroring the admin MFA flow).
13. **[P3 — new] SCIM token comparison is not timing-safe** (`api/scim/v2/route.ts:38` `token === configuredToken`). Use a constant-time compare.
14. **[P2 — cross-cutting from Part 1] RLS context + transactions are inert on the default neon-http driver** (`packages/db/client.ts`, `setRlsContext`). All DB-layer isolation claims depend on `USE_RLS=true` in production — **unverified release-gate item**.
15. **[P3 — new] `ensureUserEntity` (SSO JIT provisioning) hardcodes `currency: "USD"`, `country: "GM"`** (`lib/auth/index.ts:101-111`) — same honesty problem as onboarding; the entity is created with defaults the user never chose.

### Enterprise security gaps (what's missing for enterprise-grade)

- Org-level **MFA enforcement policy** (require 2FA for all members of an org) — MFA is per-user opt-in today.
- **Session/device management UI** for end users (list active sessions, revoke) — the sessions table supports it; no user-facing surface.
- **Tamper-evident audit trail** (append-only/hash-chained, exportable) — `auditLog` rows are plain mutable rows.
- **Data-residency/region selection**, documented **backup/restore + DR** runbook, **PII redaction verification** on Sentry/LangFuse in production, periodic **access reviews**.
- Security testing cadence (the repo previously had `.semgrep/xenboox-security.yml` — now deleted in the working tree; restore or replace with CI SAST/dependency scanning).

**Part 2 verdict:** AuthN/AuthZ architecture is the strongest layer of the platform — real MFA, real revocation, real multi-tenancy checks, real admin separation. Remaining items are hardening (P2s), not rebuilds.

## Part 3 — Router Sweep (fabrication, scoping, concurrency)

### P0 / P1

1. **[P0 — B7 unchanged] `reviewQueue.seedDemoData` wipes ALL tenants' review data.** `apps/web/server/routers/review-queue.ts:330-335`: four `db.delete()` calls with **no WHERE clause** (reviewItemEvidence, reviewItemHistory, reviewItemActions, reviewItems). Reachable from a UI button in production (`app/admin/review-queue/page.tsx:553`) under `adminProtectedProcedure`. One click destroys every organization's review queue. The same unscoped-seed pattern exists in ~8 other admin routers (automation-studio, company-brain, customer-diagnostics, feature-flags, infrastructure, logs-traces, ops-console, live-runs) — most are less destructive because they seed rather than delete, but all are unscoped and production-reachable.
2. **[P1 — B5 partially unchanged] Fake business metrics still persisted via seed mutations.** The false-success pass fixed the *read* paths (cost comparison now uses real `getTrailing30DayModelUsage`, admin.ts:666-689; settings persist to feature_flags with audit rows, admin.ts:577-634), **but** the seed mutations remain production-reachable and persist fabricated numbers: `ops-console.ts:438-494` seeds fake MRR ($700k+), 1,200 orgs, fake gross margin into `opsMetricsDaily` (only guard: "tables empty"); `logs-traces.ts:698-716` seeds fake p50/p95/p99/request/error metrics labeled `environment: "production"`; `live-runs.ts` (~560-680) fabricates 10 agent runs with random progress/amounts/confidence; `agent-monitor.ts:707-727`, `cost-analytics.ts:342-380`, `ai-workspace.ts:75`, `customer-diagnostics.ts:248-253` all still `Math.random()`. No `NODE_ENV` guard anywhere.
3. **[P1 — B6 unchanged] `admin.ts` user management is unsafe.** `createUser` (admin.ts:700-764): user insert + `userEntityAccess` grant are two non-transactional writes; `grantedBy: input.entityId` (line 757) records the **entity as the granting actor**; `updateUser` records `grantedBy: userId` — the **target user** (line 802); no admin audit row on any of these; `deleteUser` (812) / `deleteOrganization` (878) are bare hard-deletes with no confirmation, no last-admin protection, no audit. All still use broad `adminProtectedProcedure` — the `adminPermissionProcedure` matrix is never applied to them.
4. **[P1 — new] Fabricated AI confidence on user-facing features.** `company-brain.ts:692-694`: `confidence: (0.7 + Math.random() * 0.3)`, `helpful: Math.random() > 0.3` — random confidence and fake helpfulness votes presented as AI output quality signals.

### Fixed / verified honest

5. **[FIXED] Phase C tasks backend is real.** `tasks.ts` (703 lines): entity-scoped unified queries over `closeTasks` + `opsLiveRuns` + `dailyCloseRuns`, `conversationId` from migration 0039 with `metadata.conversationId` fallback, artifacts loaded from `chatMessages`, open escalations counted from `agentRoutingLogs` scoped by `entityId` **and** `conversationId` (tasks.ts:209-214). Client shape drops agent names.
6. **[FIXED] Thinking events emit human sentences only.** `api/chat/stream/route.ts:631-638` emits `{ type: "thinking", text: step.note }` — no agent names/labels/timings; `durationMs` remains only on tool-trace payloads (Details-level, per toAInative §5).
7. **[FIXED] Admin settings persistence** (`admin.ts:577-664`) — transactional upserts to `featureFlags` + `featureFlagAuditLog` rows with real actor email; `getSettings` hydrates.
8. Swallowed-error patterns are rare (23 `.catch(() => {})` across server+agents, 0 bare `catch {}`); most banking list queries are limit-bounded (period export query at `banking.ts:232` is bounded only by date range — acceptable, monitor).

### Systemic patterns (the 3 that matter)

- **"Seed demo" is a production foot-gun class.** ~9 unscoped seed/delete mutations sit one admin click from real data. Rule needed: demo seeding only via CLI script or a dev-flag-gated procedure, never a production procedure.
- **Admin mutations lack uniform guarantees.** Some (settings) are transactional + audited; most (user/org lifecycle) are not. Apply one standard: `adminPermissionProcedure` + transaction + audit row + soft-delete lifecycle.
- **Telemetry needs writers, not seeds.** opsMetricsDaily / performanceMetrics / opsLiveRuns have no real production writers; the UIs fall back to fake seeds instead of honest "no data yet". Real writers: usage events (exists for tokens), Vercel/Trigger.dev webhooks, agent run events (exists, broken linkage per Part 6).

**Part 3 verdict:** the customer-facing accounting routers are in decent shape; the **admin backend is the weak layer** — the exact opposite of what the owner suspected about the frontend.

## Part 4 — Dashboard Frontend (post-redesign)

### Verified working (redesign acceptance §8 spot-check)

1. **Command Center consumes `?prompt=` exactly once** with ref-guard + URL cleanup (`dashboard/page.tsx:195-212`) — the B2 silent-discard finding is fixed; launchpad empty state renders goal-shaped mission cards (page.tsx:422+).
2. **Activity Hub properly redirects** to `/dashboard/tasks` (`activity-hub/page.tsx`) — decided Phase C behavior.
3. **Tasks rail is one list** grouped Needs-you / Running / Done from the unified `tasks.list` (`components/dashboard/tasks-rail-panel.tsx:124-287`); no agent names/confidence in the rail.
4. **Task click loads the thread inline** via `task.conversationId → loadConversation` — no navigation away (`dashboard/page.tsx:140-142, 244-246`).
5. **Inline Ask drawer sends real chat messages** through `useStreamingChat`/`sendMessage` with page context (`components/chat/ask-drawer.tsx:67-97`); used by Ledger, Financial Pulse, and Operations. The old `useModuleAi` no-op fallback now routes to `/dashboard?prompt=` with record context (`module-ai-context.tsx:71-80`) — B3 fixed.
6. **Financial Pulse period selector is wired** into report/anomaly/forecast queries (`financial-pulse/page.tsx:103-162`).
7. **Operations is decisions-first**: cash hero → `MoneyNeedsYou` decisions → record tables (`operations/page.tsx:5-146`); Phase B ingestion revamp is real.
8. **Tasks page keyboard triage works** (j/k/a/r + section jumping, `tasks/page.tsx:275-323`) and approve/reject call real server mutations (`approvals.resolve`, `ingestion.rejectReview`); the old fake snooze/undo is gone.

### Findings

9. **[P0 — new] Entity switch serves stale cross-entity financial data.** `setEntityId` (`lib/entity-context.tsx:201-245`) updates state + localStorage + shows a 1.2s overlay, but **never invalidates the React Query cache and never reloads**. tRPC sends `x-entity-id` dynamically per request (`lib/trpc/client.ts:100-114`), so query cache keys (path + input) do **not** include the entity. With `staleTime: 30_000` and `refetchOnWindowFocus: false`, a mounted surface renders the **previous entity's cached numbers** for the new entity until a background refetch happens — for an accountant managing multiple client entities, that's another client's cash/P&L on screen while approving or posting. Server-side scoping is safe; this is a client-truth bug. Fix: on `setEntityId`, `queryClient.removeQueries()` (or key every query by entityId) and block render until refetch settles — remove the fake 1.2s timer.
10. **[P1 — spec deviation] Tasks page still stitches three sources client-side.** `tasks/page.tsx:107-122` merges `ingestion.listAgentApprovals` + `notifications.list` + `tasks.list`. toAInative §4 explicitly killed raw notification stitching ("single query — tasks.list (+ approvals joined)"). Notifications reappearing as queue items is the exact "Activity feed pretending to be decisions" problem the redesign was meant to remove.
11. **[P2] No batch approve on the Tasks page** (spec §4: batch select + approve-all; keyboard triage shipped, batch didn't).
12. **[P2] Loading/error honesty is inconsistent on Financial Pulse** — some queries gate renders with `isLoading`/`isError`, others render derived zeros while loading. For accounting UI, every numeric block needs an explicit loading skeleton and a "couldn't load" state, never a silent zero.
13. **[P3] Surface sprawl persists** beyond the 5-surface model: `hidden`, `knowledge-graph`, `audit-trail`, `ingestion`, `settings` remain as routes; `hidden` especially should be deleted or documented.

**Part 4 verdict:** the redesign landed and works end-to-end; the entity-switch cache bug is the one must-fix-before-ship frontend item.

## Part 5 — Admin Console: Audit + Rebuild Proposal

### Audit of all 35 admin pages

**Honest stubs (render "Coming soon", lie to no one) — 7:**
`billing`, `subscriptions`, `trials`, `churn`, `services`, `deployments`, `support`. All ~38 lines. Notably there is **no billing provider in the repo at all** (no Stripe — grep confirms), so these are honest placeholders for unbuilt capabilities.

**Real, data-backed, keep — 13:**
`users`, `organizations` (paginated lists + create flows via `admin.listUsers`/`listOrganizations`, admin.ts:359-420 — but mutations carry Part 3 finding #3), `admin-users` + `audit-log` (`adminAccess.users`/`adminAccess.audit` — the strongest pages: role matrix, session enforcement), `settings` (now persists to feature_flags + audit), `analytics` (`admin.getAIUsage`), `alerts` (`admin.getSpendAlerts`), `token-usage` (real `ops_token_by_model` after the false-success fix), `sso` (471 lines, config + SCIM), `feature-flags` (real flags table + audit log — minus its unscoped seed wipe at feature-flags.ts:239-241), `blog` (1,157 lines), `careers` (788 lines), `model-ops` (1,366 lines, real assignments/evaluations/cost CRUD).

**Seed-dependent / fabricated telemetry — will show invented numbers — 10:**
`logs-traces`, `agent-monitor`, `live-runs`, `infrastructure`, `customer-diagnostics`, `customer-health`, `company-brain` (random confidence on user-facing knowledge answers), `ai-comparison`, `spending` (cost-analytics has Math.random provider spend), and whatever renders `ops-console.ts` metrics. All have an admin-visible "seed demo" button that persists random data with no dev guard (Part 3 finding #2).

**Dangerous — 1:**
`review-queue` — real review data, real actions, **plus the P0 global-delete seed** (review-queue.ts:330-335).

**Unclear/mixed — 3:** `llm-router` (`llmRouter.getOverview` — verify realness), `workflow-builder` (1,130 lines, needs realness check), `prompts` (980 lines).

### The owner's actual question: "if you were in charge, what would admin look like?"

Admin exists to run the company: **support customers, watch the AI fleet, manage money and access, keep the platform healthy.** The current 35-page sprawl is 7 stubs + 13 real + 10 fake. The rebuild is not a rewrite — it's **consolidation + honesty + the 4 missing operator tools**.

**Target IA — 6 sections, ~15 pages:**

1. **Customers** (merge: users, organizations, support, trials, churn)
   - *Org list* (exists) → *Org detail*: entity access inspector, plan/limits, flags, recent audit, "act as" (impersonation with time-boxed, audited, banner-visible session — the single highest-leverage support tool, doesn't exist today).
   - *Customer 360 / Support*: lookup by email/org → their entities, recent errors (Sentry), recent runs, financial snapshot (read-only), add note/case. Needs: one case/notes table + composed queries. Effort M.
   - Trials/churn stay stubs until there's a lifecycle engine; fold into org list as status columns.
2. **AI Operations** (merge: agent-monitor, live-runs, logs-traces, ai-comparison, llm-router, model-ops, prompts, spending, token-usage)
   - *Runs*: real `opsLiveRuns` + `agentRoutingLogs` — needs the writer/reader fix (Part 6) then every run/failure/escalation is visible. Effort S after fix.
   - *Cost & usage*: token-usage by tenant/model — already real. Make spending read from it, delete Math.random.
   - *Models & prompts*: model-ops + llm-router + prompt library consolidated; evals surfaced per agent.
3. **Platform** (merge: infrastructure, deployments, logs-traces infra parts)
   - Real health from `/api/health/deep`, Trigger.dev run status, Sentry feed. **No seeded numbers — empty state until data exists.** Effort M (integration, not invention).
4. **Access & Security** (admin-users, sso, audit-log, feature-flags, sessions)
   - Keep all. Add: audit-log export + hash-chaining (tamper-evidence), org-level MFA enforcement policy, admin session list with revoke.
5. **Money** (billing, subscriptions + review-queue financial bits)
   - Keep honest stub until Stripe is chosen and integrated (checkout + webhooks + invoice sync + dunning). Do NOT fabricate revenue numbers in the meantime (ops-console MRR seeds violate this). Effort L when scheduled.
6. **Content** (blog, careers)
   - Real content management, works — keep as-is.

**Delete/merge list:** merge 7 telemetry pages into 3 (Runs, Cost & usage, Platform health); delete `ai-comparison`, `customer-diagnostics` (fold into Customer 360); every `seedDemoData` procedure and its UI button **goes away** — dev fixtures move to a CLI script run against dev DBs only.

**Build order:**
- **P0 safety (hours, not days):** delete/gate all seedDemoData (esp. review-queue.ts:330-335); `adminPermissionProcedure` on every admin.ts mutation; transaction + audit row + soft-delete for user/org lifecycle; fix `grantedBy` actor; remove Math.random from read paths (render honest empty states).
- **P1 truth:** fix opsLiveRuns writer/reader so Runs shows real data; spending/token pages read real aggregates.
- **P2 operator jobs:** impersonation-with-audit; Customer 360; Platform health page.
- **P3:** Stripe billing; evals UI; audit immutability.

**Verdict:** Admin is **salvageable incrementally** — the identity/permission/audit foundations (admin-users, adminAccess, sessions) are the best-built part of the whole platform. What's rotten is the telemetry layer (fake seeds) and the missing operator workflows (support/impersonation/billing). Rebuild those; don't rebuild the shell.

## Part 6 — AI/Agent Layer, Inference, Jobs

### What is REAL

1. **The inference layer is real and well-engineered.** `packages/models/adapters/` (anthropic, openai, vertex, bedrock, openweight) make real provider calls; missing keys throw (`anthropic.ts:40-42`), no canned fallbacks. `entry.ts:callModel` enforces entityId-required, agent×task-type authorization, gateway budgets, LangFuse tracing with PII redaction, entity-scoped semantic cache (read-only tasks only, tools excluded), spend recording — and **re-throws errors honestly** (entry.ts:262), never converting failure into a fake answer. Router has retry-with-backoff → fallback model routing (router.ts:308-498).
2. **Cost governance exists**: kill-switch + per-entity daily token/cost ceilings + threshold alerts written as real notifications (models/gateway.ts:190-276). In-memory per process (acknowledged; DB rollup is the accounting source).
3. **RAG retrieval is real hybrid search** (vector + BM25, `packages/ingestion/engine/retrieval.ts`); embeddings via OpenAI `text-embedding-3-small`, chunked, batched, entity-scoped.
4. **Chat pipeline calls real LLMs** (`pipeline.ts:25,415` → `callModel`); orchestration is custom department-based routing with conflict detection and security checks — not literal LangGraph StateGraphs (LangGraph is used for state annotations only; AGENTS.md's "each agent is a LangGraph StateGraph" overstates reality — a doc fix, not a bug).
5. **The cron month-end route is a reminder bot only** (`api/cron/month-end-close/route.ts:41-110`): finds overdue-open periods, sends idempotent `close_reminder` notifications. It does NOT run a close — so there are exactly two close implementations (Part 1 finding #9), not three.

### What is broken or dishonest

6. **[P1 — B8 unchanged] Live agent runs are invisible via SSE.** `api/agent-events/route.ts:153-156` still queries `eq(opsLiveRuns.organizationId, entityId) as any` while the writer sets only `entityId` (`orchestrator.ts:631-645`). Predicate never matches → the user-facing Tasks rail cannot show real runs from this feed. The `as any` still hides the type error.
7. **[P1 — new] Cross-tenant run-events leak in the same SSE route.** `agent-events/route.ts:211-215` queries `opsLiveRunEvents` with **no entity filter at all** (only `createdAt >= since`) and broadcasts step messages to any connected entity. Even though the route authenticates and resolves entity access, the event query itself is unscoped — tenant A's step messages reach tenant B's stream.
8. **[P1 — C7 unchanged, now 210] Hardcoded confidence everywhere.** 210 `confidence: 0.x` literals across `packages/agents` (up from 184), plus the entry-point stamp `confidence: result.fromCache ? 1.0 : 0.95` (entry.ts:220,234). Confidence drives HITL escalation (<0.7 supervisor, <0.4 human) — on these paths the escalation policy is decorative. Only a few components (close pipeline, ingestion confidence scoring) compute real confidence.
9. **[P1 — new] Embeddings fail silently into mock vectors.** `ingestion/engine/embeddings.ts:14,194-221,343`: "graceful fallback" generates **deterministic mock embeddings** when the OpenAI key is missing or the API fails. Knowledge search then returns confidently-wrong results instead of "unavailable". Must fail loudly or disable the vector path with an honest state.
10. **[P2] `runId: RUN-${taskId.slice(0,6)}`** (`orchestrator.ts:632`) — 6-char prefix collisions on UUIDs are realistic at scale; run updates can cross wires. Use the full task id or a nanoid.
11. **[P2] Silent `catch {}` around run persistence** (`orchestrator.ts:649-651`) — observability failures are invisible by design with no fallback log; combine with #6, and nobody can diagnose why runs don't show.

### Missing for real AI-native accounting at scale

- **Real confidence semantics**: either derive confidence from tool-verified evidence (e.g., extraction field-level scores, retrieval scores) or stop displaying/acting on it; the HITL gate must read a computed value, not literals.
- **Prompt versioning + eval suite wired to CI** (eval-runner exists as a skill; a repeatable eval harness with golden datasets per agent is absent from the runtime).
- **Guardrails**: prompt-injection hardening for ingestion content (document text → LLM is an injection channel), output validation schemas per task type (some exist via tool-forcing), token-level streaming through the router (streamModel still takes the non-streaming router path — entry.ts:299-302).
- **Durable agent work**: same conclusion as Part 1 — move close/heavy runs to Trigger.dev with durable state; in-memory idempotency and race-style timeouts are not production-safe.

**Part 6 verdict:** the AI stack is **genuinely real** — real providers, real cost control, real RAG, honest errors. The failures are observability plumbing (SSE field mismatch + unscoped events) and honesty gaps (confidence literals, mock embeddings), not a simulation layer.

---

# Change Log (third pass)

- **2026-09-06:** Third-pass full-stack audit completed solo (agent delegation unavailable — quota). Six parts logged with file:line evidence: accounting core (Part 1), auth & security (Part 2), router sweep (Part 3), dashboard frontend (Part 4), admin audit + rebuild proposal (Part 5), agents/inference/jobs (Part 6). Executive synthesis added at top with have/lack/need and the Wave 0–6 production path. Headline results: prior second-pass fixes verified landed (approvals ID-space + scoping, posting atomicity structure, prompt handoff, module-AI fallback, admin settings/telemetry reads, tasks unification); 3 new/remaining P0s (driver transaction shim, review-queue global delete, entity-switch stale cache), ~13 P1s, ~10 P2s catalogued.
