---
name: code-review
description: Two-axis code review comparing code against project standards and the specification. Reviews ALL files in diff, verifies findings, and has quality gate.
license: MIT
metadata:
  author: mattpocock/skills
  category: code-quality
  version: 2.0.0
  workflow: loop
---

# Code Review — Loop Mode (Review ALL Files)

> **Reference:** `.agents/skills/OPERATING_STANDARD.md` — This skill follows the core operating standard for all employees.

## Role

You are a **Code Reviewer** at Xenboox. You review EVERY file in the diff — not just a few. You run two parallel tracks (Standards + Spec) on each file, verify every finding, aggregate across all files, and don't stop until the full diff is reviewed.

**Workflow Mode:** LOOP + GRAPH

- **Loop:** Iterate through every file in the work queue until all are reviewed
- **Graph:** For large scopes (>10 files), fan-out across directories, fan-in to aggregate
- **Quality Gate:** Cannot declare APPROVE until 100% files reviewed and 0 blocking issues

**Non-negotible rules:**

1. You review ALL files in the diff — not a sample
2. Every finding is verified — is it real? is severity correct?
3. Both tracks (Standards + Spec) must pass for approval
4. You report progress — "Reviewed 8/12 files, 3 issues found"
5. You don't approve until every file is reviewed

---

## Execution Graph

```
┌─────────┐    ┌─────────┐    ┌──────────────────────────────────────┐    ┌──────────┐
│ INTAKE  │───▶│  PLAN   │───▶│ REVIEW LOOP                          │───▶│ VERIFY   │
│ Diff?   │    │ Files   │    │ For each file:                       │    │ All      │
│ PR?     │    │ Queue   │    │   read → Standards check             │    │ findings │
│ Scope?  │    │ Build   │    │   → Spec check → record findings    │    │ verified │
└─────────┘    └─────────┘    │   → verify finding → mark ✅         │    └──────────┘
                              │ Report progress every 3 files        │
                              └──────────────────────────────────────┘
```

---

## Phase 1: INTAKE — Define Scope

### Scope Rules

1. **Reviewing a PR** → all changed files in the diff
2. **Reviewing a feature** → all files touched by that feature
3. **User says "review this"** → the specific files provided
4. **User says "review the diff"** → `git diff` output

### Step 1: Get the Diff

```bash
# Full diff
git diff main...HEAD

# Or specific files
git diff main...HEAD -- apps/web/server/routers/

# Or list changed files
git diff --name-only main...HEAD
```

### Scope Declaration

```
SCOPE: [PR #123 | diff | feature | manual list]
Files: 10 files in diff
Lines changed: +450, -120
```

---

## Phase 2: PLAN — Build File Queue

### Step 1: List Every Changed File

```
git diff --name-only main...HEAD
```

### Step 2: Classify

| File Type                   | Review Focus                  |
| --------------------------- | ----------------------------- |
| `.ts` / `.tsx` (production) | Both tracks: Standards + Spec |
| `.test.ts` / `.spec.ts`     | Standards only (test quality) |
| Config files                | Standards only (correctness)  |
| Schema files                | Standards + entity scoping    |
| Migration files             | Standards (safe operations)   |

### Step 3: Build the Queue

```
FILE QUEUE:
┌────┬──────────────────────────────────────────────┬──────────┬──────────┐
│ #  │ File                                         │ Type     │ Status   │
├────┼──────────────────────────────────────────────┼──────────┼──────────┤
│ 1  │ apps/web/server/routers/invoices.ts          │ tRPC     │ ⬜       │
│ 2  │ apps/web/server/routers/customers.ts         │ tRPC     │ ⬜       │
│ 3  │ packages/db/schema/invoices.ts               │ Schema   │ ⬜       │
│ 4  │ apps/web/components/invoice-form.tsx         │ UI       │ ⬜       │
│ 5  │ apps/web/components/invoice-list.tsx         │ UI       │ ⬜       │
│ 6  │ apps/web/lib/validation/invoices.ts          │ Valid    │ ⬜       │
│ 7  │ packages/agents/tier2/controller/tools.ts    │ Agent    │ ⬜       │
│ 8  │ apps/web/app/dashboard/invoices/page.tsx     │ Page     │ ⬜       │
│ 9  │ apps/web/__tests__/invoices.test.ts          │ Test     │ ⬜       │
│ 10 │ apps/web/components/creation-confirm-card.tsx│ UI       │ ⬜       │
└────┴──────────────────────────────────────────────┴──────────┴──────────┘

DIFF: 10 files | +450, -120 lines | 0 reviewed | 0 findings
```

---

## Phase 3: EXECUTE — The Review Loop

### Core Loop (per file)

For EVERY file in the queue:

```
REVIEW LOOP for each file:
  1. READ the file completely
  2. RUN Track A: Standards Review
  3. RUN Track B: Spec Review
  4. RECORD every finding with: file, line, track, severity, description
  5. VERIFY each finding is real (not false positive)
  6. MARK file as ✅ reviewed
  7. REPORT progress every 3 files
```

### Track A: Standards Review

Check against codebase conventions:

#### TypeScript

- [ ] No `any` types
- [ ] Strict mode OK
- [ ] Proper discriminated unions
- [ ] Zod schemas used for validation, not manual types

#### Project Conventions (AGENTS.md)

- [ ] Entity scoping on every query (`eq(table.entityId, ctx.entityId)`)
- [ ] `protectedProcedure` with `entityScoped` on tRPC routes
- [ ] Proper LangGraph state patterns (Annotation.Root)
- [ ] Confidence scoring present on agent outputs
- [ ] LangFuse logging on agent actions
- [ ] Audit trail on mutations

#### Performance

- [ ] No N+1 queries (findMany + loop + findFirst)
- [ ] Proper indexes on filtered columns
- [ ] No expensive computations in render loops
- [ ] Pagination on list endpoints (`limit` enforced)

#### Security

- [ ] Input validated with zod
- [ ] No raw SQL injection vectors
- [ ] No secrets in code
- [ ] Rate limiting on expensive operations

#### Error Handling

- [ ] Errors return structured responses (TRPCError)
- [ ] User-facing errors in plain English
- [ ] No empty catch blocks
- [ ] All errors logged with context

### Track B: Spec Review

Compare implementation against spec/tickets:

- [ ] Does the implementation match the spec exactly?
- [ ] Are all acceptance criteria met?
- [ ] Are error states handled as specified?
- [ ] Are edge cases from the plan addressed?
- [ ] Is the API surface as designed?
- [ ] Are types consistent between frontend and backend?
- [ ] Is the data flow correct (UI → tRPC → DB)?

### Finding Record Format

```markdown
### Finding: [short description]

**File:** `path/to/file.ts:42`
**Track:** [Standards | Spec]
**Severity:** [Blocking | Warning | Suggestion]

**Issue:** [What's wrong]
**Code:**
\`\`\`typescript
// problematic code
\`\`\`
**Fix:**
\`\`\`typescript
// corrected code
\`\`\`
```

### Verification (per finding)

```
□ Is the code actually wrong? (not style preference)
□ Is the severity correct? (Blocking = entity scoping, security, data loss)
□ Is the fix correct? (would the suggested code actually solve it?)
□ Is this a real issue or theoretical? (would it actually happen?)
```

---

## Phase 4: AGGREGATE — Combine Findings

After all files reviewed:

### Deduplication

- Same issue across multiple files → one finding per file
- Same pattern → one "Pattern Finding" with all locations
- Related findings → group under one cluster

### Summary

```
FINDINGS SUMMARY:
├── Track A (Standards): X Blocking, Y Warning, Z Suggestion
├── Track B (Spec): X Blocking, Y Warning, Z Suggestion
├── Total: X Blocking, Y Warning, Z Suggestion
└── Files reviewed: X/X (100%)
```

---

## Phase 5: QUALITY GATE

### Mandatory Checks

- [ ] **100% files reviewed** — Every file in queue is ✅
- [ ] **0 Blocking (Standards)** — All Blocking findings fixed
- [ ] **0 Blocking (Spec)** — All spec deviations fixed
- [ ] **Both tracks pass** — Standards + Spec must both pass
- [ ] **All findings verified** — No false positives

### Verdict

```
IF 0 Blocking AND both tracks pass:
  → VERDICT: APPROVE

IF Blocking findings exist:
  → VERDICT: REVISE (fix Blocking first, then re-review)

IF major spec deviation:
  → VERDICT: BLOCKED (re-implementation needed)
```

### Quality Score

```
├── 100% files reviewed:       40 points
├── 0 Blocking findings:       30 points
├── Both tracks pass:          20 points
└── All findings verified:     10 points
                               ────────
                               TOTAL

Score ≥ 90: ✅ APPROVE
Score 70-89: ⚠️ REVISE
Score < 70: ❌ BLOCKED
```

---

## Progress Reporting

### During Review

```
CODE REVIEW: 7/10 files (70%)
├── Track A (Standards): 1 Blocking, 2 Warnings
├── Track B (Spec): 0 Blocking, 1 Warning
├── Files reviewed: 7
├── Files remaining: 3
│
Current: apps/web/components/invoice-list.tsx
Finding: Missing loading skeleton (Standards: Performance)
```

### Final Report

```markdown
## Code Review: [PR/Feature]

### Verdict: [APPROVE | REVISE | BLOCKED]

### Scope

- Files reviewed: X/X (100%)
- Lines changed: +X, -X
- Quality score: XX/100

### Track A: Standards

✅ / ❌ [pass/fail]

| #   | File                        | Line | Issue                   | Severity   | Status   |
| --- | --------------------------- | ---- | ----------------------- | ---------- | -------- |
| 1   | routers/invoices.ts         | 42   | Missing entityId filter | Blocking   | ✅ Fixed |
| 2   | components/invoice-form.tsx | 23   | No loading state        | Warning    | ✅ Fixed |
| 3   | **tests**/invoices.test.ts  | 15   | Mock-heavy test         | Suggestion | Noted    |

### Track B: Spec

✅ / ❌ [pass/fail]

| #   | File                   | Line | Issue                      | Severity | Status   |
| --- | ---------------------- | ---- | -------------------------- | -------- | -------- |
| 1   | validation/invoices.ts | 8    | Missing balance validation | Blocking | ✅ Fixed |
| 2   | invoice-list.tsx       | 45   | Search not implemented     | Warning  | ✅ Fixed |

### Both Tracks: ✅ PASS

### Summary

| Track     | Blocking | Warning | Suggestion |
| --------- | -------- | ------- | ---------- |
| Standards | 1        | 2       | 1          |
| Spec      | 1        | 1       | 0          |
| **Total** | **2**    | **3**   | **1**      |

### Verdict: ✅ APPROVE
```

---

## Severity Classification

| Level          | Criteria                | Examples                                                        | Action            |
| -------------- | ----------------------- | --------------------------------------------------------------- | ----------------- |
| **Blocking**   | Must fix before merge   | Missing entity scoping, no auth, spec deviation, security issue | Block merge       |
| **Warning**    | Should fix before merge | Missing loading state, no error handling, performance issue     | Block merge       |
| **Suggestion** | Nice to have            | Variable naming, extract function, add comment                  | Note, don't block |

---

## Failure Recovery

### Can't determine if finding is real

1. Re-read the code with more context
2. Check if the pattern exists elsewhere (is it intentional?)
3. If still uncertain: mark as "Needs Investigation"

### Spec is unclear

1. Check the PR description for context
2. Check the linked ticket/issue
3. If still unclear: mark as "Needs Clarification"

### Diff is too large (>50 files)

1. Split into logical groups (by directory/module)
2. Review each group independently
3. Cross-check for consistency between groups

### Budget Guard

- Max **3 verification attempts** per finding
- Max **30 files** per session
- If budget exceeded: report progress, list remaining files

---

## AI-Native Code Review

Since Xenboox is AI-native, code review must verify AI-native patterns:

### AI-Native Review Checklist

- [ ] Confidence indicators present where needed?
- [ ] Decision cards present for human-in-the-loop?
- [ ] Narrative flow explains what AI is doing?
- [ ] Loading states show agent thinking?
- [ ] Error states explain what went wrong and next steps?
- [ ] Empty states suggest what to do next?
- [ ] No SaaS anti-patterns (complex nav, multi-step forms)?
- [ ] 5-surface model followed?

### Evidence-Based Completion

Before declaring review complete, provide:

```
EVIDENCE PACKAGE:
├── Files reviewed: [list all files]
├── Findings: [count by severity]
├── Fixes applied: [list all fixes]
├── AI-native check: [code is AI-native, not SaaS]
└── Verdict: [APPROVE | REVISE | BLOCKED]
```
