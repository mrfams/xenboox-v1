---
name: code-review
description: Two-axis code review comparing code against project standards and the specification. Use after implementation, before merging PRs, and as part of the build workflow's review phase. Runs as parallel sub-agents for Standards vs Spec review.
license: MIT
metadata:
  author: mattpocock/skills
  category: code-quality
---

Run two parallel review tracks. Both must pass for approval.

## Track A: Standards Review

Check against the codebase's conventions:

### TypeScript

- [ ] No `any` types
- [ ] Strict mode OK
- [ ] Proper discriminated unions
- [ ] Zod schemas used for validation, not manual types

### Project Conventions (AGENTS.md)

- [ ] Entity scoping on every query
- [ ] Proper LangGraph state patterns
- [ ] Confidence scoring present
- [ ] LangFuse logging on agent actions
- [ ] Audit trail on mutations

### Performance

- [ ] No N+1 queries
- [ ] Proper indexes present
- [ ] No expensive computations in render loops
- [ ] Pagination on list endpoints

## Track B: Spec Review

Compare implementation against the spec/tickets:

- [ ] Does the implementation match the spec exactly?
- [ ] Are all acceptance criteria met?
- [ ] Are error states handled as specified?
- [ ] Are edge cases from the plan addressed?
- [ ] Is the API surface as designed?

## Output

```markdown
## Code Review

### Standards

✅ / ❌ [pass/fail]
Issues:

- [ ] location — description

### Spec

✅ / ❌ [pass/fail]
Issues:

- [ ] location — description

### Verdict: APPROVE / REVISE / BLOCKED
```
