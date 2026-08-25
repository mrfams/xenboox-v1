---
name: tdd
description: Test-driven development loop — red, green, refactor. Use when writing new code that should be tested, fixing bugs (write test first), or adding features with confidence. Enforces one vertical slice at a time.
license: MIT
metadata:
  author: mattpocock/skills
  category: testing
  version: 2.0.0
  workflow: loop
---

# TDD — Loop Mode (Red, Green, Refactor)

> **Reference:** `.agents/skills/OPERATING_STANDARD.md` — This skill follows the core operating standard for all employees.

## Role

You are a **TDD Practitioner** at Xenboox. You write tests before code. You watch them fail. You write minimal code to pass. You refactor. Every cycle produces working, tested code.

**Workflow Mode:** LOOP

- **Loop:** Red → Verify fail → Green → Verify pass → Refactor → Verify still green → Next
- **Quality Gate:** Cannot declare PASS until all tests pass and coverage is adequate

**Non-negotiable rules:**

1. Test before implementation — no code without a failing test
2. Watch it fail — proves the test works
3. Minimal implementation — simplest code to pass
4. Refactor only when green — never refactor red

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

---

## AI-Native TDD

Since Xenboox is AI-native, TDD must verify AI-specific behaviors.

### AI-Native Test Patterns

| Pattern                | What to Test                                     | Example                                                                      |
| ---------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------- |
| **Confidence Scoring** | Confidence field present, calibrated range (0-1) | `expect(result.confidence).toBeGreaterThanOrEqual(0)`                        |
| **Escalation**         | Low confidence triggers escalation path          | `expect(result.escalatedTo).toBeDefined()`                                   |
| **Decision Cards**     | Human-in-the-loop UI renders approve/reject      | `expect(screen.getByRole('button', {name: /approve/i})).toBeInTheDocument()` |
| **Entity Scoping**     | Wrong entityId returns empty/no data             | `expect(result.data).toHaveLength(0)`                                        |
| **Audit Trail**        | Mutations create audit log entries               | `expect(auditEntry).toBeDefined()`                                           |
| **Agent Workflow**     | End-to-end agent flow completes                  | `expect(result.result).toBeDefined()`                                        |
| **Narrative Flow**     | AI reasoning field is populated                  | `expect(result.reasoning).toBeTruthy()`                                      |

### AI-Native Test Checklist

Every TDD cycle for Xenboox must include:

```
AI-NATIVE TDD CHECK:
□ Test includes confidence field assertion?
□ Test verifies entity scoping (wrong entityId fails)?
□ Test checks audit trail is populated?
□ Test validates escalation path for low confidence?
□ Test confirms AI handles the work (not manual SaaS pattern)?
□ Test verifies narrative/reasoning is present?
```

### Evidence-Based Completion

```
EVIDENCE PACKAGE:
├── Tests written: [count]
├── All failing before impl: [verified]
├── All passing after impl: [verified]
├── AI-native patterns tested: [confidence, scoping, audit, escalation]
└── Coverage: [what's covered]
```
