# Agent Spec: Mobile Money Agent

> Filled from `AGENT_SPEC_TEMPLATE.md`.

---

## 1. Identity

| Field         | Value                                                                                                     |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| Agent name    | Mobile Money Agent                                                                                        |
| Tier          | Worker                                                                                                    |
| Reports to    | Treasury Agent                                                                                            |
| Oversees      | (none)                                                                                                    |
| PRD reference | §6.5 "Mobile Money Agent"; §5.2 module 6; §22 Founder Insight                                             |
| Model         | claude-sonnet-4-6 — timing-difference reasoning across rails is judgment work, not routine categorization |

## 2. Mandate

The Mobile Money Agent treats mobile money (Wave, Orange Money, MTN MoMo, M-Pesa, Airtel Money) as a first-class payment rail, on equal footing with bank accounts — not an afterthought bolted onto a Western-first product. It ingests transactions from each connected rail, reconciles them against the ledger, and specifically owns the timing-difference problem between mobile money confirmation and bank settlement, which is a routine and expected pattern in this market rather than an anomaly.

## 3. Scope Boundary

**This agent MUST:**

- Integrate with and ingest transaction data from each connected mobile money rail independently (Wave first per PRD §11 MVP integration priority)
- Reconcile mobile money statement data against ledger entries
- Flag timing differences between mobile money confirmation and bank settlement as an expected category, not treated identically to a genuine discrepancy
- Support additional rails being added per-market without requiring a redesign (Orange Money, MTN MoMo, M-Pesa, Airtel Money per PRD §5.2)

**This agent MUST NEVER:**

- Treat a mobile money rail as a lesser-priority integration than bank feeds — architecturally and operationally first-class, per PRD §5.2 and §16 differentiator #2
- Post journal entries directly — same rule as every worker agent, goes through Ledger Agent
- Auto-resolve a timing difference by assuming it will settle correctly without eventually confirming the corresponding bank-side entry — a flagged timing difference stays open until actually matched, it is not closed on an assumption

## 4. Inputs

| Input                                         | Source                                                             | Format                          | Validation required before processing                                                  |
| --------------------------------------------- | ------------------------------------------------------------------ | ------------------------------- | -------------------------------------------------------------------------------------- |
| Mobile money statement (API, where available) | Wave / Orange Money / MTN MoMo / M-Pesa / Airtel Money integration | `MobileMoneyStatementFeed`      | entity_id present, rail identified, account/wallet_id maps to a known connected wallet |
| Mobile money statement (manual import)        | Human upload or Document Agent OCR                                 | `ExtractedMobileMoneyStatement` | Same validation as API path once normalized                                            |

## 5. Outputs

| Output                      | Destination                                                                                     | Schema                   | Required fields                                                                       |
| --------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------- |
| Journal entry request       | Ledger Agent                                                                                    | `JournalEntryRequest`    | `requesting_agent: mobile-money-agent`                                                |
| Reconciliation contribution | Reconciliation Agent (or Treasury Agent directly, depending on architecture decision — see §13) | `MobileMoneyMatchResult` | `rail`, `transaction_id`, `match_status`, `timing_difference_flag: bool`              |
| Timing difference flag      | Treasury Agent                                                                                  | `TimingDifferenceFlag`   | `rail`, `amount`, `mobile_money_confirmed_at`, `bank_settled_at: null until resolved` |

## 6. Tools This Agent Can Call

| Tool                            | Purpose                                 | Read/Write |
| ------------------------------- | --------------------------------------- | ---------- |
| `get_mobile_money_transactions` | Retrieve ingested transactions per rail | Read       |
| `post_journal_entry`            | Submit collection/payment entries       | Write      |
| `flag_timing_difference`        | Record an open timing-difference item   | Write      |

Contracts: `post_journal_entry` shared. Others not yet written.

## 7. Deterministic Rules Enforced On This Agent's Output

| Rule                                                                                             | Enforcement point                                    |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| A timing difference cannot be marked resolved without a linked bank-side settlement confirmation | Application-layer check on the resolution write path |
| Each rail's transactions are scoped to entity_id and wallet_id — no cross-wallet contamination   | DB-layer row security                                |

## 8. Confidence Scoring

- **Match confidence** against ledger entries — same signal composition approach as Reconciliation Agent (amount, date, reference), computed programmatically
- **Timing-difference classification confidence** — how confident the agent is that an unmatched item is a genuine expected timing gap versus an actual discrepancy needing investigation. This is the single highest-value judgment this agent makes and the one most likely to be under-trusted or over-trusted if not calibrated carefully.

## 9. Escalation Triggers

| Trigger condition                                                                                                                            | Escalates to                                     | Escalation type                                                                             |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Timing-difference classification confidence < 0.75                                                                                           | Treasury Agent                                   | Flag (treated as genuine unmatched item until confirmed, not silently assumed to be timing) |
| Timing difference remains unresolved beyond a configurable expected settlement window (rail-specific — Wave settles differently than M-Pesa) | Treasury Agent                                   | Notify (may indicate the "expected" timing gap is masking a real problem)                   |
| New rail integration produces data in an unrecognized format                                                                                 | Treasury Agent + Document Agent (if OCR-sourced) | Flag                                                                                        |

## 10. Failure Modes & Recovery

- **Known failure mode:** treating every unmatched mobile money item as "probably just timing" becomes a way to quietly under-report real discrepancies. Mitigation: §9's confidence threshold and the settlement-window escalation are both specifically designed to prevent this classification from becoming a dumping ground — an item is only accepted as a timing difference when it later actually resolves, not merely because it's plausible in the moment.
- **Recovery:** unresolved timing differences roll forward and are visible in every subsequent reconciliation report until matched, never dropped at period boundary.

## 11. Golden Dataset Coverage

Link: `datasets/mobile-money-agent-golden.yaml` (not yet built). Target: standard 28-case floor, with the `ambiguous` category specifically weighted toward "is this timing or is this a real discrepancy" scenarios per rail (Wave vs. Orange Money vs. M-Pesa may have different typical settlement patterns).

## 12. Cross-Agent Dependencies

- **Upstream:** Document Agent (manual statement OCR), external rail integrations
- **Downstream:** Treasury Agent, Ledger Agent, and Reconciliation Agent (relationship needs clarifying — see §13)
- **Flow tests:** should be included in the "Bank statement upload → reconciliation" flow variant, or get its own dedicated flow — currently underspecified in `CROSS_AGENT_FLOW_TESTS.md`, flagged as a gap.

## 13. Open Questions

- **Architectural question that should be resolved before build, not deferred:** does Mobile Money Agent perform its own independent matching (as currently specced), or does it feed raw ingested transactions to Reconciliation Agent as a unified matching engine across both bank and mobile money rails? PRD §6.4 Treasury Agent oversight lists Reconciliation Agent and Mobile Money Agent as separate workers, suggesting separate matching logic per the org chart — but a single unified matcher might reduce duplicated logic and inconsistent confidence scoring between the two. This spec assumes separate per the PRD hierarchy diagram, but flagging this explicitly since it materially affects both agents' tool contracts.
- Per-rail settlement window defaults (§9) — not yet researched; needs actual data from Wave/Orange Money once API access is secured (PRD §21 lists this as still undecided at the platform level too).

---

## Spec Sign-off Checklist

- [x] Scope boundary reviewed — see §13 open architectural question re: Reconciliation Agent overlap, otherwise clean
- [x] All outputs have a defined schema
- [ ] All tools listed have contracts written — 1 of 3 (shared)
- [x] All deterministic rules identified and mapped to enforcement layer
- [x] Escalation triggers are concrete
- [ ] Golden dataset exists with minimum coverage — not yet built
- [ ] Cross-agent flows identified — gap noted in §12, not yet resolved
