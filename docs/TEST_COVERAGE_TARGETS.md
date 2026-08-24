# Test Coverage Targets

> Coverage goals and enforcement rules for the Xenboox codebase.

---

## Coverage Targets

| Package                 | Target | Current | Status |
| ----------------------- | ------ | ------- | ------ |
| `packages/db`           | 90%    | —       | ⬜     |
| `packages/agents`       | 85%    | —       | ⬜     |
| `packages/ui`           | 80%    | —       | ⬜     |
| `apps/web` (components) | 70%    | —       | ⬜     |
| `apps/web` (lib)        | 80%    | —       | ⬜     |
| `apps/web` (routers)    | 85%    | —       | ⬜     |

---

## What Must Be Tested

### Critical Path (100% coverage required)

- Authentication flows
- Entity scoping middleware
- Financial calculations (invoices, payroll, tax)
- Double-entry balance enforcement
- Period lock enforcement
- Audit trail writes

### High Priority (80%+ coverage)

- tRPC router procedures
- Agent state transitions
- Database migrations
- API input validation (Zod schemas)
- Error handling paths

### Medium Priority (70%+ coverage)

- React components (rendering + interaction)
- Utility functions
- Date/currency formatting
- Cache invalidation logic

### Low Priority (best effort)

- UI-only components (buttons, cards)
- Layout components
- Marketing pages

---

## Enforcement

### CI Integration

```yaml
# In .github/workflows/ci.yml
- name: Check coverage threshold
  run: |
    pnpm --filter=@xenboox/web test:coverage
    # Fail if coverage drops below threshold
```

### Pre-Merge Requirements

1. New code must not decrease overall coverage
2. Critical path changes require corresponding tests
3. PR description must note coverage impact

---

## Test Types

| Type              | Tool              | When to Run         |
| ----------------- | ----------------- | ------------------- |
| Unit tests        | Vitest            | Every commit        |
| Integration tests | Vitest + test DB  | Every PR            |
| E2E tests         | Playwright        | Before deploy       |
| Agent eval        | Custom eval suite | Before agent deploy |

---

## Running Coverage

```bash
# Web app coverage
pnpm --filter=@xenboox/web test:coverage

# Agent coverage
pnpm --filter=@xenboox/agents test:coverage

# Full coverage report
pnpm test:coverage
```

Coverage reports are uploaded as CI artifacts and retained for 7 days.

---

_Last updated: August 2026_
