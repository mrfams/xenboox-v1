# Tool Contract: `get_consolidated_cash_position`

> Filled from `TOOL_CONTRACT_TEMPLATE.md`. This tool produces the single source of truth for an entity's cash position — the unified view that Treasury Agent relies on to make payment scheduling and reconciliation close decisions. The `by_rail` breakdown is a mandatory field, not optional, specifically to prevent masking a liquidity concentration problem behind a healthy aggregate number.

---

## 1. Identity

| Field        | Value                                                                                                                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tool name    | `get_consolidated_cash_position`                                                                                                                                                                  |
| Called by    | Treasury Agent (Treasury Agent spec §6)                                                                                                                                                           |
| Read / Write | Read                                                                                                                                                                                              |
| Idempotent?  | Yes — trivially, it is a read; same inputs at the same instant return the same result. Live data reflects whatever is posted at call time, which is correct behavior for a current-position query |

## 2. Purpose

Compute and return the entity's consolidated cash position across all cash rails (bank accounts, physical cash registers, mobile money wallets) in a single unified view with a mandatory break-down by rail, so Treasury Agent and downstream consumers never see a single aggregate number hiding a liquidity problem in one rail.

## 3. Input Schema

```json
{
  "entity_id": "uuid",
  "as_of": "timestamp | null (defaults to now)",
  "include_rail_details": "bool | null (defaults to true — if false, returns only totals without per-rail breakdown)",
  "currency": "string (ISO 4217) | null (if null, returns all currencies; if set, converts all positions to the requested currency)"
}
```

| Field       | Type          | Required | Validation rule                                                                                                                   |
| ----------- | ------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `entity_id` | string (uuid) | always   | Must match calling agent's active entity scope — reject if mismatched                                                             |
| `as_of`     | timestamp     | optional | If provided, returns historical point-in-time snapshot; otherwise returns current live position — must be within entity's history |
| `currency`  | string        | optional | If provided, must be a valid ISO 4217 currency code                                                                               |

## 4. Output Schema

```json
{
  "entity_id": "uuid",
  "as_of": "timestamp",
  "base_currency": "string (ISO 4217)",
  "total_cash_position": "decimal",
  "by_rail": [
    {
      "rail": "string (enum: bank | cash | mobile_money)",
      "total": "decimal",
      "currency": "string (ISO 4217)",
      "accounts": [
        {
          "account_id": "uuid",
          "account_name": "string",
          "balance": "decimal",
          "currency": "string (ISO 4217)",
          "last_synced_at": "timestamp",
          "confidence": "decimal (0-1) — reflects data freshness and source reliability"
        }
      ]
    }
  ],
  "minimum_buffer_configured": "decimal | null",
  "available_above_buffer": "decimal | null (total_cash_position - minimum_buffer_configured, if configured)",
  "confidence": "decimal (0-1) — composite of per-rail confidence values",
  "generated_at": "timestamp"
}
```

The `by_rail` array is always present (minimum 1 rail). Even if all positions are in a single rail (e.g. bank-only entity), the array has one entry. This is structural — the consuming agent (Treasury Agent) must never receive a bare number without knowing which rail it came from.

## 5. Deterministic Rules Enforced (Layer 1)

| Rule                                                                                                     | Enforcement point                                                                        | Behavior on violation                                                                                                                                           |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `total_cash_position` must exactly equal sum of all `by_rail[].total` values, converted to base_currency | Computed on every call, verified by arithmetic check before response is assembled        | If they don't match: this is a data integrity failure analogous to an unbalanced trial balance. The tool returns an error rather than a possibly-wrong position |
| `by_rail` must always be present in the response — never returned as null or empty array                 | Schema-enforced — the output type requires `by_rail` to be present with at least 1 entry | Not a runtime check; the response shape structurally guarantees this                                                                                            |
| Only accounts/rails belonging to `entity_id` are included                                                | Row-level security at DB layer                                                           | Query structurally cannot return cross-entity rows                                                                                                              |
| `as_of` must not be in the future                                                                        | Application-layer validation                                                             | Reject before query, structured error                                                                                                                           |

## 6. Entity Scoping Enforcement

Same PostgreSQL RLS mechanism as all other tools — the underlying queries against bank account balances, cash register balances, and mobile money wallet balances are all scoped to `entity_id` at the DB layer. The tool cannot assemble a position using data from a different entity.

## 7. Idempotency & Retry Behavior

Read-only, naturally idempotent. For a historical `as_of` query, the same timestamp returns the same result. For current-position queries (no `as_of`), results reflect whatever is posted and synced at call time — retries may return different totals if new transactions have been recorded in between, which is correct behavior. Callers requiring a stable snapshot for comparison should always provide an explicit `as_of` timestamp.

## 8. Failure Modes

| Failure                                                                                 | Tool behavior                                                                                                                                                                                                                                                 | What calling agent should do                                                                                  |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Invalid date range (`as_of` in future or before entity creation)                        | Reject before query, structured error                                                                                                                                                                                                                         | Do not retry with same input — upstream bug                                                                   |
| entity_id mismatch                                                                      | Reject                                                                                                                                                                                                                                                        | Escalate per Treasury Agent spec §9 — entity mismatch = Block                                                 |
| One or more data sources unavailable (e.g. bank API feed down, mobile money sync stale) | Tool returns the position with available data, marking the unavailable rail's confidence as 0 and including an `unavailable_rails` array with details. The total position still reflects only available data — it does not guess or extrapolate missing rails | Treat as a degraded position — confidence reflects the gap. Escalate if the missing rail has material balance |
| Computed aggregate does not equal sum of parts (data integrity failure)                 | Returns a distinct `POSITION_INTEGRITY_FAILURE` system alert (not a normal response) — this indicates a bug in the aggregation logic itself or data corruption in the underlying balances table                                                               | Do not auto-correct or retry — requires engineering investigation                                             |

## 9. Audit Trail

Every call logged: `calling_agent` (treasury-agent), `entity_id`, `as_of` timestamp, result summary (total_cash_position, number of rails, confidence), timestamp. Logged to the central audit log. An `unavailable_rails` condition (see §8) is logged as a notable event even if the tool returned a degraded but usable result.

## 10. Test Coverage

Link: `tests/tools/get-consolidated-cash-position.test.ts` (to be built)

Minimum required cases:

- Single-rail entity (bank only) → response has `by_rail` with 1 entry, totals match
- Three-rail entity (bank, cash, mobile money) → response has 3 rail entries, sum of rail totals = total_cash_position
- Cross-entity query attempt → returns empty / entity mismatch, never leaks another entity's position
- Historical `as_of` query returns correct snapshot, unaffected by later postings
- One data source unavailable → degraded response with `unavailable_rails`, confidence reflects gap, no guess for missing rail
- `include_rail_details: false` → returns totals without per-account breakdown (but still has `by_rail` with rail-level totals)
- Currency conversion: position returned in non-base currency → conversion applied, exchange rate snapshot logged
- Simulated integrity failure (test-only forced mismatch) triggers `POSITION_INTEGRITY_FAILURE`, not a routine response

---

## Contract Sign-off Checklist

- [x] Input/output schemas fully specified, no untyped fields
- [x] Every deterministic rule from Treasury Agent spec §7 enforced here in code
- [x] Entity scoping enforced at DB layer (RLS), not application layer alone
- [x] Idempotency behavior defined (read-only, documented live-data caveat)
- [x] Failure modes return structured errors; integrity failure has explicit non-silent path
- [x] Audit logging confirmed present on every code path
