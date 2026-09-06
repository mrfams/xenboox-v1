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
