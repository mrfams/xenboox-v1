---
name: diagnosing-bugs
description: Structured bug diagnosis loop — reproduce, minimise, hypothesise, instrument, fix, regression-test. Use when encountering unexpected behavior, test failures, or production issues. Never guess — follow the discipline.
license: MIT
metadata:
  author: mattpocock/skills
  category: debugging
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
