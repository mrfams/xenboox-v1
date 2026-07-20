# Tool Contract Template

> Every tool an agent can call gets one contract using this structure, before any agent spec lists it as callable. Tools are where deterministic rules (PRD §6.7 Layer 1) actually live in code — never trust the model to enforce them via prompt instruction.
>
> File naming: `tools/<tool-name>-contract.md` (e.g. `post-journal-entry-contract.md`)
>
> Rule of thumb: if a rule _must never_ be violated (double-entry balance, bank balance match, entity_id scoping), it is enforced here, in code, with a hard reject — not phrased as guidance to the model.

---

## 1. Identity

| Field        | Value                                                             |
| ------------ | ----------------------------------------------------------------- |
| Tool name    | (exact function name, e.g. `post_journal_entry`)                  |
| Called by    | (which agent(s) — list all, a tool with many callers needs care)  |
| Read / Write |                                                                   |
| Idempotent?  | Yes/No — if No, explain why and how duplicate calls are prevented |

## 2. Purpose (one sentence)

## 3. Input Schema

```json
{
  // exact JSON schema, required vs optional fields, types, enums
}
```

| Field       | Type          | Required | Validation rule                                                                                                     |
| ----------- | ------------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| `entity_id` | string (uuid) | always   | Must match calling agent's active entity scope — reject if mismatched, this is the multi-tenant boundary (PRD §9.2) |

_(`entity_id` is listed first deliberately — it is required on every single tool without exception. If a tool doesn't naturally need it, that's a red flag, not an exemption.)_

## 4. Output Schema

```json
{
  // exact JSON schema of what the tool returns
}
```

## 5. Deterministic Rules Enforced (Layer 1)

The core of this document. For each rule:

| Rule                  | Enforcement point                               | Behavior on violation                                                |
| --------------------- | ----------------------------------------------- | -------------------------------------------------------------------- |
| e.g. debits = credits | DB constraint + application check before commit | Reject entire transaction, return structured error, no partial write |

State explicitly: **these checks run in code/DB, not as an instruction to the LLM.** The model can request an action; it cannot talk its way past a hard constraint. If a rule _can't_ be enforced deterministically (truly requires judgment), it does not belong in this section — it belongs in the calling agent's confidence/escalation logic instead.

## 6. Entity Scoping Enforcement

Restate specifically (not just "entity_id required" from §3): how does this tool guarantee it cannot read or write data belonging to a different entity, even if the calling agent's context is somehow corrupted or the entity_id is spoofed? Prefer row-level security enforced at the DB layer (PRD §9.2) over application-layer checks alone — application checks are defense in depth, not the primary guarantee.

## 7. Idempotency & Retry Behavior

- What happens if this tool is called twice with identical input (network retry, agent re-run after crash)?
- Idempotency key strategy, if applicable
- What state changes are safe to retry vs. must be guarded

## 8. Failure Modes

| Failure                                              | Tool behavior                                         | What calling agent should do                                                                                        |
| ---------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Invalid input schema                                 | Reject before any processing, structured error        | Do not retry with same input — this is a bug upstream, escalate                                                     |
| Deterministic rule violation                         | Reject, structured error naming the specific rule     | Escalate per `CONFIDENCE_AND_ESCALATION.md` §4 (Block) — never silently retry with adjusted numbers to make it pass |
| Downstream dependency unavailable (DB, external API) |                                                       |                                                                                                                     |
| Partial write / crash mid-operation                  | Must be impossible — transactional guarantee required | N/A if properly transactional                                                                                       |

## 9. Audit Trail

Every call to this tool must log: calling agent, entity_id, timestamp, input, output, confidence score of the calling agent's decision (if applicable), and success/failure. State where this is logged (should be a single consistent audit log across all tools, not per-tool ad hoc logging).

## 10. Test Coverage

Link to test file. Minimum coverage for a tool enforcing Layer 1 rules:

- One test per deterministic rule, proving violation is rejected
- One test proving idempotent retry produces no duplicate state change
- One test proving entity scoping cannot be bypassed (attempt cross-entity call, confirm hard failure)

---

## Contract Sign-off Checklist

- [ ] Input/output schemas fully specified, no untyped fields
- [ ] Every deterministic rule from the calling agent's spec (§7) that applies to this tool is enforced here in code
- [ ] Entity scoping enforced at DB layer, not application layer alone
- [ ] Idempotency behavior defined and tested
- [ ] Failure modes return structured errors, never silent partial success
- [ ] Audit logging confirmed present on every code path (success and failure)
