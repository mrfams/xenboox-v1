# Tool Contract: `get_trial_balance`

> Filled from `TOOL_CONTRACT_TEMPLATE.md`.

---

## 1. Identity

| Field        | Value                                                                                                                                                            |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tool name    | `get_trial_balance`                                                                                                                                              |
| Called by    | Ledger Agent (on its own behalf when responding to requests), Controller Agent, Reporting Agent, CFO Agent                                                       |
| Read / Write | Read                                                                                                                                                             |
| Idempotent?  | Yes — trivially, it's a read; same inputs return same result for a closed period, and a live/current-period result that reflects whatever is posted at call time |

## 2. Purpose

Compute and return the trial balance for a given entity and period, with a built-in self-check that the result actually balances — never returns a trial balance without verifying debits = credits first.

## 3. Input Schema

```json
{
  "entity_id": "uuid",
  "period_start": "date (ISO 8601)",
  "period_end": "date (ISO 8601)",
  "as_of": "timestamp | null (defaults to now — allows point-in-time historical queries against the immutable ledger)"
}
```

| Field                         | Type | Required | Validation rule                                                                                                                |
| ----------------------------- | ---- | -------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `entity_id`                   | uuid | always   | Must match calling agent's active entity scope                                                                                 |
| `period_start` / `period_end` | date | always   | `period_start` ≤ `period_end`; both must fall within this entity's operating history (no querying before entity creation date) |

## 4. Output Schema

```json
{
  "entity_id": "uuid",
  "period_start": "date",
  "period_end": "date",
  "accounts": [
    {
      "account_code": "string",
      "account_name": "string",
      "total_debits": "decimal",
      "total_credits": "decimal",
      "net_balance": "decimal"
    }
  ],
  "total_debits": "decimal",
  "total_credits": "decimal",
  "balanced": "bool"
}
```

If `balanced: false` is ever returned, that is not a normal result — see §8, this indicates ledger corruption and is treated as a critical system failure, not a data point to report normally.

## 5. Deterministic Rules Enforced (Layer 1)

| Rule                                                                   | Enforcement point                                                         | Behavior on violation                                                                                                                                                                                                           |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `total_debits` must equal `total_credits` across all returned accounts | Computed on every call, never cached/assumed from a prior run             | If they don't match: does NOT silently return `balanced: false` as a routine field — see §8, this triggers an immediate critical alert path, since it should be structurally impossible given `post_journal_entry`'s guarantees |
| Only accounts belonging to `entity_id` are included                    | Row-level security at DB layer, same mechanism as `post_journal_entry` §6 | Query structurally cannot return cross-entity rows                                                                                                                                                                              |

## 6. Entity Scoping Enforcement

Same PostgreSQL RLS mechanism as `post_journal_entry` — the query itself cannot return rows outside the authenticated session's `entity_id`, independent of any application-layer filtering.

## 7. Idempotency & Retry Behavior

Read-only, naturally idempotent for a closed/historical period. For the current (open) period, results reflect whatever is posted at call time — retries during an open period may legitimately return different totals if new entries posted in between, which is correct behavior, not a consistency bug. Callers requiring a stable snapshot should use `as_of` with an explicit timestamp.

## 8. Failure Modes

| Failure                              | Tool behavior                                                                                                                                                                                                                                                                                                                                                                                                                                         | What calling agent should do                                                                                              |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Invalid date range                   | Reject before query, structured error                                                                                                                                                                                                                                                                                                                                                                                                                 | Do not retry with same input — upstream bug                                                                               |
| entity_id mismatch                   | Reject                                                                                                                                                                                                                                                                                                                                                                                                                                                | Escalate per Ledger Agent spec §9 (entity mismatch = Block, immediate, CFO-notified)                                      |
| **Computed result does not balance** | This should be provably impossible given `post_journal_entry`'s guarantees (§5 of that contract). If it happens anyway, treat as evidence of a bug in the enforcement layer itself, a manual DB intervention, or data corruption. Do not return this as a normal `balanced: false` response — raise a distinct `LEDGER_INTEGRITY_FAILURE` system alert, sent directly to Controller Agent, CFO Agent, and a human, bypassing normal escalation queues | Do not attempt to auto-correct or retry — this requires human/engineering investigation, not an agent-level recovery flow |

## 9. Audit Trail

Every call logged: calling agent, entity_id, period requested, result summary (balanced true/false), timestamp. Logged to the same central audit log as all other tools.

## 10. Test Coverage

Link: `tests/tools/get-trial-balance.test.ts` (to be built)

Minimum required cases:

- Balanced ledger returns correct trial balance, `balanced: true`
- Cross-entity query attempt returns no rows / rejected, never leaks another entity's accounts
- Historical `as_of` query returns period-appropriate snapshot, unaffected by later postings
- Simulated integrity failure (test-only forced imbalance in a sandboxed DB) triggers `LEDGER_INTEGRITY_FAILURE` path, not a routine `balanced: false` response

---

## Contract Sign-off Checklist

- [x] Input/output schemas fully specified
- [x] Every deterministic rule enforced here in code
- [x] Entity scoping enforced at DB layer
- [x] Idempotency behavior defined (read-only, documented open-period caveat)
- [ ] Tested — pending implementation
- [x] Failure modes return structured errors; integrity failure has an explicit non-silent path
- [x] Audit logging confirmed present
