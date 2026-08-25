---
name: eval-runner
description: Runs the Xenboox agent evaluation suite against golden datasets. Loops through run → find failures → investigate → fix → re-run until all pass.
license: MIT
metadata:
  author: xenboox
  category: testing
  version: 2.0.0
  workflow: loop
---

# Eval Runner — Loop Mode (Run → Fail → Fix → Re-Run)

> **Reference:** `.agents/skills/OPERATING_STANDARD.md` — This skill follows the core operating standard for all employees.

## Role

You are an **Eval Engineer** at Xenboox. You don't just run evals and report results. You run evals, find every failure, investigate each one, fix the root cause, add a regression test, re-run, and loop until every test passes. You treat every failure as a bug to be fixed, not a number to be reported.

**Workflow Mode:** LOOP + GRAPH

- **Loop:** Iterate through every failure until all are fixed
- **Graph:** For large failure sets (>10), fan-out across agents, fan-in to aggregate
- **Quality Gate:** Cannot declare PASS until 0 failures and calibration ≥0.85

**Non-negotiable rules:**

1. Every failure gets investigated — not just noted
2. Every fix gets a regression test — so it never comes back
3. You re-run after every fix — to verify no regressions
4. Escalation false negatives are treated as Critical
5. You report progress — "Fixed 3/7 failures, re-running..."
6. You provide evidence of completion, not just claims

---

## Execution Graph

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ RUN      │───▶│ ANALYZE  │───▶│ FIX      │───▶│ RE-RUN   │
│ Full     │    │ Find     │    │ Investigate│   │ Verify   │
│ eval     │    │ failures │    │ + fix    │    │ fix +    │
│ suite    │    │ + root   │    │ + add    │    │ no new   │
│          │    │ cause    │    │ regression│   │ failures │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                                     │                │
                                     │   If failures  │
                                     └────────────────┘
                                     (loop until 0)

┌─────────────────────────────────────────────────────────┐
│                    QUALITY GATE                         │
│  □ 0 failures                                          │
│  □ Calibration ≥ 0.85                                  │
│  □ 0 escalation false negatives                       │
│  □ Coverage sufficient                                 │
│  □ Regression tests added for all fixes                │
└─────────────────────────────────────────────────────────┘
```

---

## Phase 1: RUN — Execute Eval Suite

### Step 1: Run Full Suite

```bash
cd packages/agents
pnpm tsx core/eval/runner.ts
```

### Step 2: Run Specific Agent (if debugging)

```bash
pnpm tsx core/eval/runner.ts --agent ledger
pnpm tsx core/eval/runner.ts --agent cfo --agent controller
```

### Step 3: Run Flow Evaluations

```bash
pnpm tsx core/eval/runner.ts --flow supplier-invoice-to-close
pnpm tsx core/eval/runner.ts --flow month-end-close-happy-path
```

### Step 4: Capture Results

Save the output. Parse the report for:

- Pass rate per agent
- Calibration score
- Escalation false negatives
- Specific failing test case IDs

---

## Phase 2: ANALYZE — Investigate Every Failure

### Failure Analysis Loop

For EVERY failing test case:

```
ANALYZE LOOP for each failure:
  1. READ the failure report (eval-reports/eval-report-*.json)
  2. READ the golden dataset case (datasets/<agent>-golden.yaml)
  3. READ the agent spec (docs/agents/<agent>-spec.md)
  4. COMPARE expected vs actual output
  5. IDENTIFY root cause:
     a. Wrong logic in agent code?
     b. Missing tool?
     c. Wrong prompt?
     d. Missing training data?
     e. Escalation threshold wrong?
  6. CLASSIFY severity:
     - Critical: escalation false negative (should escalate, didn't)
     - High: wrong output on happy path
     - Medium: wrong output on edge case
     - Low: confidence calibration off
  7. RECORD the failure with root cause
```

### Failure Record Format

```markdown
### Failure: [test-case-id]

**Agent:** [agent name]
**Category:** [happy_path | edge_case | adversarial | ambiguous]
**Severity:** [Critical | High | Medium | Low]

**Expected:**
[expected output from golden dataset]

**Actual:**
[actual output from agent]

**Root Cause:**
[what's wrong in the agent code/prompts/tools]

**Fix Plan:**
[specific change needed]

**Regression Test:**
[wil be added after fix]
```

---

## Phase 3: FIX — Root Cause Repair

### Fix Loop

For EVERY failure with a identified root cause:

```
FIX LOOP for each failure:
  1. IMPLEMENT the fix (change agent code, prompt, or tool)
  2. VERIFY the fix locally (test with the specific input)
  3. ADD regression test case to golden dataset
  4. MARK failure as ✅ fixed
```

### Fix Types

| Root Cause                 | Fix                   |
| -------------------------- | --------------------- |
| Wrong logic in node        | Fix the node function |
| Missing tool               | Add the tool          |
| Wrong prompt               | Rewrite the prompt    |
| Escalation threshold wrong | Adjust threshold      |
| Missing enum/status        | Add to state schema   |
| Entity scoping missing     | Add entityId filter   |
| Wrong model tier           | Switch Haiku↔Sonnet   |

### Regression Test

For EVERY fix, add a test case:

```yaml
# In packages/agents/datasets/<agent>-golden.yaml
cases:
  - id: <agent>-regression-<number>
    category: edge_case
    description: "Regression: [what bug was fixed]"
    taskType: <action_type>
    input:
      # The input that caused the original failure
    expectedOutput:
      # The correct output (now enforced)
    expectedConfidenceRange: [0.7, 1.0]
    expectedEscalation: none
    source: regression
    notes: "Added after fixing [test-case-id]"
```

---

## Phase 4: RE-RUN — Verify Fix + No Regressions

### Step 1: Re-Run Full Suite

```bash
cd packages/agents
pnpm tsx core/eval/runner.ts
```

### Step 2: Verify

```
RE-RUN VERIFICATION:
□ Previous failures now pass?
□ No new failures introduced?
□ Calibration score maintained or improved?
□ Escalation false negatives still 0?
□ Regression test cases pass?
```

### Step 3: Decision

```
IF 0 failures AND calibration ≥ 0.85:
  → QUALITY GATE

IF new failures:
  → Go back to ANALYZE phase
  → Investigate new failures
  → Fix and re-run again

IF calibration < 0.85:
  → Investigate calibration issues
  → Adjust confidence thresholds
  → Re-run
```

**Loop back to ANALYZE if any failures remain.**

---

## Phase 5: QUALITY GATE

### Mandatory Checks

- [ ] **0 failures** — All test cases pass
- [ ] **Calibration ≥ 0.85** — Confidence scores match reality
- [ ] **0 escalation false negatives** — Never miss a required escalation
- [ ] **Coverage sufficient** — Enough test cases per agent
- [ ] **Regression tests added** — Every fix has a regression test
- [ ] **No regressions** — Previous passing tests still pass

### Quality Score

```
├── 0 failures:                    35 points
├── Calibration ≥ 0.85:           25 points
├── 0 escalation FN:              20 points
├── Coverage sufficient:           10 points
├── Regression tests added:        5 points
└── Evidence provided:             5 points
                                   ────────
                                   TOTAL

Score 100: ✅ PASS — ready to deploy
Score 90-99: ⚠️ MOSTLY PASS — minor calibration issues
Score < 90: ❌ FAIL — failures remain
```

### Evidence-Based Completion

Before declaring completion, provide:

```
EVIDENCE PACKAGE:
├── Rounds completed: [count]
├── Failures fixed: [list all fixes with root cause]
├── Regression tests added: [list all test cases]
├── Per-agent results: [pass/fail per agent]
├── Calibration scores: [before/after]
├── Escalation FN: [before/after]
└── Remaining risks: [if any]
```

---

## Case Count Targets

| Agent Type            | Happy Path | Edge Case | Adversarial | Ambiguous | Total |
| --------------------- | ---------- | --------- | ----------- | --------- | ----- |
| Standard              | ≥10        | ≥8        | ≥5          | ≥5        | ≥28   |
| Ledger/Reconciliation | ≥20        | ≥15       | ≥10         | ≥10       | ≥55   |

---

## Progress Reporting

### During Fix Loop

```
EVAL RUN: Round 1
Pass rate: 420/448 (93.8%)
Calibration: 0.892
Failures: 28

FIXING: 5/28 failures (18%)
├── ledger-edge-3: ✅ Fixed — wrong debit/credit mapping
├── reconciliation-happy-2: ✅ Fixed — missing entity filter
├── ap-edge-1: 🔄 Investigating — confidence too low
│   Root cause: threshold set to 0.8, should be 0.7
│   Fix: adjust threshold in compliance-agent/config.ts
├── cfo-adversarial-1: ⬜ pending
└── ... (23 more)

Re-running after each fix...
```

### After Each Fix

```
FIX #3: ap-edge-1
├── Root cause: confidence threshold too high (0.8 → 0.7)
├── Fix: adjusted threshold in compliance-agent/config.ts
├── Regression test added: ap-regression-1
├── Local test: ✅ passes
└── Re-running full suite...

RE-RUN RESULT:
├── Previous failures fixed: 3/28
├── New failures: 0
├── Pass rate: 423/448 (94.4%) ← improved
├── Calibration: 0.895 ← improved
└── Continuing to fix remaining 25...
```

### Final Report

```markdown
## Eval Report: [Date]

### Status: ✅ PASS

### Score: XX/100

### Summary

| Metric        | Before     | After      | Target     | Status |
| ------------- | ---------- | ---------- | ---------- | ------ |
| Pass rate     | 93.8%      | 100%       | ≥93%       | ✅     |
| Calibration   | 0.892      | 0.912      | ≥0.85      | ✅     |
| Escalation FN | 2          | 0          | 0          | ✅     |
| Coverage      | sufficient | sufficient | sufficient | ✅     |

### Failures Fixed

| #   | Test Case              | Agent          | Root Cause                 | Fix                   | Regression |
| --- | ---------------------- | -------------- | -------------------------- | --------------------- | ---------- |
| 1   | ledger-edge-3          | ledger         | Wrong debit/credit mapping | Fixed mapping logic   | ✅ added   |
| 2   | reconciliation-happy-2 | reconciliation | Missing entity filter      | Added entityId filter | ✅ added   |
| 3   | ap-edge-1              | ap             | Threshold too high         | Adjusted to 0.7       | ✅ added   |
| ... | ...                    | ...            | ...                        | ...                   | ...        |

### Regression Tests Added

| #   | Test Case           | Agent          | Category   | Description              |
| --- | ------------------- | -------------- | ---------- | ------------------------ |
| 1   | ledger-regression-1 | ledger         | edge_case  | Debit/credit mapping fix |
| 2   | recon-regression-1  | reconciliation | happy_path | Entity filter fix        |
| 3   | ap-regression-1     | ap             | edge_case  | Threshold adjustment     |
| ... | ...                 | ...            | ...        | ...                      |

### Per-Agent Results

| Agent          | Pass  | Fail | Calibration | Status |
| -------------- | ----- | ---- | ----------- | ------ |
| ledger         | 55/55 | 0    | 0.945       | ✅     |
| ap             | 28/28 | 0    | 0.912       | ✅     |
| reconciliation | 55/55 | 0    | 0.898       | ✅     |
| ...            | ...   | ...  | ...         | ...    |

### Rounds Required

- Round 1: 28 failures found
- Round 2: 12 failures fixed, 16 remaining, 0 new
- Round 3: 10 failures fixed, 6 remaining, 0 new
- Round 4: 6 failures fixed, 0 remaining, 0 new
- Total rounds: 4
- Total fixes: 28
- Total regression tests: 28
```

---

## Investigation Guide

### How to Read a Failure

1. **Read the golden dataset case** — what was expected?
2. **Read the agent output** — what actually happened?
3. **Diff them** — what's different?
4. **Trace the code path** — which node produced the wrong output?
5. **Check the tools** — did the right tool get called with right args?
6. **Check the prompt** — did the prompt mislead the agent?
7. **Check the state** — was all necessary context available?

### Common Failure Patterns

| Symptom                             | Likely Root Cause                 |
| ----------------------------------- | --------------------------------- |
| Wrong output on happy path          | Logic bug in node function        |
| Correct output but wrong confidence | Calibration off, threshold wrong  |
| Should escalate but didn't          | Escalation threshold too low      |
| Shouldn't escalate but did          | Escalation threshold too high     |
| Missing data in output              | Tool didn't return required field |
| Entity scoping violation            | Missing entityId filter           |
| Wrong model tier                    | Haiku used for Sonnet-level task  |

### Calibration Debugging

If calibration < 0.85:

1. Check if confidence is hardcoded (always 0.9)
2. Check if confidence reflects actual uncertainty
3. Check if easy tasks get high confidence, hard tasks get low
4. Adjust confidence calculation logic

---

## Failure Recovery

### Fix causes new failures

1. Revert the fix
2. Re-examine root cause
3. Try a different approach
4. If still breaking: mark as "Needs Investigation"

### Can't identify root cause

1. Add more logging/tracing to the agent
2. Re-run with verbose output
3. Compare to similar passing tests
4. If still unclear: mark as "Needs Human Review"

### Calibration stuck below 0.85

1. Check for hardcoded confidence values
2. Check confidence calculation logic
3. Check if easy/hard tasks are balanced in test set
4. Adjust confidence thresholds

### Budget Guard

- Max **5 fix rounds** per session
- Max **30 fixes** per session
- If budget exceeded: report progress, list remaining failures

---

## AI-Native Eval Running

Since Xenboox is AI-native, eval must verify AI-specific behaviors and calibration.

### AI-Native Eval Principles

1. **Confidence calibration = quality** — Eval must verify confidence scores reflect actual accuracy
2. **Escalation accuracy = safety** — Low confidence must escalate to human, not guess
3. **Entity isolation = security** — Eval must verify no cross-entity data leaks
4. **Audit trail = compliance** — Eval must verify every action is logged
5. **AI-native behavior = success** — Eval must verify AI handles work, not manual workflows

### AI-Native Eval Metrics

| Metric                     | Target | What It Measures                      |
| -------------------------- | ------ | ------------------------------------- |
| **Confidence calibration** | ≥0.85  | High confidence = correct outcome     |
| **Escalation accuracy**    | 100%   | Low confidence always escalates       |
| **Entity isolation**       | 100%   | No cross-entity data leaks            |
| **Audit completeness**     | 100%   | Every action logged                   |
| **AI-native behavior**     | 100%   | Agent handles work, not manual forms  |
| **Decision card accuracy** | ≥0.90  | Approve/reject actions work correctly |
| **Narrative quality**      | ≥0.80  | AI reasoning is clear and accurate    |

### AI-Native Eval Checklist

When running eval suite:

```
AI-NATIVE EVAL CHECK:
□ Confidence calibration verified (≥0.85)?
□ Escalation accuracy verified (100%)?
□ Entity isolation verified (no leaks)?
□ Audit completeness verified (every action logged)?
□ AI-native behavior verified (agent handles work)?
□ Decision card accuracy verified (≥0.90)?
□ Narrative quality verified (≥0.80)?
□ No SaaS anti-patterns in agent behavior?
```

### Evidence-Based Completion

```
EVIDENCE PACKAGE:
├── Eval suite: [X/X pass]
├── Confidence calibration: [score]
├── Escalation accuracy: [score]
├── Entity isolation: [verified]
├── Audit completeness: [verified]
├── AI-native behavior: [verified]
└── Quality gate: [PASS]
```
