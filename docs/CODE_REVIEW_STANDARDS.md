# Code Review Standards

> Mandatory standards for all code reviews on the Xenboox codebase.

---

## Principles

1. **Correctness over style** — Does it work? Does it handle edge cases?
2. **Security first** — Entity scoping, input validation, no secrets in code
3. **Readability** — Will someone understand this in 6 months?
4. **Simplicity** — The simplest solution that works is the best solution

---

## Required Checks

### TypeScript

- [ ] Strict mode — no `any` types allowed
- [ ] Prefer `type` over `interface` for new code
- [ ] All function parameters typed
- [ ] No unused imports or variables

### Database

- [ ] Every query scoped to `entityId`
- [ ] Use `pgEnum` for status fields, never raw strings
- [ ] No N+1 queries — batch or join
- [ ] Indexes on frequently queried columns

### API (tRPC)

- [ ] Zod validation on every procedure input
- [ ] `protectedProcedure` for authenticated endpoints
- [ ] Entity scoping in middleware, not in each handler
- [ ] Error messages are plain English, not stack traces

### React / Next.js

- [ ] Server Components by default
- [ ] `"use client"` only when state/effects are needed
- [ ] Colocate components with their route
- [ ] No inline styles — use Tailwind classes

### Security

- [ ] No hardcoded secrets, keys, or tokens
- [ ] No `console.log` with sensitive data
- [ ] CSRF protection on form submissions
- [ ] Rate limiting on public endpoints

### Accessibility

- [ ] `aria-label` on all icon-only buttons
- [ ] Semantic HTML (headings, landmarks, lists)
- [ ] Focus management for modals and dialogs
- [ ] Color contrast meets WCAG AA

---

## Review Process

1. **Author** self-reviews before requesting review
2. **Reviewer** checks required items above
3. **Feedback** must be actionable — suggest specific changes
4. **Approval** requires at least 1 approval with all checks passing
5. **Merge** only after CI passes and all conversations resolved

---

## Common Issues to Watch For

| Issue                  | Why It Matters                    |
| ---------------------- | --------------------------------- |
| Missing entity scoping | Data leak across tenants          |
| Silent `catch {}`      | Errors disappear, bugs hide       |
| Hardcoded colors       | Breaks dark mode, inconsistent UI |
| Missing error handling | User sees blank screen on failure |
| No loading states      | Poor UX during data fetching      |
| `any` types            | Defeats TypeScript's purpose      |
| Inline `console.log`   | Leaks data, clutters output       |

---

_Last updated: August 2026_
