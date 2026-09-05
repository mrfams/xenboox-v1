# Pipeline 8 (Month-End Close) — Sub-Part D: Jobs / Recovery / Verification

**Campaign:** Deep-audit-to-production-grade · **Date:** 2026-09-05
**Scope:** cron route safety, reopen/recovery ownership, close audit trail read paths, verification loop + regression confirmation.

---

## Findings

### 🔴 D1 — `reopenPeriodWithRecovery` was not entity-safe (CROSS-TENANT WRITE) — FIXED

**Location:** `packages/agents/core/close-pipeline.ts` → `reopenPeriodWithRecovery` (Step 9)

**Problem:** The function executed in this order:

1. `insert(reopenRequests)` with only a caller-supplied `closeSessionId`
2. `update(closeSessions).set({ status: "reopened" })` filtered by `id` + `entityId` ✓
3. `update(fiscalPeriods)` gated on an **entity-scoped** session lookup ✓ (added mid-audit)

The `reopen_requests` table has **no `entityId` column** — ownership flows entirely through the close session. A caller passing a foreign `closeSessionId` could therefore:

- **write a reopen request row onto another tenant's close session** (step 1, no scope check), and
- only _after_ that cross-tenant write would the scoped session lookup return `null` and silently skip the fiscal-period flip — leaving a poisoned reopen row behind.

**Fix:** Moved the entity-scoped session lookup to the **top of the function as an ownership gate**. If the session does not exist for `(closeSessionId, entityId)` the function throws `"Close session not found for this entity. Reopen request refused."` before **any** insert or update executes. The fiscal-period flip then runs unconditionally against the verified session (it can no longer be a no-op).

**Proof:** New test `should refuse foreign closeSessionId before any write (P8-D ownership gate)` — asserts the throw AND that `db.insert` / `db.update` are never called for a foreign session.

### 🟡 D2 — `getCloseAuditTrail(closeSessionId)` has no entity param (read-only, no router consumer) — NOTED

**Location:** `packages/agents/core/close-pipeline.ts` → `getCloseAuditTrail`

The function queries by bare `closeSessionId`. It is read-only and exported only from the agents core barrel — **no router or job calls it** (verified by search), so there is no cross-tenant disclosure path today. Its sibling `getCloseSessionStatus(entityId, periodLabel)` resolves the session **entity-scoped first** and derives child queries from that id — the correct pattern. If `getCloseAuditTrail` ever gains a router consumer it must take `entityId` and gate the session lookup the same way. Left untouched to avoid signature churn with zero live callers; flagged in code review notes.

### ✅ D3 — Cron route verified safe

**Location:** `apps/web/app/api/cron/month-end-close/route.ts`

Re-audited: secret-gated (`x-cron-secret`), reminder-only (never auto-closes — closing is human-gated), entity-scoped per period, idempotent notification guard keyed on `(userId, entityId, type, data.periodId)`, `.limit(200)` bounds the scan. No changes required.

---

## Verification

| Suite                                                             | Result                                                                                                                                        |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/jobs` (25 tests)                                        | ✅ 25 passed                                                                                                                                  |
| `apps/web` fiscal-close-record-layer (12 tests)                   | ✅ 12 passed                                                                                                                                  |
| `packages/agents` pipelines reopen block (3 tests incl. new gate) | ✅ 3 passed                                                                                                                                   |
| `packages/agents` pipelines full (132 tests)                      | ✅ 127 passed, 5 failed — **identical to HEAD baseline** (P3 reconciliation + P5 reporting describe blocks, pre-existing, unrelated to close) |

Zero regressions vs. committed HEAD.

---

## Files Changed

| File                                               | Change                                                                                             |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `packages/agents/core/close-pipeline.ts`           | Ownership gate at top of `reopenPeriodWithRecovery`; fiscal flip unconditional on verified session |
| `packages/agents/core/__tests__/pipelines.test.ts` | Added cross-tenant refusal test                                                                    |

## Status

✅ **P8 fully complete** — A (state machine), B (checklist + GL integrity), C (UI + notifications), D (jobs/recovery + verify) all committed.
