# ADR-0002 — ADR-0006: Audit Chain Design Decisions

## ADR-0002: Per-Entity Chains

**Status:** Accepted · **Date:** 2026-08-10

Chains are scoped per `entity_id`: `seq` restarts at 1 per entity and
`prev_hash` links only within the entity.

- **Why:** entity isolation is a hard architectural rule in Xenboox; a global
  chain would create write contention on a single head and couple entities'
  integrity (one entity's backlog could obscure another's).
- **Cost:** verification is per-entity, which is exactly how an auditor would
  ask ("prove this entity's records").
- **Consequence:** `verify`/`export` procedures are entity-scoped via RLS.

## ADR-0003: Tamper-Evidence (not absolute Tamper-Proofness) in v1

**Status:** Accepted · **Date:** 2026-08-10

v1 delivers **tamper-evidence**: any alteration is _detectable_ by chain
verification. It does not claim absolute tamper-proofness, which requires
external anchoring (e.g. periodic digests anchored to a public timestamp
service / blockchain) that even a compromised DB admin cannot reach.

- **Honest framing:** "provably unaltered since it was recorded (verifiable)"
  rather than "impossible to alter". This is what is actually admissible and
  defensible.
- **Follow-on:** anchor the per-entity head hash (or a Merkle root over
  entities) to an external service on a schedule; `verify` would then also
  compare against the anchored digest.

## ADR-0004: Append-Only Immutability Triggers

**Status:** Accepted · **Date:** 2026-08-10

`audit_log` is append-only: `BEFORE UPDATE` and `BEFORE DELETE` triggers
raise an exception for all roles. No application path can edit or delete
history.

- Retention (7 years, per product decision) is handled by **archiving to
  cold storage** (a documented follow-on), not by DELETE — deleting chained
  rows would break verification, which is exactly the desired behavior.
- An attacker who can modify the trigger itself is out of scope for v1;
  that class of attack is caught by the anchored-digest follow-on
  (ADR-0003).

## ADR-0005: Backfill Existing History

**Status:** Accepted · **Date:** 2026-08-10

The 0025 migration backfills all pre-existing `audit_log` rows using the same
payload expression and chain algorithm (idempotent — only rows with null
chain fields are processed), so the full history verifies from day one rather
than only new inserts.

## ADR-0006: Canonical Serialization

**Status:** Accepted · **Date:** 2026-08-10

The canonical payload is built from a fixed field list with fixed coercions,
identical in SQL (trigger/backfill) and JS (verification/export):

- Timestamps: ISO-8601 UTC to second precision (`to_char(... AT TIME ZONE
'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'`) — matches
  `toISOString().slice(0,19) + 'Z'`.
- `confidence`: `numeric(3,2)` serialized as **text** (`a_confidence::text`
  in SQL, `String(Number(x))` in JS) so Postgres number formatting can never
  drift from JS.
- Keys sorted (jsonb's canonical form sorts keys; JS mirror sorts too).

Verification compares the stored payload **semantically** (parse + field
compare, tolerant of JSON whitespace/format differences) rather than by raw
string, so cross-language serialization differences cannot produce false
tamper alarms — but a column edit that leaves the stored text untouched is
still caught.
