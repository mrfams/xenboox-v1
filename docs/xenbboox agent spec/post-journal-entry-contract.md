# Tool Contract: `post_journal_entry`

> Filled from `TOOL_CONTRACT_TEMPLATE.md`. This is the single most important tool in Xenboox — every financial event in the system ultimately becomes a call to this tool. It is where PRD §6.7 Layer 1 ("zero AI tolerance") is actually implemented, not just described.

---

## 1. Identity

| Field        | Value                                                                                                                                                       |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tool name    | `post_journal_entry`                                                                                                                                        |
| Called by    | Ledger Agent only (no other agent has direct DB write access to the ledger — even Controller Agent's corrections go through Ledger Agent calling this tool) |
| Read / Write | Write                                                                                                                                                       |
| Idempotent?  | No, by default (each call creates a new entry) — but see §7, duplicate submission is guarded via idempotency key                                            |

## 2. Purpose

Commit a validated, balanced journal entry to the general ledger for a specific entity, atomically, with full audit logging, or reject it with a structured reason and no partial write.

## 3. Input Schema

```json
{
  "entity_id": "uuid",
  "idempotency_key": "string",
  "requesting_agent": "string (enum: ap-agent | ar-agent | cash-agent | mobile-money-agent | asset-agent | inventory-agent | expense-agent | payroll-worker-agent | tax-agent | controller-agent)",
  "entry_date": "date (ISO 8601)",
  "description": "string",
  "source_reference": {
    "type": "string (enum: invoice | payment | expense_claim | payroll_run | correction | adjustment | ...)",
    "id": "string"
  },
  "lines": [
    {
      "account_code": "string",
      "debit": "decimal | null",
      "credit": "decimal | null",
      "currency": "string (ISO 4217)",
      "exchange_rate": "decimal | null (required if currency != entity base currency)",
      "base_currency_amount": "decimal | null (required if currency != entity base currency)"
    }
  ],
  "correction_of_entry_id": "uuid | null (set only if this is an offsetting correction entry)"
}
```

| Field                                    | Type    | Required      | Validation rule                                                                                                               |
| ---------------------------------------- | ------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `entity_id`                              | uuid    | always        | Must match calling agent's active entity scope — reject if mismatched                                                         |
| `idempotency_key`                        | string  | always        | Must be unique per logical posting attempt; duplicate key with identical payload returns the original result, not a new entry |
| `lines`                                  | array   | always, min 2 | Each line must have exactly one of `debit`/`credit` set, not both, not neither                                                |
| `account_code` (per line)                | string  | always        | Must exist in this entity's active chart of accounts                                                                          |
| `exchange_rate` / `base_currency_amount` | decimal | conditional   | Required together whenever `currency` differs from entity base currency (PRD §12)                                             |

## 4. Output Schema

**Success:**

```json
{
  "status": "posted",
  "entry_id": "uuid",
  "entity_id": "uuid",
  "posted_at": "timestamp",
  "balanced": true,
  "total_debits": "decimal",
  "total_credits": "decimal"
}
```

**Rejection:**

```json
{
  "status": "rejected",
  "reason_code": "string (enum: UNBALANCED | INVALID_ACCOUNT | ENTITY_MISMATCH | MALFORMED_LINE | INACTIVE_ACCOUNT | DUPLICATE_KEY_CONFLICT)",
  "human_readable_reason": "string",
  "failed_rule": "string — which specific rule from §5 below failed"
}
```

No partial states exist. A call returns exactly one of these two shapes.

## 5. Deterministic Rules Enforced (Layer 1)

| Rule                                                                                 | Enforcement point                                                                                    | Behavior on violation                                                                         |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Sum of all `debit` values = sum of all `credit` values, per entry                    | Application-layer check before DB transaction begins, re-verified by DB `CHECK` constraint on commit | Reject entire entry, `UNBALANCED`, no partial write                                           |
| Every `account_code` exists and `status = active` in this entity's chart of accounts | Foreign key constraint + status check                                                                | Reject, `INVALID_ACCOUNT` or `INACTIVE_ACCOUNT`                                               |
| `entity_id` on the request matches `entity_id` on every referenced account           | Row-level security policy at DB layer (PostgreSQL RLS, per PRD §9.2) — not application-layer only    | Reject, `ENTITY_MISMATCH`, logged as a security-relevant event, not just a validation failure |
| Each line has exactly one of `debit`/`credit` non-null                               | Application-layer schema validation                                                                  | Reject, `MALFORMED_LINE`                                                                      |
| Non-base-currency lines carry both `exchange_rate` and `base_currency_amount`        | Application-layer schema validation                                                                  | Reject, `MALFORMED_LINE`                                                                      |
| Posted entries are never updated in place                                            | No `UPDATE` grant on the `journal_entries` table for any application role — only `INSERT`            | Not a runtime rejection — structurally impossible at the permissions layer                    |

All of the above run in code/DB. The calling agent (Ledger Agent) can construct a request confidently, but this tool does not trust that confidence — every rule is re-checked here regardless of what the LLM believes about its own output.

## 6. Entity Scoping Enforcement

Enforced via PostgreSQL row-level security policy on both the `journal_entries` and `accounts` tables: every query and write implicitly filtered by `entity_id` matching the authenticated agent-session's active entity context. This is not something the application code can accidentally bypass by forgetting a `WHERE` clause — it's enforced at the database session level, so even a bug in application code cannot leak a cross-entity write. Application-layer `entity_id` matching (§5) is defense in depth on top of this, not the primary guarantee.

## 7. Idempotency & Retry Behavior

- Every call requires an `idempotency_key`, generated by Ledger Agent per logical posting attempt (e.g. derived from `source_reference.type` + `source_reference.id`, so the same invoice payment can't double-post even across a crash-and-retry).
- If a call arrives with a previously-seen `idempotency_key` **and identical payload**, the tool returns the original success/rejection result without re-processing — safe to retry after network failure or agent crash mid-call.
- If a call arrives with a previously-seen `idempotency_key` but a **different payload**, that's a `DUPLICATE_KEY_CONFLICT` rejection — this indicates a bug upstream (agent generating the same key for two different logical entries) and must not be silently resolved either direction.

## 8. Failure Modes

| Failure                                                | Tool behavior                                                                                                                                                                                 | What calling agent should do                                                                                   |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Invalid input schema                                   | Reject before any DB interaction, `MALFORMED_LINE` or similar                                                                                                                                 | Do not retry with same input — escalate per `CONFIDENCE_AND_ESCALATION.md` §4 (Block), this is an upstream bug |
| Deterministic rule violation (unbalanced, bad account) | Reject, structured error naming the rule                                                                                                                                                      | Escalate (Block), per Ledger Agent spec §9 — never adjust figures to force balance                             |
| DB unavailable                                         | No write attempted or transaction rolled back cleanly, tool returns a distinct `SYSTEM_UNAVAILABLE` status (not one of the rejection reason codes above, since it's not a validation failure) | Retry with same idempotency key once DB is confirmed available; do not treat as validation failure             |
| Crash mid-transaction                                  | Must be impossible to observe a partial state — entire operation wrapped in a single DB transaction                                                                                           | N/A — transactional guarantee, not an agent-handled case                                                       |

## 9. Audit Trail

Every call — success or rejection — logs: `requesting_agent`, `entity_id`, `idempotency_key`, full request payload, full response, timestamp. Logged to the central audit log (single table/service used by all tools per `TOOL_CONTRACT_TEMPLATE.md` §9), not a Ledger-specific log, so Audit Agent and Controller Agent queries don't need to know which tool produced which record.

## 10. Test Coverage

Link: `tests/tools/post-journal-entry.test.ts` (to be built)

Minimum required cases:

- Balanced entry posts successfully
- Unbalanced entry (off by any amount, including $0.01) rejected, no partial write
- Entry referencing nonexistent account rejected
- Entry referencing inactive account rejected
- Entry with mismatched entity_id across account references rejected, logged as security event
- Identical idempotency key + identical payload → returns original result, no duplicate posting
- Identical idempotency key + different payload → `DUPLICATE_KEY_CONFLICT`
- Multi-currency line missing `exchange_rate` rejected
- Simulated crash mid-transaction → confirmed no partial state observable on recovery

---

## Contract Sign-off Checklist

- [x] Input/output schemas fully specified, no untyped fields
- [x] Every deterministic rule from Ledger Agent spec §7 enforced here in code
- [x] Entity scoping enforced at DB layer (RLS), not application layer alone
- [x] Idempotency behavior defined
- [ ] Idempotency behavior tested — pending test implementation
- [x] Failure modes return structured errors, never silent partial success
- [x] Audit logging confirmed present on every code path (design-level; pending implementation verification)
