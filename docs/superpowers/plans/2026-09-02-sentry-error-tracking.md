# Sentry Error Tracking — Full-Stack Implementation Plan

> **For agentic workers:** Use howtowork.md methodology. 12 loops per layer. TDD. Graph engineering.

**Goal:** Wire Sentry error tracking across every layer of the stack so that ALL errors — server-side tRPC, client-side React, agent failures, edge middleware — are captured with user context, entity context, and performance traces. Production-grade and enterprise-grade.

**Architecture:** Sentry is already partially installed (`@sentry/nextjs` v10.70.0, config files exist, `withSentryConfig` in next.config.ts). The gap is integration: server-side tRPC errors don't reach Sentry, no user/entity context is attached, no performance spans exist, and `console.error` calls bypass Sentry entirely.

**Tech Stack:** `@sentry/nextjs` v10.70.0, Next.js 15, tRPC, Drizzle ORM, Pino logger

**Spec:** `roadtoprod.md` P0 #1 — Error Tracking (Sentry)

---

## Current State Analysis

### What Already Exists (Verified)

| Component                  | Status | File                                                  |
| -------------------------- | ------ | ----------------------------------------------------- |
| `@sentry/nextjs` installed | ✅     | `package.json` (v10.70.0)                             |
| `sentry.client.config.ts`  | ✅     | Browser tracing, replay, DSN                          |
| `sentry.server.config.ts`  | ✅     | DSN, prismaIntegration (wrong — we use Drizzle)       |
| `sentry.edge.config.ts`    | ✅     | DSN                                                   |
| `instrumentation.ts`       | ✅     | `onRequestError` hook                                 |
| `next.config.ts`           | ✅     | `withSentryConfig`, source maps, tunnel `/api/sentry` |
| `app/error.tsx`            | ✅     | `Sentry.captureException`                             |
| `app/global-error.tsx`     | ✅     | `Sentry.captureException`                             |
| Error boundary             | ✅     | Dynamic import of `@sentry/nextjs`                    |

### What's Broken / Missing

| Gap                                                  | Impact                              | Layer           |
| ---------------------------------------------------- | ----------------------------------- | --------------- |
| `handleMutationError` doesn't call Sentry            | All tRPC server errors invisible    | tRPC Router     |
| Error formatter logs to Pino only                    | INTERNAL_SERVER_ERROR not in Sentry | tRPC Router     |
| No `Sentry.setUser()` in auth middleware             | Can't attribute errors to users     | tRPC Middleware |
| No `Sentry.setContext()` for entity                  | Can't scope errors to entity        | tRPC Middleware |
| `sentry.server.config.ts` uses `prismaIntegration()` | Wrong ORM (we use Drizzle)          | Config          |
| `enabled` requires `SENTRY_DSN` env var              | Silent fail if not set              | Config          |
| `console.error` calls (226+) bypass Sentry           | Errors lost to stdout               | All layers      |
| No `Sentry.withScope()` in error handlers            | No breadcrumbs, no tags             | tRPC/Agents     |
| No performance spans on server                       | No API latency tracking             | tRPC Middleware |
| No agent error reporting                             | Agent failures invisible            | Agent Layer     |

---

## Global Constraints

- TypeScript strict mode — no `any` types
- Entity scoping on every query — `entityId` always present
- Zod validation on every input
- No secrets in code — DSN is public, auth tokens are env vars
- All tests must pass before sign-off
- Follow existing patterns: `handleMutationError`, `logger`, `tracingMiddleware`

---

## Task 1: Sentry Server Config Fix + DSN Setup

**Files:**

- Modify: `apps/web/sentry.server.config.ts`
- Modify: `apps/web/sentry.client.config.ts`
- Modify: `apps/web/sentry.edge.config.ts`
- Create: `apps/web/.env.example` (document SENTRY_DSN)

**What changes:**

- Remove `prismaIntegration()` (we use Drizzle, not Prisma)
- Add `Sentry.init()` with proper Drizzle-friendly config
- Add ` beforeSend` to strip sensitive data
- Add environment-based sampling rates
- Document required env vars

**TDD:**

- [ ] Step 1: Write test — `sentry-init.test.ts` — verify `Sentry.init` is called with DSN
- [ ] Step 2: Run test — should PASS (config already calls init)
- [ ] Step 3: Fix server config — remove prismaIntegration, add beforeSend
- [ ] Step 4: Run test — should still PASS
- [ ] Step 5: Run typecheck — `pnpm typecheck --filter=web`

---

## Task 2: tRPC Error Handler → Sentry Integration

**Files:**

- Modify: `apps/web/lib/trpc/server.ts` (handleMutationError + errorFormatter)
- Create: `apps/web/lib/sentry.ts` (shared Sentry helper)
- Create: `apps/web/__tests__/sentry-integration.test.ts`

**What changes:**

- Create `lib/sentry.ts` with helpers: `reportToSentry(error, context)`, `setSentryUser(session)`, `setSentryEntity(entityId, entityName)`
- Update `handleMutationError` to call `reportToSentry` before throwing
- Update `errorFormatter` to call `Sentry.captureException` for INTERNAL_SERVER_ERROR
- Add `Sentry.withScope` for breadcrumbs and tags

**TDD:**

- [ ] Step 1: Write test — verify `handleMutationError` calls `Sentry.captureException`
- [ ] Step 2: Run test — should FAIL (Sentry not called yet)
- [ ] Step 3: Implement `lib/sentry.ts` helper
- [ ] Step 4: Update `handleMutationError` to use helper
- [ ] Step 5: Run test — should PASS
- [ ] Step 6: Write test — verify error formatter calls Sentry for 500 errors
- [ ] Step 7: Run test — should FAIL
- [ ] Step 8: Update error formatter
- [ ] Step 9: Run test — should PASS
- [ ] Step 10: Run typecheck + lint

---

## Task 3: Auth Middleware → Sentry User/Entity Context

**Files:**

- Modify: `apps/web/lib/trpc/server.ts` (authMiddleware, entityScopingMiddleware)
- Create: `apps/web/__tests__/sentry-context.test.ts`

**What changes:**

- In `authMiddleware`: call `Sentry.setUser({ id, email, username })` after session validation
- In `entityScopingMiddleware`: call `Sentry.setContext("entity", { id, name, currency })` after entity resolution
- Clear user context on logout (if possible via middleware)

**TDD:**

- [ ] Step 1: Write test — verify `authMiddleware` calls `Sentry.setUser`
- [ ] Step 2: Run test — should FAIL
- [ ] Step 3: Add `Sentry.setUser` to authMiddleware
- [ ] Step 4: Run test — should PASS
- [ ] Step 5: Write test — verify `entityScopingMiddleware` calls `Sentry.setContext`
- [ ] Step 6: Run test — should FAIL
- [ ] Step 7: Add `Sentry.setContext` to entityScopingMiddleware
- [ ] Step 8: Run test — should PASS
- [ ] Step 9: Run typecheck + lint

---

## Task 4: Frontend Error Boundary → Sentry Hardening

**Files:**

- Modify: `apps/web/components/shared/error-boundary.tsx`
- Modify: `apps/web/app/error.tsx`
- Modify: `apps/web/app/global-error.tsx`
- Create: `apps/web/__tests__/error-boundary-sentry.test.tsx`

**What changes:**

- Error boundary: replace dynamic import try/catch with direct `Sentry.captureException`
- Add `Sentry.withScope` to set surface, action, retryCount tags
- Add `Sentry.addBreadcrumb` for user actions before error
- Ensure `error.tsx` and `global-error.tsx` set tags (route, component)

**TDD:**

- [ ] Step 1: Write test — verify error boundary calls `Sentry.captureException` with tags
- [ ] Step 2: Run test — should FAIL (current impl is silent-fail)
- [ ] Step 3: Update error boundary
- [ ] Step 4: Run test — should PASS
- [ ] Step 5: Write test — verify `error.tsx` sets route tag
- [ ] Step 6: Run test — should FAIL
- [ ] Step 7: Update `error.tsx`
- [ ] Step 8: Run test — should PASS
- [ ] Step 9: Run typecheck + lint

---

## Task 5: Agent Error Reporting → Sentry

**Files:**

- Modify: `packages/agents/core/orchestrator.ts`
- Create: `packages/agents/core/sentry.ts`
- Create: `packages/agents/__tests__/agent-sentry.test.ts`

**What changes:**

- Create agent Sentry helper that captures agent failures with context (agent name, tier, confidence, entity)
- Wire into orchestrator error handling
- Add `Sentry.withScope` for agent-specific tags

**TDD:**

- [ ] Step 1: Write test — verify agent error calls `Sentry.captureException`
- [ ] Step 2: Run test — should FAIL
- [ ] Step 3: Implement `packages/agents/core/sentry.ts`
- [ ] Step 4: Wire into orchestrator
- [ ] Step 5: Run test — should PASS
- [ ] Step 6: Run typecheck + lint

---

## Task 6: Console.error → Sentry Bridge

**Files:**

- Modify: `apps/web/lib/logger.ts`
- Create: `apps/web/__tests__/logger-sentry.test.ts`

**What changes:**

- Add a Pino destination that also sends `error` and `fatal` level logs to `Sentry.captureException`
- This bridges all `console.error` / `logger.error` calls to Sentry without modifying 226+ call sites

**TDD:**

- [ ] Step 1: Write test — verify logger.error calls Sentry
- [ ] Step 2: Run test — should FAIL
- [ ] Step 3: Add Sentry bridge to logger
- [ ] Step 4: Run test — should PASS
- [ ] Step 5: Run typecheck + lint

---

## Task 7: tRPC Performance Spans → Sentry APM

**Files:**

- Modify: `apps/web/lib/trpc/tracing-middleware.ts` (or create if needed)
- Create: `apps/web/__tests__/sentry-tracing.test.ts`

**What changes:**

- Create Sentry transaction span for each tRPC procedure call
- Set span data: procedure name, entity ID, user ID
- Finish span on completion with duration

**TDD:**

- [ ] Step 1: Write test — verify tRPC procedure creates Sentry span
- [ ] Step 2: Run test — should FAIL
- [ ] Step 3: Implement Sentry tracing middleware
- [ ] Step 4: Run test — should PASS
- [ ] Step 5: Run typecheck + lint

---

## Task 8: E2E Verification + Environment Config

**Files:**

- Create: `apps/web/__tests__/sentry-e2e.test.ts`
- Modify: `apps/web/.env.example` (if created)

**What changes:**

- End-to-end test: trigger a tRPC error, verify it reaches Sentry (mock)
- Verify user context is set
- Verify entity context is set
- Verify performance spans exist
- Document all required env vars

**TDD:**

- [ ] Step 1: Write E2E test — full error flow
- [ ] Step 2: Run test — should PASS (all mocks wired)
- [ ] Step 3: Run full test suite — `pnpm test --filter=web`
- [ ] Step 4: Run typecheck — `pnpm typecheck --filter=web`
- [ ] Step 5: Run lint — `pnpm lint`

---

## Task 9: CI/CD Integration + Verification

**Files:**

- Verify: `.github/workflows/ci.yml` (Sentry env vars in CI)
- Create: `apps/web/__tests__/sentry-build.test.ts`

**What changes:**

- Verify Sentry source maps upload in CI build
- Verify `SENTRY_DSN` is required in production builds
- Add Sentry health check to CI

**TDD:**

- [ ] Step 1: Write build verification test
- [ ] Step 2: Run test — should PASS
- [ ] Step 3: Verify CI workflow has Sentry env vars
- [ ] Step 4: Run full test suite

---

## Task 10: Documentation + ARCHITECTURE.md Update

**Files:**

- Modify: `ARCHITECTURE.md` (add Sentry section)
- Modify: `BUILD_LOG.md` (log this session)

**What changes:**

- Document Sentry architecture: client/server/edge init, tRPC integration, agent integration
- Document env vars required
- Document error flow: tRPC → handleMutationError → Sentry → Alert
- Log session in BUILD_LOG.md

---

## Task 11: Seed Data + Demo Verification

**Files:**

- Verify: Seed data doesn't leak into Sentry (PII)
- Create: Test that Sentry redacts sensitive fields

**What changes:**

- Verify `beforeSend` strips passwords, tokens, API keys
- Verify entity data is included but PII is redacted
- Test with mock Sentry transport

**TDD:**

- [ ] Step 1: Write PII redaction test
- [ ] Step 2: Run test — should PASS
- [ ] Step 3: Verify redaction in `beforeSend`

---

## Task 12: Final Quality Gate — Full Stack Verification

**Verification Commands:**

```bash
pnpm typecheck --filter=web
pnpm typecheck --filter=agents
pnpm lint --filter=web
pnpm test --filter=web
pnpm test --filter=agents
```

**Sign-off Checklist:**

- [ ] All tests pass (unit, integration, E2E)
- [ ] Typecheck clean (zero errors)
- [ ] Lint clean (zero errors)
- [ ] Sentry captures server errors (verified via mock)
- [ ] Sentry captures client errors (verified via mock)
- [ ] Sentry captures agent errors (verified via mock)
- [ ] User context attached (verified via mock)
- [ ] Entity context attached (verified via mock)
- [ ] Performance spans created (verified via mock)
- [ ] Console.error bridged to Sentry (verified via mock)
- [ ] PII redaction working (verified via test)
- [ ] Source maps upload configured
- [ ] Documentation updated
- [ ] BUILD_LOG.md updated

---

## File Structure

```
apps/web/
├── lib/
│   ├── sentry.ts                          # NEW — shared Sentry helpers
│   ├── logger.ts                          # MODIFY — add Sentry bridge
│   └── trpc/
│       └── server.ts                      # MODIFY — error handler + context
├── sentry.client.config.ts                # MODIFY — remove prismaIntegration
├── sentry.server.config.ts                # MODIFY — remove prismaIntegration
├── sentry.edge.config.ts                  # MODIFY — verify config
├── components/shared/
│   └── error-boundary.tsx                 # MODIFY — harden Sentry capture
├── app/
│   ├── error.tsx                          # MODIFY — add tags
│   ├── global-error.tsx                   # MODIFY — add tags
│   └── .env.example                       # NEW — document SENTRY_DSN
├── __tests__/
│   ├── sentry-integration.test.ts         # NEW — tRPC error → Sentry
│   ├── sentry-context.test.ts             # NEW — user/entity context
│   ├── error-boundary-sentry.test.tsx     # NEW — client error capture
│   ├── logger-sentry.test.ts              # NEW — console.error bridge
│   ├── sentry-tracing.test.ts             # NEW — performance spans
│   ├── sentry-e2e.test.ts                 # NEW — full flow
│   ├── sentry-build.test.ts               # NEW — build verification
│   └── sentry-pii-redaction.test.ts       # NEW — PII stripping
packages/agents/
├── core/
│   ├── sentry.ts                          # NEW — agent Sentry helper
│   └── orchestrator.ts                    # MODIFY — wire error reporting
├── __tests__/
│   └── agent-sentry.test.ts               # NEW — agent error capture
```

---

## Employee Communication Plan (Graph)

| Employee    | Task           | Reads From                      | Challenges                                       |
| ----------- | -------------- | ------------------------------- | ------------------------------------------------ |
| Eng Lead    | Tasks 2, 3, 7  | Security findings, CFO findings | "Does entity context cover all routers?"         |
| Security    | Tasks 1, 6, 11 | Eng Lead findings               | "Does PII redaction cover all fields?"           |
| DevOps      | Tasks 1, 9     | Eng Lead findings               | "Are env vars documented?"                       |
| QA          | Tasks 2-8, 12  | All employees                   | "Do tests actually verify Sentry calls?"         |
| CFO         | Task 3         | Eng Lead findings               | "Is entity context accurate for financial data?" |
| PM          | Task 4         | Design findings                 | "Are error messages user-friendly?"              |
| Tech Writer | Task 10        | All employees                   | "Is documentation complete?"                     |

---

_Plan written: September 2, 2026_
_Issue: P0 #1 — Error Tracking (Sentry)_
_Methodology: howtowork.md — 12 loops, TDD, graph engineering_
