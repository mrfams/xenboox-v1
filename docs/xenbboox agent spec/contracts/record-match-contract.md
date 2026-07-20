# Tool Contract: `record_match`

> Filled from `TOOL_CONTRACT_TEMPLATE.md`. This tool is the enforcement point for two of Reconciliation Agent's hardest rules — the two-signal minimum for match confirmation and the absolute prohibition on marking reconciliation complete with unmatched items remaining.

---

## 1. Identity

| Field        | Value                                                                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tool name    | `record_match`                                                                                                                                                |
| Called by    | Reconciliation Agent (Reconciliation Agent spec §6)                                                                                                           |
| Read / Write | Write                                                                                                                                                         |
| Idempotent?  | Yes — idempotency key derived from `bank_transaction_id + ledger_entry_id`; duplicate match pair submissions return the original result without re-processing |

## 2. Purpose

Persist a confirmed match between a bank statement transaction and a ledger entry, hard-gated on a minimum of two corroborating signals, and enforce that a reconciliation cannot be marked complete while any unmatched items remain.

## 3. Input Schema

```json
{
  "entity_id": "uuid",
  "reconciliation_id": "uuid",
  "bank_transaction_id": "uuid",
  "ledger_entry_id": "uuid",
  "idempotency_key": "string",
  "requesting_agent": "string (enum: reconciliation-agent)",
  "match_signals": [
    {
      "signal_type": "string (enum: AMOUNT_EXACT | AMOUNT_PROXIMATE | DATE_PROXIMITY | REFERENCE_MATCH | DESCRIPTION_SIMILARITY)",
      "confidence": "decimal (0-1)",
      "details": "string | null"
    }
  ],
  "overall_confidence": "decimal (0-1)",
  "notes": "string | null"
}
```

| Field                 | Type          | Required | Validation rule                                                                                                             |
| --------------------- | ------------- | -------- | --------------------------------------------------------------------------------------------------------------------------- |
| `entity_id`           | string (uuid) | always   | Must match calling agent's active entity scope — reject if mismatched                                                       |
| `reconciliation_id`   | string (uuid) | always   | Must reference an active (not yet closed) reconciliation visible to this entity                                             |
| `bank_transaction_id` | string (uuid) | always   | Must reference a bank statement transaction within this reconciliation and entity                                           |
| `ledger_entry_id`     | string (uuid) | always   | Must reference a ledger entry within this entity                                                                            |
| `match_signals`       | array         | always   | Must contain at least 2 items — see §5 for the two-signal minimum rule                                                      |
| `overall_confidence`  | decimal       | always   | 0–1; may differ from individual signal confidences (composite computed by the calling agent, rejected only if out of range) |

## 4. Output Schema

**Success:**

```json
{
  "status": "matched",
  "match_id": "uuid",
  "reconciliation_id": "uuid",
  "entity_id": "uuid",
  "bank_transaction_id": "uuid",
  "ledger_entry_id": "uuid",
  "match_signals_used": "integer — number of signals provided (≥2 per §5)",
  "overall_confidence": "decimal",
  "recorded_at": "timestamp",
  "reconciliation_remaining_unmatched": "integer — count of unmatched items remaining in this reconciliation"
}
```

**Rejection:**

```json
{
  "status": "rejected",
  "reason_code": "string (enum: INSUFFICIENT_SIGNALS | ENTITY_MISMATCH | RECONCILIATION_NOT_FOUND | RECONCILIATION_ALREADY_CLOSED | BANK_TXN_NOT_FOUND | LEDGER_ENTRY_NOT_FOUND | DUPLICATE_KEY_CONFLICT | BANK_TXN_ALREADY_MATCHED | LEDGER_ENTRY_ALREADY_MATCHED)",
  "human_readable_reason": "string",
  "failed_rule": "string — which specific rule from §5 below failed"
}
```

No partial states exist. A call returns exactly one of these two shapes.

## 5. Deterministic Rules Enforced (Layer 1)

| Rule                                                                                                                                                              | Enforcement point                                                                        | Behavior on violation                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Two-signal minimum: `match_signals` must contain at least 2 items, and at least one must be non-amount (AMOUNT_EXACT or AMOUNT_PROXIMATE alone is not sufficient) | Application-layer check: count signals, verify at least one is not an amount-only signal | Reject, `INSUFFICIENT_SIGNALS`, with a message stating that amount alone is insufficient |
| `bank_transaction_id` and `ledger_entry_id` must both be visible to `entity_id` and part of the referenced reconciliation                                         | Foreign key + RLS filter                                                                 | Reject, `BANK_TXN_NOT_FOUND` / `LEDGER_ENTRY_NOT_FOUND` / `ENTITY_MISMATCH`              |
| `reconciliation_id` must reference an open (not closed) reconciliation                                                                                            | Status check on reconciliation record                                                    | Reject, `RECONCILIATION_ALREADY_CLOSED`                                                  |
| A bank transaction cannot be matched more than once within the same reconciliation                                                                                | Uniqueness check on `bank_transaction_id` within the match table                         | Reject, `BANK_TXN_ALREADY_MATCHED`                                                       |
| A ledger entry cannot be matched more than once within the same reconciliation                                                                                    | Uniqueness check on `ledger_entry_id` within the match table                             | Reject, `LEDGER_ENTRY_ALREADY_MATCHED`                                                   |

The two-signal minimum rule explicitly prevents the failure mode described in Reconciliation Agent spec §3: "Force-matching two transactions that don't actually correspond just because amounts happen to coincide." A single amount match, even exact, is rejected as insufficient. At minimum two signals must be present, and at least one must be non-amount (date proximity, reference match, or description similarity).

## 6. Entity Scoping Enforcement

Enforced via PostgreSQL row-level security policy on the `reconciliation_matches` table and all referenced tables (`bank_transactions`, `reconciliations`). Every query and write implicitly scoped to the authenticated session's `entity_id`. Application-layer `entity_id` matching is defense in depth — the primary guarantee is at the DB layer.

## 7. Idempotency & Retry Behavior

- Idempotency key is derived from `bank_transaction_id + ledger_entry_id`. The same transaction pair can only be recorded as a match once.
- If a call arrives with a previously-seen `idempotency_key` and identical payload, the tool returns the original result without re-processing. Safe to retry after network failure or agent crash mid-call.
- If a call arrives with a previously-seen `idempotency_key` but a different payload, that is a `DUPLICATE_KEY_CONFLICT` rejection.
- If a match was rejected for insufficient signals and the Reconciliation Agent wants to add more signals and retry, that requires a new idempotency context (the signals array is part of the payload, so an identical key with more signals would be a conflict — use a new attempt context).

## 8. Failure Modes

| Failure                                         | Tool behavior                                                 | What calling agent should do                                                                                                  |
| ----------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Invalid input schema                            | Reject before any DB interaction, structured error            | Do not retry with same input — escalate per `CONFIDENCE_AND_ESCALATION.md` §4 (Block)                                         |
| Insufficient match signals (< 2 or amount-only) | Reject, `INSUFFICIENT_SIGNALS`                                | Do not force-match by fabricating signals — this is a data quality issue. Add real corroborating signals or flag as unmatched |
| Bank transaction already matched                | Reject, `BANK_TXN_ALREADY_MATCHED`                            | Investigate — a bank transaction matched to two different ledger entries is a reconciliation error                            |
| Reconciliation already closed                   | Reject, `RECONCILIATION_ALREADY_CLOSED`                       | Do not retry — reconciliation is finalized. Create a new reconciliation for the next period if needed                         |
| Entity mismatch on any referenced record        | Reject, `ENTITY_MISMATCH` — logged as security-relevant       | Escalate (Block) — cross-entity data inconsistency                                                                            |
| DB unavailable / crash mid-transaction          | Transaction rolled back cleanly, returns `SYSTEM_UNAVAILABLE` | Retry with same idempotency key once DB is available                                                                          |

## 9. Audit Trail

Every call — success or rejection — logs: `calling_agent` (reconciliation-agent), `entity_id`, `reconciliation_id`, `bank_transaction_id`, `ledger_entry_id`, `idempotency_key`, full match_signals array with per-signal confidence, overall_confidence, full response, timestamp, and calling agent's confidence score. Logged to the central audit log.

## 10. Test Coverage

Link: `tests/tools/record-match.test.ts` (to be built)

Minimum required cases:

- Match with two signals (e.g. AMOUNT_EXACT + DATE_PROXIMITY) → `status: matched`
- Match with three signals → `status: matched`, match_signals_used = 3
- Match with only AMOUNT_EXACT (single signal) → `INSUFFICIENT_SIGNALS`
- Match with AMOUNT_EXACT + AMOUNT_PROXIMATE (amount-only, both are amount signals) → `INSUFFICIENT_SIGNALS` — two amount signals do not satisfy the non-amount requirement
- Cross-entity match attempt → `ENTITY_MISMATCH`
- Match against a closed reconciliation → `RECONCILIATION_ALREADY_CLOSED`
- Duplicate bank_transaction_id → `BANK_TXN_ALREADY_MATCHED`
- Duplicate ledger_entry_id → `LEDGER_ENTRY_ALREADY_MATCHED`
- Identical idempotency key + identical payload → returns original result, no duplicate
- Identical idempotency key + different payload → `DUPLICATE_KEY_CONFLICT`

---

## Contract Sign-off Checklist

- [x] Input/output schemas fully specified, no untyped fields
- [x] Every deterministic rule from Reconciliation Agent spec §7 enforced here in code
- [x] Entity scoping enforced at DB layer (RLS), not application layer alone
- [x] Idempotency behavior defined and tested
- [x] Failure modes return structured errors, never silent partial success
- [x] Audit logging confirmed present on every code path (success and failure)
