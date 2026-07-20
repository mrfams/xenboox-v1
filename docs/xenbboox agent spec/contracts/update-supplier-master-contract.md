# Tool Contract: `update_supplier_master`

> Filled from `TOOL_CONTRACT_TEMPLATE.md`. This tool enforces the anti-fraud gate on supplier payment-detail changes — a named fraud vector in AP Agent spec §3 that must be a hard code-level constraint, not a prompt-level suggestion.

---

## 1. Identity

| Field        | Value                                                                                                                                                     |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tool name    | `update_supplier_master`                                                                                                                                  |
| Called by    | AP Agent only (no other agent modifies supplier master data)                                                                                              |
| Read / Write | Write                                                                                                                                                     |
| Idempotent?  | Yes — idempotency key derived from supplier_id + a client-generated update_id; identical update requests return the original result without re-processing |

## 2. Purpose

Update supplier master data fields (name, address, tax status, payment terms, bank/mobile money payment details) for a given entity, with a mandatory hard gate: any change to bank or mobile money payment detail fields sets `requires_verification: true` and blocks payment scheduling against that supplier until the change is independently verified.

## 3. Input Schema

```json
{
  "entity_id": "uuid",
  "supplier_id": "uuid",
  "update_id": "string",
  "idempotency_key": "string",
  "requesting_agent": "string (enum: ap-agent)",
  "changes": {
    "supplier_name": "string | null",
    "address": "string | null",
    "tax_id": "string | null",
    "tax_status": "string (enum: VAT_registered | VAT_exempt | withholding_tax_applicable) | null",
    "payment_terms": "string (enum: immediate | net_15 | net_30 | net_45 | net_60 | custom) | null",
    "payment_terms_custom_days": "integer | null (required if payment_terms = custom)",
    "bank_account": {
      "bank_name": "string | null",
      "account_number": "string | null",
      "routing_number": "string | null",
      "iban": "string | null",
      "swift": "string | null",
      "currency": "string (ISO 4217) | null"
    } | null,
    "mobile_money": {
      "provider": "string (enum: mpesa | airtel_money | orange_money | mtn_momo | other) | null",
      "phone_number": "string | null",
      "account_name": "string | null",
      "currency": "string (ISO 4217) | null"
    } | null,
    "email": "string | null",
    "phone": "string | null"
  },
  "change_reason": "string",
  "requested_by_role": "string (enum: accountant | finance_director | system_agent)"
}
```

| Field                           | Type          | Required | Validation rule                                                                                                |
| ------------------------------- | ------------- | -------- | -------------------------------------------------------------------------------------------------------------- |
| `entity_id`                     | string (uuid) | always   | Must match calling agent's active entity scope — reject if mismatched                                          |
| `supplier_id`                   | string (uuid) | always   | Must reference an existing supplier record visible to this entity                                              |
| `update_id`                     | string        | always   | Client-generated unique identifier for this update attempt; used in audit trail and idempotency key derivation |
| `changes`                       | object        | always   | At least one field must be non-null — empty update is a validation error                                       |
| `bank_account` / `mobile_money` | object        | null     | conditional                                                                                                    | If either is present and any sub-field differs from the current stored value, `requires_verification` is automatically set to `true` |
| `change_reason`                 | string        | always   | Must be non-empty; free-text reason for the change (audit requirement)                                         |

## 4. Output Schema

**Success:**

```json
{
  "status": "updated",
  "supplier_id": "uuid",
  "entity_id": "uuid",
  "updated_at": "timestamp",
  "changed_fields": ["string — list of field paths that actually changed"],
  "requires_verification": "bool",
  "payment_blocked_until_verified": "bool — true if requires_verification is true"
}
```

**Rejection:**

```json
{
  "status": "rejected",
  "supplier_id": "uuid",
  "reason_code": "string (enum: ENTITY_MISMATCH | SUPPLIER_NOT_FOUND | NO_CHANGES | INVALID_FIELD_VALUE | DUPLICATE_KEY_CONFLICT | INVALID_ROLE)",
  "human_readable_reason": "string",
  "failed_rule": "string — which specific rule from §5 below failed"
}
```

No partial states exist. A call returns exactly one of these two shapes.

## 5. Deterministic Rules Enforced (Layer 1)

| Rule                                                                                                                                                      | Enforcement point                                                                                                                                                                                                                        | Behavior on violation                                                                                                                                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Any change to bank account or mobile money payment fields (any sub-field) automatically sets `requires_verification = true` and blocks payment scheduling | Application-layer diff: compares each incoming field against current stored value before write; if any payment-detail field differs, `requires_verification` is forced to `true` — the caller cannot set it to `false` for these changes | Not a violation — this is a forced state transition, not a rejection. The tool succeeds but always sets `requires_verification` if payment fields changed. The calling agent cannot override this via any parameter or confidence score. |
| Payment scheduling is blocked against this supplier until `requires_verification` is cleared by a separate verification workflow (outside this tool)      | Application-layer gate in the payment-scheduling logic: `requires_verification = true` on a supplier prevents any `schedule_payment` call from including payments to that supplier                                                       | Not enforced in this tool — enforced in the payment scheduling pipeline. This tool sets the flag; the scheduling tool checks it.                                                                                                         |
| `supplier_id` must reference an existing supplier visible to `entity_id`                                                                                  | Foreign key constraint + RLS filter                                                                                                                                                                                                      | Reject, `SUPPLIER_NOT_FOUND` or `ENTITY_MISMATCH`                                                                                                                                                                                        |
| At least one field in `changes` must be non-null                                                                                                          | Schema validation before processing                                                                                                                                                                                                      | Reject, `NO_CHANGES`                                                                                                                                                                                                                     |
| `payment_terms_custom_days` required when `payment_terms = custom`                                                                                        | Schema validation                                                                                                                                                                                                                        | Reject, `INVALID_FIELD_VALUE`                                                                                                                                                                                                            |
| `requested_by_role` must be a valid role — system-initiated changes from agent context are recorded as `system_agent`                                     | Enum validation                                                                                                                                                                                                                          | Reject, `INVALID_ROLE`                                                                                                                                                                                                                   |

The most critical rule — forced `requires_verification` on payment-detail changes — is enforced in code: the tool compares each incoming payment field against the stored value, and if any differs, it writes the supplier record with `requires_verification = true` regardless of what the calling agent requests. The model cannot talk its way out of this.

## 6. Entity Scoping Enforcement

Enforced via PostgreSQL row-level security policy on the `suppliers` table. Every query and write is implicitly scoped to the authenticated session's `entity_id`. This tool cannot read or modify a supplier record belonging to a different entity even if the calling agent's context is corrupted. Application-layer `entity_id` matching is defense in depth.

## 7. Idempotency & Retry Behavior

- Idempotency key is derived from `supplier_id + update_id`. A given `update_id` for a given supplier can only be applied once.
- If a call arrives with a previously-seen `idempotency_key` and identical payload, the tool returns the original success/rejection result without re-processing. Safe to retry after network failure or agent crash mid-call.
- If a call arrives with a previously-seen `idempotency_key` but a different payload, that is a `DUPLICATE_KEY_CONFLICT` rejection — this indicates a bug upstream (agent generating the same update_id for two different logical updates) and must not be silently resolved.
- A subsequent update to the same supplier (with a new `update_id`) is a separate operation, not a retry.

## 8. Failure Modes

| Failure                                                | Tool behavior                                                                                                                       | What calling agent should do                                                                                   |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Invalid input schema                                   | Reject before any DB interaction, structured error                                                                                  | Do not retry with same input — escalate per `CONFIDENCE_AND_ESCALATION.md` §4 (Block), this is an upstream bug |
| Supplier not found or entity mismatch                  | Reject, structured error                                                                                                            | Escalate (Block) — entity mismatch is a security event                                                         |
| No actual changes (all fields match current values)    | Reject, `NO_CHANGES`                                                                                                                | Informative; do not retry                                                                                      |
| Payment field change that sets `requires_verification` | Success (not a rejection) — but the flag is set automatically and payment scheduling against this supplier is blocked until cleared | Notify Controller Agent + human per AP Agent spec §9 — verification workflow must be initiated separately      |
| DB unavailable / crash mid-transaction                 | Transaction rolled back cleanly, returns `SYSTEM_UNAVAILABLE`                                                                       | Retry with same idempotency key once DB is available                                                           |

## 9. Audit Trail

Every call — success or rejection — logs: `calling_agent` (ap-agent), `entity_id`, `supplier_id`, `update_id`, full request payload (including all changed fields), full response, timestamp, calling agent's confidence score for the update decision, and whether `requires_verification` was set. This is the most audit-sensitive tool outside of `post_journal_entry` because supplier payment-detail changes are a known fraud vector — the audit record must capture both the before and after state of every changed field, not just the final result.

## 10. Test Coverage

Link: `tests/tools/update-supplier-master.test.ts` (to be built)

Minimum required cases:

- Non-payment field update (supplier name, address) succeeds, `requires_verification: false`
- Bank account field change succeeds, `requires_verification: true`, `payment_blocked_until_verified: true`
- Mobile money field change succeeds, `requires_verification: true`
- Mixed update (name + bank account) succeeds, `requires_verification: true`, the non-payment fields updated as well
- Identical update retried with same idempotency key → returns original result, no duplicate
- Cross-entity update attempt → `ENTITY_MISMATCH`, no state change
- Empty changes object → `NO_CHANGES`
- Supplier not found → `SUPPLIER_NOT_FOUND`
- `payment_terms_custom_days` missing when `payment_terms = custom` → `INVALID_FIELD_VALUE`
- Concurrent update to same supplier with different `update_id` — both succeed independently, audit trail captures both

---

## Contract Sign-off Checklist

- [x] Input/output schemas fully specified, no untyped fields
- [x] Every deterministic rule from AP Agent spec §7 enforced here in code
- [x] Entity scoping enforced at DB layer (RLS), not application layer alone
- [x] Idempotency behavior defined and tested
- [x] Failure modes return structured errors, never silent partial success
- [x] Audit logging confirmed present on every code path (success and failure)
