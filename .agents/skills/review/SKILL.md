---
name: review
description: Production-quality code review that checks correctness, security, performance, style, and entity scoping. Use after implementing any feature or fix, before merging. Reviews against Xenboox conventions and general best practices.
license: MIT
metadata:
  author: garrytan/gstack
  category: code-quality
---

Review code against these dimensions. Report findings with severity (blocking, warning, suggestion).

## 1. Correctness

- Does the code do what it's supposed to?
- Are there off-by-one or edge-case bugs?
- Are error paths handled? (not just happy path)
- Are async operations properly awaited?
- Are transactions rollback on failure?

## 2. Entity Scoping (Xenboox Critical)

- Every DB query includes `entityId` filter
- No unscoped `findMany()` calls
- Cross-entity access attempts return 403

## 3. Security

- Input validated with zod schemas
- No raw SQL injection vectors
- No secrets or tokens in code
- No direct user input in DB queries
- Rate limiting on mutation endpoints

## 4. Performance

- N+1 queries in loops?
- Missing indexes on filtered columns?
- Unnecessary re-renders in React components?
- Large payloads without pagination?

## 5. TypeScript Safety

- No `any` types
- Strict mode violations?
- Proper discriminated unions for state
- Zod inference instead of manual types

## 6. Error Handling

- Errors return structured responses (not thrown strings)
- TRPCError with proper codes
- User-facing errors in plain English
- All errors logged with context

## Output Format

```
## Review: [file/scope]

### Blocking (must fix before merge)
- [ ] issue description (location)

### Warnings (should fix)
- [ ] issue description (location)

### Suggestions (nice to have)
- [ ] issue description (location)
```
