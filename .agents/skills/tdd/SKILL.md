---
name: tdd
description: Test-driven development loop — red, green, refactor. Use when writing new code that should be tested, fixing bugs (write test first), or adding features with confidence. Enforces one vertical slice at a time.
license: MIT
metadata:
  author: mattpocock/skills
  category: testing
---

Implement features using strict test-driven development. Work in one vertical slice at a time.

## The Loop

### 🔴 Red: Write a Failing Test

1. Write the test that describes the behavior you want
2. Run the test — it must fail (proves the test works)
3. The test describes the interface before the implementation

```typescript
// Example test
import { describe, it, expect } from "vitest";
import { calculateVat } from "./vat";

describe("calculateVat", () => {
  it("calculates 15% VAT for standard rate", () => {
    const result = calculateVat(1000, "USD");
    expect(result.amount).toBe(150);
    expect(result.rate).toBe(0.15);
  });

  it("returns zero for exempt items", () => {
    const result = calculateVat(1000, "USD", { exempt: true });
    expect(result.amount).toBe(0);
  });
});
```

### 🟢 Green: Make It Pass

1. Write the minimal implementation that makes the test pass
2. Don't over-engineer — do the simplest thing
3. Run the test — it must pass

### 🔵 Refactor: Improve the Code

1. Clean up the implementation (extract functions, rename, simplify)
2. Run the test — still passes
3. Commit the test + implementation together

## Rules

- One red-green-refactor cycle per test
- Never write implementation without a failing test first
- Never change a passing test's expectations without turning it red first
- Commit after each cycle if the change is self-contained

## Verification

- `pnpm test` — all tests pass
- Test covers: happy path, error case, edge case
- Test entity-scoping: query with wrong entityId returns empty
