# CONTEXT.md — Shared Domain Context

> Living glossary for Xenboox engineering. Terms here are canonical; when a
> feature introduces new terms, they land here with their ADR link.

## Audit Trail (tamper-evident)

| Term                         | Definition                                                                                                                                                                                         |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AuditEvent**               | One row in `audit_log`. Records who did what, when, from what state to what state, with context (IP, session, request) and — for agent actions — agent identity and confidence.                    |
| **actorType**                | Who performed the action: `user` \| `agent` \| `system` \| `api`. Canonical term resolving the old ambiguity between web and agent-side `createAuditEntry` helpers.                                |
| **AuditChain**               | The implicit linkage of an entity's events via `seq` + `prevHash` + `eventHash`. Per-entity (ADR-0002).                                                                                            |
| **eventHash**                | `sha256(prevHash \| '\n' \| canonical_payload_text)`. Links each event to the previous one.                                                                                                        |
| **prevHash**                 | The eventHash of the previous event in the same entity's chain. The first event links to `GENESIS_HASH`.                                                                                           |
| **payloadHashInput**         | The exact canonical payload text the trigger hashed — stored so verification hashes the same bytes (no cross-language drift).                                                                      |
| **VerificationReport**       | Output of `audit.verify`: `valid`, `status` (`valid` \| `broken` \| `unchained`), `checkedCount`, `firstBrokenSeq`, `checkedAt`.                                                                   |
| **Unchained**                | A row (or entity) whose chain fields are NULL because it predates the migration and hasn't been backfilled. Reported as `unchained`, never falsely flagged as tampered.                            |
| **Column-consistency check** | Part of verification: recompute the payload from the row's columns and compare semantically against the stored text, catching edits that change visible history without rewriting the stored text. |

## Related decisions

- ADR-0001 — hash chaining at the DB layer (trigger).
- ADR-0002 — per-entity chains.
- ADR-0003 — tamper-evidence v1; external anchoring as follow-on.
- ADR-0004 — append-only immutability triggers; 7-year retention via archive.
- ADR-0005 — backfill existing history.
- ADR-0006 — canonical serialization (fixed field list + coercions, both sides).
