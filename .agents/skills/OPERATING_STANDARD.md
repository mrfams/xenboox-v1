# Engineering & Employee Operating Standard

> Single source of truth for how ALL employees work.
> Every skill must reference this standard.
> No employee may declare work complete without meeting these requirements.

---

## Core Principle

**Completion means outcome, not activity.**

A task is NOT complete because:

- Code typechecks
- A component renders
- A button appears
- A function exists
- An endpoint responds
- A test passes (especially if it only tests mocks)
- A document exists
- The implementation "looks right"

A task IS complete when:

- The intended outcome actually works
- The relevant surrounding system has been checked
- End-to-end behavior has been verified
- Evidence exists that the goal was achieved

---

## The Execution Loop

Every employee must follow this loop. No exceptions.

```
GOAL
  ↓
RESEARCH
  ↓
UNDERSTAND CURRENT STATE
  ↓
IDENTIFY SYSTEM / ROLE DEPENDENCIES
  ↓
DEFINE SUCCESS (acceptance criteria)
  ↓
BUILD EXECUTION GRAPH
  ↓
DEFINE TESTS / EVALUATION
  ↓
IMPLEMENT
  ↓
EXECUTE
  ↓
OBSERVE REALITY
  ↓
COMPARE AGAINST GOAL
  ↓
┌───────────────┐
│ COMPLETE?     │
└───────┬───────┘
        │
    NO  │  YES
        ↓
  DIAGNOSE / DISCOVER
        ↓
  UPDATE GRAPH
        ↓
     ITERATE
        │
        └───────────────┐
                        ↓
                END-TO-END VERIFY
                        ↓
                EVIDENCE OF SUCCESS
                        ↓
                     COMPLETE
```

### Loop Phases

| Phase            | Question                                 | Action                                                                 |
| ---------------- | ---------------------------------------- | ---------------------------------------------------------------------- |
| **GOAL**         | What are we actually trying to achieve?  | Define the outcome, not the activity                                   |
| **RESEARCH**     | What do we need to understand first?     | Inspect codebase, architecture, dependencies, existing implementations |
| **UNDERSTAND**   | What is the current state?               | Read existing code, schemas, APIs, components, tests                   |
| **DEPENDENCIES** | What systems/components are involved?    | Map frontend → API → backend → database → external services            |
| **SUCCESS**      | How will we know it's done?              | Define observable acceptance criteria                                  |
| **GRAPH**        | What steps are needed and in what order? | Build dependency-aware execution plan                                  |
| **TESTS**        | What should we verify?                   | Define verification criteria before implementation                     |
| **IMPLEMENT**    | Build the solution                       | Write code, copy, design, analysis — whatever the role requires        |
| **EXECUTE**      | Run the actual system                    | Start dev server, run queries, execute scripts, test in browser        |
| **OBSERVE**      | What actually happened?                  | Check real output, not assumed output                                  |
| **COMPARE**      | Does the result match the goal?          | Evaluate against acceptance criteria                                   |
| **DIAGNOSE**     | If it failed, why?                       | Root cause analysis, not symptom patching                              |
| **ITERATE**      | What needs to change?                    | Update plan, fix root cause, re-implement                              |
| **VERIFY**       | End-to-end check                         | Multiple verification layers appropriate to the task                   |
| **EVIDENCE**     | What proof do we have?                   | Concrete evidence of completion, not confidence                        |

---

## Research Requirements

Before executing ANY non-trivial task, the employee MUST investigate:

### For Engineering Work

- Existing architecture and patterns
- Repository structure and conventions
- Relevant frontend components
- Backend services and APIs
- Database models and schemas
- Authentication/authorization
- Existing business logic
- Event systems and queues
- Integrations and external services
- Configuration and environment
- Existing tests
- Known limitations and TODOs
- Related features and dependencies

### For Content Work

- Existing content on the topic
- Brand voice and style guidelines
- Target audience and their needs
- SEO requirements and keyword strategy
- Competitor content on same topics
- Required structure and length
- Factual claims requiring verification
- Internal linking opportunities
- Publishing standards and quality bars

### For Product Work

- User problems being solved
- Current user flows and pain points
- Edge cases and failure modes
- Competitive alternatives
- Business constraints and goals
- Technical feasibility
- Measurable outcomes

### For Finance Work

- Complete financial model
- Revenue and cost assumptions
- Customer economics
- Cash flow and burn
- Runway and break-even
- Scenario analysis requirements
- Sensitivity to key variables
- Risk factors

---

## Verification Layers

Typechecking is ONE layer. Employees must use appropriate layers for the task:

| Layer                    | What It Checks                       | When to Use                       |
| ------------------------ | ------------------------------------ | --------------------------------- |
| Syntax                   | Code parses correctly                | Always                            |
| Type checking            | Type safety                          | Always                            |
| Linting                  | Code conventions                     | Always                            |
| Unit tests               | Individual functions                 | Core logic                        |
| Component tests          | UI rendering                         | UI components                     |
| Integration tests        | Multiple components working together | Features spanning multiple layers |
| API tests                | Endpoint behavior                    | Backend routes                    |
| Database tests           | Query correctness                    | Data operations                   |
| End-to-end tests         | Full user flow                       | User-facing features              |
| Browser verification     | Actual rendering                     | UI features                       |
| Runtime execution        | Actual behavior                      | Everything                        |
| Error path testing       | Failure handling                     | Error-prone code                  |
| Permission testing       | Auth/authz                           | Protected features                |
| State verification       | Data persistence                     | Data mutations                    |
| Integration verification | External services                    | Third-party integrations          |

### Verification Rule

**The verification depth must match the task risk and complexity.**

- Typo fix → syntax + visual check
- New component → typecheck + render check + interaction check
- New feature → typecheck + unit tests + integration test + E2E verification
- API change → typecheck + API test + integration test + permission check
- Database change → typecheck + migration test + data verification
- Financial calculation → typecheck + unit tests + scenario verification + stress test
- Content piece → word count + brand voice + SEO + factual accuracy + rendering check

---

## Graph-Based Execution

### The Graph Must Be Dynamic

The execution graph is NOT a static checklist. It changes as new information is discovered.

Example:

```
Implement notification system
        ↓
Research existing notification code
        ↓
Discover notification service exists but has no persistence
        ↓
ADD: Persistence requirement to graph
        ↓
Discover authentication gap
        ↓
ADD: Authorization requirement to graph
        ↓
Implement persistence
        ↓
Integration test fails — API contract mismatch
        ↓
DIAGNOSE: Root cause is schema mismatch
        ↓
UPDATE: Fix schema, not just test
        ↓
Re-test
        ↓
E2E verification
        ↓
Complete
```

**Discovery of additional required work is NOT failure. Failing to find it IS failure.**

### Graph Format

Every employee should construct a graph that shows:

```
GOAL: [What we're trying to achieve]

DEPENDENCIES:
- [System/component A]
- [System/component B]
- [External service C]

EXECUTION STEPS:
1. [Step] → depends on: [nothing/step X]
2. [Step] → depends on: [step 1]
3. [Step] → depends on: [step 1, step 2]
...

VERIFICATION:
- [How we verify step 1]
- [How we verify step 2]
- [End-to-end verification]
```

---

## Anti-Patterns (What NOT to Do)

### ❌ The One-Shot Pattern

```
Task arrives → Edit something → Make visible artifact → Typecheck → Declare done
```

### ❌ The Mock-Only Pattern

```
Write test → Mock everything → Test passes → Declare done
```

### ❌ The UI-Only Pattern

```
Create component → Style it → It renders → Declare done
```

(But the button doesn't actually DO anything when clicked)

### ❌ The Endpoint-Only Pattern

```
Create API route → Returns 200 → Declare done
```

(But the frontend never calls it, or the backend logic is empty)

### ❌ The Document-Only Pattern

```
Write documentation → It exists → Declare done
```

(But the documentation doesn't match reality)

### ❌ The Typecheck-Only Pattern

```
Make changes → Typecheck passes → Declare done
```

(But nothing was actually verified at runtime)

---

## Evidence-Based Completion

Every employee must provide evidence, not confidence.

### Required Evidence Format

```markdown
## Completion Evidence

### Goal

[What we were trying to achieve]

### What Was Changed

[List of files/components/systems modified]

### Verification Performed

- [ ] [Verification step 1]: [Result]
- [ ] [Verification step 2]: [Result]
- [ ] [Verification step 3]: [Result]

### Evidence

[Concrete proof — test output, browser screenshot, API response, calculation results]

### Remaining Risk

[Anything that could not be fully verified]

### Completion Status

[COMPLETE with evidence / INCOMPLETE — blocked by X]
```

---

## Role-Specific Standards

Each role has additional requirements beyond the core loop:

### Engineering

- Must verify end-to-end behavior, not just compilation
- Must test failure paths, not just happy paths
- Must verify permissions and authentication
- Must verify data persistence
- Must verify frontend-backend connection
- Must verify error handling

### Content

- Must meet word count requirements (not 2 sentences when 1,500 words expected)
- Must meet brand voice standards
- Must meet SEO requirements
- Must be factually accurate
- Must render correctly in the actual blog system
- Must include proper metadata

### Product

- Must validate against user problems, not just feature lists
- Must identify edge cases
- Must verify measurable outcomes
- Must check competitive positioning

### Finance

- Must stress-test assumptions
- Must model multiple scenarios
- Must identify key risks
- Must provide evidence-based recommendations

### Design

- Must verify interaction states (loading, error, empty, disabled)
- Must verify accessibility
- Must verify responsive behavior
- Must use real content, not lorem ipsum

### Marketing

- Must verify conversion elements work
- Must verify SEO metadata is correct
- Must verify tracking events fire
- Must verify competitive positioning

---

## Quality Gates

Every task must pass through quality gates before completion:

### Gate 1: Research Complete

- [ ] Current state understood
- [ ] Dependencies identified
- [ ] Acceptance criteria defined

### Gate 2: Implementation Complete

- [ ] All planned steps executed
- [ ] No placeholder or fake implementations
- [ ] All connections verified

### Gate 3: Verification Complete

- [ ] Appropriate verification layers executed
- [ ] End-to-end behavior confirmed
- [ ] Failure paths tested

### Gate 4: Evidence Provided

- [ ] Concrete evidence of completion
- [ ] Remaining risks identified
- [ ] Quality score meets threshold

---

## The Standard We Want

Employees who naturally think:

1. "What is the actual goal?"
2. "What do I need to understand before touching this?"
3. "What are all the pieces involved?"
4. "What could be missing?"
5. "How will I test this?"
6. "What happens when I actually run it?"
7. "Does the real result match the intended outcome?"
8. "What did I learn?"
9. "What needs to change?"
10. "Let me run it again."
11. "I have evidence that this is actually complete."

---

## Final Principle

**Never confuse artifact completion with goal completion.**

- A button is not a feature.
- An endpoint is not a working integration.
- A function is not a working system.
- A passing typecheck is not a successful implementation.
- A passing mock test is not necessarily successful real-world behavior.
- A spreadsheet is not a financial analysis.
- Two sentences are not necessarily a blog post.
- A recommendation is not necessarily a validated decision.
- A completed task record is not proof of completed work.

**The employee's responsibility is to close the gap between the requested goal and reality.**
