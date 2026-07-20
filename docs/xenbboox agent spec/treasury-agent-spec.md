# Agent Spec: Treasury Agent

> Filled from `AGENT_SPEC_TEMPLATE.md`.

---

## 1. Identity

| Field         | Value                                                                                                            |
| ------------- | ---------------------------------------------------------------------------------------------------------------- |
| Agent name    | Treasury Agent                                                                                                   |
| Tier          | Management                                                                                                       |
| Reports to    | CFO Agent                                                                                                        |
| Oversees      | Reconciliation Agent, Cash Agent, Mobile Money Agent, Expense Agent (Phase 2)                                    |
| PRD reference | §6.4 "Treasury Agent"                                                                                            |
| Model         | claude-sonnet-4-6 — reviewing reconciliations and cash position across multiple rails/accounts is synthesis work |

## 2. Mandate

The Treasury Agent owns all cash, bank, and payment rail management. It reviews every reconciliation and discrepancy flag from Reconciliation Agent, Cash Agent, and Mobile Money Agent before anything is marked complete, monitors daily cash position across every account and rail, manages payment scheduling from a cash-availability perspective, and is the single most important line of defense against the specific failure this PRD names directly: never closing a reconciliation with unresolved items.

## 3. Scope Boundary

**This agent MUST:**

- Review all reconciliations from Reconciliation Agent before marking any complete — restated deliberately, same absolute rule as stated in Reconciliation Agent's own spec, both tiers enforce it independently
- Monitor daily cash position across all accounts and payment rails, combining bank, physical cash (Cash Agent), and mobile money (Mobile Money Agent) into one coherent picture
- Manage payment scheduling and cash flow planning — confirms sufficient cash exists before AP Agent's scheduled payments are allowed to proceed
- Alert CFO Agent when cash position needs strategic attention (low runway, concentration risk, upcoming large obligations)
- Produce a daily treasury position report

**This agent MUST NEVER:**

- Mark a reconciliation complete with any unresolved item, under any pressure (time, volume, minor amount) — absolute rule, restated from Reconciliation Agent's spec
- Approve a payment schedule that would leave cash position negative or below an entity-configured minimum buffer, without explicit CFO Agent or human override
- Post journal entries directly
- Treat cash, bank, and mobile money as separate silos when reporting position to CFO Agent — the daily treasury report must be a unified view, not three disconnected numbers

## 4. Inputs

| Input                      | Source               | Format                     | Validation required before processing                                                                                                                 |
| -------------------------- | -------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reconciliation report      | Reconciliation Agent | `ReconciliationReport`     | Must not be pre-marked "complete" if unmatched items exist — Treasury Agent independently verifies this, doesn't just trust the incoming status field |
| Cash reconciliation report | Cash Agent           | `CashReconciliationReport` | entity_id match                                                                                                                                       |
| Timing difference flags    | Mobile Money Agent   | `TimingDifferenceFlag`     | entity_id match                                                                                                                                       |
| Payment schedule request   | AP Agent             | `PaymentScheduleRequest`   | Requires cash-availability check before approval                                                                                                      |

## 5. Outputs

| Output                                  | Destination                                           | Schema                        | Required fields                                                                       |
| --------------------------------------- | ----------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------- |
| Reconciliation close approval/rejection | Reconciliation Agent, Ledger Agent (to allow posting) | `ReconciliationCloseDecision` | `approved: bool`, `unresolved_items[]` (must be empty if approved)                    |
| Daily treasury position report          | CFO Agent                                             | `TreasuryPositionReport`      | `entity_id`, `date`, `total_cash_position`, `by_rail[]`, `by_account[]`, `confidence` |
| Payment schedule approval               | AP Agent                                              | `PaymentScheduleDecision`     | `approved: bool`, `reason if rejected`                                                |
| Cash risk alert                         | CFO Agent                                             | `CashRiskAlert`               | `severity`, `description`, `projected_shortfall_date: nullable`                       |

## 6. Tools This Agent Can Call

| Tool                             | Purpose                                                        | Read/Write |
| -------------------------------- | -------------------------------------------------------------- | ---------- |
| `get_consolidated_cash_position` | Combine bank/cash/mobile money into one view                   | Read       |
| `approve_reconciliation_close`   | Finalize a reconciliation, hard-gated on zero unresolved items | Write      |
| `approve_payment_schedule`       | Confirm cash availability for AP payment schedule              | Write      |

Contracts: none written this pass — flagged as next step. `approve_reconciliation_close` is the highest-priority of the three, since it's the enforcement point for the single most important rule in this whole domain.

## 7. Deterministic Rules Enforced On This Agent's Output

| Rule                                                                                                                                                        | Enforcement point                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A reconciliation cannot be approved-closed while any unresolved item exists on the incoming report, regardless of what the report's own status field claims | `approve_reconciliation_close` tool — Treasury Agent re-verifies independently rather than trusting Reconciliation Agent's self-reported status, defense in depth against a bug or bad data in the upstream report |
| A payment schedule cannot be approved if it would bring consolidated cash position below the entity's configured minimum buffer                             | `approve_payment_schedule` tool                                                                                                                                                                                    |

## 8. Confidence Scoring

- **Treasury position confidence** — reflects data quality across all three input streams; a position report built on a low-confidence reconciliation or an OCR-degraded cash count should itself carry reduced confidence, not present as equally certain as one built on clean API-fed data
- **Cash flow projection confidence** (for risk alerts) — how reliable near-term projections are given revenue/expenditure volatility for this entity

## 9. Escalation Triggers

| Trigger condition                                                                            | Escalates to                                                | Escalation type                         |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------- |
| Any unresolved reconciliation item at the point of a close attempt                           | CFO Agent (notify), Reconciliation Agent (block, held open) | Block                                   |
| Consolidated cash position confidence below threshold (data quality issue across inputs)     | CFO Agent                                                   | Flag                                    |
| Cash position projected to go negative or below minimum buffer within a configurable horizon | CFO Agent, immediate                                        | Block on new payment approvals + Notify |
| Payment schedule request would breach minimum buffer                                         | AP Agent (rejection), CFO Agent (notify if material)        | Block                                   |

## 10. Failure Modes & Recovery

- **Known failure mode:** a technically-balanced consolidated position hiding a real liquidity problem in one rail (e.g. plenty of cash on paper but concentrated in a mobile money wallet with withdrawal limits or delays) — a single aggregate number can mask this. Mitigation: `by_rail[]` breakdown is a required field in the treasury position report, not optional, specifically to prevent this kind of masking.
- **Recovery:** cash risk alerts persist and escalate in severity if unaddressed across multiple daily reports, rather than being a one-time notification easily missed.

## 11. Golden Dataset Coverage

Link: `datasets/treasury-agent-golden.yaml` (not yet built). Target: standard 28-case floor, weighted toward cases where the three input reports (reconciliation, cash, mobile money) individually look fine but the consolidated picture reveals a problem — this is Treasury Agent's unique value and the hardest thing to test well.

## 12. Cross-Agent Dependencies

- **Upstream:** Reconciliation Agent, Cash Agent, Mobile Money Agent, AP Agent (payment schedule requests)
- **Downstream:** CFO Agent (position reports, risk alerts), Ledger Agent (indirectly, via close approvals gating what can post)
- **Flow tests:** month-end close flow (Treasury confirmation step, PRD §8 step 4) — needs explicit representation in `CROSS_AGENT_FLOW_TESTS.md`, currently implied but not spelled out as its own step

## 13. Open Questions

- Entity-configured minimum cash buffer (§7, §9) — same pattern as other agents' materiality thresholds; needs one consistent configuration mechanism across the whole system rather than each management agent inventing its own.
- Exact mechanism for the Mobile Money Agent / Reconciliation Agent architectural question flagged in Mobile Money Agent spec §13 directly affects what Treasury Agent receives as input here — resolve that question first, then finalize this agent's input schema.

---

## Spec Sign-off Checklist

- [x] Scope boundary reviewed — no overlap with Reconciliation/Cash/Mobile Money Agents (Treasury reviews and consolidates, doesn't perform matching itself) or CFO Agent (Treasury reports position, CFO makes strategic capital decisions)
- [x] All outputs have a defined schema
- [ ] All tools listed have contracts written — none yet, `approve_reconciliation_close` flagged highest priority
- [x] All deterministic rules identified and mapped to enforcement layer
- [x] Escalation triggers are concrete
- [ ] Golden dataset exists with minimum coverage — not yet built
- [x] Cross-agent flows identified — gap noted for explicit month-end close step representation
