# Agent Spec Template

> Every agent in the Xenboox workforce gets one spec file using this exact structure, before any prompt is written. If a section can't be filled in, the agent isn't ready to build.
>
> File naming: `agents/<agent-name>-spec.md` (e.g. `ledger-agent-spec.md`)

---

## 1. Identity

| Field         | Value                                                             |
| ------------- | ----------------------------------------------------------------- |
| Agent name    |                                                                   |
| Tier          | Strategic / Management / Worker / Platform-wide                   |
| Reports to    | (which agent receives its summaries/escalations)                  |
| Oversees      | (worker agents underneath it, if any)                             |
| PRD reference | (section # in XENBOOX_PRD.md)                                     |
| Model         | claude-haiku-4-5 or claude-sonnet-4-6 (per PRD §18 cost strategy) |

## 2. Mandate (one paragraph)

What this agent owns, in plain English. Should be narrow enough that a new engineer reading only this paragraph knows exactly what NOT to route to this agent.

## 3. Scope Boundary

**This agent MUST:**

- (bullet list of in-scope responsibilities, pulled from PRD §6.4/6.5/6.6)

**This agent MUST NEVER:**

- (explicit exclusions — e.g. "Never posts directly to the ledger" for every agent except Ledger Agent)
- (cross-entity access — restate entity_id scoping requirement even though it's global, because it's the #1 way multi-tenant systems leak data)

## 4. Inputs

For each input type this agent accepts:

| Input | Source (which agent/tool/human) | Format | Validation required before processing |
| ----- | ------------------------------- | ------ | ------------------------------------- |
|       |                                 |        |                                       |

## 5. Outputs

For each output type this agent produces:

| Output | Destination (which agent/tool/human) | Schema | Required fields |
| ------ | ------------------------------------ | ------ | --------------- |

Every output must be **structured** (JSON schema, not free text) unless it is a final human-facing summary. Link to schema definition in `/schemas/<agent-name>/`.

## 6. Tools This Agent Can Call

List every tool by name, link to its contract in `TOOL_CONTRACT_TEMPLATE.md`-derived doc. State explicitly: **an agent may only call tools listed here.** No dynamic tool discovery.

| Tool | Purpose | Read/Write |
| ---- | ------- | ---------- |

## 7. Deterministic Rules Enforced On This Agent's Output

Pull from PRD §6.7 Layer 1. List every hard constraint that applies to this agent's domain, and state where it's enforced (should be in the tool/DB layer, never trusted to the model).

Example: Ledger Agent → "debits must equal credits on every journal entry — enforced in `post_journal_entry` tool, rejected at DB constraint level, not a prompt instruction."

## 8. Confidence Scoring

- What does this agent score confidence on? (every output? specific judgment calls only?)
- What inputs to the confidence score are used (data completeness, precedent match in golden dataset, ambiguity signals)?
- Reference `CONFIDENCE_AND_ESCALATION.md` for the numeric scale and thresholds — this section only states _what's being scored_, not the general mechanism.

## 9. Escalation Triggers

Explicit conditions under which this agent stops and escalates rather than proceeding. Not vague ("if uncertain") — concrete ("confidence score below 0.75 on transaction categorization" / "invoice amount exceeds $X" / "counterparty not in supplier master data").

| Trigger condition | Escalates to | Escalation type (flag / block / notify) |
| ----------------- | ------------ | --------------------------------------- |

## 10. Failure Modes & Recovery

What happens when this agent is wrong, and how is it caught/corrected?

- Known failure modes specific to this agent's domain
- How Audit Agent or Controller Agent cross-checks this agent's work (if applicable)
- What "undo" looks like for this agent's actions

## 11. Golden Dataset Coverage

Link to `datasets/<agent-name>-golden.yaml`. Summarize case categories covered:

- Happy path: (count)
- Edge cases: (count, list types)
- Adversarial / malformed input: (count, list types)
- Ambiguous (should escalate, not guess): (count)

State explicitly what is **not yet covered** — this is a living gap list, not a claim of completeness.

## 12. Cross-Agent Dependencies

- Upstream agents whose output this agent depends on
- Downstream agents that depend on this agent's output
- Link to relevant flow(s) in `CROSS_AGENT_FLOW_TESTS.md`

## 13. Open Questions

Anything undecided about this agent's behavior. Do not silently default — flag it here and resolve before build, same discipline as PRD §21.

---

## Spec Sign-off Checklist

Before this spec is considered ready to implement:

- [ ] Scope boundary reviewed — no overlap with another agent's mandate
- [ ] All outputs have a defined schema
- [ ] All tools listed have contracts written
- [ ] All deterministic rules identified and mapped to enforcement layer (not left to the model)
- [ ] Escalation triggers are concrete, not vague
- [ ] Golden dataset exists with minimum coverage (see `GOLDEN_DATASET_SPEC.md` for minimum case counts)
- [ ] Cross-agent flows this agent participates in are identified
