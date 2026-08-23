---
name: test-coverage
description: Analyzes test coverage across the Xenboox codebase. Use when checking which code lacks tests, planning test sprints, or verifying pre-ship readiness. Fires with "check test coverage", "what's untested", "test gaps".
license: MIT
metadata:
  author: xenboox
  category: testing
---

## When to Use

- Before shipping features
- When planning test sprints
- To find untested code paths
- As a pre-ship gate
- After refactoring (to verify tests still cover the code)

## Steps

### 1. Run Unit Test Coverage

```bash
cd apps/web
pnpm vitest run --coverage
```

This generates a coverage report showing which files and lines are covered.

### 2. Check E2E Coverage

```bash
cd apps/web
pnpm playwright test --reporter=list
```

E2E tests cover user flows. Check `apps/web/e2e/` for existing specs.

### 3. Analyze Coverage Gaps

Look for:

| Area | Expected Coverage | Why |
|------|------------------|-----|
| `apps/web/app/api/` | 100% | API routes handle money and data |
| `apps/web/server/routers/` | 100% | tRPC routers are the backbone |
| `packages/db/schema/` | Schema tests exist | Data integrity |
| `packages/agents/` | Eval suite covers agents | Agent correctness |
| `apps/web/components/` | Critical paths tested | UI correctness |

### 4. Identify Untested Critical Paths

High-priority untested areas:

| Path | Risk | Priority |
|------|------|----------|
| `app/api/auth/` | Security | P0 |
| `server/routers/banking.ts` | Financial data | P0 |
| `server/routers/invoices.ts` | Revenue | P0 |
| `packages/agents/tier3/` | Agent execution | P1 |
| `components/dashboard/` | User experience | P1 |
| `app/api/newsletter/route.ts` | Public endpoint | P2 |

### 5. Write Missing Tests

For each untested area, follow TDD:

1. Load the `tdd` skill
2. Write a failing test
3. Verify it fails for the right reason
4. Implement the fix
5. Verify it passes

### 6. Verify Coverage Improved

```bash
pnpm vitest run --coverage --reporter=text
```

Check that coverage increased and no regressions occurred.

## Test Types by Area

| Area | Test Type | Tool | Location |
|------|-----------|------|----------|
| API routes | Unit + Integration | Vitest | `__tests__/*.test.ts` |
| tRPC routers | Unit | Vitest | `__tests__/*-router.test.ts` |
| Components | Unit + Snapshot | Vitest | `__tests__/*.test.ts` |
| User flows | E2E | Playwright | `e2e/*.spec.ts` |
| Agents | Eval | Custom harness | `packages/agents/core/eval/` |
| Database | Integration | Vitest | `__tests__/entity-scoping.test.ts` |
| Auth | Security | Vitest | `__tests__/auth.test.ts` |

## Verification

1. Coverage report generated
2. No critical paths untested
3. Coverage percentage ≥80% for API routes
4. All P0 areas have tests
5. E2E tests cover main user flows

## Common Pitfalls

1. **Testing mocks instead of code** — Tests should verify real behavior, not mock behavior
2. **Skipping edge cases** — Happy path tests are easy. Edge cases catch bugs
3. **Not testing entity scoping** — Every query must be scoped. Test that wrong entityId returns empty
4. **Ignoring error paths** — Errors happen. Test that they're handled gracefully
5. **Tests that don't fail** — If a test passes immediately, it's not testing the right thing
