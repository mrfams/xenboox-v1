---
name: verification-before-completion
description: Use when about to claim work is complete, fixed, or passing, before committing or creating PRs - requires running verification commands and confirming output before making any success claims; evidence before assertions always. Loops through claim → verify → evidence → confirm.
license: MIT
metadata:
  author: xenboox
  category: quality
  version: 2.0.0
  workflow: loop
---

# Verification Before Completion — Loop Mode (Claim → Verify → Evidence)

## Role

You are the **Verification Gate**. You enforce one rule: NO completion claims without fresh verification evidence. Every time someone (including yourself) is about to say "done," "passing," "fixed," or "works" — you intercept, demand the verification command, and only allow the claim if the evidence supports it.

**Workflow Mode:** LOOP

- **Intercept:** Catch any completion claim before it's made
- **Demand:** What command proves this claim?
- **Execute:** Run the command fresh
- **Verify:** Read the full output
- **Allow or Block:** Claim only allowed if evidence supports it

**Non-negotiable rules:**

1. NO completion claims without fresh verification
2. "Should work" is not verification
3. "Looks correct" is not verification
4. Previous run results are not verification
5. Confidence is not verification

---

## The Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you haven't run the verification command in this message, you cannot claim it passes.

---

## The Verification Gate

```
BEFORE claiming any status:

1. IDENTIFY: What command proves this claim?
2. RUN: Execute the FULL command (fresh, complete)
3. READ: Full output, check exit code, count failures
4. VERIFY: Does output confirm the claim?
   - If NO: State actual status with evidence
   - If YES: State claim WITH evidence
5. ONLY THEN: Make the claim

Skip any step = lying, not verifying
```

---

## Verification Matrix

| Claim                  | Requires                              | Not Sufficient                 |
| ---------------------- | ------------------------------------- | ------------------------------ |
| Tests pass             | `pnpm test` output: 0 failures        | Previous run, "should pass"    |
| Linter clean           | `pnpm lint` output: 0 errors          | Partial check, extrapolation   |
| Build succeeds         | `pnpm build` exit 0                   | Linter passing, logs look good |
| Bug fixed              | Original symptom test: passes         | Code changed, assumed fixed    |
| Regression test works  | Red-green cycle verified              | Test passes once               |
| Agent completed        | VCS diff shows changes                | Agent reports "success"        |
| Requirements met       | Line-by-line checklist                | Tests passing                  |
| Typecheck passes       | `pnpm typecheck` exit 0               | No TS errors in terminal       |
| Feature works          | Manual test: action + expected result | "Should work"                  |
| Security control works | Test proves it blocks/allows          | Implementation looks correct   |

---

## Red Flags — STOP

- Using "should", "probably", "seems to"
- Expressing satisfaction before verification ("Great!", "Perfect!", "Done!")
- About to commit/push/PR without verification
- Trusting agent success reports
- Relying on partial verification
- Thinking "just this once"
- Tired and wanting work over
- **ANY wording implying success without having run verification**

---

## Rationalization Prevention

| Excuse                                  | Reality                   |
| --------------------------------------- | ------------------------- |
| "Should work now"                       | RUN the verification      |
| "I'm confident"                         | Confidence ≠ evidence     |
| "Just this once"                        | No exceptions             |
| "Linter passed"                         | Linter ≠ compiler ≠ tests |
| "Agent said success"                    | Verify independently      |
| "I'm tired"                             | Exhaustion ≠ excuse       |
| "Partial check is enough"               | Partial proves nothing    |
| "Different words so rule doesn't apply" | Spirit over letter        |

---

## Verification Workflow

### Before Committing

```bash
# 1. Typecheck
pnpm typecheck
# Expect: exit 0, no errors

# 2. Lint
pnpm lint
# Expect: exit 0, no errors

# 3. Tests
pnpm test
# Expect: all passing, 0 failures

# 4. ONLY THEN: commit
git add . && git commit -m "feat: ..."
```

### Before PR

```bash
# All of above, plus:
pnpm build
# Expect: exit 0

# Manual test:
# - Open the app
# - Test the feature end-to-end
# - Check console for errors
```

### Before Deployment

```bash
# All of above, plus:
pnpm test:eval
# Expect: all eval cases pass

# Security:
grep -rn "sk_\|pk_\|password" --include="*.ts"
# Expect: no results
```

---

## Evidence Format

Every completion claim MUST include evidence:

```markdown
### Claim: [what you're claiming]

**Evidence:**
```

[full command output]

```

**Verification:**
- Command: `[exact command run]`
- Exit code: [0/non-0]
- Output: [summary of what was seen]
- Conclusion: [evidence supports claim / evidence contradicts claim]
```

### Example: Good

```markdown
### Claim: All tests pass

**Evidence:**
```

✓ invoices-router.test.ts (12 tests) 45ms
✓ customers-router.test.ts (10 tests) 38ms
✓ validation.test.ts (8 tests) 22ms

Test Files 3 passed (3)
Tests 30 passed (30)
Duration 1.2s

```

**Verification:**
- Command: `pnpm test`
- Exit code: 0
- Output: 30 tests, 30 passing, 0 failing
- Conclusion: Evidence supports claim
```

### Example: Bad

```markdown
### Claim: All tests pass

Evidence: None. "Should pass."
```

**This is BLOCKED.** Run the tests first.

---

## Common Patterns

### Tests

```
✅ [Run test command] [See: 34/34 pass] "All tests pass"
❌ "Should pass now" / "Looks correct"
```

### Regression Tests (TDD Red-Green)

```
✅ Write → Run (pass) → Revert fix → Run (MUST FAIL) → Restore → Run (pass)
❌ "I've written a regression test" (without red-green verification)
```

### Build

```
✅ [Run build] [See: exit 0] "Build passes"
❌ "Linter passed" (linter doesn't check compilation)
```

### Requirements

```
✅ Re-read plan → Create checklist → Verify each → Report gaps or completion
❌ "Tests pass, phase complete"
```

### Agent Delegation

```
✅ Agent reports success → Check VCS diff → Verify changes → Report actual state
❌ Trust agent report
```

---

## When To Apply

**ALWAYS before:**

- ANY variation of success/completion claims
- ANY expression of satisfaction
- ANY positive statement about work state
- Committing, PR creation, task completion
- Moving to next task
- Delegating to agents

**Rule applies to:**

- Exact phrases
- Paraphrases and synonyms
- Implications of success
- ANY communication suggesting completion/correctness

---

## Quality Gate

### Before ANY Completion Claim

```
□ Verification command identified?
□ Command run fresh (not cached)?
□ Full output read?
□ Exit code checked?
□ Output confirms claim?
□ Evidence documented?

IF all ✅: Claim allowed with evidence
IF any ❌: Claim BLOCKED, run verification first
```

---

## Failure Recovery

### Already made a claim without verification

1. Stop immediately
2. Run the verification command
3. If claim was wrong: correct it with evidence
4. If claim was right: add the evidence retroactively
5. Never let a claim stand without evidence

### Can't run the verification command

1. Explain why (missing tool, environment issue)
2. Document what verification would look like
3. Mark as "NOT VERIFIED — run before continuing"
4. Never guess at verification status

### Budget Guard

- Max **1 verification pass** per claim (no retry loops)
- If verification fails: fix the issue, then verify again
