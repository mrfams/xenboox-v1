# Pipeline 8 — Sub-Part B: Month-End Close Job (checklist tasks + GL integrity)

**Scope:** `packages/jobs/month-end-close.ts` (async close path) + close task
state (`close-center.updateTaskStatus`).

---

## 🔴 Findings & Fixes

### B1 — CRITICAL: depreciation lines pointed at a random UUID that was never inserted

`runDepreciation` generated `jeId = crypto.randomUUID()`, inserted the JE
**header without that id** (the DB generated its own), then inserted lines with
`journalEntryId: jeId` — a FK to a non-existent header. Every month-end close
on an entity with fixed assets + depreciation accounts threw a FK violation and
failed the close (retries → DLQ).

**Fix:** insert the header first, take its `.returning({ id })`, and link the
lines to `header.id`.

### B2 — CRITICAL: "last entry number" read the MINIMUM, not the maximum

`orderBy(journalEntries.entryNumber).limit(1)` sorts **ASC** — it returned the
entity's lowest entry number, so the depreciation JE was numbered
`min + 1`, which already exists → guaranteed unique-index violation on the
first depreciation insert (whenever the entity had prior entries).

**Fix:** `orderBy(desc(...))` (MAX + 1), re-read the max between assets (other
writers may post mid-loop).

### B3 — Draft guard missed `pending_review`

The job blocked `draft` entries but let `pending_review` slip into a close,
where it would become unpostable forever (same class as P8-A1).

**Fix:** guard `IN ('draft', 'pending_review')`.

### ✅ Verified sound

- Balance check runs over **posted** entries only (posted = guaranteed
  balanced by TrustGuard at posting time) before the flip.
- `close-center.updateTaskStatus` is already an atomic conditional transition
  (`status != input.status` guard) with idempotent no-op + audit — no
  double-complete, no duplicate audit rows.
- The job is tenant-deduped (`tenantJobOptions`) + queue concurrency 1.

---

## ✅ Verification

- Jobs suite 25 green; file parses clean.
- `fiscal-close-record-layer.test.ts` now 8 assertions (P8-A + P8-B).
