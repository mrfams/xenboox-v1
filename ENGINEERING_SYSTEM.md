# XENBOOX ENGINEERING SYSTEM — Loop & Graph Engineering Standard

> Status: ACTIVE (2026-09-06). Governs every batch of the rebuild (KILLPLAN epochs; prodway waves). AGENTS.md Build Workflow (Plan→Approve→Build→Log) still applies; this document defines HOW building happens inside it.
> Prime directive: **nothing is out of the blue and nothing escapes.** Every change is a graph node. Every node passes the loop. Every loop leaves evidence.

---

## 1. Goals Ladder (goal-driven, not task-driven)

A Goal is a user-observable end state with acceptance criteria. Batches exist only to close Goals.

| Goal | End state | Acceptance criteria |
|---|---|---|
| **G0 — Safe ground** | No fake/destructive path reachable in production; real DB transactions | prodway P0s #1–3 closed; zero seeds/demo-money/Math.random in production paths; entity switch never renders cross-entity data |
| **G1 — Trustworthy ledger** | Every posting validated, atomic, idempotent, durable; approvals re-validated; close resumable | prodway Wave 1 checklist; close survives kill/retry; approval audit rows durable |
| **G2 — Truthful UI** | Every surface renders only real, period-scoped, entity-scoped data with honest states | prodway Wave 2 checklist; SSE scoped; no client stitching of queues |
| **G3 — Hardened platform** | Security hardening complete (tokens, MFA throttle, SCIM, device mgmt) | prodway Wave 3 checklist |
| **G4 — Engine v2 live** | Immutable hash-chained journal + posting service + read models behind flags; dual-write verifier green | §4.5 steps 1–4; nightly balance parity |
| **G5 — Product parity** | Epoch 2–4 scope per KILLPLAN (coverage matrix, rails, jurisdictions, firm workspace) | Epoch gates in §9/§19 |

## 2. The Graph (dependency-graph engineering)

- **Every unit of work is a node** with: id, goal, files, depends-on (edges), tests-authored, stress-cases, status.
- **Status vocabulary (strict):** `closed-deferred → spec'd → red (tests authored) → green (implemented) → reviewed (self-critique vs spec) → stress-designed → closed-deferred (verified by inspection; tests pending Run Phase)`.
- A node may only move one status per loop pass, and **each transition is stated in the session log** — that is the "nothing escapes" mechanism.
- Any discovered work that is not yet a node **becomes a node before any code is written for it**. No ad-hoc edits, ever — including "one-line fixes."
- The graph lives in this file (§6) and is updated on every node transition. `BUILD_LOG.md` carries the narrative.

## 3. The Loop (per node — no one-shot implementation)

Each node runs the full loop; a node is never "done" in one pass:

1. **SPEC** — exact behavior, files, edge cases, failure modes. Stated before any code.
2. **RED** — author the tests first (unit + edge + failure). Tests are committed, not run (see §4).
3. **GREEN** — implement to the spec and tests; no scope beyond the node.
4. **REVIEW** — self-critique against spec + AGENTS.md rules (scoping, zod, transactions, error handling). Load `engineering-critique` skill pre-close on every node touching money/auth/admin.
5. **STRESS** — design the stress cases (concurrency, retries, timeout, malformed input, hostile input, scale). Authored into the stress registry (§5), executed in Run Phase.
6. **CLOSE** — graph transition + BUILD_LOG entry. A node closes only with: spec ref, test list, stress list, review notes, and residual risks.

## 4. TDD under PC constraint — Deferred Execution Policy

- Tests are **always authored first** (RED before GREEN) — TDD discipline does not relax.
- Test **execution is deferred**: the PC cannot run the suites now. Therefore:
  - Every node lists its authored tests in the node record.
  - The **Deferred Test Registry** is the single list of suites awaiting execution (maintained in §7).
  - A scheduled **Run Phase** (user-invoked, when PC resources allow) executes the registry in priority order (money paths → auth → UI) and any failure reopens the node (`green → red`), never patched silently.
- Until the Run Phase, "verified" means: implementation inspected against spec + tests read as executable specifications + invariants restated. We do not claim green without runs — status is `closed-deferred`, never `passed`.

## 5. Stress Registry

Every money/auth/concurrency node ships stress-case designs even when not executed now: concurrent double-submit, retry-after-partial-failure, timeout-mid-write, kill-and-resume, malformed/hostile input, N-entity scale, slow-network UI races. Registered per node in §7; executed in Run Phase; failures reopen nodes.

## 6. Graph — current state

### Batch 1 / G0 nodes (edges = depends-on)

| ID | Node | Files | Depends on | Status |
|---|---|---|---|---|
| N0 | Restore .agents/.semgrep/.opencode + commit pending remediation | git worktree | — | closed-deferred |
| N1 | Driver decision: Pool default, real transactions | packages/db/client.ts | N0 | closed-deferred |
| N2 | RLS context correct on pooled connections (withRlsTransaction) | apps/web/lib/trpc/rls.ts (new) | N1 | closed-deferred |
| N3 | Remove review-queue global-delete seed | routers/review-queue.ts + admin page | N0 | closed-deferred |
| N4 | Dev-gate all seedDemoData + remove Math.random read paths (11 routers) | routers/{ops-console,logs-traces,live-runs,agent-monitor,cost-analytics,ai-workspace,customer-diagnostics,company-brain,feature-flags,infrastructure,prompt-library}.ts | N0 | closed-deferred |
| N5 | seed-demo route production guard | app/api/seed-demo/route.ts | N0 | closed-deferred |
| N6 | Entity-switch cache invalidation + honest switch UX | lib/entity-context.tsx, components/layout/entity-switcher.tsx | N0 | closed-deferred |
| N7 | Remove/gate admin seed UI buttons (9 pages) | app/admin/*/page.tsx | N3, N4 | closed-deferred |
| N8 | Batch log: prodway + BUILD_LOG + graph closure | prodway.md, BUILD_LOG.md | N1–N7 | backlog |


### Batch 2 / G1 nodes

| ID | Node | Files | Depends on | Status |
|---|---|---|---|---|
| N12 | Approval re-validation (TrustGuard + open-period) | server/routers/approvals.ts | Batch 1 | closed-deferred |
| N13 | Durable approval audit rows (chain-backed) | server/routers/approvals.ts | N12 | closed-deferred |
| N16 | Cancellation-correct timeouts (onTimeout + 5 boundary checks) | packages/agents/core/retry.ts, close-pipeline.ts | Batch 1 | closed-deferred |
| N17 | Banking demo-money removal, honest manual sync | server/routers/banking.ts | Batch 1 | closed-deferred |
| N18 | SSE truth + tenant isolation (entityId scoping, events subquery, full-taskId runId) | app/api/agent-events/route.ts, packages/agents/core/orchestrator.ts | Batch 1 | closed-deferred |
| N19 | Server-side unified needsYou queue (end client stitching) | server/routers/tasks.ts, app/dashboard/tasks/page.tsx | Batch 1 | closed-deferred |
| N20 | Batch approve with honest per-item results | app/dashboard/tasks/page.tsx | N19 | closed-deferred |
| N21 | Financial Pulse honest loading/error states (KPI strip gated) | app/dashboard/financial-pulse/page.tsx | Batch 1 | closed-deferred |
| N22 | Reset/verification tokens hashed at rest (SHA-256, lookup-by-hash) | server/routers/auth.ts | Batch 1 | closed-deferred |
| N23 | Durable MFA attempt throttle (5-strikes lockout reuse) | server/routers/auth.ts | Batch 1 | closed-deferred |
| N24 | SCIM constant-time token compare | app/api/scim/v2/route.ts | Batch 1 | closed-deferred |
| N26 | Posting hygiene: in-tx document linking, cleanupJournal deleted, one-tx reversals | journal-posting-core.ts, ar-posting.ts, ap-posting.ts | Batch 2 | closed-deferred |
| N27 | statusCode column integer + safe-cast migration 0040 | packages/db/schema/idempotency.ts, migrations/0040 | Batch 1 | closed-deferred |
| N29 | Deterministic verification: tally gate + JE balance gate (chat path); ingestion enforcement verified | server/routers/chat.ts, packages/ingestion/engine/posting-engine.ts | Batch 2 | passed (Run Phase) |
| N30 | Statement transactions materialize into bankTransactions (idempotent, account-resolving) | packages/ingestion/engine/posting-engine.ts | Batch 2 | passed (Run Phase) |
| N25 | Device/session management (backend landed under pre-built UI; revocation kills JWT in 1 request) | server/routers/auth.ts, components/settings/sessions-section.tsx | Batch 1 | passed (Run Phase) |
| N32 | Escalated reviewers see the actual document (entity-scoped R2 file route + View action) | app/api/documents/[id]/file/route.ts, components/ingestion/ingestion-review-panel.tsx | N29 | passed (Run Phase) |
| N33 | journal_events (append-only, hash-chained) + ledger_account_balances schema; migration 0041 + append-only trigger | packages/db/schema/ledger.ts, migrations/0041 | — | passed (Run Phase) |
| N34 | @xenboox/ledger posting service: validate → idempotency → chain append + projection (one tx) | packages/ledger/src/posting.ts | N33 | passed (Run Phase) |
| N35 | computeEventHash / verifyChain / rebuildBalances; tamper-evidence proven (7 mutation classes) | packages/ledger/src/hash.ts, verify.ts | N34 | passed (Run Phase) |
| N36 | Shadow dual-write (mirror hook + majorToMinor/toLedgerLines/shadowMirror) + parity verifier + nightly cron | packages/ledger/src/shadow.ts, parity.ts, apps/web/server/journal-posting-core.ts, app/api/cron/ledger-parity | N34 | passed (Run Phase) |
| N37 | AR invoice cut-over behind LEDGER_PRIMARY_AR — engine authoritative, legacy mirror derived, asymmetric failure semantics | apps/web/server/ar-posting.ts | N36 | passed (Run Phase) |
| N38 | AP bill + payment cut-overs behind LEDGER_PRIMARY_AP (engine first, mirror derived, shared link helpers) | apps/web/server/ap-posting.ts | N37 | passed (Run Phase) |
| N15 | Converge month-end job onto pipeline semantics | packages/jobs/month-end-close.ts | Batch 1 | closed-deferred |
| N14 | Wire durable closeSessions into executing close + DB idempotency | packages/agents/core/close-pipeline.ts | N15 | closed-deferred |

### Upcoming batches (already graphed, not started)

- **Batch 2 / G1:** approvals re-validation (balance+period) · durable approval audit rows · close sessions wired · close implementations converged · withTimeout cancellation · banking demo-money removal.
- **Batch 3 / G2:** SSE writer/reader fix + opsLiveRunEvents scoping + runId · notifications stitching removal · batch approve · loading/error gates.
- **Batch 4 / G3:** token hashing, MFA throttle, SCIM constant-time, device/session UI, MFA policy.
- **Batch 5+ / G4:** Engine v2 per §4.5.

## 7. Deferred Test Registry & Stress Registry

Populated as nodes pass RED/STRESS. Format: `node → suite file → case names → priority (money > auth > UI)`. All suites execute in Run Phase; failures reopen nodes.

## 8. Session reporting format (every working session ends with)

1. Graph delta (node → status transitions made, with evidence)
2. Loop phase reached per node
3. Tests authored (added to registry) · stress cases designed
4. Residual risks / newly discovered work → new nodes
5. Next loop pass
