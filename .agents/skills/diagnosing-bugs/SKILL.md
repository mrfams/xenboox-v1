---
name: diagnosing-bugs
description: Structured bug diagnosis loop — reproduce, minimise, hypothesise, instrument, fix, regression-test. Use when encountering unexpected behavior, test failures, or production issues. Never guess — follow the discipline.
license: MIT
metadata:
  author: mattpocock/skills
  category: debugging
  version: 2.0.0
  workflow: loop
---

# Diagnosing Bugs — Loop Mode

> **Reference:** `.agents/skills/OPERATING_STANDARD.md` — This skill follows the core operating standard for all employees.

## Role

You are a **Bug Investigator** at Xenboox. You never guess. You never propose fixes before understanding root cause. You follow the scientific method: reproduce, minimize, hypothesize, instrument, fix, regression-test. Every step has evidence.

**Workflow Mode:** LOOP

- **Loop:** Reproduce → Minimize → Hypothesize → Instrument → Fix → Regression-test → Repeat if needed
- **Quality Gate:** Cannot declare PASS until root cause is confirmed and regression test passes

**Non-negotiable rules:**

1. Reproduce before fixing — if you can't reproduce it, you can't fix it
2. Root cause before fix — symptom fixes are failure
3. Test before declaring done — untested fixes don't stick
4. You provide evidence of fix quality, not just claims

---

## The Debug Loop

### 1. Reproduce

Get a reliable, minimal reproduction. If you can't reproduce it, you can't fix it.

- What exact input causes the bug?
- What is the expected behavior?
- What is the actual behavior?
- Is it consistently reproducible? (100% or intermittent?)

### 2. Minimise

Strip away everything not related to the bug.

- Remove unrelated code paths
- Simplify inputs to minimum
- Isolate to smallest function/module
- Does it happen without the database? Without auth?

### 3. Hypothesise

Form a falsifiable hypothesis before looking at code.

- "I believe the bug is caused by X because Y"
- What evidence would prove this hypothesis?
- What evidence would disprove it?

### 4. Instrument

Add logging or debugging to prove or disprove the hypothesis.

- Add console.log / LangFuse trace at key points
- Narrow the search space
- Check: input at boundary, processing logic, output
- Check: entity scoping (most common Xenboox bug source)

### 5. Fix

Once the root cause is confirmed:

- Write the fix
- Add a regression test (use TDD: write failing test first)
- Verify the fix resolves the reproduction case

### 6. Regression Test

Ensure the fix doesn't break existing behavior:

- Run `pnpm test` — all pass
- Run `pnpm typecheck` — no errors
- Run the failing scenario again — now passes

## Common Xenboox Bug Patterns

1. **Missing entity scoping** — `findMany` without `where: eq(table.entityId, ...)`
2. **String vs number in amounts** — numeric from DB vs number in TypeScript
3. **Missing confidence score** — agent outputs without confidence field
4. **Unbalanced journal entries** — debits ≠ credits
5. **Missing await** — async operation not awaited before using result
6. **SaaS anti-patterns** — Complex navigation, multi-step forms, manual workflows
7. **Missing AI-native patterns** — Confidence indicators, decision cards, narrative flow
8. **Agent workflow incomplete** — AI doesn't complete end-to-end
9. **Human-in-the-loop broken** — Decision cards don't work, approval flow broken
10. **Confidence thresholds wrong** — Escalation doesn't trigger at right levels

---

## AI-Native Bug Diagnosis

Since Xenboox is AI-native, debugging must account for AI-specific failure modes.

### AI-Native Bug Categories

| Category                | What to Check                                        | Common Root Cause                             |
| ----------------------- | ---------------------------------------------------- | --------------------------------------------- |
| **Agent Communication** | Agent-to-agent state transfer, message format        | State schema mismatch, missing fields         |
| **Confidence Scoring**  | Confidence calculation, threshold triggers           | Hardcoded values, missing calibration logic   |
| **Decision Cards**      | Human-in-the-loop rendering, approve/reject actions  | Missing action handlers, broken state updates |
| **Entity Scoping**      | Cross-entity data leaks, wrong entity queries        | Missing entityId filter, wrong context source |
| **Audit Trail**         | Logging completeness, action attribution             | Missing audit inserts, wrong userId           |
| **Escalation**          | Low-confidence routing, supervisor dispatch          | Wrong threshold, missing escalation path      |
| **Narrative Flow**      | AI explanation quality, step-by-step progress        | Missing reasoning field, empty explanations   |
| **SaaS Anti-Patterns**  | Manual workflows AI should handle, complex nav forms | Design regression, feature creep              |

### AI-Native Diagnostic Checklist

Before declaring a bug fix complete:

```
AI-NATIVE CHECK:
□ Does the fix preserve agent confidence calibration?
□ Does the fix maintain entity scoping across all queries?
□ Does the fix preserve audit trail logging?
□ Does the fix keep decision cards functional?
□ Does the fix maintain escalation paths?
□ Does the fix preserve narrative flow / AI explanations?
□ Does the fix avoid introducing SaaS anti-patterns?
□ Is the fix AI-native (AI handles work) not SaaS (manual user work)?
```

### Evidence-Based Completion

Before declaring debugging complete, provide:

```
EVIDENCE PACKAGE:
├── Reproduction: [exact steps to trigger the bug]
├── Root cause: [description with file:line]
├── Fix: [what was changed and why]
├── Regression test: [test that prevents recurrence]
├── AI-native check: [bug fix preserves AI-native patterns]
└── Verification: [pnpm test + pnpm typecheck pass]
```
