---
name: eval-runner
description: Runs the Xenboox agent evaluation suite against golden datasets. Use when verifying agent quality, checking eval scores, debugging agent failures, or before deploying agent changes. Fires with "run evals", "check agent scores", "evaluate agents".
license: MIT
metadata:
  author: xenboox
  category: testing
---

## When to Use

- Before deploying agent changes
- After modifying agent logic
- When debugging agent failures
- To check agent quality scores
- As a pre-ship gate

## Prerequisites

- Read `AGENTS.md` for agent conventions
- Read the relevant agent spec in `docs/agents/`
- Understand the eval harness in `packages/agents/core/eval/`

## Steps

### 1. Run Full Eval Suite

```bash
cd packages/agents
pnpm tsx core/eval/runner.ts
```

This runs all 16 agent golden datasets (ap, ar, asset, cash, cfo, compliance, controller, document, inventory, ledger, mobile-money, payroll-manager, payroll-worker, reconciliation, reporting, treasury) against their expected outputs.

### 2. Run Specific Agent

```bash
cd packages/agents
pnpm tsx core/eval/runner.ts --agent ledger
pnpm tsx core/eval/runner.ts --agent cfo --agent controller
```

### 3. Run Flow Evaluations

```bash
cd packages/agents
pnpm tsx core/eval/runner.ts --flow supplier-invoice-to-close
pnpm tsx core/eval/runner.ts --flow month-end-close-happy-path
```

### 4. Interpret Results

The runner outputs:

```
============================================================
EVAL SUITE REPORT — 2026-08-23T...
============================================================

Overall: 420/448 passed (93.8%)
Calibration: 0.892
Escalation False Negatives: 0
Coverage Sufficient: true
Blocking Failures: 0

✅ ledger: 55/55 passed | exact-match: 100% | calibration: 0.945 | FN: 0 FP: 0 | coverage: true
✅ ap: 28/28 passed | exact-match: 96% | calibration: 0.912 | FN: 0 FP: 1 | coverage: true
⚠️ reconciliation: 52/55 passed | exact-match: 91% | calibration: 0.878 | FN: 2 FP: 0 | coverage: true
```

**Key metrics:**

| Metric | Target | What It Means |
|--------|--------|---------------|
| Pass Rate | ≥93% | Overall correctness |
| Calibration | ≥0.85 | Confidence scores match reality |
| Escalation FN | 0 | Never miss a required escalation |
| Coverage Sufficient | true | Enough test cases per category |

### 5. Investigate Failures

When a test fails:

1. Check the failure report in `./eval-reports/eval-report-*.json`
2. Read the golden dataset case: `packages/agents/datasets/<agent>-golden.yaml`
3. Read the agent spec: `docs/agents/<agent>-spec.md`
4. Understand the expected vs actual output
5. Fix the agent logic
6. Re-run the eval

### 6. Add New Test Cases

When you find a bug or edge case not covered:

```yaml
# In packages/agents/datasets/<agent>-golden.yaml
cases:
  - id: <agent>-<category>-<number>
    category: edge_case  # happy_path | edge_case | adversarial | ambiguous
    description: "Describe the scenario"
    taskType: <action_type>
    input:
      # Agent input
    expectedOutput:
      # Expected result
    expectedConfidenceRange: [0.7, 1.0]
    expectedEscalation: none  # none | notify | flag | block
    expectedEscalationTarget: null
    source: synthetic
    notes: "Why this case matters"
```

**Case count targets per agent:**

| Agent Type | Happy Path | Edge Case | Adversarial | Ambiguous | Total |
|------------|-----------|-----------|-------------|-----------|-------|
| Standard | ≥10 | ≥8 | ≥5 | ≥5 | ≥28 |
| Ledger/Reconciliation | ≥20 | ≥15 | ≥10 | ≥10 | ≥55 |

### 7. Track Scores Over Time

After each run, note the pass rate and calibration score. If either drops:

1. Identify which agent regressed
2. Check recent changes to that agent
3. Add regression test case
4. Fix and re-verify

## Verification

1. All evals pass (or regressions are documented)
2. No escalation false negatives
3. Calibration score ≥0.85
4. Coverage sufficient for all agents
5. Report saved to `./eval-reports/`

## Common Pitfalls

1. **Ignoring false negatives** — An agent that doesn't escalate when it should is worse than one that over-escalates
2. **Low calibration** — Agent says 90% confidence but is only right 70% of the time → users can't trust it
3. **Missing adversarial cases** — The real world is adversarial. Test for fraud, edge cases, malformed input
4. **Not adding regression tests** — Every bug found should become a permanent test case
5. **Running evals in isolation** — Check the full suite, not just one agent. Agents hand off to each other
