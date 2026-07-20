# Golden Dataset Spec

> Defines the format every agent's golden dataset must follow, and the minimum coverage required before an agent is considered eval-ready. Golden datasets are what `EVAL_HARNESS_SPEC.md` runs against — this doc is the data contract, that doc is the execution contract.

---

## 1. Purpose

The golden dataset is the ground truth PRD §6.7 Layer 3 depends on: _"Golden dataset of verified correct accounting scenarios. Every agent output scored against this dataset continuously."_

It serves three jobs, and a case should be tagged with which job(s) it serves:

1. **Accuracy** — is the agent's output correct?
2. **Calibration** — does the agent's stated confidence match how often it's actually right on that type of case?
3. **Escalation behavior** — does the agent escalate when it should, and _not_ escalate when it shouldn't (over-escalation is also a failure — an agent that flags everything is not usable)?

---

## 2. File Format

One file per agent: `datasets/<agent-name>-golden.yaml`

```yaml
agent: ledger-agent
version: 1
last_updated: 2026-07-20
cases:
  - id: ledger-001
    category: happy_path # happy_path | edge_case | adversarial | ambiguous
    description: "Standard cash sale, single currency, complete data"
    input:
      # exact structured input matching the agent's input schema
    expected_output:
      # exact structured output matching the agent's output schema
    expected_confidence_range: [0.9, 1.0]
    expected_escalation: none # none | notify | flag | block
    expected_escalation_target: null
    source: synthetic # synthetic | anonymized_real | disagreement_derived
    notes: ""

  - id: ledger-014
    category: ambiguous
    description: "Expense could plausibly be office supplies or IT equipment — no strong precedent"
    input: {}
    expected_output: null # null = agent should NOT produce a final output
    expected_confidence_range: [0.5, 0.74]
    expected_escalation: flag
    expected_escalation_target: controller-agent
    source: synthetic
    notes: "This is the class of case Layer 3 exists for — must not guess silently"
```

### Field rules

| Field                       | Rule                                                                                                                                                     |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                        | Stable, never reused even if case is deprecated — deprecated cases are marked `deprecated: true`, not deleted, so historical eval runs stay reproducible |
| `category`                  | One of the four fixed values below (§3) — no free-text categories, or coverage tracking breaks                                                           |
| `expected_output`           | `null` is a valid and important value — it means "correct behavior is to not produce a confident final answer"                                           |
| `expected_confidence_range` | A range, not a point value — the harness checks the agent's score falls in range, exact-match confidence scoring isn't realistic                         |
| `expected_escalation`       | Must match the vocabulary in `CONFIDENCE_AND_ESCALATION.md` §4 (notify / flag / block / none)                                                            |
| `source`                    | Tracks provenance — matters for knowing what's tested against real-world data vs. synthetic guesses                                                      |

---

## 3. Case Categories (fixed set of four)

Every case must be exactly one of:

1. **`happy_path`** — clean, complete, unambiguous data. The agent should handle this with high confidence and no escalation. This is the majority of real production traffic and the majority of cases should be this category — but it's the least informative category for catching bugs, so it should not be the _only_ category.

2. **`edge_case`** — valid but unusual: multi-currency, partial payments, split transactions, unusual but legal timing, jurisdiction-specific quirks (PAYE variations across GRA/FIRS/KRA, etc.). Agent should still produce a correct answer, possibly with a lower (but still auto-proceed or flag-tier) confidence score.

3. **`adversarial`** — malformed, incomplete, or actively bad input: corrupted OCR output, missing required fields, contradictory data, duplicate submission attempts. Tests that deterministic rules (Layer 1) reject correctly and the agent doesn't hallucinate a plausible-looking answer to paper over bad data.

4. **`ambiguous`** — valid, complete data where genuine human judgment is required and no single correct answer exists. Tests that the agent escalates rather than guessing. This category directly tests PRD §6.7's "never guess silently" requirement — it is the most important category for a financial system and must not be under-represented just because it's harder to author.

---

## 4. Minimum Coverage Requirements (per agent, before "eval-ready")

An agent is **not** ready for its eval harness to gate deployments until its golden dataset meets these minimums. These are floors, not targets — high-risk agents (Ledger, Tax, Payroll) should exceed them substantially.

| Category          | Minimum count (MVP agents) | Minimum count (Ledger/Reconciliation — highest risk) |
| ----------------- | -------------------------- | ---------------------------------------------------- |
| `happy_path`      | 10                         | 20                                                   |
| `edge_case`       | 8                          | 15                                                   |
| `adversarial`     | 5                          | 10                                                   |
| `ambiguous`       | 5                          | 10                                                   |
| **Total minimum** | **28**                     | **55**                                               |

Below this floor, the harness can still run (useful for development) but its results **do not gate deployment** — not enough coverage to trust a pass as meaningful. Mark this status explicitly in the harness output (`coverage_sufficient: false`).

---

## 5. Where Cases Come From

Priority order — real and disagreement-derived data is worth more than invented synthetic cases:

1. **Disagreement-derived** (highest priority) — per `CONFIDENCE_AND_ESCALATION.md` §6, every cross-agent disagreement gets logged as a golden dataset candidate. These are cases the system has proven are genuinely hard.
2. **Anonymized real data** — once there's a beta user, real transactions (stripped of identifying detail) become the best source of edge cases, especially jurisdiction-specific ones (real GRA VAT quirks beat invented ones).
3. **Synthetic** — hand-authored to fill known gaps, especially for `adversarial` category before real bad data has been seen in production.

Every case's `source` field must be honest about which of these it is — don't backfill `synthetic` cases as `anonymized_real`, the harness's trust weighting (see `EVAL_HARNESS_SPEC.md`) may treat them differently.

---

## 6. Maintenance Rules

- **Never delete a case.** Deprecate with `deprecated: true` and a reason. Deleting silently allows regressions to sneak back in on a rule that used to be tested.
- **Every production bug becomes a golden dataset case** before the fix is considered complete. Bug without a regression case = bug that will recur.
- **Review cadence:** golden datasets for MVP agents reviewed monthly against real production disagreement logs once there's a beta user; before that, reviewed whenever an agent spec changes.

---

## 7. What This Spec Does Not Cover

- Cross-agent flow test data (invoice → AP → Cash → Ledger chains) — that's `CROSS_AGENT_FLOW_TESTS.md`, a different data shape (sequences of agent calls, not single input/output pairs).
- Load/performance testing — not a golden dataset concern, separate infra work.
- How scores are computed from these cases (exact-match vs. LLM-graded logic) — that's `EVAL_HARNESS_SPEC.md`.
