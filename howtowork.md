# HOW TO WORK — Loop + Graph Engineering Methodology

> **Read this before every issue. Follow it without exception.**
> **One issue at a time. Every layer. 12 loops. No cruising. No shortcuts.**

---

## The Rule

**One issue. All the way down. Every layer. 12 loops per layer. Enterprise grade. Production grade. No exceptions.**

No issue is left until it is completely, fully, and really production grade and enterprise grade. We do not move to the next issue until the current one is bulletproof across every single layer of the stack.

---

## The Layers

Every issue must be addressed across ALL of these layers. Not surface. Not just UI. Not just backend. Every single one:

| #   | Layer                   | What It Means                                                                                                  |
| --- | ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | **Schema / Migrations** | Database tables, columns, indexes, enums, constraints, foreign keys. Drizzle schema + generated migration.     |
| 2   | **Domain Model**        | The business concept this issue lives in. Terminology, invariants, edge cases, relationships to other domains. |
| 3   | **tRPC Routers**        | API procedures. Input validation with Zod. Entity scoping. Audit logging. Error handling.                      |
| 4   | **Agent Logic & Tools** | LangGraph StateGraph nodes. Tool definitions. Confidence scoring. Escalation logic.                            |
| 5   | **Agent Orchestration** | How this issue flows through the 3-tier agent hierarchy. CFO → Department Head → Worker routing.               |
| 6   | **Frontend Components** | React components. Forms. Error states. Loading states. Empty states. Accessibility. Mobile responsive.         |
| 7   | **Integration Tests**   | Router → DB → response tests. Agent tool execution tests. State machine tests.                                 |
| 8   | **E2E Tests**           | Full user workflow tests with Playwright. Authenticated flows. Edge cases.                                     |
| 9   | **Agent Eval Datasets** | YAML golden datasets. Confidence ranges. Edge case scenarios. Regression prevention.                           |
| 10  | **CI/CD Pipeline**      | Tests in CI. Linting. Typecheck. Build verification. Migration drift check.                                    |
| 11  | **Seed Data**           | Demo data that exercises this feature. Realistic amounts. Multi-currency scenarios. Edge cases.                |
| 12  | **Documentation**       | ARCHITECTURE.md updates. DATABASE.md updates. ADR if needed. Inline code comments where non-obvious.           |

---

## The Loop (12 Times Per Layer)

For EACH layer, we run this loop 12 times. Not 12 superficial passes. 12 deep passes where each one must catch things the previous ones missed.

### Loop Structure

```
┌─────────────────────────────────────────────────────┐
│              12 LOOPS PER LAYER (TDD + Graph)        │
│                                                      │
│  Loop 1-4:   DISCOVERY & BUILD (TDD)                │
│  ─────────────────────────────                       │
│  🔴 RED:    Write test first (must fail)             │
│  🟢 GREEN:  Write minimum code to pass               │
│  🔧 REFACTOR: Clean up, no behavior change           │
│  📢 GRAPH:  Employees read each other's findings     │
│  → challenge each other → gaps found → gaps fixed     │
│  → verify: run test, paste output → LOOP             │
│                                                      │
│  Loop 5-8:   DEEP VERIFICATION (Graph)               │
│  ─────────────────────────────                       │
│  Employee re-audits their own work with fresh eyes   │
│  → adversarial review by another employee            │
│  → cross-layer dependency check (graph)              │
│  → edge cases found → new tests written (TDD)        │
│  → edge cases fixed → verify → LOOP                  │
│                                                      │
│  Loop 9-12:  ENTERPRISE HARDENING (Graph + TDD)     │
│  ─────────────────────────────                       │
│  Security review → write security tests (TDD)        │
│  → Performance review → write perf tests (TDD)       │
│  → Compliance check → verify compliance (evidence)   │
│  → Final sign-off or LOOP again                      │
│  → ALL tests must pass before sign-off               │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### What Each Loop Must Produce

Every loop must produce ONE of these outcomes:

1. **Fixes applied** — Real code changes, not theoretical notes
2. **Gaps identified and documented** — If something can't be fixed now, it's logged with owner, priority, and timeline
3. **Verification evidence** — Test output, typecheck pass, lint pass, or explicit failure with root cause
4. **Employee sign-off** — The responsible employee confirms their layer meets production grade

If a loop produces NONE of these, it was a wasted loop. That means the employee didn't go deep enough. They must re-fire and go deeper.

---

## The Employee Communication Pattern

Employees don't work in isolation. They talk to each other. They challenge each other. They cross-check.

```
┌──────────┐     challenges     ┌──────────┐
│ Employee │ ◄─────────────────► │ Employee │
│    A     │                     │    B     │
└────┬─────┘                     └────┬─────┘
     │                                │
     │  findings                      │  findings
     ▼                                ▼
┌──────────┐     validates     ┌──────────┐
│ Employee │ ◄────────────────► │ Employee │
│    C     │                    │    D     │
└──────────┘                    └──────────┘
```

### Communication Rules

1. **Every employee writes their findings to a file** — not just in their head
2. **Employees read each other's findings** — before building, they check what others found
3. **Employees challenge each other** — if the PM says "this is done," the QA engineer tests it
4. **Employees agree or escalate** — if they disagree, they escalate to the user (human-in-the-loop)
5. **No employee can sign off alone** — at least one other employee must verify their layer

### The 25 Employees

| #   | Employee                 | Role                           | Primary Layers                     |
| --- | ------------------------ | ------------------------------ | ---------------------------------- |
| 1   | CEO/Founder              | Strategic assessment           | All (oversight)                    |
| 2   | Product Manager          | Feature audit, user value      | Frontend, Domain Model             |
| 3   | Engineering Lead         | Technical audit, stack quality | All layers                         |
| 4   | CFO/Finance Expert       | Accounting completeness        | Schema, Domain, Agent Logic        |
| 5   | Security Engineer        | Security & compliance          | All layers (security lens)         |
| 6   | Design Lead              | UX/UI quality                  | Frontend, Documentation            |
| 7   | Marketing Manager        | Go-to-market, positioning      | Documentation, Seed Data           |
| 8   | COO                      | Operations, customer success   | All (operational lens)             |
| 9   | Sales Rep                | Sales readiness, objections    | Frontend, Documentation            |
| 10  | Customer Success Manager | Retention, churn prevention    | Frontend, Agent Logic              |
| 11  | Onboarding Specialist    | Activation, first-run          | Frontend, Seed Data                |
| 12  | Software Architect       | System design, scalability     | Schema, CI/CD, Agent Orchestration |
| 13  | DevOps Engineer          | CI/CD, infrastructure          | CI/CD, Documentation               |
| 14  | Data Analyst             | Analytics, metrics             | Schema, Frontend, CI/CD            |
| 15  | Copywriter               | Website, messaging             | Frontend, Documentation            |
| 16  | UX Writer                | Microcopy, content design      | Frontend, Documentation            |
| 17  | Product Analyst          | AARRR, feature adoption        | Frontend, Agent Logic              |
| 18  | Lead Researcher          | ICP, lead generation           | Documentation, Seed Data           |
| 19  | QA Engineer              | Testing, quality assurance     | Integration Tests, E2E, CI/CD      |
| 20  | Technical Writer         | Documentation, API docs        | Documentation                      |
| 21  | Compliance Officer       | Regulatory, legal              | Schema, CI/CD, Documentation       |
| 22  | Integration Specialist   | Bank feeds, payments           | Schema, tRPC, Agent Logic          |
| 23  | Customer Support Manager | Support, knowledge base        | Frontend, Documentation            |
| 24  | Finance Analyst          | Pricing, unit economics        | Schema, Frontend, Documentation    |
| 25  | Competitor Analyst       | Competitive landscape          | Documentation, Frontend            |

---

## The Process (Per Issue)

### Phase 0: SELECTION

1. User selects ONE issue from the priority matrix
2. Employee reads the issue definition
3. Employee maps the issue to all 12 layers
4. Employee writes the plan (what, files, order, rules, verification)

### Phase 1: DISCOVERY (Loops 1-4)

- Each relevant employee fires and does their job on this issue
- They write findings to `findings/[issue-name]/[employee].md`
- They read each other's findings
- They build their layer's implementation
- They verify with tests, typecheck, lint
- They communicate challenges and gaps
- They fix gaps and LOOP

### Phase 2: DEEP VERIFICATION (Loops 5-8)

- Each employee re-audits their own work with fresh eyes
- Another employee adversarial-reviews their layer
- Cross-layer dependencies are checked (does the schema match the router? does the router match the frontend? does the agent use the right tools?)
- Edge cases are discovered and handled
- Failures are fixed and LOOP

### Phase 3: ENTERPRISE HARDENING (Loops 9-12)

- Security engineer reviews this issue's implementation for vulnerabilities
- Performance engineer checks for N+1 queries, bundle size, response times
- Compliance officer verifies regulatory requirements are met
- Final sign-off: every employee confirms their layer is production grade
- If ANY employee says "not ready," we LOOP again

### Phase 4: SIGN-OFF

- All 12 layers verified
- All employees signed off
- All tests passing
- Typecheck clean
- Lint clean
- Build passing
- Documentation updated
- Seed data updated
- CI/CD verified
- **Issue is DONE. Move to next issue.**

---

## Quality Gates

No issue passes these gates until ALL are met:

### Gate 0: TDD (Must Pass First)

- [ ] Every implementation has a failing test written BEFORE the code
- [ ] Red → Green → Refactor cycle completed for every change
- [ ] All tests pass — run command, paste output as evidence
- [ ] No implementation code exists without a corresponding test
- [ ] Test coverage ≥ 80% for changed files
- [ ] Tests are deterministic — run 3 times, same result every time

### Gate 1: Code Quality

- [ ] TypeScript strict mode — no `any` types
- [ ] ESLint passing — no warnings
- [ ] All tests passing — unit, integration, E2E (with output evidence)
- [ ] Build passing — no errors
- [ ] Entity scoping on every query — grep-proof evidence
- [ ] Zod validation on every input — invalid input tested and rejected
- [ ] Audit logging on every mutation — grep-proof evidence

### Gate 2: Security

- [ ] No SQL injection vectors
- [ ] No XSS vectors
- [ ] No CSRF vectors
- [ ] No secrets in code
- [ ] Rate limiting on endpoints
- [ ] Input sanitization
- [ ] Authorization checks (not just authentication)

### Gate 3: Accounting Integrity

- [ ] Double-entry balance invariant (debits = credits, always)
- [ ] Period lock enforcement (closed periods reject modifications)
- [ ] Entity isolation (no cross-entity data leakage)
- [ ] Currency handling (proper rounding, no floating point)
- [ ] Audit trail complete (who, what, when, why)

### Gate 4: Agent Quality

- [ ] Confidence scoring present
- [ ] Escalation logic working (< 0.7 → supervisor, < 0.4 → human)
- [ ] LangFuse tracing on every action
- [ ] Error recovery with exponential backoff
- [ ] Entity context never hardcoded

### Gate 5: User Experience

- [ ] Empty states for all new data scenarios
- [ ] Loading states (skeleton screens, not spinners)
- [ ] Error states with plain English messages
- [ ] Mobile responsive
- [ ] Accessible (WCAG 2.1 AA)
- [ ] Confirmation dialogs for destructive actions

### Gate 6: Observability

- [ ] Structured logging (JSON, not console.log)
- [ ] Error tracking (Sentry integration)
- [ ] Request tracing (requestId propagation)
- [ ] Performance metrics (response time, DB query time)

### Gate 7: Data Integrity

- [ ] Seed data exercises this feature
- [ ] Demo account demonstrates this feature
- [ ] Migration is reversible
- [ ] No data loss on rollback
- [ ] Backward compatible with existing data

---

## What "Enterprise Grade" Means

Enterprise grade is not a label. It is a checklist:

1. **Works at scale** — 10,000+ users, 1M+ records, 100+ concurrent
2. **Handles failures gracefully** — timeouts, retries, circuit breakers, fallbacks
3. **Is auditable** — every action logged with who, what, when, why, confidence
4. **Is secure** — OWASP Top 10 mitigated, SOC 2 controls in place
5. **Is compliant** — GDPR, local data protection, accounting standards
6. **Is observable** — you can debug any production issue without guessing
7. **Is testable** — automated tests cover the critical path
8. **Is documented** — another engineer can understand and modify it
9. **Is reversible** — can be rolled back without data loss
10. **Is monitored** — alerts fire before users notice problems

---

## What "Production Grade" Means

Production grade is the minimum bar:

1. **Typecheck passes** — zero errors
2. **Lint passes** — zero warnings
3. **All tests pass** — unit, integration, E2E
4. **Build succeeds** — no build errors
5. **No console.log** — structured logging only
6. **No hardcoded values** — environment variables or config
7. **No magic numbers** — named constants with comments
8. **Error handling** — every async operation has error handling
9. **Input validation** — Zod on every user input
10. **Entity scoping** — every query scoped to entity_id

---

## The No-Cruising Rule

**Cruising** = going through the motions without actually catching or fixing anything.

### What Counts as Cruising

- Saying "this seems to be there" without proving it with evidence
- Checking a box without running the actual test/command/code
- "Looks good to me" without adversarial probing
- A loop produces no findings, no fixes, no verification
- An employee signs off without actually testing their layer
- Tests pass but don't cover edge cases
- Code review finds nothing but the code has obvious gaps
- Documentation is written but doesn't explain the "why"
- Reading code and saying "this looks correct" without writing a test that proves it
- Claiming "entity scoping is in place" without grep-proof that every query has it
- Saying "error handling exists" without triggering an error and verifying the response
- Assuming something works because it worked before — code changes, regressions happen

### Verification Is Not Optional

**Every claim must have evidence.** No exceptions.

| If you say...                 | You must show...                                        |
| ----------------------------- | ------------------------------------------------------- |
| "Tests pass"                  | Run the test command and paste the output               |
| "Typecheck passes"            | Run typecheck and paste the output                      |
| "Entity scoping works"        | Grep every query file and show every query has entityId |
| "Error handling is correct"   | Trigger the error path and show the response            |
| "Zod validation works"        | Send invalid input and show the rejection               |
| "This component renders"      | E2E test output showing the component in the browser    |
| "Agent confidence works"      | Eval dataset output showing confidence score in range   |
| "No SQL injection"            | Show parameterized queries on every DB call             |
| "Audit trail logs everything" | Grep every mutation and show audit log call             |
| "Period lock works"           | Test: try to post to closed period, verify rejection    |

**"This seems right" is not evidence. Run it. Prove it. Show the output.**

If cruising is detected:

1. The employee must re-fire and go deeper
2. The loop count does NOT advance
3. Another employee must adversarial-review their work
4. The user is notified: "Employee X is cruising. Re-firing."

**12 loops means 12 real loops. Not 12 check-the-box passes.**

---

## TDD — Test-Driven Development (Non-Negotiable)

**Everything is built test-first. No exceptions.**

### The Rule

For every layer, for every feature, for every fix:

1. **Write the test FIRST** — before writing any implementation code
2. **Watch it FAIL** — red. The test must fail because the code doesn't exist yet.
3. **Write the MINIMUM code to pass** — green. Don't over-engineer.
4. **Refactor** — clean up without changing behavior.
5. **Verify** — run the test again. It must pass.

This is the TDD cycle. Red → Green → Refactor. Every time. No exceptions.

### What Gets Tested (Per Layer)

| Layer               | Test Type       | What to Test                                                    |
| ------------------- | --------------- | --------------------------------------------------------------- |
| Schema              | Unit            | Enum values, default values, nullable constraints               |
| Domain              | Unit            | Business rules, invariants, edge cases                          |
| tRPC Router         | Integration     | Input validation, entity scoping, error handling, audit logging |
| Agent Logic         | Unit            | Tool functions, confidence scoring, state transitions           |
| Agent Orchestration | Integration     | Routing logic, escalation, department dispatch                  |
| Frontend            | Component + E2E | Rendering, form submission, error display, empty states         |
| Integration Tests   | Integration     | Router → DB → response end-to-end                               |
| E2E Tests           | E2E             | Full user workflow in browser                                   |
| Agent Eval          | Eval            | Confidence ranges, output format, edge cases                    |

### TDD Enforcement

- **No implementation code without a failing test first** — if someone writes code without a test, it gets deleted and re-done
- **No commit without passing tests** — if tests fail, the commit doesn't happen
- **No sign-off without test evidence** — every employee must show test output for their layer
- **Coverage minimum: 80%** for the files changed in this issue

### Test Quality Standards

- Tests must be **deterministic** — same input, same output, every time
- Tests must be **isololated** — no shared state between tests
- Tests must be **fast** — unit tests < 100ms, integration tests < 2s, E2E < 30s
- Tests must be **readable** — test name describes the behavior being tested
- Tests must be **maintainable** — if the test is harder to understand than the code, rewrite it

---

## Graph Engineering Style (In Each Loop)

Each loop is NOT a linear pass. It is a **graph** where employees communicate, challenge, and validate each other.

### The Graph Pattern

```
                    ┌─────────────┐
                    │   USER      │
                    │ (approves)  │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   CEO       │
                    │ (oversight) │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼──────┐ ┌──▼────────┐ ┌▼─────────────┐
       │    PM       │ │   ENG     │ │    CFO       │
       │ (features)  │ │ (tech)    │ │ (accounting) │
       └──────┬──────┘ └──┬────────┘ └┬─────────────┘
              │            │            │
              │     ┌──────▼──────┐     │
              │     │   SECURITY  │     │
              │     │ (hardening) │     │
              │     └──────┬──────┘     │
              │            │            │
       ┌──────▼──────┐     │     ┌──────▼──────┐
       │   DESIGN    │     │     │    QA       │
       │ (UX/UI)     │     │     │ (testing)   │
       └──────┬──────┘     │     └──────┬──────┘
              │            │            │
              └────────────┼────────────┘
                           │
                    ┌──────▼──────┐
                    │  ARCHITECT  │
                    │ (system)    │
                    └─────────────┘
```

### How the Graph Works Per Loop

**Step 1: Parallel Discovery** — All relevant employees fire simultaneously on their layer

**Step 2: Cross-Communication** — Employees read each other's findings:

- PM reads Eng's technical findings → "Can we build this UX with those constraints?"
- Eng reads PM's feature findings → "This has 3 edge cases you didn't consider"
- CFO reads Security's findings → "This audit logging misses journal entry reversals"
- Security reads CFO's findings → "That entity scoping has a tenant isolation gap"

**Step 3: Challenge & Validate** — Employees adversarially review each other:

- QA tests what Eng built → "Fails on empty state"
- Design reviews what PM specified → "Mobile layout breaks at 375px"
- Compliance checks what Security approved → "GDPR erasure endpoint missing"

**Step 4: Fix & Loop** — Gaps found → fixed → back to Step 1

### Graph Communication Rules

1. **Every employee writes findings** — not verbal, written to file
2. **Every employee reads at least 2 other employees' findings** — before building
3. **Every employee challenges at least 1 other employee** — adversarial review
4. **Every employee's work must be validated by at least 1 other employee** — no lone wolves
5. **Disagreements escalate to user** — human-in-the-loop for conflicts

### Why Graph, Not Linear

Linear = PM defines → Eng builds → QA tests → done. This misses things.

- PM defines without checking if schema supports it
- Eng builds without checking if agents need it
- QA tests without checking if security is compromised
- Done without checking if compliance requires it

Graph = everyone talks to everyone. Every loop catches more. 12 loops = 12 catches.

---

## File Structure Per Issue

```
findings/
├── [issue-name]/
│   ├── plan.md                    # The plan (what, files, order, rules)
│   ├── schema.md                  # Employee 12 (Software Architect) findings
│   ├── domain.md                  # Employee 4 (CFO) findings
│   ├── trpc.md                    # Employee 3 (Eng Lead) findings
│   ├── agent-logic.md             # Employee 4 (CFO) + Employee 3 findings
│   ├── agent-orchestration.md     # Employee 12 findings
│   ├── frontend.md                # Employee 2 (PM) + Employee 6 (Design) findings
│   ├── integration-tests.md       # Employee 19 (QA) findings
│   ├── e2e-tests.md               # Employee 19 (QA) findings
│   ├── agent-eval.md              # Employee 3 findings
│   ├── cicd.md                    # Employee 13 (DevOps) findings
│   ├── seed-data.md               # Employee 11 (Onboarding) + Employee 18 findings
│   ├── documentation.md           # Employee 20 (Tech Writer) findings
│   ├── security.md                # Employee 5 (Security) findings
│   ├── compliance.md              # Employee 21 (Compliance) findings
│   ├── performance.md             # Employee 12 findings
│   ├── sign-offs.md               # All employees sign off here
│   └── loop-log.md                # Log of all 12 loops with outcomes
```

---

## Execution Command

When starting an issue, the agent should:

1. **Read this file** — `howtowork.md`
2. **Read the issue** — from the priority matrix in `roadtoprod.md`
3. **Write the plan** — `findings/[issue-name]/plan.md`
4. **Ask for approval** — present plan to user
5. **Execute loops 1-4** — discovery and build
6. **Execute loops 5-8** — deep verification
7. **Execute loops 9-12** — enterprise hardening
8. **Collect sign-offs** — every employee confirms
9. **Update documentation** — ARCHITECTURE.md, DATABASE.md, BUILD_LOG.md
10. **Move to next issue** — only after full sign-off

---

_This document is the SINGLE SOURCE OF TRUTH for how we work._
_Read it before every issue. Follow it without exception._
_No cruising. No shortcuts. No cruising. No shortcuts._
_Every loop is TDD. Every loop is graph. Every claim has evidence._
_Nothing is left to chance. Nothing passes by assumption._
_Run it. Prove it. Show the output. Then sign off._
