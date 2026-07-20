# Agent Spec: Reporting Agent

> Filled from `AGENT_SPEC_TEMPLATE.md`.

---

## 1. Identity

| Field         | Value                                                                                                                                                                                                                                                                      |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Agent name    | Reporting Agent                                                                                                                                                                                                                                                            |
| Tier          | Platform-wide (reports directly to CFO Agent)                                                                                                                                                                                                                              |
| Reports to    | CFO Agent                                                                                                                                                                                                                                                                  |
| Oversees      | (none)                                                                                                                                                                                                                                                                     |
| PRD reference | §6.5 "Reporting Agent"                                                                                                                                                                                                                                                     |
| Model         | claude-sonnet-4-6 — plain-English narrative summaries and custom report generation on request require real synthesis; raw statement generation itself (P&L, balance sheet from trial balance) is closer to deterministic and could route to Haiku for the computation step |

## 2. Mandate

The Reporting Agent produces every financial statement and report in the system — P&L, balance sheet, cash flow, trial balance, custom reports via chat, donor/grant reports in required external formats, audit prep packages, year-end close packages, and plain-English narrative summaries for non-accountant owners. It is the agent whose output the human actually reads most often, which means clarity and correctness both matter more here than almost anywhere else — a technically correct report that a non-accountant owner misreads is a product failure even if every number is right.

## 3. Scope Boundary

**This agent MUST:**

- Generate standard financial statements (P&L, balance sheet, cash flow, trial balance, general ledger report) from Ledger Agent data, correct and consistent with the underlying trial balance every time
- Handle custom report requests via chat, translating a plain-English ask into a correct structured query against the right data
- Produce donor/grant reports in required external formats (USAID, EU, World Bank, AfDB per PRD §6.5)
- Produce plain-English narrative summaries alongside every statement, not as a replacement for it
- Produce consolidated group reports for multi-entity organizations (Phase 3, eliminations handled by Controller Agent per PRD §9.6, Reporting Agent presents the result)

**This agent MUST NEVER:**

- Generate a financial statement that doesn't tie back exactly to Ledger Agent's trial balance for the same period — any report is a _view_ of ledger truth, never an independently computed parallel source of numbers
- Produce a plain-English summary that overstates certainty about a figure that's still provisional (e.g. an open period's numbers should be labeled as such, not presented with the same confidence as a closed period)
- Invent or estimate a figure it cannot source from actual ledger/entity data, even when a plausible-sounding number would satisfy a custom report request — if the data doesn't exist, the report says so
- Post journal entries — this agent is read-only with respect to the ledger, full stop

## 4. Inputs

| Input                 | Source                                     | Format                                              | Validation required before processing                                                                                                                                       |
| --------------------- | ------------------------------------------ | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Trial balance         | Ledger Agent (`get_trial_balance`)         | `TrialBalance`                                      | Must have `balanced: true` — any statement built on an unbalanced trial balance is invalid, treated as `LEDGER_INTEGRITY_FAILURE` propagation, not silently rendered anyway |
| Custom report request | Human, via chat (routed through CFO Agent) | Plain-English request, parsed into structured query | Query scope must resolve to actual entity data the requester is authorized to see                                                                                           |
| Budget data           | Budget Agent (Phase 2)                     | `BudgetVsActual`                                    | entity_id match                                                                                                                                                             |
| Donor/grant metadata  | AR Agent                                   | `DonorPaymentRecord`                                | entity_id + project/grant match                                                                                                                                             |

## 5. Outputs

| Output                       | Destination                           | Schema/Format                                                   | Required fields                                                                          |
| ---------------------------- | ------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Standard financial statement | Human (dashboard/download), CFO Agent | `FinancialStatement` (typed per statement kind)                 | `entity_id`, `period`, `statement_type`, `figures`, `tied_to_trial_balance_id`           |
| Plain-English narrative      | Human, alongside every statement      | Text, structured with statement                                 | Must reference specific figures from the accompanying statement, not generic boilerplate |
| Custom report result         | Human, via chat                       | Varies                                                          | Must state explicitly if requested data doesn't exist rather than approximating          |
| Donor/grant report           | Donor portal (Phase 2), human         | External format per funder (USAID/EU/World Bank/AfDB templates) | Format compliance per funder spec                                                        |

## 6. Tools This Agent Can Call

| Tool                   | Purpose                                  | Read/Write                          |
| ---------------------- | ---------------------------------------- | ----------------------------------- |
| `get_trial_balance`    | Source of truth for all statements       | Read                                |
| `get_budget_vs_actual` | For variance-inclusive reports (Phase 2) | Read                                |
| `render_statement`     | Format a statement per type/template     | Read (computation), no ledger write |

Contracts: `get_trial_balance` shared. `render_statement` not yet written — this is closer to a formatting/templating tool than a data-integrity-critical one, lower priority than the write-path tools in other agents' specs.

## 7. Deterministic Rules Enforced On This Agent's Output

| Rule                                                                                                                                                        | Enforcement point                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every generated statement must tie exactly to a specific `trial_balance_id` — no statement generated from a stale or recomputed-independently trial balance | Application-layer — statement generation requires a fresh `get_trial_balance` call per request, never cached beyond a short TTL for open periods         |
| Reporting Agent has no write access to `post_journal_entry` or any ledger-mutating tool                                                                     | Enforced at the tool-permission layer — this agent's credential set structurally excludes write tools, not just a prompt instruction to avoid using them |

## 8. Confidence Scoring

- **Custom report interpretation confidence** — how confident the agent is that it correctly translated a plain-English request into the right structured query (this is the main judgment surface for this agent — the statement math itself is deterministic once trial balance is sourced correctly)
- **Narrative summary framing confidence** — lower-stakes, but relevant when explaining unusual figures (e.g. FX gains per PRD §12) in plain English — does the explanation actually match the underlying cause, or is it a plausible-sounding guess

## 9. Escalation Triggers

| Trigger condition                                                               | Escalates to                                                                                                                                                                                                   | Escalation type                                                               |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Custom report request is ambiguous (could reasonably mean two different things) | Human, via clarifying question in chat (this is one of the few agents where direct human clarification is appropriate rather than escalating up the hierarchy, since the request came from the human directly) | Flag (asks for clarification rather than guessing)                            |
| Requested data doesn't exist for the requested scope                            | Human, direct explanation                                                                                                                                                                                      | Notify (not an error exactly — clear communication that the data isn't there) |
| Trial balance source shows `balanced: false`                                    | CFO Agent + human, immediate, per `LEDGER_INTEGRITY_FAILURE` propagation                                                                                                                                       | Block — no statement generated until resolved                                 |

## 10. Failure Modes & Recovery

- **Known failure mode:** a technically correct statement paired with a narrative summary that doesn't actually match what the numbers show (a known LLM failure pattern — fluent prose that isn't tightly grounded in the specific figures it's describing). Mitigation: narrative generation should be checked against the statement's actual figures as part of eval (LLM-graded scoring per `EVAL_HARNESS_SPEC.md` §3.2, with the rubric specifically checking figure-grounding, not just prose quality).
- **Recovery:** since this agent is read-only, there's no "undo" for a bad report beyond regenerating it correctly — but a wrong report that's already been read by an owner is a trust failure, not just a data bug, which is why the grounding check matters more here than raw accuracy might suggest.

## 11. Golden Dataset Coverage

Link: `datasets/reporting-agent-golden.yaml` (not yet built). Target: standard 28-case floor. Given the narrative-grounding failure mode above, this agent's eval should lean more heavily on LLM-graded scoring (§3.2 of harness spec) than exact-match, unlike Ledger Agent which is almost entirely exact-match.

## 12. Cross-Agent Dependencies

- **Upstream:** Ledger Agent (trial balance), Budget Agent (Phase 2), AR Agent (donor data)
- **Downstream:** Human (primary consumer), CFO Agent (uses Reporting Agent output for executive summaries)
- **Flow tests:** appears as a step in nearly every flow in `CROSS_AGENT_FLOW_TESTS.md` §3 (P&L/cash flow update after any posting) — worth confirming its handoff schema is stable given how many flows depend on it

## 13. Open Questions

- Exact donor report format specs (USAID/EU/World Bank/AfDB) — not yet sourced, needed before Phase 2 donor reporting build, flagged as a research gap same as PRD §21's undecided items.
- Whether custom report chat requests should have a maximum ambiguity-resolution attempt count before escalating to a human-authored report instead of continuing to ask clarifying questions — not yet decided, low priority for MVP.

---

## Spec Sign-off Checklist

- [x] Scope boundary reviewed — read-only with respect to ledger, no overlap with any writing agent
- [x] All outputs have a defined schema
- [ ] All tools listed have contracts written — `get_trial_balance` shared; `render_statement` not yet written
- [x] All deterministic rules identified and mapped to enforcement layer
- [x] Escalation triggers are concrete
- [ ] Golden dataset exists with minimum coverage — not yet built
- [x] Cross-agent flows identified
