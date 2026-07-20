# Agent Spec: CFO Agent

> Filled from `AGENT_SPEC_TEMPLATE.md`. Built last in the MVP sequence deliberately — this agent's contract can only be fully specified once every agent whose summaries it consumes has a defined output schema.

---

## 1. Identity

| Field         | Value                                                                                                                                                                                                                |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Agent name    | CFO Agent                                                                                                                                                                                                            |
| Tier          | Strategic (Tier 1 — sole occupant)                                                                                                                                                                                   |
| Reports to    | Human (Account Owner / Finance Director / Board)                                                                                                                                                                     |
| Oversees      | Controller Agent, Treasury Agent, Payroll Manager Agent (Phase 2), Compliance Agent (Phase 2) — plus receives direct reports from Reporting Agent, Budget Agent (Phase 2), Analytics Agent (Phase 2), Document Agent |
| PRD reference | §6.3 "CFO Agent"; §7.4 Chat Interface; §8 Autonomous Close Flow                                                                                                                                                      |
| Model         | claude-sonnet-4-6 — the entire mandate is strategic synthesis and human communication, the highest-reasoning tier by design                                                                                          |

## 2. Mandate

The CFO Agent is the sole point of contact between the human and the agent workforce, and the only agent whose job is explicitly to _never_ touch individual transactions. It receives instructions in plain English, routes work to department heads, reviews only their summaries, triggers and confirms month-end/year-end close, produces executive summaries, flags strategic anomalies, and makes final decisions on escalations that reach it. Its core discipline, stated twice in the PRD (§6.1 "no bottleneck," §6.3 "never posts journal entries"), is restraint: it must not become a second Controller Agent by re-litigating transaction-level detail it has no business reviewing.

## 3. Scope Boundary

**This agent MUST:**

- Serve as the human's first point of contact for every instruction, question, and report request (PRD §7.4 — chat interface entry point on every surface)
- Route work to the correct department head agent (Controller, Treasury, Payroll Manager, Compliance) rather than attempting domain work itself
- Review only department head _summaries_, never individual transactions — this is a hard behavioral boundary, not a preference
- Trigger month-end/year-end close sequences and confirm sign-off only after all department heads confirm their domains are clean (PRD §8)
- Produce plain-English executive financial summaries
- Flag strategic-level anomalies (unusual trends, cash risk, budget overruns) — sourced from Analytics Agent and Treasury Agent, not independently re-derived from raw data
- Make final decisions on escalations that have already passed through the management tier and require strategic judgment or human-equivalent authority
- Initiate the Error Recovery Flow (PRD §8) when a human flags a closed period as wrong

**This agent MUST NEVER:**

- Post journal entries, directly or by instructing a worker agent to bypass its normal reporting chain — always routes through the proper tier (Controller Agent → Ledger Agent)
- Review or act on individual transactions — if a request would require transaction-level detail, it routes to the relevant management agent instead of attempting to synthesize an answer from raw data itself
- Sign off on a close where any department head has not confirmed their domain clean, regardless of time pressure or a human's impatience
- Provide false certainty in an executive summary — if underlying data has open exceptions or a management agent flagged reduced confidence, that uncertainty must be visible in what the CFO Agent tells the human, not smoothed over for a cleaner-sounding report
- Act on an instruction that would require bypassing another agent's hard-enforced rule (e.g. a human asking to "just post this anyway" when Ledger Agent has rejected an unbalanced entry) — the CFO Agent explains why the system won't do this rather than finding a workaround

## 4. Inputs

| Input                                               | Source                                                                                        | Format                                       | Validation required before processing                                         |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------- |
| Plain-English instruction/question                  | Human, any surface (web/mobile/desktop chat)                                                  | Natural language                             | entity_id resolved from active session context                                |
| Department head summary                             | Controller Agent, Treasury Agent, Payroll Manager Agent (Phase 2), Compliance Agent (Phase 2) | Respective `*Confirmation`/`*Report` schemas | entity_id match                                                               |
| Financial statements                                | Reporting Agent                                                                               | `FinancialStatement`                         | Must be tied to a valid trial balance (per Reporting Agent's own guarantee)   |
| Strategic anomaly flag                              | Analytics Agent (Phase 2), Treasury Agent                                                     | `CashRiskAlert`, `AnomalyFlag`               | entity_id match                                                               |
| Escalation (already passed through management tier) | Controller Agent, Treasury Agent, Compliance Agent (Phase 2)                                  | `Escalation` (generic envelope — see §13)    | Must include originating agent's confidence + reasoning, not just a bare flag |

## 5. Outputs

| Output                           | Destination                                                        | Schema                 | Required fields                                                                                              |
| -------------------------------- | ------------------------------------------------------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| Plain-English response           | Human, chat                                                        | Text                   | Must be traceable to specific underlying data/agent outputs — no unsupported claims                          |
| Work assignment                  | Controller / Treasury / Payroll Manager / Compliance Agent         | `WorkAssignment`       | `entity_id`, `instruction`, `originating_human_request_id` (traceability)                                    |
| Close sign-off                   | Reporting Agent (triggers month-end package), human (notification) | `CloseSignOff`         | `entity_id`, `period`, `all_departments_confirmed: true` (hard requirement, never false at time of sign-off) |
| Executive summary                | Human                                                              | `ExecutiveSummary`     | Must explicitly surface any open exceptions/reduced-confidence items, not just headline figures              |
| Escalation resolution / decision | Originating management agent, human (if human input was needed)    | `EscalationResolution` | `decision`, `reasoning`, `escalated_further_to_human: bool`                                                  |

## 6. Tools This Agent Can Call

| Tool                       | Purpose                                                      | Read/Write                                   |
| -------------------------- | ------------------------------------------------------------ | -------------------------------------------- |
| `get_department_summaries` | Pull latest confirmed status from each management agent      | Read                                         |
| `trigger_close_sequence`   | Initiate month-end close, gated on all-departments-confirmed | Write (orchestration state, not ledger data) |
| `reopen_close`             | Initiate Error Recovery Flow per PRD §8                      | Write (orchestration state)                  |
| `route_work_assignment`    | Send instruction to the correct department head agent        | Write (message dispatch, not data mutation)  |

Notably absent from this list: `post_journal_entry`, `get_trial_balance` (direct), or any tool that would let the CFO Agent act on transaction-level data — this is deliberate and enforced at the tool-permission layer (§7), not just a documented restriction.

Contracts: none written this pass — flagged as final step in the MVP tool contract sequence, appropriately, since this agent's tools are orchestration-only and lowest risk in terms of financial-data integrity (though highest risk in terms of _trust_ — a wrong executive summary is a different kind of failure than a wrong journal entry, see §10).

## 7. Deterministic Rules Enforced On This Agent's Output

| Rule                                                                                                                                                  | Enforcement point                                                                                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CFO Agent's tool/credential set structurally excludes any ledger-mutating tool                                                                        | Tool-permission layer — same pattern as Reporting Agent §7, this is not a prompt instruction, the agent literally cannot call `post_journal_entry` even if it tried                                                                                           |
| `trigger_close_sequence` cannot execute unless all required department confirmations are present and each confirms `clean: true` (or equivalent)      | Application-layer gate in the tool itself — CFO Agent's own reasoning is not the enforcement point, the tool re-checks independently                                                                                                                          |
| Every executive summary must include a machine-checkable "open exceptions" section that cannot be empty if any input summary reported open exceptions | Application-layer check on `ExecutiveSummary` generation — prevents the fluent-but-incomplete-narrative failure mode from Reporting Agent's spec §10, which applies here with even higher stakes since this is the human's primary read of the whole business |

## 8. Confidence Scoring

- **Instruction interpretation confidence** — how confident the agent is that it correctly understood a plain-English human request before routing work based on it
- **Close-readiness confidence** — distinct from the binary "all departments confirmed" gate; reflects the CFO Agent's synthesis of _how_ confident each department's confirmation was (a close where Controller Agent confirmed clean but Treasury Agent's confirmation carried reduced confidence per its own spec §8 should be reflected, not treated as uniformly "clean")

## 9. Escalation Triggers

| Trigger condition                                                                                                           | Escalates to                                                                                               | Escalation type                                                                                                                   |
| --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Instruction interpretation confidence < 0.75                                                                                | Human, clarifying question                                                                                 | Flag (asks rather than guesses — same pattern as Reporting Agent §9, appropriate here since the human is the direct counterparty) |
| Any department head has not confirmed clean at close time                                                                   | Held — close does not trigger, human notified of what's outstanding                                        | Block                                                                                                                             |
| Close-readiness confidence low despite all formal confirmations present                                                     | Human, with explicit caveat in the close notification                                                      | Flag (does not block — formal gate is satisfied — but transparency to human is non-negotiable per §3's "no false certainty" rule) |
| A management agent's escalation requires human-equivalent judgment (material dollar threshold, per PRD §21 still undecided) | Human                                                                                                      | Block until human responds                                                                                                        |
| A human requests an action that would require bypassing a lower-tier hard rule                                              | Human, with explanation of why the system won't do this — not silently refused, not silently complied with | Notify (this is a conversation, not a queue item, but it is logged in the audit trail same as any escalation)                     |

## 10. Failure Modes & Recovery

- **Known failure mode:** the CFO Agent is the agent most exposed to the "fluent but ungrounded" failure class, because its entire output surface is natural-language synthesis of other agents' work, and it's also the agent whose failures are least likely to be caught by a downstream mechanical check (there's no "CFO Agent's summary must balance" rule the way there is for Ledger Agent). Mitigation: the machine-checkable open-exceptions requirement (§7) is the primary technical guardrail; the eval harness for this agent should lean almost entirely on LLM-graded scoring with a rubric that specifically penalizes unsupported claims and omitted caveats, more heavily than it rewards prose quality.
- **Recovery:** because CFO Agent cannot mutate financial data, its failure mode is miscommunication, not data corruption — recovery is a corrected summary and, if the miscommunication led to a bad human decision, that's addressed through the Error Recovery Flow (PRD §8) at whatever level actually needs correcting.

## 11. Golden Dataset Coverage

Link: `datasets/cfo-agent-golden.yaml` (not yet built). Target: standard 28-case floor, but this dataset should include full department-summary input bundles (not single-field inputs) since CFO Agent's job is synthesis across multiple simultaneous inputs — cases should specifically include bundles where individual department summaries look fine in isolation but the combination reveals something (mirroring Treasury Agent's own unique-value test cases in its spec §11, one level up the hierarchy).

## 12. Cross-Agent Dependencies

- **Upstream:** every management and platform-wide agent (Controller, Treasury, Payroll Manager [Phase 2], Compliance [Phase 2], Reporting, Analytics [Phase 2], Document)
- **Downstream:** human only
- **Flow tests:** month-end close (happy path and error recovery variants) in `CROSS_AGENT_FLOW_TESTS.md` §3 — CFO Agent is the final step in both

## 13. Open Questions

- Generic `Escalation` envelope schema referenced in §4 — needs to be formally defined once all management agents' individual escalation schemas exist, so CFO Agent has one consistent shape to reason over regardless of which department it came from, rather than special-casing per source.
- Material dollar threshold for mandatory human involvement (§9) — same open item as PRD §21 and referenced throughout this framework; this is the single most-referenced undecided item across all specs written so far and probably deserves resolving before Phase 2 rather than continuing to defer per-agent.
- Exactly how "close-readiness confidence" (§8) should be computed as a function of multiple department confidence inputs (weighted average? worst-of? something else?) — not yet decided, needs real close data to reason about sensibly.

---

## Spec Sign-off Checklist

- [x] Scope boundary reviewed — the "never touches transactions" boundary is the defining constraint of this agent and is enforced both behaviorally (§3) and structurally (§7 tool permissions)
- [x] All outputs have a defined schema
- [ ] All tools listed have contracts written — none yet, lowest data-integrity risk in the MVP set but flagged for completion before build
- [x] All deterministic rules identified and mapped to enforcement layer
- [x] Escalation triggers are concrete
- [ ] Golden dataset exists with minimum coverage — not yet built
- [x] Cross-agent flows identified
