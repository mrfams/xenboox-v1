# Agent Spec: Reconciliation Agent

> Filled from `AGENT_SPEC_TEMPLATE.md`.

---

## 1. Identity

| Field         | Value                                                                                                                                                                                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Agent name    | Reconciliation Agent                                                                                                                                                                                                                                                           |
| Tier          | Worker                                                                                                                                                                                                                                                                         |
| Reports to    | Treasury Agent                                                                                                                                                                                                                                                                 |
| Oversees      | (none — leaf worker agent)                                                                                                                                                                                                                                                     |
| PRD reference | §6.5 "Reconciliation Agent" (under Treasury Agent)                                                                                                                                                                                                                             |
| Model         | claude-sonnet-4-6 — matching is pattern-judgment work (fuzzy matching bank lines to ledger entries under real-world noise: timing gaps, partial amounts, reference number mismatches), not routine categorization; PRD §18 places reconciliation explicitly in the Sonnet tier |

## 2. Mandate

The Reconciliation Agent matches bank statement transactions (from API feeds, PDF uploads, or manual entry) against ledger entries, for every connected bank account, across multiple banks and accounts simultaneously. It never closes a reconciliation with unresolved items — this is the single hardest rule this agent operates under, restated directly from PRD §6.4/§6.5 in two separate places because it's that important. It is the primary defense against "the books say one thing, the bank says another" — the failure mode that destroys trust in an accounting product fastest.

## 3. Scope Boundary

**This agent MUST:**

- Ingest bank statement data from all three input paths: API feed, PDF upload (OCR via Document Agent), manual entry
- Match statement transactions to ledger entries on amount, date proximity, and reference/description similarity
- Flag every unmatched item with specific, actionable detail — not a generic "3 items unmatched"
- Handle multiple banks and multiple accounts within one entity concurrently, without cross-account contamination
- Produce a reconciliation report for Treasury Agent's review before any reconciliation is marked complete

**This agent MUST NEVER:**

- Mark a reconciliation complete while any item remains unmatched — this is an absolute rule restated from PRD §6.4 (Treasury Agent) and §6.5 (Reconciliation Agent itself), meaning it is enforced at two tiers deliberately, not redundantly by accident
- Force-match two transactions that don't actually correspond just to clear an unmatched item (e.g. matching a $500 deposit to an unrelated $500 withdrawal because the amounts happen to coincide) — a coincidental amount match without corroborating signal (date proximity, reference, description) is not a match
- Post journal entries directly — matches and confirmed reconciliation results go through Ledger Agent like everything else
- Auto-resolve a discrepancy by adjusting the ledger side to match the bank side, or vice versa, without Treasury Agent review — reconciliation agent identifies discrepancies, it does not unilaterally decide which side is "correct"

## 4. Inputs

| Input                       | Source                                                                          | Format                   | Validation required before processing                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Bank statement (API feed)   | Plaid integration / direct bank API                                             | `BankStatementFeed`      | entity_id present, account_id maps to a known connected account                                                         |
| Bank statement (PDF upload) | Document Agent (post-OCR extraction)                                            | `ExtractedBankStatement` | OCR confidence score attached — low-confidence extractions flagged before matching begins, not silently matched against |
| Manual entry                | Human via Cash Agent or direct entry                                            | `ManualStatementEntry`   | Same schema as API feed, entered by authorized role only                                                                |
| Ledger entries for period   | Ledger Agent (`get_trial_balance` or a dedicated ledger-entries-by-period read) | `JournalEntry[]`         | entity_id match, period matches statement period                                                                        |

## 5. Outputs

| Output                               | Destination                                                      | Schema                 | Required fields                                                                                                                                                           |
| ------------------------------------ | ---------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reconciliation report                | Treasury Agent                                                   | `ReconciliationReport` | `entity_id`, `account_id`, `period`, `matched[]`, `unmatched_bank_items[]`, `unmatched_ledger_items[]`, `status: never "complete" if either unmatched array is non-empty` |
| Match confirmation (per transaction) | Ledger Agent (indirectly, via Treasury Agent's approval to post) | `MatchResult`          | `bank_transaction_id`, `ledger_entry_id`, `match_confidence`, `match_signals[]` (which signals supported the match — amount, date, reference)                             |
| Unmatched item flag                  | Treasury Agent                                                   | `UnmatchedItemFlag`    | `item_id`, `side` (bank/ledger), `amount`, `date`, `description`, `possible_causes[]` (e.g. timing difference, missing entry, duplicate)                                  |

## 6. Tools This Agent Can Call

| Tool                           | Purpose                                                                          | Read/Write |
| ------------------------------ | -------------------------------------------------------------------------------- | ---------- |
| `get_ledger_entries_by_period` | Retrieve ledger-side entries to match against                                    | Read       |
| `get_bank_statement_data`      | Retrieve ingested statement data (from feed/OCR/manual)                          | Read       |
| `record_match`                 | Persist a confirmed match (not a ledger posting — a reconciliation-record write) | Write      |
| `flag_unmatched_item`          | Persist an unmatched item to the reconciliation report                           | Write      |

Contracts: not yet written this pass — flagged as immediate next step for this agent, same discipline as Controller Agent's golden dataset gap. `record_match` in particular needs care: it must be structurally incapable of marking a reconciliation "complete" while unmatched items exist (the hard rule from §3 belongs enforced here in code, not just stated in the agent's prompt).

## 7. Deterministic Rules Enforced On This Agent's Output

| Rule                                                                                                                                               | Enforcement point                                                                                                                                                                                |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A reconciliation cannot be marked `status: complete` while `unmatched_bank_items` or `unmatched_ledger_items` is non-empty                         | `record_match` / report-finalization tool — hard check, not a prompt instruction, this is the single most important rule this agent has and it must not depend on the model remembering to check |
| A match requires at minimum two corroborating signals (not amount alone) before it can be recorded as `matched` rather than `low_confidence_match` | Application-layer check in `record_match` — amount-only matches are structurally routed to a lower-confidence bucket requiring Treasury Agent review, never auto-confirmed                       |
| entity_id and account_id scoping — no cross-account or cross-entity matching                                                                       | DB-layer row security, same pattern as Ledger Agent tools                                                                                                                                        |

## 8. Confidence Scoring

This is the agent where confidence scoring matters most in the whole system, because matching is inherently a judgment call under noisy real-world data (African banking context: delayed settlement, inconsistent reference numbers, mobile money timing gaps per PRD §6.5 Mobile Money Agent interaction).

- **Match confidence** per transaction pair — composite of amount exactness, date proximity, description/reference similarity. All three signals computed programmatically (string similarity, date delta), not the model eyeballing it — the LLM's role is to reason over ambiguous or partial signal combinations, not to replace the deterministic similarity computation itself.
- **Reconciliation-level confidence** — separate from per-match confidence, reflects overall data quality for this period (e.g. a PDF-sourced statement with poor OCR quality should produce a lower overall confidence even if individual matches look clean, since the underlying data itself is less trustworthy).

## 9. Escalation Triggers

| Trigger condition                                                                                  | Escalates to                                                                              | Escalation type                                                                                                                                    |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Match confidence 0.75–0.89 (plausible but not certain)                                             | Treasury Agent                                                                            | Flag (included in report as `low_confidence_match`, held for explicit Treasury Agent confirmation before being treated as final)                   |
| Match confidence < 0.75                                                                            | Treasury Agent                                                                            | Block (not recorded as a match at all — appears as unmatched on both sides until resolved)                                                         |
| Any unmatched item remains at the point Treasury Agent requests reconciliation closure             | Treasury Agent                                                                            | Block — reconciliation cannot close, restated per §3/§7                                                                                            |
| OCR-sourced statement data below a minimum extraction confidence threshold                         | Document Agent (request re-extraction or flag for manual entry) + Treasury Agent (notify) | Flag                                                                                                                                               |
| Pattern of repeated unmatched items from the same counterparty/description across multiple periods | Treasury Agent                                                                            | Notify (may indicate a systemic issue — e.g. a payment rail not being captured properly — worth surfacing even though no single period is "wrong") |

## 10. Failure Modes & Recovery

- **Known failure mode:** false-positive match — two transactions that coincidentally share amount and rough timing but aren't actually the same transaction. Mitigation: the two-signal minimum in §7, plus Audit Agent's continuous sampling includes reconciliation matches, not just ledger postings.
- **Known failure mode:** genuine timing differences (mobile money confirms before bank settles, per PRD §6.5 Mobile Money Agent) being incorrectly flagged as discrepancies rather than expected lag. Mitigation: `possible_causes` field on unmatched items explicitly includes "timing difference" as a category, and Mobile Money Agent's own timing-difference flagging (its spec, not yet built) should feed context here rather than each agent treating the same lag as a fresh mystery.
- **Recovery:** unmatched items persist across reconciliation runs until resolved — never silently dropped from the next period's report just because a new period started.

## 11. Golden Dataset Coverage

Link: `datasets/reconciliation-agent-golden.yaml` (not yet built — flagged as high priority given this agent's risk ranking; target the Ledger/Reconciliation-tier floor of 55 cases, not the standard 28, per `GOLDEN_DATASET_SPEC.md` §4)

Priority case types once built: near-miss amount matches that are NOT the same transaction (adversarial), legitimate timing-difference pairs that should NOT be flagged as discrepancies (edge case), and OCR-degraded statement data (adversarial) — these three are where this agent is most likely to fail silently if under-tested.

## 12. Cross-Agent Dependencies

- **Upstream:** Document Agent (OCR'd PDF statements), Cash Agent / Mobile Money Agent (manual entry path, timing context), Ledger Agent (entries to match against)
- **Downstream:** Treasury Agent (report review, close decisions)
- **Flow tests:** "Bank statement upload → reconciliation" flow in `CROSS_AGENT_FLOW_TESTS.md` §3 — this agent is the core of that flow

## 13. Open Questions

- Exact minimum extraction-confidence threshold for OCR-sourced statements (§9) — needs real Tesseract/Claude Vision output samples to calibrate, not yet set.
- Whether "two corroborating signals" (§7) should have a defined minimum quality per signal (e.g. date proximity within how many days counts as corroborating) — currently qualitative, needs concrete numeric bounds before implementation.
- How reconciliation-level confidence (§8) should factor into Treasury Agent's own daily treasury position report — not yet specified, will surface when Treasury Agent's own spec is written.

---

## Spec Sign-off Checklist

- [x] Scope boundary reviewed — no overlap with Treasury Agent (Reconciliation matches and reports, Treasury reviews and decides to close) or Cash/Mobile Money Agents (they're statement sources, not matching logic owners)
- [x] All outputs have a defined schema
- [ ] All tools listed have contracts written — none written this pass, flagged as immediate next step
- [x] All deterministic rules identified and mapped to enforcement layer
- [x] Escalation triggers are concrete
- [ ] Golden dataset exists with minimum coverage — not yet built, tracked in §11 as high priority
- [x] Cross-agent flows this agent participates in are identified
