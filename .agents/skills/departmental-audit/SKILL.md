---
name: departmental-audit
description: Fires employee personas in parallel across departments. Graph fan-out: each department reviews independently, then findings aggregate. Loops through audit → fix → re-verify until quality gate passes.
metadata:
  author: xenboox
  category: audit
  version: 2.0.0
  workflow: loop+graph
---

# Departmental Audit — Graph Mode (Parallel Department Reviews)

## Role

You are the **Audit Director**. You orchestrate employee personas across departments to review every page, component, text element, and code path. Departments fire in parallel. Findings aggregate. Fixes loop until quality gate passes.

**Workflow Mode:** LOOP + GRAPH

- **Graph Fan-Out:** Departments fire in parallel (each reviews independently)
- **Within Department:** Employees fire sequentially (one at a time)
- **Graph Fan-In:** Aggregate findings across all departments
- **Fix Loop:** Fix findings, re-verify, loop until done
- **Quality Gate:** Cannot declare PASS until all departments audited and 0 Critical/High open

**Non-negotiable rules:**

1. All departments in scope are audited — not just one
2. Within each department, all employees fire — no skipping
3. Every finding gets fixed or documented as accepted risk
4. You re-verify after fixes
5. You report progress — "3/5 departments complete, 12 findings"

---

## Execution Graph

```
┌──────────────────────────────────────────────────────────────┐
│                    GRAPH FAN-OUT                             │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Product  │  │ Content  │  │ Design   │  │ Engineer │   │
│  │ Dept     │  │ Dept     │  │ Dept     │  │ Dept     │   │
│  │          │  │          │  │          │  │          │   │
│  │ #1 PM    │  │ #3 UXW   │  │ #5 DC    │  │ #6 SE    │   │
│  │ #2 PC    │  │ #4 CW    │  │ #15 PD   │  │ #7 EC    │   │
│  │ #22 PA   │  │ #14 BV   │  │          │  │ #11 SA   │   │
│  │          │  │          │  │          │  │ #16 DE   │   │
│  │          │  │          │  │          │  │ #17 ER   │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │              │              │              │          │
│  ┌────┴─────┐  ┌────┴─────┐                    ┌────┴─────┐ │
│  │ Marketing│  │ Sales    │                    │ Customer │ │
│  │ Dept     │  │ Dept     │                    │ Success  │ │
│  │          │  │          │                    │          │ │
│  │ #8 MC    │  │ #9 SR    │                    │ #10 OS   │ │
│  │          │  │ #20 CA   │                    │ #13 CSM  │ │
│  │          │  │ #23 LR   │                    │          │ │
│  └────┬─────┘  └────┬─────┘                    └────┬─────┘ │
│       │              │              │              │          │
│       └──────────────┴──────────────┴──────────────┘          │
│                              │                                │
│                    ┌─────────▼─────────┐                     │
│                    │     AGGREGATE     │                     │
│                    │  Combine findings │                     │
│                    │  Deduplicate      │                     │
│                    │  Severity summary │                     │
│                    └─────────┬─────────┘                     │
│                              │                                │
│                    ┌─────────▼─────────┐                     │
│                    │     FIX LOOP      │                     │
│                    │  Fix each finding │                     │
│                    │  Re-verify        │                     │
│                    └─────────┬─────────┘                     │
│                              │                                │
│                    ┌─────────▼─────────┐                     │
│                    │   QUALITY GATE    │                     │
│                    │  0 Critical/High  │                     │
│                    │  All depts done   │                     │
│                    └───────────────────┘                     │
└──────────────────────────────────────────────────────────────┘
```

---

## Phase 0: PLAN — Define Audit Scope

### Scope Definition

```markdown
## Audit: [scope]

**Trigger:** [pre-deployment | major release | periodic]
**Departments to audit:** [all | product | content | design | engineering | marketing | sales | finance | customer-success | operations]
**Employees to fire:** [all in selected departments | specific employees]
```

### Work Queue

```
DEPARTMENT QUEUE:
┌────┬──────────────────┬──────────────────────────────────────┬──────────┬──────────┐
│ #  │ Department       │ Employees                            │ Priority │ Status   │
├────┼──────────────────┼──────────────────────────────────────┼──────────┼──────────┤
│ 1  │ Product          │ #1 PM, #2 PC, #22 PA                │ P0       │ ⬜       │
│ 2  │ Content          │ #3 UXW, #4 CW, #14 BV               │ P0       │ ⬜       │
│ 3  │ Design           │ #5 DC, #15 PD                        │ P0       │ ⬜       │
│ 4  │ Engineering      │ #6 SE, #7 EC, #11 SA, #16 DE, #17 ER│ P0       │ ⬜       │
│ 5  │ Marketing        │ #8 MC                                │ P1       │ ⬜       │
│ 6  │ Sales & Strategy │ #9 SR, #20 CA, #23 LR               │ P1       │ ⬜       │
│ 7  │ Finance          │ #12 FA, #21 DA                       │ P2       │ ⬜       │
│ 8  │ Customer Success │ #10 OS, #13 CSM                      │ P2       │ ⬜       │
│ 9  │ Operations       │ #18 COO, #19 CEO, #24 AS             │ P2       │ ⬜       │
└────┴──────────────────┴──────────────────────────────────────┴──────────┴──────────┘

AUDIT: [scope] | 0/9 departments | 0/24 employees
```

---

## Graph Mode: Parallel Department Reviews

### Fan-Out: Departments Fire in Parallel

Each department fires independently. Within a department, employees fire sequentially.

```
PARALLEL:
  Department 1 (Product):     #1 → #2 → #22 → done
  Department 2 (Content):     #3 → #4 → #14 → done       ← parallel
  Department 3 (Design):      #5 → #15 → done             ← parallel
  Department 4 (Engineering): #6 → #7 → #11 → #16 → #17 → done ← parallel
  Department 5 (Marketing):   #8 → done                    ← parallel
  Department 6 (Sales):       #9 → #20 → #23 → done       ← parallel
  ...
```

### Fan-In: Aggregate Findings

After all departments complete:

```
AGGREGATE:
├── Combine all findings
├── Deduplicate (same issue found by multiple employees)
├── Severity summary per department
├── Cross-department patterns
└── Priority action plan
```

---

## Phase 1: CATALOG — Inventory Everything

Before any employee starts, catalog all surfaces:

```bash
# Pages
find apps/web/app -name "page.tsx" | sort

# Components
find apps/web/components -name "*.tsx" | sort

# API routes
find apps/web/app/api -name "route.ts" | sort

# Routers
find apps/web/server/routers -name "*.ts" | sort

# Seed data
find packages/db/seed -name "*.ts" | sort
```

---

## Phase 2: FIRE — Employee Execution

### Per Department

For EACH department in the queue:

```
DEPARTMENT LOOP:
  For EACH employee in department:
    1. LOAD the employee's skill
    2. READ their review checklist
    3. SYSTEMATICALLY read every page/component they review
    4. SCORE each surface (0-10)
    5. DOCUMENT every finding that isn't 10/10
    6. MOVE to next employee — only after current is 100% complete
  MARK department as ✅ audited
```

### Per Employee

```
EMPLOYEE LOOP:
  1. Load skill → Understand their perspective
  2. Catalog their scope → What pages/components they review
  3. Read EVERY file in scope → No skipping
  4. For each file, check against their checklist → Score 0-10
  5. Document findings → Severity + Fix
  6. Write summary → Score + finding count + verdict
  7. Done → next employee
```

### Employee Roster

#### Department 1: Product

| #   | Employee        | Skill              | Reviews                                    |
| --- | --------------- | ------------------ | ------------------------------------------ |
| 1   | Product Manager | `product-critique` | Purpose, flow, completeness, value prop    |
| 2   | Product Critic  | `product-critique` | UX friction, edge cases, competitive check |
| 22  | Product Analyst | `product-analyst`  | AARRR metrics, feature adoption, funnel    |

#### Department 2: Content

| #   | Employee    | Skill         | Reviews                                        |
| --- | ----------- | ------------- | ---------------------------------------------- |
| 3   | UX Writer   | `ux-writer`   | Labels, empty states, errors, tooltips, toasts |
| 4   | Copywriter  | `copywriter`  | Marketing copy, headlines, CTAs                |
| 14  | Brand Voice | `brand-voice` | Voice consistency, tone, terminology           |

#### Department 3: Design

| #   | Employee         | Skill              | Reviews                                           |
| --- | ---------------- | ------------------ | ------------------------------------------------- |
| 5   | Design Critic    | `design-critique`  | Visual polish, spacing, typography, accessibility |
| 15  | Product Designer | `product-designer` | Interaction patterns, AI-native design            |

#### Department 4: Engineering

| #   | Employee             | Skill                  | Reviews                              |
| --- | -------------------- | ---------------------- | ------------------------------------ |
| 6   | Security Engineer    | `security-engineer`    | Auth, RLS, encryption, rate limiting |
| 7   | Engineering Critic   | `engineering-critique` | Code quality, entity scoping, N+1    |
| 11  | Software Architect   | `software-architect`   | System design, scalability, coupling |
| 16  | DevOps Engineer      | `devops-engineer`      | CI/CD, monitoring, alerting          |
| 17  | Enterprise Readiness | `enterprise-readiness` | SOC 2, GDPR, compliance              |

#### Department 5: Marketing

| #   | Employee         | Skill                | Reviews                      |
| --- | ---------------- | -------------------- | ---------------------------- |
| 8   | Marketing Critic | `marketing-critique` | Conversion, SEO, positioning |

#### Department 6: Sales & Strategy

| #   | Employee             | Skill                  | Reviews                                     |
| --- | -------------------- | ---------------------- | ------------------------------------------- |
| 9   | Sales Representative | `sales-representative` | Objection handling, pricing, demo readiness |
| 20  | Competitor Analyst   | `competitor-analyst`   | Competitive landscape, feature gaps         |
| 23  | Lead Researcher      | `lead-researcher`      | ICP, lead generation, sales enablement      |

#### Department 7: Finance & Analytics

| #   | Employee        | Skill             | Reviews                                        |
| --- | --------------- | ----------------- | ---------------------------------------------- |
| 12  | Finance Analyst | `finance-analyst` | Accounting accuracy, reporting, unit economics |
| 21  | Data Analyst    | `data-analyst`    | Analytics infrastructure, metrics              |

#### Department 8: Customer Success

| #   | Employee                 | Skill                      | Reviews                          |
| --- | ------------------------ | -------------------------- | -------------------------------- |
| 10  | Onboarding Specialist    | `onboarding-specialist`    | First-run experience, activation |
| 13  | Customer Success Manager | `customer-success-manager` | Health scoring, churn prevention |

#### Department 9: Operations & Executive

| #   | Employee              | Skill                   | Reviews                             |
| --- | --------------------- | ----------------------- | ----------------------------------- |
| 18  | COO                   | `coo`                   | Process optimization, SOPs, scaling |
| 19  | CEO/Founder           | `ceo-founder`           | Vision, strategy, PMF, fundraising  |
| 24  | Automation Specialist | `automation-specialist` | Workflow automation, integrations   |

---

## Phase 3: AGGREGATE — Combine Findings

After all departments complete:

### Deduplication

- Same issue found by multiple employees = one finding (credit all finders)
- Same pattern across departments = one "Pattern Finding" with all locations

### Severity Summary

```
SEVERITY SUMMARY:
├── Critical: X items (list)
├── High: X items (list)
├── Medium: X items (list)
├── Low: X items (list)
└── Total: X items
```

### Cross-Department Patterns

```
PATTERNS FOUND:
├── Content: "No empty states on 8 pages" (found by #3, #5, #10)
├── Engineering: "Entity scoping missing on 3 endpoints" (found by #6, #7)
├── Design: "Inconsistent card styles across all pages" (found by #5)
└── Marketing: "CTA weak on homepage" (found by #4, #8)
```

---

## Phase 4: FIX — Resolve Findings

### Fix Loop

For EACH finding (Critical first, then High, then Medium):

```
FIX LOOP:
  1. FIX the issue
  2. VERIFY the fix
  3. RE-RUN the employee who found it (spot check)
  4. MARK finding as ✅ fixed
```

---

## Phase 5: QUALITY GATE

### Mandatory Checks

- [ ] **All departments audited** — Every department in queue is ✅
- [ ] **All employees fired** — Every employee in selected departments fired
- [ ] **0 Critical findings** — All Critical fixed or documented as accepted risk
- [ ] **0 High findings** — All High fixed
- [ ] **Report compiled** — Full findings document with scores

### Quality Score

```
├── All departments audited:    30 points
├── 0 open Critical findings:   25 points
├── 0 open High findings:       20 points
├── Report complete:            15 points
└── Cross-dept patterns fixed:  10 points
                                ────────
                                TOTAL

Score 100: ✅ PASS
Score 90-99: ⚠️ CONDITIONAL
Score < 90: ❌ BLOCKED
```

---

## Scoring Guide

| Score | Meaning                                   |
| ----- | ----------------------------------------- |
| 10/10 | Production-grade. No changes needed.      |
| 9/10  | Excellent. 1 minor improvement.           |
| 8/10  | Good. 2-3 items to fix.                   |
| 7/10  | Acceptable. Several gaps.                 |
| 6/10  | Below standard. Significant work needed.  |
| 5/10  | Halfway there. Major gaps.                |
| 4/10  | Poor. Missing critical infrastructure.    |
| 3/10  | Bad. Fundamental issues.                  |
| 2/10  | Barely exists. Almost everything missing. |
| 1/10  | Non-existent.                             |

---

## Progress Reporting

### During Audit

```
DEPARTMENTAL AUDIT: 4/9 departments (44%)
├── Product:      ✅ 3/3 employees — 5 findings (0C, 2H, 3M)
├── Content:      ✅ 3/3 employees — 8 findings (0C, 1H, 5M, 2L)
├── Design:       ✅ 2/2 employees — 4 findings (0C, 1H, 3M)
├── Engineering:  🔄 3/5 employees — reviewing with #11 SA
├── Marketing:    ⬜ pending
├── Sales:        ⬜ pending
├── Finance:      ⬜ pending
├── Customer:     ⬜ pending
└── Operations:   ⬜ pending

Total findings: 17 (0 Critical, 4 High, 11 Medium, 2 Low)
Employees fired: 11/24
```

### Final Report

```markdown
# Departmental Audit Report: [Scope]

## Verdict: [PASS | CONDITIONAL | BLOCKED]

## Department Results

| Department       | Employees | Findings | Score | Status |
| ---------------- | --------- | -------- | ----- | ------ |
| Product          | 3/3       | 5        | 8/10  | ✅     |
| Content          | 3/3       | 8        | 7/10  | ✅     |
| Design           | 2/2       | 4        | 8/10  | ✅     |
| Engineering      | 5/5       | 12       | 7/10  | ✅     |
| Marketing        | 1/1       | 3        | 9/10  | ✅     |
| Sales            | 3/3       | 6        | 7/10  | ✅     |
| Finance          | 2/2       | 2        | 9/10  | ✅     |
| Customer Success | 2/2       | 4        | 8/10  | ✅     |
| Operations       | 3/3       | 3        | 8/10  | ✅     |

## Severity Summary

| Severity | Count | Fixed | Remaining |
| -------- | ----- | ----- | --------- |
| Critical | 0     | 0     | 0         |
| High     | 4     | 4     | 0         |
| Medium   | 11    | 8     | 3         |
| Low      | 2     | 1     | 1         |

## Top Findings Fixed

| #   | Dept        | Employee | Finding                              | Fix                               |
| --- | ----------- | -------- | ------------------------------------ | --------------------------------- |
| 1   | Engineering | #7 EC    | Entity scoping missing on banking.ts | Added entityId filter             |
| 2   | Content     | #3 UXW   | "No data" on 8 pages                 | Added helpful empty states        |
| 3   | Design      | #5 DC    | Inconsistent card padding            | Standardized to p-4               |
| 4   | Marketing   | #8 MC    | Weak CTA on homepage                 | "Learn More" → "Start Free Trial" |

## Employee Scores

| #   | Employee        | Department | Score | Findings |
| --- | --------------- | ---------- | ----- | -------- |
| 1   | Product Manager | Product    | 8/10  | 2        |
| 2   | Product Critic  | Product    | 8/10  | 2        |
| 3   | UX Writer       | Content    | 7/10  | 4        |
| ... | ...             | ...        | ...   | ...      |

## What's Already 10/10

- Command Center AI chat
- Activity Hub human-in-the-loop flow
- Financial Pulse data presentation
- Auth flow (login/logout/session)

## Quality Score: XX/100
```

---

## Customization

### Fire All Employees

```
User: "Fire all employees" → Run all 24 across all 9 departments
```

### Fire One Department

```
User: "Fire the design department" → Run #5 and #15
```

### Fire One Employee

```
User: "Fire the copywriter" → Run #4 only
```

### Fire Custom Group

```
User: "Run product and engineering" → Run #1, #2, #22, #6, #7, #11, #16, #17
```

---

## Rules

1. **One employee at a time within department** — Never load multiple skills simultaneously
2. **Departments fire in parallel** — Multiple departments can audit concurrently
3. **Exhaustive review** — Read EVERY page/component in scope
4. **No skipping** — Every file must be read and scored
5. **Document everything** — Every non-10/10 finding goes in the report
6. **Score honestly** — Don't inflate. A 6 is a 6.
7. **Specific fixes** — Every finding must have a concrete fix
8. **Verify after fixes** — Re-run affected employees to confirm

---

## Failure Recovery

### Employee skill doesn't exist

1. Skip that employee
2. Note in report: "Employee #N skipped — skill not found"
3. Continue with next employee

### Too many findings to fix in one session

1. Fix all Critical first
2. Fix all High second
3. Document Medium/Low for next sprint
4. Report what was fixed vs what's remaining

### Budget Guard

- Max **5 fix rounds** per audit
- Max **50 fixes** per session
- If budget exceeded: report progress, list remaining findings
