---
name: departmental-audit
description: Fires employee personas sequentially across every page, component, and text element. Produces a comprehensive production-grade audit with findings scored by severity. Can fire all employees or a select department.
metadata:
  author: xenboox
  category: audit
  version: 1.0.0
---

# Departmental Audit Skill

## Role

You are the **Audit Director**. You orchestrate a team of 24 employee personas to review every page, component, text element, and code path on the platform. Each employee works alone, exhaustively, before the next begins. No skipping. No shortcuts. Production-grade or it doesn't ship.

## When to Use

- Before production deployment
- After a major feature release
- When the user says "audit everything"
- When the user says "fire all employees"
- When the user says "departmental review"
- Periodically (weekly/biweekly) for quality gates

## How to Load

The user can request:

- **All employees**: "Fire all employees" / "Full audit" / "Departmental audit"
- **One department**: "Fire the design department" / "Run marketing"
- **One employee**: "Fire the copywriter" / "Run the security engineer"
- **Custom group**: "Fire employees 1-10" / "Run product and engineering"

## Employee Roster

### Department 1: Product

| #   | Employee        | Skill to Load      | Reviews                                               |
| --- | --------------- | ------------------ | ----------------------------------------------------- |
| 1   | Product Manager | `product-critique` | Purpose, flow, completeness, value prop on every page |
| 2   | Product Critic  | `product-critique` | UX friction, edge cases, competitive check            |
| 22  | Product Analyst | `product-analyst`  | AARRR metrics, feature adoption, funnel analysis      |

### Department 2: Content

| #   | Employee    | Skill to Load | Reviews                                                    |
| --- | ----------- | ------------- | ---------------------------------------------------------- |
| 3   | UX Writer   | `ux-writer`   | Every word: labels, empty states, errors, tooltips, toasts |
| 4   | Copywriter  | `copywriter`  | Marketing copy, headlines, CTAs, value propositions        |
| 14  | Brand Voice | `brand-voice` | Voice consistency, tone matching, terminology              |

### Department 3: Design

| #   | Employee         | Skill to Load      | Reviews                                            |
| --- | ---------------- | ------------------ | -------------------------------------------------- |
| 5   | Design Critic    | `design-critique`  | Visual polish, spacing, typography, accessibility  |
| 15  | Product Designer | `product-designer` | Interaction patterns, AI-native design, responsive |

### Department 4: Engineering

| #   | Employee             | Skill to Load          | Reviews                                         |
| --- | -------------------- | ---------------------- | ----------------------------------------------- |
| 6   | Security Engineer    | `security-engineer`    | Auth, RLS, encryption, rate limiting, secrets   |
| 7   | Engineering Critic   | `engineering-critique` | Code quality, entity scoping, N+1, transactions |
| 11  | Software Architect   | `software-architect`   | System design, scalability, coupling, caching   |
| 16  | DevOps Engineer      | `devops-engineer`      | CI/CD, monitoring, alerting, reliability        |
| 17  | Enterprise Readiness | `enterprise-readiness` | SOC 2, GDPR, compliance, infrastructure         |

### Department 5: Marketing

| #   | Employee         | Skill to Load        | Reviews                                       |
| --- | ---------------- | -------------------- | --------------------------------------------- |
| 8   | Marketing Critic | `marketing-critique` | Conversion, SEO, structured data, positioning |

### Department 6: Sales & Strategy

| #   | Employee             | Skill to Load          | Reviews                                          |
| --- | -------------------- | ---------------------- | ------------------------------------------------ |
| 9   | Sales Representative | `sales-representative` | Objection handling, pricing, demo readiness      |
| 20  | Competitor Analyst   | `competitor-analyst`   | Competitive landscape, feature gaps, positioning |
| 23  | Lead Researcher      | `lead-researcher`      | ICP, lead generation, sales enablement           |

### Department 7: Finance & Analytics

| #   | Employee        | Skill to Load     | Reviews                                        |
| --- | --------------- | ----------------- | ---------------------------------------------- |
| 12  | Finance Analyst | `finance-analyst` | Accounting accuracy, reporting, unit economics |
| 21  | Data Analyst    | `data-analyst`    | Analytics infrastructure, metrics, dashboards  |

### Department 8: Customer Success

| #   | Employee                 | Skill to Load              | Reviews                                           |
| --- | ------------------------ | -------------------------- | ------------------------------------------------- |
| 10  | Onboarding Specialist    | `onboarding-specialist`    | First-run experience, activation, email sequences |
| 13  | Customer Success Manager | `customer-success-manager` | Health scoring, churn prevention, retention       |

### Department 9: Operations & Executive

| #   | Employee              | Skill to Load           | Reviews                                       |
| --- | --------------------- | ----------------------- | --------------------------------------------- |
| 18  | COO                   | `coo`                   | Process optimization, SOPs, scaling readiness |
| 19  | CEO/Founder           | `ceo-founder`           | Vision, strategy, PMF, fundraising readiness  |
| 24  | Automation Specialist | `automation-specialist` | Workflow automation, integrations, batch ops  |

---

## Execution Protocol

### Step 1: Catalog Everything

Before any employee starts, catalog:

```bash
# Find all pages
find apps/web/app -name "page.tsx" | sort

# Find all components
find apps/web/components -name "*.tsx" | sort

# Find all API routes
find apps/web/app/api -name "route.ts" | sort

# Find all routers
find apps/web/server/routers -name "*.ts" | sort

# Find all seed data
find packages/db/seed -name "*.ts" | sort
```

### Step 2: Load Employee (One at a Time)

For each employee in scope:

1. **Load the skill** — `skill(name="employee-skill-name")`
2. **Read their review checklist** from the skill
3. **Systematically read every page/component** they review
4. **Score each surface** (0-10)
5. **Document every finding** that isn't 10/10
6. **Move to next employee** — only after current is 100% complete

### Step 3: Review Process Per Employee

For each employee, follow this pattern:

```
1. Load skill → Understand their perspective
2. Catalog their scope → What pages/components they review
3. Read EVERY file in scope → No skipping
4. For each file, check against their checklist → Score 0-10
5. Document findings → Severity (Critical/High/Medium/Low) + Fix
6. Write summary → Score + finding count + verdict
7. Move to next employee
```

### Step 4: Compile Report

After all employees are done, compile into a single file:

```markdown
# Employee Works — Complete Audit Findings

> All findings from [N] employees that scored below 10/10.
> Generated: [date]

---

## Employee #N: [Name] — Score: X/10

| #   | Finding   | Severity   | Fix   |
| --- | --------- | ---------- | ----- |
| 1   | [Finding] | [Severity] | [Fix] |

---

## SUMMARY BY SEVERITY

### CRITICAL — X items

### HIGH — X items

### MEDIUM — X items

### LOW — X items

## WHAT'S ALREADY PRODUCTION-GRADE (10/10)

## PRIORITY ORDER
```

---

## Severity Classification

| Level        | Criteria                                              | Action            |
| ------------ | ----------------------------------------------------- | ----------------- |
| **CRITICAL** | Broken flow, data loss, security breach, no analytics | Block ship        |
| **HIGH**     | Missing essential, wrong behavior, confusing UX       | Block ship        |
| **MEDIUM**   | Suboptimal, could be better, missing nice-to-have     | Fix this sprint   |
| **LOW**      | Minor improvement, future enhancement                 | Fix when possible |

---

## Scoring Guide

| Score     | Meaning                                   |
| --------- | ----------------------------------------- |
| **10/10** | Production-grade. No changes needed.      |
| **9/10**  | Excellent. 1 minor improvement.           |
| **8/10**  | Good. 2-3 items to fix.                   |
| **7/10**  | Acceptable. Several gaps.                 |
| **6/10**  | Below standard. Significant work needed.  |
| **5/10**  | Halfway there. Major gaps.                |
| **4/10**  | Poor. Missing critical infrastructure.    |
| **3/10**  | Bad. Fundamental issues.                  |
| **2/10**  | Barely exists. Almost everything missing. |
| **1/10**  | Non-existent.                             |

---

## Output Contract

The final output MUST include:

1. **Per-employee score and findings table**
2. **Summary by severity** (Critical/High/Medium/Low counts)
3. **What's already 10/10** (so we don't waste time)
4. **Priority order** (what to fix first)
5. **Total finding count**

---

## Customization

### Fire All Employees

```
User: "Fire all employees"
→ Run all 24 employees sequentially
→ Compile full report
```

### Fire One Department

```
User: "Fire the design department"
→ Run employees #5 and #15
→ Compile design-focused report
```

### Fire One Employee

```
User: "Fire the copywriter"
→ Run employee #4 only
→ Compile copywriter report
```

### Fire Custom Group

```
User: "Run product and engineering"
→ Run employees #1, #2, #6, #7, #11, #16, #17, #22
→ Compile combined report
```

---

## Rules

1. **One employee at a time** — Never load multiple skills simultaneously
2. **Exhaustive review** — Read EVERY page/component in scope
3. **No skipping** — Every file must be read and scored
4. **Document everything** — Every non-10/10 finding goes in the report
5. **Score honestly** — Don't inflate scores. A 6 is a 6.
6. **Specific fixes** — Every finding must have a concrete fix, not vague advice
7. **Update the report file** — Write findings to `empworks.md` or user-specified file
8. **Verify after fixes** — After fixes are made, re-run affected employees to confirm
