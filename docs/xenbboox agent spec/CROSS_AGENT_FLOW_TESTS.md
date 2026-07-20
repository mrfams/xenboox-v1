# Cross-Agent Flow Tests

> Single-agent golden datasets (`GOLDEN_DATASET_SPEC.md`) catch per-agent regressions. They do not catch handoff failures — agent A produces output that agent B can't correctly consume, even though both pass their own evals in isolation. This doc defines how those flows get tested.

---

## 1. Why This Is Separate From Per-Agent Evals

A concrete failure mode this catches that per-agent evals structurally cannot: AP Agent's eval passes because its output matches its own schema. Cash Agent's eval passes because, given a well-formed input, it responds correctly. But if AP Agent's schema changed last sprint and Cash Agent's expected-input assumptions didn't get updated to match, both agents are "passing" while the actual pipeline between them is broken. This is the most common way multi-agent systems silently degrade — and it's exactly the shape of failure a 19-agent hierarchy is most exposed to.

---

## 2. File Format

One file per flow: `flows/<flow-name>-flow.yaml`

```yaml
flow: supplier-invoice-to-close
description: "PRD §6.6 — supplier invoice arrives by email through to CFO summary"
version: 1
last_updated: 2026-07-20

steps:
  - step: 1
    agent: document-agent
    action: ingest_and_extract
    input:
      # structured input — e.g. raw email + PDF attachment
    expected_output:
      # structured output this step must produce
    expected_confidence_range: [0.85, 1.0]
    handoff_check: "output schema matches ap-agent's expected input schema exactly"

  - step: 2
    agent: ap-agent
    action: match_and_schedule
    input_from_step: 1
    expected_output:
      # ...
    expected_confidence_range: [0.9, 1.0]
    handoff_check: "purchase_order_id resolved correctly, payment_due_date computed correctly"

  # ... continues through cash-agent, mobile-money-agent or reconciliation-agent,
  # ledger-agent, tax-agent, controller-agent, reporting-agent, analytics-agent, cfo-agent

final_state_check:
  # what the end-to-end system state must look like after all steps —
  # e.g. journal entry posted and balanced, P&L updated, no unresolved escalations
  # unless the scenario specifically tests an escalation path

expected_human_touchpoints:
  0 # PRD §6.6: "the human never touches the invoice" — this flow should hit zero,
  # a variant flow testing an escalation case would set this to 1+ and specify why
```

### Key fields beyond per-step data

| Field                        | Purpose                                                                                                                                                                                      |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `handoff_check`              | The specific thing being verified at each step boundary — not just "step passed" but "step N's output is directly consumable by step N+1 without transformation the spec didn't account for" |
| `final_state_check`          | End-to-end correctness — the pipeline can pass every individual step and still leave the system in a wrong final state (e.g. double-posted, or posted to wrong entity)                       |
| `expected_human_touchpoints` | Makes the "human never touches this" promise (PRD §6.6, §8) testable, not just aspirational prose                                                                                            |

---

## 3. Required Flows (MVP)

Derived directly from PRD §6.6, §8, and the 11 MVP agents. Each needs a happy-path version and at least one failure/escalation variant.

| Flow                                                 | Agents involved                                                                                        | Source                        |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------- |
| Supplier invoice → payment → close                   | Document → AP → Cash → Mobile Money/Reconciliation → Ledger → Controller → Reporting → Analytics → CFO | PRD §6.6                      |
| Customer invoice → payment received                  | AR → Cash/Mobile Money → Ledger → Controller → Reporting                                               | Derived from module list §5.2 |
| Bank statement upload → reconciliation               | Document → Reconciliation → Treasury → Ledger → Controller                                             | PRD §7.1 integration priority |
| Month-end autonomous close (happy path)              | Controller, Treasury confirm → Reporting produces package → CFO signs off → owner notified             | PRD §8                        |
| Month-end close — error recovery (owner flags issue) | CFO reopens → identifies scope → classifies error type → recovery sequence → re-close                  | PRD §8 "Error Recovery Flow"  |
| Onboarding historical data pull                      | Document ingestion at volume → Ledger backfill → chart of accounts proposal                            | PRD §13                       |

Each flow above needs, at minimum:

- 1 happy-path case
- 1 case where a step in the middle should escalate (proves escalation propagates correctly through a chain, not just within one agent)
- 1 case testing the "disagreement between agents" mechanism (`CONFIDENCE_AND_ESCALATION.md` §6) where applicable

---

## 4. What "Passing" Means for a Flow

A flow test passes only if **all** of the following hold — partial credit doesn't apply here the way it might for a single agent's LLM-graded score, because a broken handoff anywhere in the chain invalidates everything downstream of it:

1. Every step's output matches its `expected_output` (same scoring rules as `EVAL_HARNESS_SPEC.md` §3, applied per step)
2. Every `handoff_check` passes
3. `final_state_check` matches
4. Actual human touchpoints equal `expected_human_touchpoints` — not more, not fewer
5. No escalation false negatives anywhere in the chain (same hard-fail severity as single-agent evals, per `EVAL_HARNESS_SPEC.md` §3.4)

---

## 5. Schema Drift Protection

The specific failure mode from §1 (schema changes silently break a downstream consumer) gets an additional automated check, not just reliance on someone running the full flow test:

- Every agent's declared output schema (from its spec, §5) is checked against every downstream agent's declared input schema (§4) automatically, on every commit that touches either schema.
- This is a structural/type check, not a behavioral eval — fast, cheap, runs on every commit, catches the class of bug before a full flow eval run is even needed.
- Flow evals (this doc) then confirm the schemas aren't just _type-compatible_ but _behaviorally_ correct end to end.

---

## 6. Maintenance Rules

Same discipline as `GOLDEN_DATASET_SPEC.md` §6:

- Every production incident involving a multi-agent handoff becomes a new flow test case before the fix is considered done.
- Flows are versioned; deprecated steps/flows marked, not deleted.
- New agents added in Phase 2/3 require updating any flow they now participate in (e.g. adding Payroll Manager Agent means the month-end close flow needs a new confirmation step per PRD §8 step 3-5 pattern).

---

## 7. Open Questions

- Whether flow tests run against a full LangGraph execution (real agent-to-agent calls through the actual orchestration graph) or a mocked-handoff version for speed — proposing: mocked for commit-time (fast), full real execution nightly and pre-deploy (slow but ground-truth).
- Ownership: who authors new flow tests when a new cross-agent interaction is introduced — proposing this is a required part of any PR that adds a new agent-to-agent handoff, same as tool contracts being required before a tool is callable.
