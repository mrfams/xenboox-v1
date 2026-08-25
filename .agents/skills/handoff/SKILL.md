---
name: handoff
description: Compresses the current conversation and context into a structured handoff document. Loops through compress → verify → quality gate to ensure nothing is lost.
license: MIT
metadata:
  author: mattpocock/skills
  category: workflow
  version: 2.0.0
  workflow: loop
---

# Handoff — Loop Mode (Compress → Verify → Done)

## Role

You are a **Session Compressor**. You take everything from the current conversation — decisions, progress, blockers, next steps — and compress it into a structured handoff document that lets another agent or person pick up exactly where you left off. You verify nothing is lost. You don't stop until the handoff is complete and verified.

**Workflow Mode:** LOOP

- **Compress:** Extract all key information from conversation
- **Structure:** Organize into handoff document format
- **Verify:** Check nothing is missing — every decision, every blocker, every next step
- **Quality Gate:** Cannot declare done until handoff passes completeness check

**Non-negotiable rules:**

1. Every decision made in the session is documented
2. Every blocker/uncertainty is captured
3. Every next step is actionable and specific
4. Verification status is accurate (not guessed)
5. Files to read are listed with reasons

---

## Execution Graph

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ COMPRESS │───▶│ STRUCTURE│───▶│ VERIFY   │───▶│ DONE     │
│ Extract  │    │ Organize │    │ Check    │    │ Handoff  │
│ all info │    │ into     │    │ complete │    │ ready    │
│ from     │    │ template │    │ + accurate│   │          │
│ convo    │    │          │    │          │    │          │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                                     │
                                     │ If incomplete
                                     └──→ back to COMPRESS
```

---

## Phase 1: COMPRESS — Extract Everything

### What to Extract

Go through the conversation and extract:

#### 1. What Was Done

- Every feature/fix/change completed
- Every file created or modified
- Every test written or fixed
- Every configuration changed

#### 2. What's In Progress

- Work that was started but not finished
- Partial implementations
- Things blocked mid-way

#### 3. Decisions Made

- Architecture decisions (why this approach?)
- Trade-offs accepted (why not that approach?)
- Convention choices (why this pattern?)
- Direction changes (why did we pivot?)

#### 4. Blockers / Open Questions

- Things that couldn't be resolved in this session
- Questions that need input from others
- Dependencies on external systems/people
- Uncertainties that need clarification

#### 5. Verification Status

- What was tested and passed
- What was tested and failed
- What wasn't tested yet
- Typecheck/lint status

#### 6. Context for Next Agent

- Key files to read first
- Important patterns to understand
- Gotchas or surprises encountered
- What NOT to do (learned from mistakes)

### Extraction Checklist

```
EXTRACTION:
□ All completed work items listed?
□ All in-progress items listed?
□ All decisions documented with rationale?
□ All blockers captured with what's needed?
□ All next steps identified?
□ Verification status accurate?
□ Key files listed with reasons?
□ Gotchas/surprises documented?
```

---

## Phase 2: STRUCTURE — Build the Document

### Handoff Document Template

```markdown
# Handoff: [Project/Feature]

> Generated: [date] | From: [previous agent/session]

## Summary

[2-3 sentence summary of what was accomplished and what remains]

## What Was Done

### Completed

- [ ] [item 1] — [brief description]
- [ ] [item 2] — [brief description]
- [ ] [item 3] — [brief description]

### In Progress

- [ ] [item] — [current state, what's left]

## Current State

### Files Modified

| File             | Action   | Notes                  |
| ---------------- | -------- | ---------------------- |
| path/to/file.ts  | Created  | [what it does]         |
| path/to/other.ts | Modified | [what changed]         |
| path/to/test.ts  | Created  | [X tests, all passing] |

### Branch / Commit

- **Branch:** [branch name]
- **Latest commit:** [hash] — [message]
- **Working tree:** [clean | modified files: list]

### Dev Server

- **Running:** [yes/no]
- **URL:** [if running]

## Decisions Made

### Decision 1: [Title]

- **What:** [what was decided]
- **Why:** [rationale]
- **Alternatives considered:** [what else was evaluated]
- **Trade-off:** [what we gave up]

### Decision 2: [Title]

- **What:** [what was decided]
- **Why:** [rationale]

## Blockers / Open Questions

### Blockers

- [ ] [blocker description] — **Needs:** [person/role/action]
- [ ] [blocker description] — **Needs:** [person/role/action]

### Open Questions

- [ ] [question] — **Needs:** [input from whom]
- [ ] [question] — **Needs:** [decision from whom]

## Next Steps

### Immediate (next agent should do)

1. [specific action] — [why]
2. [specific action] — [why]
3. [specific action] — [why]

### Later (can wait)

1. [action] — [when/why]
2. [action] — [when/why]

## Files to Read First

| File              | Why Read It                             |
| ----------------- | --------------------------------------- |
| path/to/file.ts   | [Contains the core logic for X]         |
| path/to/config.ts | [Defines the Y pattern used throughout] |
| path/to/test.ts   | [Shows expected behavior for Z]         |

## Gotchas / Surprises

- [Unexpected thing encountered and how it was handled]
- [Convention that differs from what you'd expect]
- [Known issue that's not a blocker but worth knowing]

## What NOT To Do

- [Mistake made and learned from]
- [Approach that didn't work and why]
- [Thing that seems obvious but isn't]

## Verification Status

| Check     | Status | Details                |
| --------- | ------ | ---------------------- |
| Typecheck | ✅/❌  | [X errors remaining]   |
| Lint      | ✅/❌  | [X warnings]           |
| Tests     | ✅/❌  | [X passing, Y failing] |
| Manual QA | ✅/❌  | [what was tested]      |

## empworks.md Status

[If applicable: what was marked done, what remains]
```

---

## Phase 3: VERIFY — Check Completeness

### Verification Checklist

```
COMPLETENESS:
□ Summary is accurate (2-3 sentences)?
□ All completed items listed?
□ All in-progress items listed with current state?
□ All files modified/created listed?
□ Branch/commit info accurate?
□ All decisions documented with rationale?
□ All blockers captured with what's needed?
□ All next steps are actionable (not vague)?
□ Files to read are listed with reasons?
□ Gotchas documented?
□ What NOT to do documented?
□ Verification status accurate (not guessed)?

ACCURACY:
□ Do file paths match actual files on disk?
□ Is the branch/commit info correct?
□ Are test results accurate (run them if unsure)?
□ Are next steps actually next (not skipped steps)?
□ Is the summary honest about what's done vs not?
```

### If Verification Fails

```
IF incomplete:
  → Go back to COMPRESS phase
  → Extract missing information
  → Re-structure and re-verify

IF inaccurate:
  → Fix the inaccurate information
  → Re-verify

IF max 2 passes and still incomplete:
  → Document what's missing
  → Note "needs verification" on uncertain items
  → Present best version with gaps noted
```

---

## Phase 4: QUALITY GATE

### Mandatory Checks

- [ ] **Summary accurate** — Reflects actual state
- [ ] **All work documented** — Completed + in-progress
- [ ] **All decisions captured** — With rationale
- [ ] **All blockers listed** — With what's needed
- [ ] **Next steps actionable** — Specific, not vague
- [ ] **Verification status accurate** — Based on actual runs
- [ ] **Files listed with reasons** — Not just paths

### Quality Score

```
├── Summary accurate:            20 points
├── All work documented:         20 points
├── All decisions captured:      20 points
├── Next steps actionable:       20 points
└── Verification accurate:       20 points
                                 ────────
                                 TOTAL

Score ≥ 90: ✅ READY
Score 70-89: ⚠️ GAPS NOTED
Score < 70: ❌ INCOMPLETE
```

---

## Failure Recovery

### Can't remember all decisions

1. Re-read the conversation
2. Check git log for commits (decisions are in commit messages)
3. Check BUILD_LOG.md for session notes
4. If still uncertain: mark as "Needs verification"

### Next steps are vague

1. Make them specific: "Fix the type error in invoices.ts:42" not "Fix type errors"
2. Make them ordered: what to do first, second, third
3. Make them verifiable: how to know when done

### Verification status unknown

1. Run the checks: `pnpm typecheck`, `pnpm lint`, `pnpm test`
2. If can't run: mark as "Not verified — run before continuing"
3. Never guess at verification status

### Budget Guard

- Max **2 verification passes**
- If still incomplete: present best version with gaps noted
