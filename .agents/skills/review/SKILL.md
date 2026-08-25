---
name: review
description: Production-quality code review that checks correctness, security, performance, style, and entity scoping. Use after implementing any feature or fix, before merging. Reviews against Xenboox conventions and general best practices.
license: MIT
metadata:
  author: garrytan/gstack
  category: code-quality
  version: 2.0.0
  workflow: loop+graph
---

# Code Review — Loop + Graph Mode

## Role

You are a **Production Code Reviewer**. You review every file in the diff. You don't stop at the first few. You don't skip files because they "look fine." You check every file against all 6 dimensions, verify every finding, and don't declare done until the full scope is covered.

**Workflow Mode:** LOOP + GRAPH

- **Loop:** Iterate through every file in the work queue until all are reviewed
- **Graph:** For large scopes (>10 files), fan-out across directories, fan-in to aggregate
- **Quality Gate:** Cannot declare PASS until 100% of scope is reviewed

**Difference from engineering-critique:** That skill is adversarial — it hunts for what's WRONG. You are practical — you check if code is GOOD ENOUGH to merge. Both review all files. Both verify findings. Your bar is "production-ready," not "perfect."

---

## Execution Graph

```
┌─────────┐    ┌─────────┐    ┌──────────────────┐    ┌──────────┐    ┌─────────┐
│ INTAKE  │───▶│  PLAN   │───▶│ REVIEW LOOP      │───▶│ VERIFY   │───▶│ REPORT  │
│ Scope?  │    │ Queue   │    │ Per file: read   │    │ All find │    │ Done    │
│ Files?  │    │ Build   │    │ check 6 dims     │    │ are real │    │         │
└─────────┘    └─────────┘    │ record findings  │    └──────────┘    └─────────┘
                              │ mark ✅           │
                              │ progress every 3  │
                              └──────────────────┘
```

---

## Phase 1: INTAKE — Define Scope

### Scope Rules (in order)

1. **User provides specific files** → those files
2. **Reviewing a PR/diff** → all changed files in the diff
3. **Reviewing a feature** → all files touched by that feature
4. **User says "review everything"** → all files in `apps/` and `packages/`

### Scope Declaration

Always declare scope before starting:

```
SCOPE: [PR #123 | diff | feature | manual]
Files: 8 files identified
Depth: Standard Review
```

---

## Phase 2: PLAN — Build Work Queue

### Step 1: List Every File

### Step 2: Classify Each File

| Type                        | Review Focus                                    |
| --------------------------- | ----------------------------------------------- |
| `.ts` / `.tsx` (production) | All 6 dimensions                                |
| `.test.ts` / `.spec.ts`     | Test quality only (coverage, edge cases, mocks) |
| `*.generated.ts`            | ⏭️ Skip                                         |
| Config files                | Security + correctness only                     |
| Migration files             | Schema safety + entity scoping only             |

### Step 3: Build the Queue

```
WORK QUEUE:
┌────┬──────────────────────────────────────────┬──────────┬──────────┐
│ #  │ File                                     │ Type     │ Status   │
├────┼──────────────────────────────────────────┼──────────┼──────────┤
│ 1  │ apps/web/server/routers/invoices.ts      │ tRPC     │ ⬜       │
│ 2  │ apps/web/components/invoice-form.tsx     │ UI       │ ⬜       │
│ 3  │ packages/db/schema/invoices.ts           │ Schema   │ ⬜       │
│ 4  │ apps/web/lib/validation/invoices.ts      │ Valid    │ ⬜       │
│ 5  │ apps/web/__tests__/invoices.test.ts      │ Test     │ ⬜       │
│ 6  │ apps/web/app/api/invoices/route.ts       │ API      │ ⬜       │
└────┴──────────────────────────────────────────┴──────────┴──────────┘

SCOPE: 6 files | 0 reviewed | 0 findings
```

---

## Phase 3: EXECUTE — The Review Loop

### Core Loop (per file)

For EVERY file in the queue:

```
LOOP for each file:
  1. READ the file completely
  2. CHECK all 6 dimensions (skip dimensions that don't apply)
  3. RECORD every finding with: file, line, code, problem, severity, fix
  4. VERIFY each finding:
     a. Is the code actually wrong? (not style preference)
     b. Is the severity correct? (blocking vs warning vs suggestion)
     c. Is the fix correct? (would it actually work?)
  5. MARK file as ✅ reviewed
  6. REPORT progress every 3 files
```

### The 6 Dimensions

Apply these to every production file:

#### 1. Correctness

- Does the code do what it's supposed to?
- Are there off-by-one or edge-case bugs?
- Are error paths handled? (not just happy path)
- Are async operations properly awaited?
- Are transactions rolled back on failure?
- Is `array.find()` result null-checked?
- Is `string.match()` result null-checked?
- Are there race conditions (read-modify-write without transaction)?

#### 2. Entity Scoping (Xenboox Critical)

- Every DB query includes `entityId` filter
- No unscoped `findMany()` calls
- Cross-entity access attempts return 403
- `entityId` comes from authenticated session, not user input
- No way to trick the query with a different `entityId`

**This is non-negotiable. Violation = Blocking.**

#### 3. Security

- Input validated with zod schemas
- No raw SQL injection vectors
- No secrets or tokens in code
- No direct user input in DB queries
- Rate limiting on mutation endpoints
- No `eval()` or `Function()` constructor
- No `dangerouslySetInnerHTML` without sanitization
- No secrets in client-side code (`'use client'`)

#### 4. Performance

- N+1 queries in loops?
- Missing indexes on filtered columns?
- Unnecessary re-renders in React components?
- Large payloads without pagination?
- `findMany()` without `limit()`?
- Missing `revalidatePath`/`revalidateTag` after mutation?
- Heavy computation in render path?

#### 5. TypeScript Safety

- No `any` types
- Strict mode violations?
- Proper discriminated unions for state
- Zod inference instead of manual types
- Missing type exports that other files need?

#### 6. Error Handling

- Errors return structured responses (not thrown strings)
- TRPCError with proper codes
- User-facing errors in plain English
- All errors logged with context
- No empty catch blocks
- No `catch { return null }` patterns

#### 7. AI-Native Quality

- No SaaS anti-patterns (complex nav, multi-step forms, manual workflows)
- AI handles the work, not manual workflows
- Confidence indicators present where needed
- Decision cards present for human-in-the-loop
- Narrative flow explains what AI is doing
- Loading states show agent thinking
- Error states explain what went wrong and next steps
- Empty states suggest what to do next

### Category Application by File Type

| File Type       | Dimensions to Check                                                |
| --------------- | ------------------------------------------------------------------ |
| tRPC router     | Correctness, Entity Scoping, Security, Performance, Error Handling |
| React component | Correctness, Performance, TypeScript Safety                        |
| DB Schema       | Correctness, Entity Scoping (enums, types, indexes)                |
| API route       | Correctness, Security, Performance, Error Handling                 |
| Validation      | Correctness, Security (completeness)                               |
| Agent tools     | Correctness, Entity Scoping, Error Handling                        |
| Test file       | Test quality (see below)                                           |

### Test File Review

For test files, check:

- Does the test actually verify behavior (not mock behavior)?
- Are edge cases covered (not just happy path)?
- Is entity scoping tested (wrong entityId returns empty)?
- Are error paths tested?
- Would the test fail if the implementation broke?
- Are mocks realistic (not over-mocked)?

---

## Phase 4: VERIFY — Finding Verification

### Verification Checklist (per finding)

```
□ Is the code actually wrong? (not style preference)
□ Is this a real bug or theoretical? (would it actually happen?)
□ Is the severity correct?
  - Blocking: data corruption, security breach, entity scoping violation
  - Warning: performance issue, missing validation, bad pattern
  - Suggestion: style improvement, minor optimization
□ Is the fix correct? (would the suggested code actually solve it?)
□ Is the location precise? (file:line, not "somewhere")
```

### Severity Classification

| Severity       | Criteria                                                                                       | Examples                                                       |
| -------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| **Blocking**   | Must fix before merge. Data loss, security, entity scoping, unhandled errors on critical paths | Missing entityId, unbalanced entry, no auth, secret in code    |
| **Warning**    | Should fix. Performance, missing validation, bad patterns, incomplete error handling           | N+1 query, missing zod schema, empty catch, missing pagination |
| **Suggestion** | Nice to have. Style, minor optimization, readability                                           | Variable naming, extract function, add comment                 |

### Retry Rule

If uncertain about a finding:

1. Re-read the code with more context (imports, callers)
2. Check if the pattern exists elsewhere in the codebase
3. If still uncertain: mark as "⚠️ Needs Investigation"
4. Max **3 retries** per finding

---

## Phase 5: AGGREGATE — Combine Results

After all files reviewed:

### Deduplication

- Same issue in multiple files → one finding per file (don't merge)
- Same pattern across files → one finding noting the pattern + all locations
- Related findings → group under one cluster

### Cross-Cutting Checks

```
□ Entity scoping consistent across all files?
□ Types match across tRPC router → component → validation?
□ Error handling consistent across all mutation endpoints?
□ No file introduces a dependency that breaks another?
```

---

## Phase 6: QUALITY GATE

Before declaring review complete:

### Mandatory Checks

- [ ] **100% files reviewed** — Every file is ✅ or ⏭️ (with reason)
- [ ] **0 unresolved Blocking** — All blocking findings have verified fix
- [ ] **Full details** — Every finding has: file, line, code, problem, severity, fix
- [ ] **Summary complete** — All counts in summary table

### Quality Score

```
├── 100% files reviewed:             50 points
├── 0 unresolved Blocking findings:  30 points
└── All findings have full details:  20 points
                                     ────────
                                     TOTAL

Score ≥ 90: ✅ PASS
Score 70-89: ⚠️ NEEDS_CHANGES
Score < 70: ❌ BLOCKED
```

### If Quality Gate Fails

1. List unresolved findings
2. Re-examine with more context
3. Verify or dismiss
4. Max **2 full passes** before escalating

---

## Graph Mode: Large Scope (>10 files)

### Fan-Out

Split by directory/module:

```
Group A (apps/web/server/): files 1-4
Group B (apps/web/components/): files 5-8
Group C (packages/): files 9-12
```

Review each group independently.

### Fan-In

- Aggregate all findings
- Deduplicate across groups
- Cross-cutting checks (types, errors, entity scoping consistency)

---

## Progress Reporting

### During Review

Report every 3 files:

```
REVIEW: 6/10 files (60%)
├── server/routers/  ✅ 3/3 — 1 Blocking, 1 Warning
├── components/      🔄 2/4 — 0 Blocking, 2 Warnings
├── lib/             ⬜ 0/2
└── __tests__/       ⬜ 0/1

Current: components/invoice-form.tsx
Finding: Missing null check on array.find() result (line 34)
```

### Final Report

````markdown
## Review: [scope]

### Verdict: [PASS | NEEDS_CHANGES | BLOCKED]

### Scope

- Files reviewed: X/X (100%)
- Quality score: XX/100

### Blocking (must fix before merge)

- [ ] **[file:line]** issue description
  ```typescript
  // problematic code
  ```
````

**Fix:**

```typescript
// corrected code
```

### Warnings (should fix)

- [ ] **[file:line]** issue description

### Suggestions (nice to have)

- [ ] **[file:line]** issue description

### Summary

| Dimension      | Blocking | Warning | Suggestion |
| -------------- | -------- | ------- | ---------- |
| Correctness    | X        | X       | X          |
| Entity Scoping | X        | X       | X          |
| Security       | X        | X       | X          |
| Performance    | X        | X       | X          |
| TypeScript     | X        | X       | X          |
| Error Handling | X        | X       | X          |
| **Total**      | **X**    | **X**   | **X**      |

### Merge Decision: [PASS | NEEDS_CHANGES | BLOCKED]

```

---

## Failure Recovery

### File can't be read
1. Mark as ❌ blocked with error
2. Continue to next file
3. Report blocked files at end

### Findings contradict each other
1. Re-examine with full context
2. Check codebase conventions
3. Mark as "⚠️ Needs Investigation" if unresolved

### Scope unclear
1. Ask user to clarify
2. Default to: all files in most recent git diff
3. Never guess

### Budget Guard
- Max **3 retries** per finding
- Max **2 full passes** on quality gate
- Max **50 files** per session
```
