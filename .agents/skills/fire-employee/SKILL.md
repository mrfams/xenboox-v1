---
name: fire-employee
description: Puts ONE employee to work — reviews their domain, fixes every issue, verifies each fix, loops until production-grade. Not a review skill. A WORK skill. Loop+graph engineering. One employee at a time.
metadata:
  author: xenboox
  category: execution
  version: 1.0.0
  workflow: loop+graph
---

# Fire Employee — Loop + Graph Execution

## Role

You are the **Work Director**. You put ONE employee to work — not to review, not to report, but to FIX. Every issue they find, they fix. Every fix, they verify. They don't stop until their domain is production-grade.

**This is NOT a review skill.** `departmental-audit` finds problems. `fire-employee` FIXES them. The employee does the work — code, copy, design, whatever their profession is. They fix it, verify it, and move on.

**Workflow Mode:** LOOP + GRAPH

- **Loop:** Find issue → Fix → Verify → Next issue → Loop until done
- **Graph:** Fan-out across files in domain → fix each → aggregate results
- **Quality Gate:** Cannot declare PASS until typecheck passes, all fixes verified, 0 regressions

**Non-negotiable rules:**

1. ONE employee at a time — never load two skills simultaneously
2. EVERY issue found gets FIXED — not documented, not ticketed, FIXED
3. Every fix is VERIFIED — typecheck, test, or manual confirmation
4. Fixes are production-grade — not patches, not TODOs, not "good enough"
5. Progress is reported — "Fixed 5/12 issues, verifying..."

---

## Execution Graph

```
┌─────────────┐
│   INTAKE    │  Who is the employee? What's their domain?
└──────┬──────┘
       │
┌──────▼──────┐
│    PLAN     │  Load skill → Build work queue from empworks.md + fresh review
└──────┬──────┘
       │
┌──────▼──────────────────────────────────────────┐
│              FIX LOOP                           │
│                                                 │
│  For EACH issue in work queue:                  │
│  ┌─────────────────────────────────────────┐    │
│  │ 1. UNDERSTAND the issue                 │    │
│  │ 2. READ the affected code               │    │
│  │ 3. IMPLEMENT the fix                    │    │
│  │ 4. VERIFY the fix works                 │    │
│  │    - typecheck passes                   │    │
│  │    - no regressions                     │    │
│  │    - fix actually solves the problem    │    │
│  │ 5. MARK issue as ✅ fixed               │    │
│  │ 6. REPORT progress                      │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  Report every 3 fixes                           │
└──────────────┬──────────────────────────────────┘
               │
       ┌───────▼───────┐
       │ CROSS-CHECK   │  Verify consistency across all fixes
       └───────┬───────┘
               │
       ┌───────▼───────┐
       │ QUALITY GATE  │  typecheck ✓ lint ✓ no regressions ✓
       └───────┬───────┘
               │
       ┌───────▼───────┐
       │  UPDATE LOG   │  Mark findings ✅ in empworks.md
       └───────────────┘
```

---

## Phase 0: INTAKE — Who Is the Employee?

### Required Input

The user MUST provide one of:

- Employee name: "Fire the copywriter" / "Put the security engineer to work"
- Employee number: "Fire employee #7" / "Run #14"
- Skill name: "Fire engineering-critique" / "Run brand-voice"

### Employee Lookup

| #   | Employee              | Skill                      | Department       | Domain                                      |
| --- | --------------------- | -------------------------- | ---------------- | ------------------------------------------- |
| 1   | Product Manager       | `product-critique`         | Product          | Purpose, flow, completeness, value prop     |
| 2   | Product Critic        | `product-critique`         | Product          | UX friction, edge cases, competitive check  |
| 3   | UX Writer             | `ux-writer`                | Content          | Labels, empty states, errors, tooltips      |
| 4   | Copywriter            | `copywriter`               | Content          | Marketing copy, headlines, CTAs             |
| 5   | Design Critic         | `design-critique`          | Design           | Visual polish, spacing, typography          |
| 6   | Security Engineer     | `security-engineer`        | Engineering      | Auth, RLS, encryption, rate limiting        |
| 7   | Engineering Critic    | `engineering-critique`     | Engineering      | Code quality, entity scoping, N+1           |
| 8   | Marketing Critic      | `marketing-critique`       | Marketing        | Conversion, SEO, structured data            |
| 9   | Sales Representative  | `sales-representative`     | Sales            | Objection handling, pricing, demo readiness |
| 10  | Onboarding Specialist | `onboarding-specialist`    | Customer Success | First-run experience, activation            |
| 11  | Software Architect    | `software-architect`       | Engineering      | System design, scalability, coupling        |
| 12  | Finance Analyst       | `finance-analyst`          | Finance          | Accounting accuracy, reporting              |
| 13  | Customer Success Mgr  | `customer-success-manager` | Customer Success | Health scoring, churn prevention            |
| 14  | Brand Voice           | `brand-voice`              | Content          | Voice consistency, tone, terminology        |
| 15  | Product Designer      | `product-designer`         | Design           | Interaction patterns, AI-native design      |
| 16  | DevOps Engineer       | `devops-engineer`          | Engineering      | CI/CD, monitoring, alerting                 |
| 17  | Enterprise Readiness  | `enterprise-readiness`     | Engineering      | SOC 2, GDPR, compliance                     |
| 18  | COO                   | `coo`                      | Operations       | Process optimization, SOPs, scaling         |
| 19  | CEO/Founder           | `ceo-founder`              | Operations       | Vision, strategy, PMF                       |
| 20  | Competitor Analyst    | `competitor-analyst`       | Sales            | Competitive landscape, feature gaps         |
| 21  | Data Analyst          | `data-analyst`             | Finance          | Analytics infrastructure, metrics           |
| 22  | Product Analyst       | `product-analyst`          | Product          | AARRR metrics, feature adoption             |
| 23  | Lead Researcher       | `lead-researcher`          | Sales            | ICP, lead generation, sales enablement      |
| 24  | Automation Specialist | `automation-specialist`    | Operations       | Workflow automation, integrations           |

---

## Phase 1: PLAN — Build Work Queue

### Step 1: Load the Employee's Skill

```
LOAD: skill(name="[employee-skill-name]")
→ Read their review checklist
→ Understand their professional perspective
→ Know what they check and how they score
```

### Step 2: Read Existing Findings from empworks.md

```
READ: empworks.md
→ Find all findings for this employee (Employee #N)
→ Note which are ⬜ (not started) vs ✅ (fixed)
→ Build initial work queue from unfixed findings
```

### Step 3: Fresh Review (Find What empworks.md Missed)

The employee does a fresh review of their domain. empworks.md might have missed issues or new code may have been added since the last audit.

```
FRESH REVIEW:
→ Read EVERY file in the employee's scope
→ Apply their professional checklist
→ Add NEW findings to the work queue
→ Don't duplicate existing empworks.md findings
```

### Step 4: Build the Final Work Queue

```
WORK QUEUE:
┌────┬──────────────────────────────────────┬──────────┬──────────┬──────────┐
│ #  │ Issue                                │ Severity │ Source   │ Status   │
├────┼──────────────────────────────────────┼──────────┼──────────┼──────────┤
│ 1  │ [Issue from empworks.md]             │ HIGH     │ empworks │ ⬜       │
│ 2  │ [Issue from empworks.md]             │ MEDIUM   │ empworks │ ⬜       │
│ 3  │ [New issue from fresh review]        │ HIGH     │ fresh    │ ⬜       │
│ 4  │ [New issue from fresh review]        │ MEDIUM   │ fresh    │ ⬜       │
│ 5  │ [Issue from empworks.md]             │ LOW      │ empworks │ ⬜       │
└────┴──────────────────────────────────────┴──────────┴──────────┴──────────┘

EMPLOYEE: [Name] (#N) | DOMAIN: [scope] | ISSUES: 5 | FIXED: 0
```

---

## Phase 2: FIX — The Core Loop

### Priority Order

Fix in this order — no exceptions:

1. **CRITICAL** first — broken flows, data loss, security breaches
2. **HIGH** second — confusing UX, wrong behavior, missing essentials
3. **MEDIUM** third — suboptimal, could be better
4. **LOW** last — minor improvements

### Per-Issue Fix Loop

For EACH issue in the queue:

```
FIX LOOP:
┌─────────────────────────────────────────────────┐
│ 1. UNDERSTAND                                    │
│    → Read the issue description                  │
│    → Read the affected file(s)                   │
│    → Understand the root cause                   │
│                                                  │
│ 2. PLAN THE FIX                                  │
│    → What exactly needs to change?               │
│    → Which files are affected?                   │
│    → Are there dependencies?                     │
│    → What's the minimal change that fixes it?    │
│                                                  │
│ 3. IMPLEMENT                                     │
│    → Make the code change                        │
│    → Follow project conventions                  │
│    → No TODOs, no "good enough"                  │
│    → Production-grade or don't ship              │
│                                                  │
│ 4. VERIFY                                        │
│    → Run: pnpm typecheck --filter=web            │
│    → Check: does the fix actually solve it?      │
│    → Check: any regressions?                     │
│    → Check: is it production-grade?              │
│                                                  │
│ 5. IF VERIFICATION FAILS                         │
│    → Read the error                              │
│    → Fix the issue                               │
│    → Re-verify                                   │
│    → Max 3 attempts per issue                    │
│                                                  │
│ 6. MARK DONE                                     │
│    → Update empworks.md: ⬜ → ✅                  │
│    → Add fix description to the finding          │
│                                                  │
│ 7. REPORT                                        │
│    → "Fixed 3/5 issues, verifying #4..."         │
└─────────────────────────────────────────────────┘
```

### What "Production-Grade Fix" Means

| Category     | Production-Grade                                   | NOT Production-Grade                      |
| ------------ | -------------------------------------------------- | ----------------------------------------- |
| **Code**     | TypeScript strict, no `any`, proper error handling | `// @ts-ignore`, `any` types, empty catch |
| **Copy**     | Clear, professional, no jargon                     | "TODO: fix this", "lorem ipsum"           |
| **Design**   | Uses design tokens, responsive, accessible         | Hardcoded colors, fixed widths, no aria   |
| **Security** | Entity-scoped, validated, rate-limited             | Missing auth, no input validation         |
| **UX**       | Loading states, error states, empty states         | Blank pages, silent failures              |
| **Testing**  | Typecheck passes, no regressions                   | "It works on my machine"                  |

### Fix Verification Commands

```bash
# Always run after code changes
pnpm typecheck --filter=web

# Run if tests exist for the affected area
pnpm test --filter=web

# Run lint
pnpm lint --filter=web
```

---

## Phase 3: CROSS-CHECK — Verify Consistency

After ALL issues are fixed:

### Consistency Checks

```
CROSS-CHECK:
□ All fixes use the same patterns as the rest of the codebase?
□ No fix introduced a new inconsistency?
□ All design token changes are consistent (not just one file)?
□ All copy changes match the brand voice?
□ All security fixes follow the same validation pattern?
□ Entity scoping is consistent across all fixed files?
```

### Regression Check

```
REGRESSION CHECK:
□ No existing functionality broken by the fixes?
□ No new TypeScript errors introduced?
□ No new lint warnings?
□ No new `any` types added?
□ No console.log statements left in production code?
```

---

## Phase 4: QUALITY GATE

### Mandatory Checks

- [ ] **All issues in queue addressed** — Every item is ✅ fixed or documented as accepted risk
- [ ] **Typecheck passes** — `pnpm typecheck --filter=web` exits 0
- [ ] **No regressions** — Existing functionality not broken
- [ ] **Production-grade** — No TODOs, no `any`, no hardcoded values
- [ ] **empworks.md updated** — All fixed findings marked ✅ with fix description

### Quality Score

```
QUALITY SCORE:
├── All issues fixed:              40 points
├── Typecheck passes:              25 points
├── No regressions:                20 points
├── Production-grade quality:      15 points
                                  ────────
                                  TOTAL

Score ≥ 90: ✅ PASS
Score 70-89: ⚠️ NEEDS_WORK (fix remaining issues)
Score < 70: ❌ FAIL (major issues remain)
```

### If Quality Gate Fails

1. List all unfixed issues
2. Go back to Phase 2: FIX
3. Fix the remaining issues
4. Re-verify
5. Re-check quality gate
6. Max **3 full passes** before escalating to user

---

## Progress Reporting

### During Fix Loop

```
FIRE EMPLOYEE: Security Engineer (#6)
DOMAIN: Auth, RLS, encryption, rate limiting, secrets

FIX PROGRESS: 3/7 issues (43%)
├── ✅ T6-1: Added rate limiting to donor portal endpoint
├── ✅ T6-2: Added entity validation to projects API
├── ✅ T6-3: Removed internalTable from API response
├── 🔄 T6-4: Sanitizing CSV export (verifying...)
├── ⬜ T6-5: Fixing dashboard chat export sanitization
├── ⬜ T6-6: Adding audit log for conversation export
└── ⬜ T6-7: Verifying auth flow completeness

Typecheck: ✅ passing
Regressions: 0
```

### Final Report

```markdown
## Fire Employee: [Employee Name] (#N)

### Verdict: [PASS | NEEDS_WORK | FAIL]

### Employee

- **Name:** [Employee Name]
- **Number:** #N
- **Department:** [Department]
- **Domain:** [What they review]
- **Skill loaded:** [skill-name]

### Issues Fixed

| #   | Issue               | Severity | Fix                | Verified     |
| --- | ------------------- | -------- | ------------------ | ------------ |
| 1   | [Issue description] | HIGH     | [What was changed] | ✅ typecheck |
| 2   | [Issue description] | MEDIUM   | [What was changed] | ✅ typecheck |
| 3   | [Issue description] | LOW      | [What was changed] | ✅ typecheck |

### Issues Remaining

| #   | Issue   | Severity | Reason                                        |
| --- | ------- | -------- | --------------------------------------------- |
| 1   | [Issue] | MEDIUM   | [Why not fixed — needs design decision, etc.] |

### Verification

- [x] Typecheck: `pnpm typecheck --filter=web` — ✅ passed
- [x] No regressions: verified
- [x] Production-grade: all fixes meet standard
- [x] empworks.md: updated with ✅ markers

### Quality Score: XX/100
```

---

## Customization

### Fire One Employee

```
User: "Fire the copywriter"
→ Load copywriter skill
→ Review all marketing copy
→ Fix every issue found
→ Verify and report
```

### Fire by Number

```
User: "Fire employee #7"
→ Load engineering-critique skill
→ Review all engineering surfaces
→ Fix every issue
→ Verify and report
```

### Fire Multiple (Sequential)

```
User: "Fire the copywriter, then the brand voice"
→ Fire copywriter first (complete)
→ Then fire brand-voice (complete)
→ Report combined results
```

### Fire All in Department

```
User: "Fire all engineering employees"
→ Fire #6 (Security Engineer) — complete
→ Fire #7 (Engineering Critic) — complete
→ Fire #11 (Software Architect) — complete
→ Fire #16 (DevOps Engineer) — complete
→ Fire #17 (Enterprise Readiness) — complete
→ Report combined results
```

---

## Rules

1. **ONE employee at a time** — Never load two skills. Complete one before starting the next.
2. **FIX, don't report** — Every finding gets a code/design/copy fix. Not a ticket. Not a note. A fix.
3. **Verify every fix** — Typecheck, test, or manual confirmation. No "I think it works."
4. **Production-grade** — If a senior engineer wouldn't ship it, it's not done.
5. **No partial fixes** — "I started working on it" doesn't count. Either it's fixed or it's not.
6. **Update empworks.md** — Every fixed finding gets marked ✅ with the fix description.
7. **Report progress** — Every 3 fixes, report status. Never go silent.
8. **Respect conventions** — Match the existing codebase style. Don't introduce new patterns.

---

## Failure Recovery

### Can't find the employee's skill

1. Tell the user: "Employee #[N] skill not found: [skill-name]"
2. Ask if they want to proceed with a different employee
3. Don't guess or skip

### Fix breaks something else

1. Revert the fix immediately
2. Re-analyze the issue with full context
3. Find a fix that doesn't break other functionality
4. Max 3 attempts per issue before escalating

### Too many issues to fix in one session

1. Fix all CRITICAL first
2. Fix all HIGH second
3. Report progress: "Fixed X/Y issues. Y remaining."
4. Update empworks.md with what's done vs what's remaining
5. User can re-invoke to continue

### Typecheck fails after fix

1. Read the error message carefully
2. Fix the type error
3. Re-run typecheck
4. If the type error is in a different file than the one you changed, check if your fix changed a shared type
5. Max 3 type-check-fix cycles per issue

### Budget Guard

- Max **3 fix attempts** per issue
- Max **3 full quality gate passes** per session
- Max **30 fixes** per session
- If budget exceeded: report progress, list remaining, ask user to continue in new session

---

## Coordination

- **Works with:** `departmental-audit` (this skill FIXES what that skill FINDS)
- **Works with:** `verify-fix` (this skill's fixes can be verified by verify-fix)
- **Works with:** `engineering-critique`, `design-critique`, `product-critique` (their checklists guide what to fix)
- **Feeds into:** Production deployment (this skill makes code production-ready)
- **Blocks:** Ship of unfixed Critical/High issues

---

## Example Session

```
User: "Fire the copywriter"

DIRECTOR: Loading copywriter skill...
SCOPE: All marketing copy, headlines, CTAs, value propositions
WORK QUEUE: 8 issues found (2 from empworks.md, 6 from fresh review)

FIX PROGRESS: 0/8 issues (0%)

FIX #1: Homepage hero subtitle — "19 AI agents handle..." → "AI agents handle..."
  → Implementation: Updated apps/web/components/marketing/hero-home.tsx
  → Verify: pnpm typecheck --filter=web ✅
  → Mark: empworks.md T4-1 ⬜ → ✅
  → Progress: 1/8 (12%)

FIX #2: Pricing tier description inconsistency — unified to value-first
  → Implementation: Updated apps/web/app/(marketing)/pricing/page.tsx
  → Verify: pnpm typecheck --filter=web ✅
  → Mark: empworks.md T14-1 ⬜ → ✅
  → Progress: 2/8 (25%)

[... continues until all 8 fixed ...]

QUALITY GATE: ✅ PASS (Score: 95/100)
- All 8 issues fixed and verified
- Typecheck passing
- No regressions
- empworks.md updated

VERDICT: ✅ PASS — Copywriter domain is production-grade
```
