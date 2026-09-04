# Pipeline 7 — Sub-Part B: Posting / Reversal State Machine + Period Integrity

**Scope:** `post`, `reverse`, `delete` on manual journal entries.

---

## 🔴 Findings & Fixes

### B1 — `post` could double-post under concurrency (status flip race)

`post` flipped `draft → posted` with an unconditional `where(id, entityId)`
after reading the status. Two concurrent posts of the same draft both passed
the status guard → last-write-wins double post.

**Fix:** conditional flip — `where(status IN (draft, pending_review))`; zero
rows returned → friendly `CONFLICT` ("Journal entry was already posted").

### B2 — `post` period lookup was not entity-scoped; date never checked against period bounds

The period was fetched by `id` only — a draft whose `periodId` pointed at a
foreign entity's open period would validate. The entry `date` was never
checked against the period's `startDate/endDate`.

**Fix:** period query is entity-scoped, and the entry date must fall inside the
period bounds (else "Entry date does not fall within the selected period").

### B3 — `reverse` copied the original's reference → unique-index collision 500

The reversal inserted `reference: entry.reference`. The `(entityId, reference)`
index is unique, so **reversing any entry that carries a reference always threw
a raw constraint violation**. (The original design likely intended idempotency
via the reference, but it collides with the original row itself.)

**Fix:** the reversal gets its own per-original unique key,
`reference: REV-${entry.id}` — collision-free and retry-idempotent.

### B4 — `reverse` posted dated-today into the original's (possibly closed) period

Reversal used `date = today` with `periodId = entry.periodId`. When the
original period was closed — the common case for a correction — the reversal
silently wrote into a locked month, corrupting closed-period integrity.

**Fix:** the reversal resolves the **current open period** for today
(`findOpenPeriod`) and posts there; if today's period is closed it refuses
("today's accounting period is closed. Reopen it first."). Reversals of
previous-period entries are now always corrections to the current period.

### B5 — `reverse` raced the entry number and could double-reverse

Same max+1 race as `create`, and the original's flip was unconditional.

**Fix:** 3-attempt retry on the reversal header insert; the flip back to
`reversed` is conditional on `status = posted`, else the fresh reversal is
compensated (deleted) and a `CONFLICT` ("already reversed") is raised.

### B6 — `delete` had no permission gate

`create/post/reverse` all carry `requirePermission`; `delete` (draft deletion)
ran for any authenticated entity user. Drafts contain financial draft data —
destruction must be gated.

**Fix:** added `requirePermission("general_ledger", "delete")`.

### B7 — `validateForPosting` rejected `pending_review` entries forever

The agent-side posting check accepted `draft`/`pending`, but the DB enum's
review state is `pending_review` — a `pending_review` entry could never post
(router allowed it, TrustGuard blocked it).

**Fix:** `validateForPosting` now accepts `pending_review`.

### ✅ Verified sound

- Reversal line swaps (dr ↔ cr) with compensation on lines/update failure.
- Trial balance reads only entity-scoped, `posted` entries.
- `db.transaction` shim executes sequentially (non-atomic) — `delete` order
  (lines then header) is correct under that constraint.

---

## ✅ Verification

- `journal-record-layer.test.ts` now 12 assertions (A + B contracts).
- Agents tool-system suite 62 green (posting checks unchanged elsewhere).
- Router + trust-guard parse clean.
