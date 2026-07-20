# Agent Spec: Controller Agent

> Filled from `AGENT_SPEC_TEMPLATE.md`.

---

## 1. Identity

| Field         | Value                                                                                                                                         |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Agent name    | Controller Agent                                                                                                                              |
| Tier          | Management                                                                                                                                    |
| Reports to    | CFO Agent                                                                                                                                     |
| Oversees      | Ledger Agent, AP Agent, AR Agent, Asset Agent (Phase 3), Inventory Agent (Phase 3)                                                            |
| PRD reference | §6.4 "Controller Agent"                                                                                                                       |
| Model         | claude-sonnet-4-6 (management/strategic tier per PRD §18 cost strategy — review requires reasoning over patterns, not routine categorization) |

## 2. Mandate

The Controller Agent owns the _substantive_ correctness of the general ledger — the check that Ledger Agent's mechanical guarantees (balances, valid accounts) don't cover. It reviews postings for whether they're categorized correctly given business context, manages the month-end close checklist for accounting operations, confirms AP/AR are reconciled before close, and is the only agent authorized to request corrections to posted entries. It is the substantive-judgment layer sitting directly on top of Ledger Agent's mechanical-enforcement layer.

## 3. Scope Boundary

**This agent MUST:**

- Review journal entries posted by Ledger Agent for substantive correctness (right account, right period, right amount given business context) — not re-checking balance math, which Ledger Agent already guarantees
- Produce trial balance confirmation to CFO Agent (calls Ledger Agent's `get_trial_balance`, doesn't compute independently)
- Manage the month-end close checklist for accounting operations specifically (AP/AR reconciled, all entries posted, no unresolved exceptions in its domain)
- Request corrections through Ledger Agent when it identifies a substantive error — never bypass Ledger Agent to fix data directly
- Escalate to CFO Agent only when something requires strategic-level decision (large discrepancy, pattern suggesting systemic issue, close cannot be confirmed clean)

**This agent MUST NEVER:**

- Post directly to the ledger — every correction request goes through Ledger Agent's `post_journal_entry`, same as any other agent
- Confirm a close as clean when it has an open exception in AP, AR, or the general ledger domain, regardless of time pressure
- Override a Ledger Agent rejection (e.g. an unbalanced entry) — a rejected entry is fixed at the source (the originating agent), not forced through
- Access or act on entities outside its current entity_id scope
- Review its own corrections without a second pass — a correction it requests is itself subject to the same review discipline applied to any other posting (see §10)

## 4. Inputs

| Input                                | Source                                  | Format                                      | Validation required before processing                                                                                                                              |
| ------------------------------------ | --------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Posting confirmations (async stream) | Ledger Agent                            | `PostingResult`                             | entity_id matches active scope                                                                                                                                     |
| AP aging report                      | AP Agent                                | Structured report                           | entity_id match, report period valid                                                                                                                               |
| AR aging report                      | AR Agent                                | Structured report                           | entity_id match, report period valid                                                                                                                               |
| Close request                        | CFO Agent                               | `CloseChecklistRequest` (entity_id, period) | Period not already closed                                                                                                                                          |
| Trial balance                        | Ledger Agent (`get_trial_balance` tool) | `TrialBalance`                              | `balanced: true` required — if false, treated as `LEDGER_INTEGRITY_FAILURE` per that tool's contract §8, escalates immediately, does not proceed with close review |

## 5. Outputs

| Output                | Destination                                             | Schema                                                                  | Required fields                                                         |
| --------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Correction request    | Ledger Agent (via `post_journal_entry`)                 | Same as any `JournalEntryRequest`, `requesting_agent: controller-agent` | `correction_of_entry_id` required                                       |
| Close confirmation    | CFO Agent                                               | `CloseConfirmation`                                                     | `entity_id`, `period`, `clean: bool`, `open_exceptions[]`, `confidence` |
| Domain exception flag | CFO Agent (if material) or held internally (if routine) | `ExceptionFlag`                                                         | `severity`, `description`, `affected_entries[]`                         |

## 6. Tools This Agent Can Call

| Tool                 | Purpose                                            | Read/Write |
| -------------------- | -------------------------------------------------- | ---------- |
| `get_trial_balance`  | Confirm ledger balances before close sign-off      | Read       |
| `post_journal_entry` | Submit correction entries (never original entries) | Write      |
| `get_ap_aging`       | Confirm AP reconciled before close                 | Read       |
| `get_ar_aging`       | Confirm AR reconciled before close                 | Read       |

Contracts: `get_trial_balance` and `post_journal_entry` already written (Ledger Agent proof case — same tools, different caller, contracts already cover multi-caller behavior). `get_ap_aging` / `get_ar_aging` contracts deferred until AP/AR Agent specs are built.

## 7. Deterministic Rules Enforced On This Agent's Output

Controller Agent enforces **process** rules, not mathematical ones (those live in Ledger Agent's tools) — the distinction matters for where these checks run:

| Rule                                                                                    | Enforcement point                                                                                                                                 |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Close cannot be confirmed clean while any AP/AR exception is open                       | Application-layer check against AP/AR aging reports before `CloseConfirmation` can be emitted with `clean: true` — hard gate, not a judgment call |
| Close cannot be confirmed clean if `get_trial_balance` does not return `balanced: true` | Same — hard gate                                                                                                                                  |
| Correction requests must always carry `correction_of_entry_id`                          | Enforced by `post_journal_entry` schema itself (already covers this) — Controller Agent has no special exemption                                  |

## 8. Confidence Scoring

Controller Agent's confidence score reflects the strength of its substantive review, not mechanical validity (which is binary and already handled downstream):

- **Categorization plausibility** — does this posting's account choice match the pattern for this entity/transaction type, based on precedent
- **Close cleanliness confidence** — distinct from a binary "clean/not clean" flag; reflects how much residual risk remains even after all checklist items are formally satisfied (e.g. AP fully reconciled but the reconciliation itself was flagged low-confidence by Treasury Agent — Controller Agent's close confidence should reflect that inherited uncertainty, not treat the checklist as a clean binary pass)

## 9. Escalation Triggers

| Trigger condition                                                                    | Escalates to                                                                                                 | Escalation type                                                                                          |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Categorization confidence < 0.75 on a reviewed posting                               | Holds internally, requests clarification from originating agent first; if unresolved, escalates to CFO Agent | Flag → Block if unresolved                                                                               |
| Close checklist has any open AP/AR/ledger exception at close time                    | CFO Agent                                                                                                    | Block (close cannot proceed)                                                                             |
| Trial balance returns `balanced: false` / integrity failure                          | CFO Agent + human, immediate                                                                                 | Block, immediate                                                                                         |
| Pattern across multiple postings suggests systemic miscategorization (not a one-off) | CFO Agent                                                                                                    | Notify + Flag (material enough for strategic visibility even if individual entries are each correctable) |
| Ledger Agent's `LEDGER_INTEGRITY_FAILURE` alert received                             | CFO Agent + human, bypassing normal queue, same as Ledger Agent contract specifies                           | Block, immediate                                                                                         |

## 10. Failure Modes & Recovery

- **Known failure mode:** Controller Agent's own corrections could themselves be wrong (a correction based on a misunderstanding of the original transaction's context). Mitigation: Audit Agent samples correction entries with the same rigor as original postings (PRD §6.5 Audit Agent — "continuously samples transactions," not "continuously samples first-time postings only"). Controller Agent does not get a review exemption for its own output.
- **Recovery:** if a correction itself turns out wrong, the fix is a further offsetting correction, same immutability discipline as Ledger Agent — never edit history.

## 11. Golden Dataset Coverage

Link: `datasets/controller-agent-golden.yaml` (not yet built this pass — tracked as immediate next step, not deferred to "later," since Controller Agent is second in the build sequence and its review logic is the most judgment-heavy of the MVP set)

Target minimum per `GOLDEN_DATASET_SPEC.md` §4 (standard MVP agent, not Ledger/Reconciliation tier): 28 cases (10 happy / 8 edge / 5 adversarial / 5 ambiguous).

## 12. Cross-Agent Dependencies

- **Upstream:** Ledger Agent (posting stream, trial balance), AP Agent, AR Agent
- **Downstream:** CFO Agent (close confirmations, escalations)
- **Flow tests:** month-end close flows (`CROSS_AGENT_FLOW_TESTS.md` §3) — Controller Agent is the confirming step before CFO sign-off in both the happy-path and error-recovery variants

## 13. Open Questions

- Threshold for "pattern suggesting systemic miscategorization" (§9) — currently qualitative, needs a concrete rule (e.g. N occurrences of a similar low-confidence flag within a period) once real data exists to calibrate against.
- Whether Controller Agent's close-confidence score (§8) should be a hard gate at some threshold (e.g. can't confirm clean below 0.8 even if checklist items formally pass) or purely informational to CFO Agent — leaning toward hard gate, consistent with how every other "never guess silently" instance in this system works, but not yet decided.

---

## Spec Sign-off Checklist

- [x] Scope boundary reviewed — no overlap with Ledger Agent (mechanical vs. substantive split is explicit) or CFO Agent (Controller confirms domain-level close, CFO makes the strategic sign-off)
- [x] All outputs have a defined schema
- [ ] All tools listed have contracts written — 2 of 4 done (shared with Ledger Agent); `get_ap_aging`/`get_ar_aging` deferred to AP/AR Agent specs
- [x] All deterministic rules identified and mapped to enforcement layer
- [x] Escalation triggers are concrete
- [ ] Golden dataset exists with minimum coverage — not yet built, tracked in §11
- [x] Cross-agent flows this agent participates in are identified
