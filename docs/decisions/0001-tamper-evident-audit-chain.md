# ADR-0001: Tamper-Evident Audit Chain at the Database Layer

**Status:** Accepted
**Date:** 2026-08-10

## Context

Xenboox needs a legally-defensible record of "who did what" — every mutation
by users, agents, and system jobs must be provably unalterable. The existing
`audit_log` table records actions (actor, entity, before/after values, IP,
user agent) via ~200 hand-scattered `insert(auditLog)` sites, but nothing
prevents or detects silent edits or deletes, and there is no proof of
integrity. Agentic accounting makes this urgent: autonomous agents now post
journal entries and create invoices, and you cannot interview an agent in a
dispute — the record itself must be the witness.

Regulatory drivers: SOC 2 CC7.2 (log integrity protection), ISO 27001
A.12.4 (logging & monitoring), GDPR Art. 5(2) (accountability), and the
accounting "books and records" expectation that history cannot be silently
rewritten.

## Decision

Every `audit_log` insert is chained to the previous event of the same entity
using SHA-256, computed by a PostgreSQL **BEFORE INSERT trigger**:

```
event_hash = sha256(prev_hash || '\n' || canonical_payload_text)
```

- `seq` — 1-based position within the entity's chain (unique per entity).
- `prev_hash` — event hash of the previous event; the first event links to
  a deterministic genesis hash `sha256('xenboox-audit-genesis')`.
- `event_hash` — SHA-256 of `prev_hash + canonical payload text`.
- `payload_hash_input` — the exact canonical payload text that was hashed,
  stored so verification hashes the _same bytes_ the trigger hashed (no
  cross-language re-serialization drift).

Because the chain is computed in a trigger, **all ~200 existing insert sites
gain tamper-evidence automatically** — no router rewrite required. The JS
mirror (`apps/web/lib/audit/chain.ts`, `backfill.ts`) is kept in sync for
verification, exports, and JS-side tooling.

## Why not alternatives

| Option                                              | Rejected because                            |
| --------------------------------------------------- | ------------------------------------------- |
| Middleware-only chaining                            | Misses agent/job/system writes outside tRPC |
| Rewrite all ~200 insert sites                       | 200+ files of churn, easy to miss a path    |
| External anchoring (blockchain / timestamp service) | Postponed — see ADR-0003                    |

## Consequences

- Any past edit, reorder, or deletion breaks subsequent links and is detected
  by one-click verification (`audit.verify`).
- The trigger must stay byte-identical to the JS mirror; a drift would cause
  false tamper alarms on the column-consistency check. The stored
  `payload_hash_input` + semantic comparison mitigate this.
- Per-entity chains require a row lock on `entities` during insert to prevent
  concurrent seq races (unique `(entity_id, seq)` index enforces it).
