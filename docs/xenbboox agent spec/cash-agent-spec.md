# Agent Spec: Cash Agent

> Filled from `AGENT_SPEC_TEMPLATE.md`.

---

## 1. Identity

| Field         | Value                                                                                                                                                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Agent name    | Cash Agent                                                                                                                                                                                                                                  |
| Tier          | Worker                                                                                                                                                                                                                                      |
| Reports to    | Treasury Agent                                                                                                                                                                                                                              |
| Oversees      | (none)                                                                                                                                                                                                                                      |
| PRD reference | §6.5 "Cash Agent"; §22 Founder Insight names imprest management directly as lived domain knowledge                                                                                                                                          |
| Model         | claude-sonnet-4-6 — imprest issuance/retirement matching requires judgment (partial receipts, mixed-purpose float); PRD flags this module as "built more robustly than any Western platform," which means it isn't routine enough for Haiku |

## 2. Mandate

The Cash Agent owns physical cash and imprest management: daily cash position across tills and locations, petty cash floats, imprest issuance and retirement, and immediate discrepancy detection. This is the module the PRD explicitly calls a core African-market differentiator (§22) — it must be held to a higher bar than a generic "expense tracking" feature, because it's tracking real physical cash handled by real people in the field, where discrepancies are both more common and more consequential than in a bank-mediated flow.

## 3. Scope Boundary

**This agent MUST:**

- Track daily cash position across every physical till and location for the entity
- Manage petty cash float balances
- Record imprest issuance: who received it, how much, for what stated purpose, when
- Perform imprest retirement: match receipts submitted against float issued, calculate balance due (over/under)
- Detect and immediately flag cash discrepancies — never let a discrepancy sit unflagged until period end
- Produce a daily cash reconciliation report

**This agent MUST NEVER:**

- Post journal entries directly — imprest and cash movements post through Ledger Agent
- Retire an imprest float as "clean" when receipts don't sum to the amount issued, without flagging the variance explicitly (a variance is not automatically fraud or error, but it is never silently absorbed)
- Issue imprest without a named recipient and stated purpose — anonymous or purpose-less float issuance is not a valid input, this agent rejects the request rather than proceeding
- Treat a cash discrepancy as resolved based on plausible-sounding explanation alone — resolution requires either supporting documentation or explicit Treasury Agent / human sign-off

## 4. Inputs

| Input                         | Source                                                                       | Format                        | Validation required before processing                                                  |
| ----------------------------- | ---------------------------------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------- |
| Imprest issuance request      | Human (Cashier role) via mobile app                                          | `ImprestIssuanceRequest`      | recipient identified, purpose stated, amount > 0, entity_id matches                    |
| Imprest retirement submission | Human (Cashier or recipient) via mobile app, receipts via Document Agent OCR | `ImprestRetirementSubmission` | float reference exists and is still open, receipts attached or explicitly noted absent |
| Daily till count              | Cashier via mobile app                                                       | `TillCountEntry`              | location_id valid, amount ≥ 0, timestamp within business hours window (configurable)   |

## 5. Outputs

| Output                                      | Destination               | Schema                     | Required fields                                                                       |
| ------------------------------------------- | ------------------------- | -------------------------- | ------------------------------------------------------------------------------------- |
| Journal entry request (issuance/retirement) | Ledger Agent              | `JournalEntryRequest`      | `requesting_agent: cash-agent`, `source_reference.type: adjustment`                   |
| Daily cash reconciliation report            | Treasury Agent            | `CashReconciliationReport` | `entity_id`, `date`, `locations[]` (each with expected vs. actual), `discrepancies[]` |
| Discrepancy flag                            | Treasury Agent, immediate | `CashDiscrepancyFlag`      | `location_id`, `expected_amount`, `actual_amount`, `variance`, `flagged_at`           |

## 6. Tools This Agent Can Call

| Tool                      | Purpose                                             | Read/Write |
| ------------------------- | --------------------------------------------------- | ---------- |
| `record_till_count`       | Persist a cash count for a location/date            | Write      |
| `get_open_imprest_floats` | Retrieve outstanding floats for retirement matching | Read       |
| `post_journal_entry`      | Submit issuance/retirement/discrepancy entries      | Write      |

Contracts: `post_journal_entry` already written (shared, multi-caller). `record_till_count` and `get_open_imprest_floats` not yet written — flagged as next step.

## 7. Deterministic Rules Enforced On This Agent's Output

| Rule                                                                                                                                | Enforcement point                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Imprest issuance requires non-null recipient, purpose, amount > 0                                                                   | Application-layer schema validation on `record_imprest_issuance`             |
| Retirement variance (receipts total vs. amount issued) is always computed and stored, never omitted even when it's zero             | Application-layer — the field is required in the output schema, not optional |
| Discrepancy flags cannot be marked resolved without either a linked document or an explicit human/Treasury Agent sign-off reference | Application-layer check on the resolution write path                         |

## 8. Confidence Scoring

- **Retirement match confidence** — how well submitted receipts account for the float issued (amount match, plausibility of stated purpose vs. receipt categories)
- **Discrepancy explanation confidence** — when a discrepancy is reported with an explanation (e.g. "float double-counted"), how well that explanation is corroborated by other data (till counts, timing) versus asserted without support

## 9. Escalation Triggers

| Trigger condition                                                             | Escalates to               | Escalation type                                                                                                                                             |
| ----------------------------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Any cash discrepancy detected, any amount                                     | Treasury Agent, immediate  | Notify (always — per PRD §6.5 "immediate flagging," no minimum threshold, small discrepancies matter for pattern detection even if individually immaterial) |
| Discrepancy above entity-configured materiality threshold                     | Treasury Agent + CFO Agent | Flag                                                                                                                                                        |
| Imprest retirement variance confidence < 0.75                                 | Treasury Agent             | Block (retirement held open, not closed, until resolved)                                                                                                    |
| Repeated discrepancies from the same location/cashier across multiple periods | Treasury Agent             | Notify (pattern flag — potential systemic issue or process gap, not necessarily wrongdoing, but worth surfacing)                                            |

## 10. Failure Modes & Recovery

- **Known failure mode:** legitimate delay between physical cash movement and recording (field officer records imprest use days after the fact) creates a false-looking discrepancy at the moment of count. Mitigation: discrepancy flags carry a distinct `possible_causes` category for "recording lag" versus "unexplained variance," and Treasury Agent's review considers timing before treating a gap as a true discrepancy.
- **Recovery:** discrepancies are corrected via journal entries through Ledger Agent (adjustment type), never by silently editing a prior till count record.

## 11. Golden Dataset Coverage

Link: `datasets/cash-agent-golden.yaml` (not yet built). Target: standard 28-case floor, but weight `ambiguous` category toward retirement-variance scenarios specifically — this is where the PRD's "built more robustly than any Western platform" claim is actually tested or not.

## 12. Cross-Agent Dependencies

- **Upstream:** Document Agent (receipt OCR), human input via mobile app
- **Downstream:** Treasury Agent (daily report, discrepancy review), Ledger Agent (postings)
- **Flow tests:** no dedicated flow in `CROSS_AGENT_FLOW_TESTS.md` §3 yet — should be added given this is a named differentiator module; flagged as a gap in that doc.

## 13. Open Questions

- Entity-configured materiality threshold for discrepancy escalation to CFO Agent (§9) — will vary by entity size, not a single global number; mechanism for entities to set this not yet designed.
- Whether mobile app should allow retirement submission without any receipts (fully verbal/asserted purpose) as a valid-but-flagged path, or hard-require at least partial documentation — leaning toward allow-but-flag, since cash-heavy African field operations realistically can't always produce a receipt for every small purchase, but this needs founder judgment given the lived domain experience behind this module (PRD §22).

---

## Spec Sign-off Checklist

- [x] Scope boundary reviewed — no overlap with Mobile Money Agent (physical cash only) or Reconciliation Agent (bank-side matching)
- [x] All outputs have a defined schema
- [ ] All tools listed have contracts written — 1 of 3 (shared `post_journal_entry`)
- [x] All deterministic rules identified and mapped to enforcement layer
- [x] Escalation triggers are concrete
- [ ] Golden dataset exists with minimum coverage — not yet built
- [x] Cross-agent flows identified — gap flagged in §12, needs a dedicated flow test added
