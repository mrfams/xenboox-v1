# Engineering Critique — Loop & Graph Engineering Upgrade

> **For agentic workers:** Use this plan to upgrade `.agents/skills/engineering-critique/SKILL.md` from one-shot to loop+graph pattern.

**Goal:** Transform engineering-critique from a one-shot checklist into a production workflow that reviews ALL files, verifies every finding, retries on failure, and doesn't stop until 100% scope is covered.

**Architecture:** Loop pattern with graph fan-out for large diffs. Work queue tracks progress. Quality gate ensures completeness.

**Tech Stack:** Skill markdown (SKILL.md), no code changes needed

**Spec:** Current `.agents/skills/engineering-critique/SKILL.md` (250+ lines of checklist)

---

## What Changes

| Before                        | After                                                    |
| ----------------------------- | -------------------------------------------------------- |
| One pass through checklist    | Loop: iterate through every file in scope                |
| "Review the diff" (vague)     | Work queue: list every file, mark each ✅/🔄/⬜          |
| Findings without verification | Verify each finding: is it real? is the fix correct?     |
| Stops after a few findings    | Processes ALL files, ALL findings                        |
| No retry                      | Retry up to 3x with more context if review is unclear    |
| No quality gate               | Quality gate: 100% files reviewed, 0 Critical unresolved |
| No progress report            | Live progress: "Reviewed 7/12 files, 3 Critical found"   |

---

## Plan

### Task 1: Rewrite SKILL.md Header & Role

**Files:** `.agents/skills/engineering-critique/SKILL.md`

**What changes:**

- Add "Workflow Mode: LOOP + GRAPH" header
- Upgrade role description: "You are a Staff Engineer who reviews EVERY file, not just a few"
- Add scope definition: "Scope = all files in the diff, all files in the changed module, or all files the user specifies"

**Content:**

```markdown
# Enterprise Engineering Critique — Loop + Graph Mode

## Role & Authority

You are the **Staff Engineer Reviewer**. You review EVERY file in scope. You do not stop early. You do not skip files. You do not declare done until every file has been reviewed and every finding has been verified.

**Workflow Mode:** LOOP + GRAPH

- **Loop:** You iterate through every file in the work queue until all are reviewed
- **Graph:** For large scopes (>10 files), you fan-out across files in parallel, then aggregate findings
- **Quality Gate:** You cannot declare PASS until 100% of scope is reviewed and 0 Critical findings are unresolved

**Non-negotiable rules:**

1. You review ALL files in scope — not a sample, not the "important" ones
2. Every finding must be verified — is it real? is the severity correct?
3. Every finding must include: file, line, code, problem, impact, fix
4. You retry if a finding is unclear — add more context, re-examine
5. You report progress as you go — "Reviewed X/Y files"
```

### Task 2: Add Work Queue System

**Files:** `.agents/skills/engineering-critique/SKILL.md`

**Add after the Role section:**

```markdown
## Work Queue

Before starting review, build the work queue:

### Step 1: Identify All Files in Scope

Scope rules (in order):

1. If user provides specific files → those files
2. If reviewing a PR/diff → all changed files in the diff
3. If reviewing a module → all files in the changed module(s)
4. If user says "review everything" → all files in apps/ and packages/

### Step 2: Build the Queue

For each file, record:

- File path
- Status: ⬜ pending | 🔄 in progress | ✅ reviewed | ❌ blocked
- Findings count (updated as you review)

### Step 3: Track Progress

Report progress every 3 files:
```

PROGRESS: 3/12 files reviewed (25%)
Findings so far: 2 Critical, 3 High, 5 Medium
Current: apps/web/server/routers/invoices.ts

```

### Queue Format

| # | File | Status | Critical | High | Medium | Low |
|---|------|--------|----------|------|--------|-----|
| 1 | apps/web/server/routers/invoices.ts | ✅ | 1 | 0 | 2 | 1 |
| 2 | packages/agents/tier2/controller-agent/tools.ts | ✅ | 0 | 1 | 1 | 0 |
| 3 | apps/web/components/invoice-list.tsx | 🔄 | — | — | — | — |
| 4 | apps/web/app/api/invoices/route.ts | ⬜ | — | — | — | — |
| ... | ... | ⬜ | — | — | — | — |

TOTAL: 2/12 reviewed | 1 Critical | 1 High | 3 Medium | 1 Low
```

````

### Task 3: Add the Review Loop

**Files:** `.agents/skills/engineering-critique/SKILL.md`

**Add the core loop:**

```markdown
## The Review Loop

For EVERY file in the queue, execute this loop:

### Loop Iteration (per file)

1. **READ** the file completely — don't skim, don't sample
2. **APPLY** all 6 review categories (Correctness, Financial Integrity, Security, Performance, Architecture, Agent Integrity)
3. **RECORD** every finding with full details
4. **VERIFY** each finding:
   - Is the code actually wrong? (not just different style)
   - Is the severity correct? (Critical = data corruption/security breach)
   - Is the fix correct? (would the suggested fix actually work?)
5. **MARK** file as ✅ reviewed with findings count
6. **REPORT** progress if ≥3 files reviewed since last report

### Retry Rule

If you're uncertain about a finding:
1. Re-read the code with more context (imports, callers, DB schema)
2. Check if the pattern exists elsewhere in the codebase (is it intentional?)
3. If still uncertain after retry: mark as "Needs Investigation" with reasoning
4. Max 3 retries per finding before escalating to "Needs Investigation"

### Skip Rule

You may ONLY skip a file if:
- It's a generated file (*.generated.ts, *.schema.ts auto-generated)
- It's a test file (and user didn't ask for test review)
- User explicitly says "skip file X"

If you skip a file, mark it as ⏭️ skipped with reason.
````

### Task 4: Add Quality Gate

**Files:** `.agents/skills/engineering-critique/SKILL.md`

```markdown
## Quality Gate

Before declaring review complete, ALL of these must be true:

### Mandatory Checks

- [ ] 100% of files in queue are marked ✅ reviewed or ⏭️ skipped (with reason)
- [ ] 0 Critical findings are unresolved (all must have verified fix)
- [ ] 0 High findings are unresolved (all must have verified fix)
- [ ] Every finding has: file, line, code snippet, problem, impact, fix
- [ ] Review summary table is complete with all counts

### If Quality Gate Fails

- Go back to the first unresolved finding
- Add more context (read imports, callers, schema)
- Verify or dismiss the finding
- Re-check quality gate
- Max 2 full passes before escalating to human

### Quality Score

Calculate a quality score:

- 100% files reviewed = 50 points
- 0 unresolved Critical = 25 points
- 0 unresolved High = 15 points
- All findings have full details = 10 points

Score ≥ 90: PASS
Score 70-89: NEEDS_CHANGES (minor gaps)
Score < 70: BLOCKED (major gaps in review)
```

### Task 5: Add Graph Fan-Out for Large Scopes

**Files:** `.agents/skills/engineering-critique/SKILL.md`

```markdown
## Graph Mode: Large Scope (>10 files)

When scope exceeds 10 files, use graph fan-out:

### Phase 1: PARALLEL REVIEW (Fan-Out)

Split files into groups by directory/module:
```

Group A (apps/web/server/): files 1-4
Group B (apps/web/components/): files 5-8
Group C (packages/agents/): files 9-12

```

Review each group independently. Each group produces:
- Findings list for that group
- Severity counts
- Entity scoping check results

### Phase 2: AGGREGATE (Fan-In)
Combine all group findings into unified report:
- Deduplicate findings across groups
- Check for cross-group issues (e.g., tRPC route + component using different types)
- Aggregate severity counts
- Check consistency: same pattern used correctly across all groups

### Phase 3: CROSS-CUTTING CHECKS
After aggregating, verify:
- Entity scoping is consistent across ALL groups
- No group introduced a dependency that breaks another group
- Financial data flow is correct end-to-end (UI → API → DB)
- Agent tools match their graph definitions
```

### Task 6: Add Progress Reporting

**Files:** `.agents/skills/engineering-critique/SKILL.md`

```markdown
## Progress Reporting

### During Review

Report every 3 files or every 5 minutes:
```

REVIEW PROGRESS: 7/15 files (47%)
├── apps/web/server/routers/ ✅ 4/4 files — 1 Critical, 2 High
├── apps/web/components/ 🔄 2/5 files — 0 Critical, 1 High  
├── packages/agents/ ⬜ 0/4 files
└── apps/web/app/api/ ⬜ 0/2 files

Current: apps/web/components/invoice-list.tsx
Finding: Entity scoping missing on line 42

```

### Final Report
Always end with the structured report format (existing in the skill), but now with guaranteed completeness:
- Every file reviewed
- Every finding verified
- Quality gate passed
```

### Task 7: Add Failure Recovery

**Files:** `.agents/skills/engineering-critique/SKILL.md`

```markdown
## Failure Recovery

### If a file can't be read

1. Mark as ❌ blocked with error message
2. Continue to next file
3. At end: report blocked files separately
4. Ask user for guidance on blocked files

### If findings contradict each other

1. Re-examine both findings with full context
2. Check codebase conventions (is there a pattern?)
3. If still contradictory: mark both as "Needs Investigation" with reasoning
4. Escalate to user with both perspectives

### If scope is unclear

1. Ask user to clarify scope before starting
2. Default to: all files in the most recent git diff
3. Never guess at scope — always confirm

### If quality gate fails after 2 passes

1. List all unresolved findings
2. Explain why they couldn't be resolved
3. Ask user: "Should I escalate these or adjust the review scope?"
```

### Task 8: Preserve All Existing Content

**Files:** `.agents/skills/engineering-critique/SKILL.md`

The existing 6 review categories (Correctness, Financial Integrity, Security, Performance, Architecture, Agent Integrity) are excellent. Keep ALL of them. The upgrade is about HOW the review is executed (loop, queue, verification), not WHAT is checked.

Preserve:

- ✅ All detection patterns (grep patterns, code examples)
- ✅ All stack-specific checks (Next.js 15, Drizzle, tRPC, LangGraph)
- ✅ All severity classification tables
- ✅ All output format templates
- ✅ CI/CD gate integration
- ✅ Escalation matrix
- ✅ Review checklist

### Task 9: Verification

After rewriting the skill:

1. **Read the new SKILL.md** — verify it's complete
2. **Test the skill** — fire it on a real diff (e.g., the last commit)
3. **Verify it loops** — check that it processes ALL files, not just a few
4. **Verify it reports progress** — check progress updates appear
5. **Verify quality gate** — check it doesn't declare PASS prematurely
6. **Verify findings are detailed** — each has file, line, code, problem, fix

---

## Expected Outcome

Before: "I reviewed the PR" (did 3 out of 12 files)
After: "Reviewed all 12 files. 2 Critical, 3 High, 5 Medium findings. Quality gate: PASS (95/100). Here's the full report with every finding verified."

---

## Template for Other Skills

This pattern (Work Queue → Loop → Verify → Quality Gate → Report) will be applied to all other skills. engineering-critique is the template.
