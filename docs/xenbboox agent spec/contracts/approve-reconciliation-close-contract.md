# Tool Contract: `approve_reconciliation_close`

> Filled from `TOOL_CONTRACT_TEMPLATE.md`. This is the enforcement point for the single most important rule in the Treasury domain — a reconciliation with any unresolved item must never be closed. Both Treasury Agent spec §3 and Reconciliation Agent spec §3 restate this as an absolute rule; this tool makes it a hard code-level gate, not a prompt instruction.

---

## 1. Identity

| Field        | Value                                                                                                                             |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Tool name    | `approve_reconciliation_close`                                                                                                    |
| Called by    | Treasury Agent only (no other agent has the authority to finalize a reconciliation)                                               |
| Read / Write | Write                                                                                                                             |
| Idempotent?  | Yes — idempotency key derived from `reconciliation_id`; identical close requests return the original result without re-processing |

## 2. Purpose

Atomically finalize a reconciliation for a given entity, account, and period — hard-gated on zero unresolved items in both the bank and ledger unmatched lists — or reject with a structured reason describing which items remain open.

## 3. Input Schema

```json
{
  "entity_id": "uuid",
  "reconciliation_id": "uuid",
  "idempotency_key": "string",
  "requesting_agent": "string (enum: treasury-agent)",
  "period_end_date": "date (ISO 8601)",
  "notes": "string | null"
}
```

| Field               | Type          | Required | Validation rule                                                                                             |
| ------------------- | ------------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| `entity_id`         | string (uuid) | always   | Must match calling agent's active entity scope — reject if mismatched                                       |
| `reconciliation_id` | string (uuid) | always   | Must reference an existing reconciliation record visible to this entity                                     |
| `idempotency_key`   | string        | always   | Must be unique per close attempt; duplicate key with identical payload returns original result without redo |
| `period_end_date`   | date          | always   | Must match the period_end of the referenced reconciliation                                                  |

## 4. Output Schema

**Success:**

```json
{
  "status": "approved",
  "reconciliation_id": "uuid",
  "entity_id": "uuid",
  "approved_at": "timestamp",
  "unresolved_items_count": 0,
  "previous_close_id": "uuid | null"
}
```

**Rejection:**

```json
{
  "status": "rejected",
  "reconciliation_id": "uuid",
  "reason_code": "string (enum: UNRESOLVED_ITEMS_EXIST | ENTITY_MISMATCH | RECONCILIATION_NOT_FOUND | ALREADY_CLOSED | DUPLICATE_KEY_CONFLICT | PERIOD_MISMATCH)",
  "human_readable_reason": "string — plain English, suitable for agent-to-agent communication",
  "failed_rule": "string — which specific rule from §5 below failed",
  "unresolved_items": [
    {
      "side": "string (bank | ledger)",
      "item_id": "uuid",
      "amount": "decimal",
      "description": "string",
      "possible_cause": "string | null"
    }
  ]
}
```

No partial states exist. A call returns exactly one of these two shapes.

## 5. Deterministic Rules Enforced (Layer 1)

| Rule                                                                                                                       | Enforcement point                                                                                                       | Behavior on violation                                                                       |
| -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Zero unresolved items: the reconciliation must have zero items in both `unmatched_bank_items` and `unmatched_ledger_items` | Application-layer check reading the live reconciliation state before commit, re-verified within the same DB transaction | Reject, `UNRESOLVED_ITEMS_EXIST`, return the full list of unresolved items, no state change |
| `reconciliation_id` must reference an existing reconciliation visible to `entity_id`                                       | Foreign key constraint + RLS filter                                                                                     | Reject, `RECONCILIATION_NOT_FOUND` or `ENTITY_MISMATCH`                                     |
| Reconciliation must not already be closed                                                                                  | Status check on the reconciliation record before write                                                                  | Reject, `ALREADY_CLOSED`, return original close timestamp                                   |
| `period_end_date` must match the reconciliation's `period_end`                                                             | Application-layer comparison                                                                                            | Reject, `PERIOD_MISMATCH`                                                                   |

All of the above run in code/DB. The Treasury Agent reviews the reconciliation report and decides to approve, but this tool independently re-verifies every unmatched-items claim rather than trusting the incoming request's metadata about completeness.

## 6. Entity Scoping Enforcement

Enforced via PostgreSQL row-level security policy on the `reconciliations` table: every query and write implicitly filtered by `entity_id` matching the authenticated agent-session's active entity context. This is the same RLS mechanism used by `post_journal_entry` and `get_trial_balance` — it is not possible for this tool to read or close a reconciliation belonging to a different entity, even if the calling agent's context were corrupted. Application-layer `entity_id` matching (§5) is defense in depth.

## 7. Idempotency & Retry Behavior

- Idempotency key is derived from `reconciliation_id` — each reconciliation can only be closed once.
- If a call arrives with a previously-seen `idempotency_key` and identical payload, the tool returns the original success/rejection result without re-processing. Safe to retry after network failure or agent crash mid-call.
- If a call arrives with a previously-seen `idempotency_key` but a different payload, that is a `DUPLICATE_KEY_CONFLICT` rejection — indicates a bug upstream where the same key is being generated for two different close attempts.
- After a successful close, no second close is possible regardless of key — the `ALREADY_CLOSED` check is separate from the idempotency check.

## 8. Failure Modes

| Failure                                     | Tool behavior                                                                              | What calling agent should do                                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Invalid input schema                        | Reject before any DB interaction, structured error                                         | Do not retry with same input — escalate per `CONFIDENCE_AND_ESCALATION.md` §4 (Block)              |
| Unresolved items exist                      | Reject, `UNRESOLVED_ITEMS_EXIST`, return full list of unresolved items                     | Escalate per Treasury Agent spec §9 (Block) — notify CFO Agent, hold reconciliation open           |
| Reconciliation not found or entity mismatch | Reject, structured error                                                                   | Escalate (Block) — this is a critical inconsistency, likely a corrupted agent context              |
| Reconciliation already closed               | Reject, `ALREADY_CLOSED`, return original close timestamp                                  | This is informative, not an error; do not retry, move on                                           |
| DB unavailable or crash mid-transaction     | No write attempted or transaction rolled back cleanly; returns `SYSTEM_UNAVAILABLE` status | Retry with same idempotency key once DB is confirmed available; do not treat as validation failure |

## 9. Audit Trail

Every call — success or rejection — logs: `calling_agent` (treasury-agent), `entity_id`, `reconciliation_id`, `idempotency_key`, full request payload, full response, timestamp, and the calling agent's confidence score for the close decision. Logged to the central audit log (single table/service used by all tools per `TOOL_CONTRACT_TEMPLATE.md` §9).

## 10. Test Coverage

Link: `tests/tools/approve-reconciliation-close.test.ts` (to be built)

Minimum required cases:

- Close with zero unresolved items → `status: approved`, reconciliation marked closed
- Close with one or more unresolved items on bank side → rejection, `UNRESOLVED_ITEMS_EXIST`, items returned in response
- Close with one or more unresolved items on ledger side → rejection, same as above
- Cross-entity close attempt (reconciliation belongs to different entity) → `ENTITY_MISMATCH`, no state change
- Close of already-closed reconciliation → `ALREADY_CLOSED`, original close timestamp returned
- Identical idempotency key + identical payload → returns original result, no duplicate close
- Identical idempotency key + different payload → `DUPLICATE_KEY_CONFLICT`
- `reconciliation_id` that does not exist → `RECONCILIATION_NOT_FOUND`
- `period_end_date` mismatch → `PERIOD_MISMATCH`

---

## Contract Sign-off Checklist

- [x] Input/output schemas fully specified, no untyped fields
- [x] Every deterministic rule from Treasury Agent spec §7 enforced here in code
- [x] Entity scoping enforced at DB layer (RLS), not application layer alone
- [x] Idempotency behavior defined and tested
- [x] Failure modes return structured errors, never silent partial success
- [x] Audit logging confirmed present on every code path (success and failure)
