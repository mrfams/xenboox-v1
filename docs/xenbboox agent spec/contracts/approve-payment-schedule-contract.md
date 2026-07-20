# Tool Contract: `approve_payment_schedule`

> Filled from `TOOL_CONTRACT_TEMPLATE.md`. Enforces the cash-availability gate before any AP payment schedule is released for execution — the hard boundary between "we want to pay this" and "we actually have the cash to pay this."

---

## 1. Identity

| Field        | Value                                                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Tool name    | `approve_payment_schedule`                                                                                                     |
| Called by    | Treasury Agent only (Treasury Agent spec §6)                                                                                   |
| Read / Write | Write                                                                                                                          |
| Idempotent?  | Yes — idempotency key derived from `schedule_id`; identical approval requests return the original result without re-processing |

## 2. Purpose

Approve or reject a proposed AP payment schedule after verifying that executing the schedule would not cause the entity's consolidated cash position to fall below its configured minimum buffer — a deterministic cash-availability gate that cannot be bypassed by a confident-LIAM override.

## 3. Input Schema

```json
{
  "entity_id": "uuid",
  "schedule_id": "uuid",
  "idempotency_key": "string",
  "requesting_agent": "string (enum: treasury-agent)",
  "proposed_payments": [
    {
      "payment_id": "uuid",
      "amount": "decimal",
      "currency": "string (ISO 4217)",
      "rail": "string (enum: bank_transfer | mobile_money | cash)",
      "scheduled_date": "date (ISO 8601)",
      "payee_supplier_id": "uuid"
    }
  ],
  "total_proposed_amount": "decimal",
  "currency": "string (ISO 4217)"
}
```

| Field                   | Type          | Required | Validation rule                                                                                            |
| ----------------------- | ------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| `entity_id`             | string (uuid) | always   | Must match calling agent's active entity scope — reject if mismatched                                      |
| `schedule_id`           | string (uuid) | always   | Must reference an existing payment schedule proposal visible to this entity                                |
| `idempotency_key`       | string        | always   | Must be unique per approval attempt; duplicate key with identical payload returns original result          |
| `total_proposed_amount` | decimal       | always   | Must equal sum of all `proposed_payments[].amount` — structural integrity check against calculation errors |
| `proposed_payments`     | array         | always   | Must not be empty; each payment must have a valid `rail` and `scheduled_date` ≥ today                      |

## 4. Output Schema

**Success:**

```json
{
  "status": "approved",
  "schedule_id": "uuid",
  "approved_at": "timestamp",
  "entity_id": "uuid",
  "cash_position_before": {
    "total": "decimal",
    "minimum_buffer": "decimal",
    "available_above_buffer": "decimal"
  },
  "cash_position_after": {
    "total": "decimal",
    "minimum_buffer": "decimal",
    "available_above_buffer": "decimal"
  },
  "approval_valid_until": "timestamp"
}
```

**Rejection:**

```json
{
  "status": "rejected",
  "schedule_id": "uuid",
  "reason_code": "string (enum: INSUFFICIENT_CASH | BELOW_MINIMUM_BUFFER | ENTITY_MISMATCH | SCHEDULE_NOT_FOUND | ALREADY_APPROVED | DUPLICATE_KEY_CONFLICT | AMOUNT_MISMATCH | INVALID_CURRENCY)",
  "human_readable_reason": "string",
  "failed_rule": "string — which specific rule from §5 below failed",
  "cash_position": {
    "total": "decimal",
    "minimum_buffer": "decimal",
    "available_above_buffer": "decimal"
  }
}
```

No partial states exist. A call returns exactly one of these two shapes.

## 5. Deterministic Rules Enforced (Layer 1)

| Rule                                                                                                                                                             | Enforcement point                                                                                                                            | Behavior on violation                                                                           |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Proposed payments total must not exceed consolidated cash position minus the entity-configured minimum buffer                                                    | Application-layer check: fetches live consolidated cash position from `get_consolidated_cash_position`, computes `total - buffer - proposed` | Reject, `INSUFFICIENT_CASH` or `BELOW_MINIMUM_BUFFER` depending on severity, with position data |
| Consolidated cash position must be non-negative after executing the schedule                                                                                     | Same check as above, cascading: if post-execution position < 0, reject                                                                       | Reject, `INSUFFICIENT_CASH`                                                                     |
| `total_proposed_amount` must match sum of `proposed_payments[].amount`                                                                                           | Application-layer arithmetic validation                                                                                                      | Reject, `AMOUNT_MISMATCH`                                                                       |
| All proposed payments must share a single currency or be convertible to the entity's base currency — no multi-currency schedule with unspecified conversion rate | Application-layer check                                                                                                                      | Reject, `INVALID_CURRENCY`                                                                      |
| `schedule_id` must reference an existing payment schedule visible to `entity_id`                                                                                 | Foreign key constraint + RLS filter                                                                                                          | Reject, `SCHEDULE_NOT_FOUND` or `ENTITY_MISMATCH`                                               |
| Schedule must not already be approved                                                                                                                            | Status check on schedule record before write                                                                                                 | Reject, `ALREADY_APPROVED`, return original approval timestamp                                  |

All of the above run in code/DB. The Treasury Agent reviews the payment schedule request and proposes approval, but this tool independently fetches the live cash position and enforces the buffer check — the model cannot approve a schedule that violates cash constraints, regardless of its reasoning or confidence.

## 6. Entity Scoping Enforcement

Enforced via PostgreSQL row-level security policy on both the `payment_schedules` and `cash_positions` tables. This tool reads the entity's consolidated cash position through the same RLS-gated queries used by `get_consolidated_cash_position` — it is structurally impossible to evaluate cash availability against the wrong entity's balance. Application-layer `entity_id` matching is defense in depth.

## 7. Idempotency & Retry Behavior

- Idempotency key is derived from `schedule_id` — each schedule can only be approved once.
- If a call arrives with a previously-seen `idempotency_key` and identical payload, the tool returns the original result without re-processing. Safe to retry after network failure or agent crash mid-call.
- If a call arrives with a previously-seen `idempotency_key` but a different payload, that is a `DUPLICATE_KEY_CONFLICT` rejection.
- A schedule rejected for cash reasons can be resubmitted after the cash position improves (e.g. new deposits arrive), but that is a new approval attempt with a new idempotency context — not a retry of the same call.
- Approval has an expiration timestamp (`approval_valid_until`). Schedules not executed before this timestamp require re-approval.

## 8. Failure Modes

| Failure                                                                    | Tool behavior                                                             | What calling agent should do                                                                                                |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Invalid input schema                                                       | Reject before any DB interaction, structured error                        | Do not retry with same input — escalate per `CONFIDENCE_AND_ESCALATION.md` §4 (Block)                                       |
| Insufficient cash (position goes negative)                                 | Reject, `INSUFFICIENT_CASH`, return current cash position                 | Escalate per Treasury Agent spec §9 (Block) — notify CFO Agent; do not attempt to reduce amounts to force approval          |
| Below minimum buffer (position stays positive but below configured buffer) | Reject, `BELOW_MINIMUM_BUFFER`, return buffer details                     | Escalate per Treasury Agent spec §9 (Block) — notify CFO Agent; override path requires explicit human or CFO Agent sign-off |
| Cash position unavailable or stale                                         | Reject, `SYSTEM_UNAVAILABLE` — distinct from cash-availability rejections | Retry after verifying data pipeline health; do not interpret as a cash-availability result                                  |
| Schedule already approved                                                  | Reject, `ALREADY_APPROVED`, return original approval details              | Informative, not an error; proceed with execution of the already-approved schedule                                          |
| DB unavailable / crash mid-transaction                                     | Transaction rolled back cleanly, returns `SYSTEM_UNAVAILABLE`             | Retry with same idempotency key once DB is available                                                                        |

## 9. Audit Trail

Every call — success or rejection — logs: `calling_agent` (treasury-agent), `entity_id`, `schedule_id`, `idempotency_key`, full request payload (including proposed payments), full response, timestamp, calling agent's confidence score for the approval decision, and the cash position snapshot used for evaluation. Logged to the central audit log.

## 10. Test Coverage

Link: `tests/tools/approve-payment-schedule.test.ts` (to be built)

Minimum required cases:

- Schedule with sufficient cash above buffer → `status: approved`, position-after correctly reflects deduction
- Schedule that would bring position negative → `INSUFFICIENT_CASH`, no approval
- Schedule that would stay positive but drop below minimum buffer → `BELOW_MINIMUM_BUFFER`, no approval
- Cross-entity schedule approval attempt → `ENTITY_MISMATCH`, no state change
- Already-approved schedule → `ALREADY_APPROVED`
- Amount mismatch (total_proposed_amount != sum of payments) → `AMOUNT_MISMATCH`
- Empty proposed_payments array → structural validation error
- Identical idempotency key + identical payload → returns original result, no duplicate
- Identical idempotency key + different payload → `DUPLICATE_KEY_CONFLICT`
- Currency mismatch across payments without conversion rate → `INVALID_CURRENCY`

---

## Contract Sign-off Checklist

- [x] Input/output schemas fully specified, no untyped fields
- [x] Every deterministic rule from Treasury Agent spec §7 enforced here in code
- [x] Entity scoping enforced at DB layer (RLS), not application layer alone
- [x] Idempotency behavior defined and tested
- [x] Failure modes return structured errors, never silent partial success
- [x] Audit logging confirmed present on every code path (success and failure)
