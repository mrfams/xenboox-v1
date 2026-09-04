# Pipeline 7 — Sub-Part A: Journal Entries Record Layer

**Scope:** manual JE `create` — input validation, money safety, atomicity,
entity scoping, numbering, duplicate handling.

---

## 🔴 Findings & Fixes

### A1 — Count-based `entryNumber` allocation races under concurrency

`entryNumber` was `max(entryNumber) + 1` read-then-insert with a **UNIQUE
(entityId, entryNumber)** index. Two concurrent creates read the same max →
unique violation → raw 500. Drafts are human-paced, but agent/batch creators
can collide.

**Fix:** bounded retry loop (3 attempts) — on a `je_entity_entry_number`
collision, re-read the max and retry; after 3 attempts throw a clean
`INTERNAL_SERVER_ERROR` ("Could not allocate a journal entry number").

### A2 — Duplicate reference surfaced as a raw constraint 500

The `(entityId, reference)` unique index is the idempotency key for posted
entries; a manual create reusing an existing reference (draft or posted) hit
the constraint with no friendly path.

**Fix:** pre-check with a friendly `CONFLICT` —
"A journal entry with reference \"…\" already exists for this entity".

### A3 — Header + lines inserts were not atomic (orphan drafts)

`create` inserted the header, then the lines, in two queries with no
compensation — a lines failure left an orphaned draft header (and a consumed
entry number).

**Fix:** lines insert wrapped; on failure the just-created header is deleted
(compensation) before the error propagates. (The repo standard — the
neon-http transaction shim is a silent no-op, so compensation is used instead
of transactions.)

### A4 — Unbounded money strings + unbounded line count

Line debit/credit used a loose inline `^\d+(\.\d{1,2})?$` regex — magnitude
unbounded, so amounts beyond `numeric(15,2)` reached the DB as a raw range
error. Line array had no upper bound.

**Fix:** switched to the shared bounded `moneyString`
(`^\d{1,13}(\.\d{1,2})?$`, exactly `numeric(15,2)`), plus an integer-cents
`MAX_CENTS` guard on every amount, and `.max(200)` on the lines array.

### ✅ Already enforced (TrustGuard — verified, not re-implemented)

`validateJournalEntry` (agents/central-trust-guard) runs before the write and
checks: ≥2 lines, exactly one of debit/credit per line (no both/neither),
non-negative amounts, debits = credits, non-zero total, **account exists in
the entity + is active**, and the **period belongs to the entity and is open**
with the entry date inside its bounds.

---

## ✅ Verification

- `journal-record-layer.test.ts` — 6 static assertions over the create
  contract (bounded money, line cap, MAX_CENTS, TrustGuard wiring, CONFLICT,
  race-safe numbering, compensation).
- Router parses clean; no behavioral change to reads/post/reverse (P7-B).
