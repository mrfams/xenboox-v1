# Pipeline 1 — Sub-Part E: Posting & Propagation — Deep Audit Findings

**Employee #5 · Date: 2026-09-03**
**Scope:** `posting-engine.ts`, `propagation.ts`, `period-manager.ts` (+ pipeline wiring in `index.ts`)

## Verdict: 1 Critical, 8 High, 6 Medium, 3 Low — 18 findings

---

## 🔴 CRITICAL (1)

### C1 — TrustGuard runs 3× per document (double-run never actually fixed)

**File:** `posting-engine.ts` (decidePosting + executePosting)

Stage 10b in `index.ts` stores the result on **`state.trustGuard`**, and `confidence.ts` reads **`state.trustGuard`** — but `decidePosting` and `executePosting` check **`state.validation?.trustGuard`**, which is never set. So `runTrustGuard(state)` executes **two additional times** per document (3 total). The earlier "eliminated double-run" fix checked the wrong field. Wasted LLM-free compute is one thing — but each run re-derives `passed` from the same data so results agree; still, this is 2× redundant deterministic work on every single document and makes the codebase lie about its own fix.

**Fix:** read `state.trustGuard ?? state.validation?.trustGuard` in both functions.

---

## 🟠 HIGH (8)

### H1 — Review-pending documents get re-ingested on retry

**File:** `index.ts` + `posting-engine.ts`

`pending_review`/`escalated` sets the doc to status **`agent_processing`** — which IS in `READY_STATUSES` (needed for the job→ingestion handoff). A retry/recovery run picks the doc up again and re-runs the entire pipeline → a doc awaiting human review can be re-classified and **auto-posted on the second pass**. Double processing of the same document.

**Fix:** in `runIngestionPipeline`, skip documents whose `metadata.ingestion.requiresReview === true` (they are awaiting a human decision — never re-process).

### H2 — Auto-post failure leaves the document stuck in "posting"

**File:** `posting-engine.ts` (executePosting catch block)

If `postJournalEntry` throws, the catch logs `agentActivity` failed but **never updates the document status or metadata** — the doc stays at `posting` forever, invisible to retries and to the review queue, with no failure notification.

**Fix:** on failure, set doc status `failed` + `metadata.ingestion.error`, write an audit entry, and send a failure notification.

### H3 — TrustGuard review items suggest the WRONG (actual) value

**File:** `posting-engine.ts` (escalated path)

Failed deterministic checks build review items with `value: check.actual` then map to `suggestedValue: item.value` — i.e., the user is shown the _incorrect_ extracted value as the suggested correction. Should be **`check.expected`** (the deterministically correct figure).

### H4 — Inventory propagation fabricates quantity and unit cost

**File:** `propagation.ts` (propagateInventory)

Every inventory purchase inserts `quantity: 1` and `unitCost: <line total>`, and new items get `quantityOnHand: 1`. A 100-unit purchase at $10 each books 1 unit at $1,000 unit cost → **stock counts and valuation are silently wrong**. No quantity info exists on the journal line, so it must either be parsed from the description or explicitly flagged as estimated.

**Fix:** parse quantity from description (`N units/pcs/boxes`); when absent, record quantity 1 with an explicit `QUANTITY ESTIMATED — VERIFY` note and push a warning; `unitCost = amount / qty`.

### H5 — Fixed-asset detection `l.debit > 100` books expense lines as assets

**File:** `propagation.ts` (propagateFixedAsset)

The asset line is found by `accountCode 15xx/14xx` **OR `debit > 100`** — any entry with a >$100 debit line (e.g. a $1,200 expense) creates a fixed asset. Remove the amount heuristic; code prefix only.

### H6 — Period close passes with NO trial balance snapshots

**File:** `period-manager.ts` (closePeriod)

Validation "trial_balance_balanced" sums snapshots — zero snapshots → `0 == 0` → "balanced" → close succeeds on a period whose TB was never generated.

**Fix:** when the period has posted entries but zero snapshots → validation error.

### H7 — `openPeriod` can reopen a LOCKED period

**File:** `period-manager.ts`

The lock lifecycle says locked is terminal (only admin unlock), and the code rejects opening a locked period — then the status allow-list `["closed", "locked"]` re-admits it. Anyone with period access can silently bypass the lock.

**Fix:** remove `"locked"` from the openable statuses.

### H8 — Bank reconciliation check is NOT scoped to the period

**File:** `period-manager.ts` (closePeriod + getPeriodSummary)

`eq(isReconciled, false)` with no date filter → one stale unreconciled transaction from 3 years ago blocks/warns every period close forever. Scope by `transactionDate` within `period.startDate..endDate` (the unused `periodStr` shows the intent).

---

## 🟡 MEDIUM (6)

### M1 — closePeriod loads ALL journal entries to find drafts

`findMany` then filters in JS. Query `status IN (draft, pending_review)` directly.

### M2 — getPeriodSummary loads all entries for `entryCount`

Use `COUNT(*)`.

### M3 — Trial balance snapshot upsert is per-account (N queries)

`updateTrialBalance` loops accounts with individual upserts. Single batched `insert...onConflictDoUpdate`.

### M4 — `status: newStatus as any` type bypass (4 places)

**File:** `period-manager.ts` — replace with the enum-typed value (the column is `periodStatusEnum`).

### M5 — Non-null assertions on `state.proposedJournal!` / `state.compositeConfidence!`

**File:** `posting-engine.ts` — an auto-post decision with a missing proposed entry throws a bare TypeError that lands in the (now fixed) failure path with a useless message. Explicit guard with a meaningful error.

### M6 — getPeriodSummary reconciliation check unscoped (same as H8)

---

## 🟢 LOW (3)

### L1 — `affectsCash` treats AR (1100) as a cash account

**File:** `propagation.ts` — conservative (over-marks cash flow stale), but wrong taxonomy.

### L2 — Budget / cash-flow / KPI "stale" marking is only an activity log

No real invalidation happens; the modules recompute on next read. Documented design, but the activity rows are misleadingly named `*_marked_stale`.

### L3 — `periodStr` computed but unused in closePeriod

---

## ✅ Already Production-Grade

- TrustGuard **override**: failed deterministic checks force `escalated`, never auto-post ✓
- Decision matrix thresholds documented and sane (95/85/60/40) ✓
- Posting is idempotent at the DB layer (unique constraints from Sub-Part D) ✓
- Propagation isolates per-module failures with error collection; posting stands ✓
- Period close validates previous period closed + draft-free + balanced TB (once fixed) ✓
- Reopen requires force when subsequent periods are closed ✓
- All queries entity-scoped ✓

---

## Fix Plan (grouped)

**Phase 1 — Critical + High (9):**

1. C1: read `state.trustGuard ?? state.validation?.trustGuard`
2. H1: requiresReview guard in runIngestionPipeline
3. H2: failure path → doc `failed` + audit + notification
4. H3: review items suggest `check.expected`
5. H4: inventory quantity parse/flag
6. H5: asset detection by code only
7. H6: require TB snapshots when entries exist
8. H7: lock is not openable
9. H8: scope reconciliation checks to period dates

**Phase 2 — Medium (6):** 10. M1: targeted draft query · 11. M2: COUNT · 12. M3: batch upsert · 13. M4: enum-typed status · 14. M5: explicit guards · 15. M6: scoped summary check

**Phase 3 — Tests:** 16. posting-engine decision tests (TrustGuard override, review-item values, requiresReview guard) 17. propagation tests (inventory quantity parse, asset line selection) 18. period-manager tests (lock bypass, empty-TB close, scoped reconciliation)
