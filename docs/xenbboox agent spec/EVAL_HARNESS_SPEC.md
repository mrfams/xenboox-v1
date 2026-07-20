# Eval Harness Spec

> Defines how golden datasets (`GOLDEN_DATASET_SPEC.md`) get executed, scored, and turned into a deploy/no-deploy signal. This is a build spec — the actual harness is code, this doc is what that code must do and why.

---

## 1. Purpose

PRD §6.7 Layer 3: _"Every agent output scored against this dataset continuously. Regression testing before every product deployment."_

This doc makes that concrete: what "scored" means numerically, what "continuously" means operationally, and what blocks a deploy vs. what just warns.

---

## 2. What Gets Run, When

| Trigger                                                         | Scope                                              | Blocking?                                                                        |
| --------------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------- |
| Every commit touching an agent's prompt, spec, or tool contract | That agent's full golden dataset                   | Yes — PR cannot merge on regression                                              |
| Every commit touching a shared tool used by multiple agents     | Golden datasets of all calling agents              | Yes                                                                              |
| Nightly                                                         | Full suite, all agents, all cross-agent flow tests | No (informational — catches drift from upstream model updates, not code changes) |
| Before production deploy                                        | Full suite                                         | Yes — hard gate                                                                  |
| On every logged agent disagreement (§6.7 Layer 2 event)         | Just the new case, added to relevant dataset(s)    | No — this generates new golden cases, doesn't block anything itself              |

"Continuously" in the PRD = commit-time + nightly + pre-deploy, not literally every production inference (that's what LangFuse tracing is for — observability on real traffic, separate from eval on known-answer data).

---

## 3. Scoring Methodology

Three scoring types, applied based on the nature of the expected output — an agent spec/dataset case should make clear which applies.

### 3.1 Exact-Match (deterministic outputs)

For anything with one mathematically correct answer: tax calculations, double-entry balance, reconciliation matches, depreciation figures.

- Output compared field-by-field against `expected_output`.
- No partial credit. A trial balance that's off by any amount is a fail, not "mostly right."
- This is the cheapest and highest-trust score type — use it wherever the domain allows (most of accounting does).

### 3.2 LLM-Graded (judgment-based outputs)

For outputs requiring judgment where multiple reasonable phrasings exist: categorization reasoning, plain-English summaries, variance explanations.

- A grading prompt (separate from the agent's own prompt, reviewed and versioned like any other prompt) compares actual output against `expected_output` and a rubric, returns pass/fail + reasoning.
- Grading model should be a _different_ model or at minimum a fresh context from the agent being graded — never let an agent grade its own output.
- LLM-graded results are inherently noisier than exact-match. Track grader agreement over time (spot-check a sample against human review) — if grader accuracy drifts, the grading prompt needs revision, flagged same as any other regression.

### 3.3 Calibration Score

Per `CONFIDENCE_AND_ESCALATION.md` §2.3 — checks whether stated confidence matches actual correctness rate, computed across the dataset, not per-case.

- Bucket all cases by the agent's stated confidence (e.g. 0.9–1.0, 0.75–0.89, etc.)
- Within each bucket, compute actual accuracy rate
- Well-calibrated: accuracy rate roughly matches the bucket's confidence range
- **Overconfidence (high stated score, low actual accuracy) is a harder failure than underconfidence** — an agent that's falsely confident is more dangerous than one that escalates too often. Weight the regression check accordingly.

### 3.4 Escalation Correctness

Separate from accuracy — did the agent escalate (or not escalate) as specified in `expected_escalation`?

- **False negative** (should have escalated, didn't) — most severe failure class in the entire harness. This is the "guessed silently" failure PRD §6.7 explicitly forbids. Any single false negative on an `ambiguous` or `adversarial` case blocks deploy, regardless of aggregate pass rate.
- **False positive** (escalated when it shouldn't have) — real cost (unusable product if every transaction gets flagged) but not a safety failure. Tracked as a quality metric, contributes to regression score, does not hard-block alone unless the rate crosses a set threshold (proposed: >15% false-positive rate on `happy_path` cases blocks deploy — an agent that can't confidently clear clean cases isn't ready).

---

## 4. Composite Score & Pass/Fail

Per agent, per run, compute:

```
result = {
  exact_match_rate: 0.0-1.0,       # on applicable cases
  llm_graded_pass_rate: 0.0-1.0,   # on applicable cases
  calibration_score: 0.0-1.0,      # lower = worse miscalibration
  escalation_false_negatives: int, # target: always 0
  escalation_false_positives: int,
  coverage_sufficient: bool,       # per GOLDEN_DATASET_SPEC.md §4 minimums
}
```

**Hard fail conditions (block deploy regardless of other scores):**

- Any `escalation_false_negative` > 0
- Any exact-match failure on a `happy_path` or `edge_case` deterministic output (Layer 1 rules must never regress)
- `coverage_sufficient: false` for any MVP agent once past prototype stage

**Regression fail conditions (block deploy if worse than last passing baseline):**

- `exact_match_rate` decreases
- `llm_graded_pass_rate` decreases beyond a small noise tolerance (proposed: 2 percentage points, given LLM-graded scoring's inherent noise)
- `calibration_score` decreases
- `escalation_false_positives` increases beyond threshold

**Baseline:** last known passing run on `main`, stored alongside the code (not just in CI logs) so regressions are diffable.

---

## 5. Cross-Agent Flow Evals

Single-agent eval catches per-agent regressions but not handoff failures (agent A's output doesn't match what agent B expects as input, even if both pass their own evals independently).

- Run `CROSS_AGENT_FLOW_TESTS.md` scenarios as their own eval type: sequence of agent calls, checked at each handoff point plus final state.
- Gates deploy same as single-agent evals — a flow-level regression is just as serious as a single-agent one, sometimes more so since it's invisible to per-agent tests.

---

## 6. Infrastructure

- **LangFuse** (already in stack, PRD §18) — used for tracing individual eval runs and production inference, giving one place to compare eval-time behavior against real traffic patterns.
- **Harness execution** — proposed: Promptfoo or a custom TypeScript harness (fits Next.js/tRPC stack better than a Python-first tool like Braintrust) — running as part of CI (GitHub Actions, given GitHub already in tool access) against a test database, not production.
- **Test data isolation** — golden dataset runs must execute against an isolated test entity/org, never against real production entity_ids, even in a "dry run" mode. No exceptions — this is a financial system, cross-contamination risk is not worth any convenience gained.

---

## 7. Reporting

Every harness run produces:

- Per-agent scorecard (the composite score above)
- Diff against baseline (what got better/worse, case-by-case for anything that flipped)
- Human-readable summary posted to PR (for commit-triggered runs) — pass/fail plus the specific cases that changed status, not just an aggregate number
- Nightly full-suite results logged to LangFuse for trend tracking over time (catches slow drift that a single PR-diff wouldn't show)

---

## 8. Open Questions

- Exact LLM-graded noise tolerance (2 points proposed above) — needs tuning once there's real grading data to look at, don't treat as final.
- Whether grading model should be Sonnet or a separate/larger model than the agent being graded — leaning toward Sonnet for MVP (cost), revisit if grader reliability becomes a problem.
- False-positive escalation threshold (15% proposed on `happy_path`) — arbitrary starting point, needs real usage data to validate.
