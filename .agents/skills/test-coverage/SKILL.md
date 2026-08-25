---
name: test-coverage
description: Analyzes test coverage across the Xenboox codebase and closes gaps by writing tests. Use when checking which code lacks tests, planning test sprints, or verifying pre-ship readiness. Fires with "check test coverage", "what's untested", "test gaps".
license: MIT
metadata:
  author: xenboox
  category: testing
  version: 2.0.0
  workflow: loop
---

# Test Coverage — Loop Mode (Find AND Fill)

## Role

You are a **Test Engineer**. You find untested code AND write tests for it. You don't just report gaps — you close them. You run coverage, identify every gap, build a work queue, write tests for each gap, verify they pass, and don't stop until all critical gaps are closed.

**Workflow Mode:** LOOP

- **Find:** Run coverage analysis, identify all gaps
- **Queue:** Build work queue of every untested area
- **Fill:** Write tests for each gap (one at a time, TDD style)
- **Verify:** Run tests, confirm they pass
- **Repeat:** Until all P0/P1 gaps are closed

**Non-negotiable rules:**

1. You find ALL gaps — not just a few obvious ones
2. You write tests for ALL P0/P1 gaps — not just one
3. Every test you write must actually fail before you make it pass (TDD)
4. You verify tests pass AND cover the right behavior
5. You report progress — "Wrote 5/12 tests, 8 gaps remaining"

---

## Execution Graph

```
┌─────────┐    ┌─────────┐    ┌──────────────────────────────────────┐    ┌──────────┐
│  FIND   │───▶│  QUEUE  │───▶│ FILL LOOP                            │───▶│ VERIFY   │
│ Run     │    │ Build   │    │ For each gap:                        │    │ All      │
│ coverage│    │ work    │    │   read source → write failing test   │    │ tests    │
│ Identify│    │ queue   │    │   → verify fails → implement         │    │ pass     │
│ gaps    │    │         │    │   → verify passes → mark ✅          │    │          │
└─────────┘    └─────────┘    │ Report progress every 3 tests        │    └──────────┘
                              └──────────────────────────────────────┘
```

---

## Phase 1: FIND — Coverage Analysis

### Step 1: Run Unit Test Coverage

```bash
cd apps/web
pnpm vitest run --coverage
```

### Step 2: Run E2E Coverage (if applicable)

```bash
cd apps/web
pnpm playwright test --reporter=list
```

### Step 3: Analyze Coverage Report

For each area, check coverage percentage:

| Area                       | Target Coverage | Why                              |
| -------------------------- | --------------- | -------------------------------- |
| `apps/web/app/api/`        | 100%            | API routes handle money and data |
| `apps/web/server/routers/` | 100%            | tRPC routers are the backbone    |
| `packages/db/schema/`      | 80%+            | Schema integrity                 |
| `packages/agents/`         | Eval suite      | Agent correctness                |
| `apps/web/components/`     | 80% critical    | UI correctness                   |
| `apps/web/lib/`            | 90%             | Shared utilities                 |

### Step 4: Identify Every Gap

List every file/area that is untested or under-tested:

```
COVERAGE GAPS FOUND:
┌────┬──────────────────────────────────────┬──────────┬────────┬──────────┐
│ #  │ Area                                 │ Coverage │ Risk   │ Priority │
├────┼──────────────────────────────────────┼──────────┼────────┼──────────┤
│ 1  │ server/routers/invoices.ts           │ 0%       │ High   │ P0       │
│ 2  │ server/routers/customers.ts          │ 0%       │ High   │ P0       │
│ 3  │ lib/validation/invoices.ts           │ 0%       │ High   │ P0       │
│ 4  │ server/routers/banking.ts            │ 0%       | High   │ P0       │
│ 5  │ components/invoice-form.tsx          │ 0%       │ Medium │ P1       │
│ 6  │ components/customer-table.tsx        │ 0%       │ Medium │ P1       │
│ 7  │ lib/utils/currency.ts                │ 45%      │ Medium │ P1       │
│ 8  │ app/api/newsletter/route.ts          │ 0%       │ Low    │ P2       │
│ 9  │ components/creation-confirm-card.tsx │ 0%       │ Low    │ P2       │
│ 10 │ lib/hooks/use-entity.ts              │ 0%       │ Low    │ P2       │
└────┴──────────────────────────────────────┴──────────┴────────┴──────────┘

GAPS: 10 total | 4 P0 | 3 P1 | 3 P2
```

---

## Phase 2: QUEUE — Build Work Queue

### Priority Rules

| Priority | Criteria                                                  | Action              |
| -------- | --------------------------------------------------------- | ------------------- |
| **P0**   | Handles money, auth, or financial data. 0% coverage.      | Write tests NOW     |
| **P1**   | Core feature, shared utility, UI component. Low coverage. | Write tests NOW     |
| **P2**   | Edge case, public endpoint, non-critical. Low coverage.   | Write tests if time |
| **P3**   | Nice to have, low risk, already partially tested          | Skip for now        |

### Queue Rules

- Process P0 first, then P1, then P2
- Within same priority: process by risk (financial > auth > UI > utility)
- Each item = one test file to write
- One item at a time (TDD: one failing test → implement → verify)

---

## Phase 3: FILL — Write Tests (The Loop)

### Core Loop (per gap)

For EVERY gap in the queue:

```
FILL LOOP for each gap:
  1. READ the source file to test
  2. UNDERSTAND what it does (inputs, outputs, side effects)
  3. WRITE a failing test (Red)
  4. VERIFY it fails for the right reason
  5. WRITE the implementation fix if needed (Green)
  6. VERIFY it passes
  7. REFACTOR if needed (Blue)
  8. VERIFY it still passes
  9. MARK gap as ✅ closed
  10. REPORT progress every 3 tests
```

### What Good Tests Look Like (by area)

#### tRPC Router Tests

Test every procedure: happy path, auth, entity scoping, validation, error cases.

```typescript
// Example: invoices router test structure
describe("invoices router", () => {
  describe("list", () => {
    it("returns invoices scoped to entity", async () => { ... });
    it("returns empty for wrong entity", async () => { ... });
    it("filters by status", async () => { ... });
    it("paginates results", async () => { ... });
    it("requires authentication", async () => { ... });
  });

  describe("create", () => {
    it("creates invoice with valid data", async () => { ... });
    it("rejects missing required fields", async () => { ... });
    it("rejects negative amounts", async () => { ... });
    it("creates audit trail entry", async () => { ... });
    it("requires authentication", async () => { ... });
  });

  describe("update", () => {
    it("updates invoice fields", async () => { ... });
    it("rejects update to locked period", async () => { ... });
    it("only updates own entity invoices", async () => { ... });
  });

  describe("delete", () => {
    it("soft-deletes invoice", async () => { ... });
    it("prevents delete of paid invoice", async () => { ... });
  });
});
```

#### API Route Tests

Test HTTP methods, status codes, auth, input validation, response format.

```typescript
// Example: API route test structure
describe("POST /api/invoices", () => {
  it("returns 201 with valid data", async () => { ... });
  it("returns 401 without auth", async () => { ... });
  it("returns 400 with invalid data", async () => { ... });
  it("returns 403 for wrong entity", async () => { ... });
  it("creates audit trail", async () => { ... });
});
```

#### Utility Function Tests

Test pure functions: inputs → outputs, edge cases, error cases.

```typescript
// Example: currency utility test
describe("formatCurrency", () => {
  it("formats USD correctly", () => {
    expect(formatCurrency(1000, "USD")).toBe("$1,000.00");
  });
  it("handles zero", () => {
    expect(formatCurrency(0, "USD")).toBe("$0.00");
  });
  it("handles negative values", () => {
    expect(formatCurrency(-500, "USD")).toBe("-$500.00");
  });
  it("handles very large numbers", () => {
    expect(formatCurrency(999999999, "USD")).toBe("$999,999,999.00");
  });
});
```

#### Component Tests

Test rendering, user interactions, state changes, error states.

```typescript
// Example: component test structure
describe("InvoiceForm", () => {
  it("renders form fields", () => { ... });
  it("submits with valid data", async () => { ... });
  it("shows validation errors", async () => { ... });
  it("disables submit while loading", async () => { ... });
  it("shows error state on failure", async () => { ... });
});
```

### TDD Enforcement

Every test MUST follow red-green-refactor:

1. **Red:** Write the test FIRST. Run it. It MUST fail.
2. **Green:** Write the MINIMAL implementation to make it pass.
3. **Refactor:** Clean up if needed. Test still passes.

**If a test passes immediately without writing it, it's not testing anything.**

### Test File Location

Place test files next to the source or in `__tests__/`:

```
apps/web/
├── server/routers/invoices.ts
├── __tests__/invoices-router.test.ts     ← test here
├── lib/validation/invoices.ts
├── __tests__/invoices-validation.test.ts  ← or here
├── components/invoice-form.tsx
├── __tests__/invoice-form.test.tsx         ← or here
```

---

## Phase 4: VERIFY — After Writing Tests

### Per-Test Verification

After writing each test:

```bash
cd apps/web
pnpm vitest run __tests__/invoices-router.test.ts
```

- [ ] Test passes
- [ ] Test actually tests behavior (not mock)
- [ ] Test covers happy path AND error case
- [ ] Test is entity-scoped (wrong entityId returns empty)

### Final Verification

After all tests written:

```bash
cd apps/web
pnpm vitest run --coverage
```

- [ ] Coverage increased for tested areas
- [ ] No regressions (previously passing tests still pass)
- [ ] All new tests pass
- [ ] Coverage thresholds met for P0 areas

---

## Phase 5: QUALITY GATE

### Mandatory Checks

- [ ] **All P0 gaps closed** — Every P0 area has tests
- [ ] **All P1 gaps closed** — Every P1 area has tests
- [ ] **All tests pass** — `pnpm vitest run` exits cleanly
- [ ] **Coverage improved** — Measurable increase from baseline
- [ ] **No regressions** — Previously passing tests still pass

### Quality Score

```
├── All P0 gaps closed:              40 points
├── All P1 gaps closed:              25 points
├── All tests pass:                  20 points
└── Coverage increased:              15 points
                                     ────────
                                     TOTAL

Score ≥ 90: ✅ PASS
Score 70-89: ⚠️ NEEDS_WORK (gaps remain)
Score < 70: ❌ FAIL (critical gaps open)
```

---

## Progress Reporting

### During Work

Report every 3 tests:

```
TEST COVERAGE: 7/12 gaps closed (58%)
├── P0: 4/4 closed ✅
├── P1: 2/3 closed (1 in progress)
├── P2: 1/5 closed
├── Tests written: 7
├── Tests passing: 7/7
└── Coverage: 62% → 78% (+16%)

Current: Writing test for server/routers/banking.ts
  → Red: wrote test, confirmed it fails ✅
  → Green: implementing...
```

### Final Report

```markdown
## Test Coverage Report

### Verdict: [PASS | NEEDS_WORK | FAIL]

### Coverage Summary

| Area            | Before  | After   | Target  | Status |
| --------------- | ------- | ------- | ------- | ------ |
| server/routers/ | 0%      | 85%     | 100%    | ⚠️     |
| lib/validation/ | 0%      | 92%     | 100%    | ✅     |
| components/     | 15%     | 68%     | 80%     | ⚠️     |
| lib/utils/      | 45%     | 78%     | 90%     | ⚠️     |
| **Overall**     | **32%** | **71%** | **80%** | ⚠️     |

### Tests Written

| #   | Test File                   | Area        | Tests | Status      |
| --- | --------------------------- | ----------- | ----- | ----------- |
| 1   | invoices-router.test.ts     | tRPC router | 12    | ✅ All pass |
| 2   | customers-router.test.ts    | tRPC router | 10    | ✅ All pass |
| 3   | invoices-validation.test.ts | Validation  | 8     | ✅ All pass |
| 4   | banking-router.test.ts      | tRPC router | 11    | ✅ All pass |
| 5   | invoice-form.test.tsx       | Component   | 6     | ✅ All pass |
| 6   | currency.test.ts            | Utility     | 9     | ✅ All pass |
| 7   | customer-table.test.tsx     | Component   | 5     | ✅ All pass |

### Gaps Remaining

| Area                       | Gap                         | Why Not Closed      | Priority |
| -------------------------- | --------------------------- | ------------------- | -------- |
| server/routers/invoices.ts | Edge case: concurrent edits | Needs investigation | P1       |
| components/                | 3 components untested       | P2, deferred        | P2       |

### Quality Score: XX/100

### Verdict: [PASS | NEEDS_WORK | FAIL]
```

---

## Test Types by Area

| Area         | Test Type          | Tool           | What to Test                                |
| ------------ | ------------------ | -------------- | ------------------------------------------- |
| API routes   | Unit + Integration | Vitest         | Auth, input, output, errors, entity scoping |
| tRPC routers | Unit               | Vitest         | All procedures, validation, auth, scoping   |
| Components   | Unit + Snapshot    | Vitest         | Rendering, interactions, states             |
| User flows   | E2E                | Playwright     | Full journeys, cross-page                   |
| Agents       | Eval               | Custom harness | Tool outputs, confidence, escalation        |
| Database     | Integration        | Vitest         | Entity scoping, constraints, cascades       |
| Auth         | Security           | Vitest         | Login, logout, session, RBAC                |
| Utilities    | Unit               | Vitest         | Pure functions, edge cases                  |

---

## Common Pitfalls

1. **Testing mocks instead of code** — Tests should verify real behavior, not mock behavior
2. **Skipping edge cases** — Happy path tests are easy. Edge cases catch bugs
3. **Not testing entity scoping** — Every query must be scoped. Test that wrong entityId returns empty
4. **Ignoring error paths** — Errors happen. Test that they're handled gracefully
5. **Tests that don't fail** — If a test passes immediately, it's not testing the right thing
6. **Writing too many tests at once** — One test at a time, verify it fails, then implement
7. **Not testing financial calculations** — Invoice totals, journal entry balance, currency conversion
8. **Forgetting audit trail** — Test that mutations create audit log entries

---

## Failure Recovery

### Test won't fail (passes immediately)

1. Re-read what you're testing
2. Check if the behavior already exists
3. Write a MORE specific test (test edge case, not happy path)
4. If still passes: the code might already be correct — document and move on

### Test keeps failing after implementation

1. Re-read the error message carefully
2. Check if the implementation has a bug
3. Check if the test expectation is wrong
4. Fix the root cause, don't tweak the test to make it pass

### Can't figure out what to test

1. Read the source file's function signatures
2. Check what callers expect from it
3. Check if there are existing tests for similar files
4. Start with the happy path, then add error cases

### Budget Guard

- Max **3 attempts** per test (write → fail → fix → fail → re-examine)
- Max **20 tests** per session
- If budget exceeded: report progress, list remaining gaps
