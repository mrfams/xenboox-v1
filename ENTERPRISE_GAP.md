# ENTERPRISE_GAP.md — Production Readiness Audit

> Auto-generated audit. Every item is a blocking gap before production.
> Check off items as they are resolved. Update status column when done.
> Last audited: 2026-07-16

---

## CRITICAL — Ship Blockers (4)

- [ ] **C-01: Rotate Committed Credentials** `apps/web/.env` contains a real Neon database password and `AUTH_SECRET` in plaintext. Rotate both immediately. Scrub from git history with `git filter-branch` or BFG. Ensure `.env` is in `.gitignore` and `.env.local` is used locally.
  - Files: `apps/web/.env`, `.gitignore`
  - Owner: ____________
  - Status: NOT STARTED

- [ ] **C-02: Fix `@ts-nocheck` on 16/18 Router Files** All API endpoints have TypeScript type-checking disabled due to drizzle-orm dual-version resolution. Deduplicate the drizzle-orm dependency, or create a shared types package so routers are fully type-safe.
  - Files: All 16 files in `apps/web/server/routers/` with `@ts-nocheck`
  - Owner: ____________
  - Status: NOT STARTED

- [ ] **C-03: CI/CD Pipeline** No automated testing, linting, or type checking runs before deploy. Set up GitHub Actions: lint → typecheck → test → build → preview deploy. Block main merges on failure.
  - Files: `.github/workflows/ci.yml` (new)
  - Owner: ____________
  - Status: NOT STARTED

- [ ] **C-04: Wire Real LLM Calls into Agents** All 18 LangGraph agents have `callLLM()`/`streamLLM()` available but never import them. Every agent runs deterministic regex/DB logic only. Wire Claude Sonnet 4.6 (strategic) and Haiku 4.5 (worker) into agent nodes via the existing `core/llm/` infrastructure.
  - Files: All agent `nodes.ts` files (18 agents), `packages/agents/core/llm/agent-llm.ts`
  - Owner: ____________
  - Status: NOT STARTED

---

## HIGH — Must Fix Before Production (10)

- [ ] **H-01: Enable RLS in Production** RLS migration `0006` exists but Neon HTTP driver doesn't support `SET app.current_entity_id`. Switch to Neon WebSocket mode, or use PgBouncer transaction mode, so RLS policies actually enforce entity isolation at the DB layer.
  - Files: `packages/db/index.ts`, `packages/db/migrations/0006_enable_rls.sql`
  - Owner: ____________
  - Status: NOT STARTED

- [ ] **H-02: Register Manual Migrations in Drizzle Journal** Migrations 0006 (RLS), 0007 (idempotency), 0008 (security fields) are not in `meta/_journal.json`. Add them so `drizzle-kit migrate` tracks and executes them. Prevents environment drift.
  - Files: `packages/db/migrations/meta/_journal.json`
  - Owner: ____________
  - Status: NOT STARTED

- [ ] **H-03: Test Coverage on Critical Paths** Zero tests exist for: auth flows (login, register, lockout, password reset), entity scoping (the #1 security boundary), tRPC endpoint integration, input validation (Zod schemas), encryption/decryption, rate limiting. Minimum target: 80% coverage on auth + entity scoping + financial mutations.
  - Files: `apps/web/__tests__/` (new tests)
  - Owner: ____________
  - Status: NOT STARTED

- [ ] **H-04: Wire Password Reset Email** `auth.ts:124` generates a reset token but the Resend email call is commented out. Implement the email send and add a `/reset-password` page.
  - Files: `apps/web/server/routers/auth.ts`, `apps/web/app/(auth)/reset-password/page.tsx` (new)
  - Owner: ____________
  - Status: NOT STARTED

- [ ] **H-05: Code Splitting & Loading States** Zero `loading.tsx` files, zero `React.lazy()`, zero `next/dynamic()`. The entire dashboard ships as one JS chunk. Add route-level `loading.tsx` skeletons for every dashboard route group. Dynamic-import heavy components (chat, reports, documents).
  - Files: `apps/web/app/(dashboard)/*/loading.tsx` (new, ~12 files)
  - Owner: ____________
  - Status: NOT STARTED

- [ ] **H-06: Custom 404 Page** No `not-found.tsx` exists. Users hitting a bad URL see the Next.js default.
  - Files: `apps/web/app/not-found.tsx` (new)
  - Owner: ____________
  - Status: NOT STARTED

- [ ] **H-07: Tighten CSP Headers** `script-src` includes `'unsafe-inline'` and `'unsafe-eval'`. For production, use nonce-based CSP or hash-based CSP. At minimum, remove `unsafe-eval`.
  - Files: `apps/web/lib/security/headers.ts`, `apps/web/middleware.ts`
  - Owner: ____________
  - Status: NOT STARTED

- [ ] **H-08: CSRF Protection** No CSRF tokens implemented. Add CSRF token validation for all state-changing requests, or verify that SameSite cookies + double-submit pattern is in place.
  - Files: `apps/web/middleware.ts`, `apps/web/lib/auth/index.ts`
  - Owner: ____________
  - Status: NOT STARTED

- [ ] **H-09: Wire Client-Side Idempotency Key Generation** Server middleware is wired but the client never generates or sends the `x-idempotency-key` header for financial mutations.
  - Files: `apps/web/lib/trpc/` (client config), mutation hooks
  - Owner: ____________
  - Status: NOT STARTED

- [ ] **H-10: Add `mutateProcedure` to Remaining Critical Mutations** AP/AR payment creation, fixed asset disposal don't have idempotency protection.
  - Files: `apps/web/server/routers/ap.ts`, `apps/web/server/routers/ar.ts`, `apps/web/server/routers/fixedAssets.ts`
  - Owner: ____________
  - Status: NOT STARTED

---

## MEDIUM — Production Quality (15)

- [ ] **M-01: Fix Hardcoded Email Recipients** `fixedAssets.ts` and `inventory.ts` send notifications to `"admin@xenboox.com"`. Route to entity owner/admin via `userEntityAccess` query.
  - Files: `apps/web/server/routers/fixedAssets.ts`, `apps/web/server/routers/inventory.ts`
  - Owner: ____________
  - Status: NOT STARTED

- [ ] **M-02: Structured Logging** Only raw `console.*` calls. Add Pino or Winston with request ID correlation, log levels, and structured JSON output. Integrate with Vercel Logs or a log aggregation service.
  - Files: `apps/web/lib/logger.ts` (new), all router files, `apps/web/app/api/trpc/[trpc]/route.ts`
  - Owner: ____________
  - Status: NOT STARTED

- [ ] **M-03: Fix Dashboard Toast Mock** `dashboard/page.tsx:21` has `const toast = { error: (msg) => console.warn(...) }`. Replace with actual sonner toast.
  - Files: `apps/web/app/(dashboard)/dashboard/page.tsx`
  - Owner: ____________
  - Status: NOT STARTED

- [ ] **M-04: Wire Chat File Upload to R2** Chat attachments create a DB record but never upload the file. Implement presigned URL flow in the chat UI.
  - Files: `apps/web/app/(dashboard)/chat/page.tsx`, `apps/web/components/chat/`
  - Owner: ____________
  - Status: NOT STARTED

- [ ] **M-05: Build Settings Page** Change password form, notification preferences, security settings are all "coming soon" stubs.
  - Files: `apps/web/app/(dashboard)/settings/page.tsx`
  - Owner: ____________
  - Status: NOT STARTED

- [ ] **M-06: Desktop Treasury — Replace Mock Data** `pages/treasury/bank-accounts.tsx` shows hardcoded $520k/$150k/$670k. Wire to `trpc.treasury.listBankAccounts`.
  - Files: `apps/desktop/src/pages/treasury/bank-accounts.tsx`
  - Owner: ____________
  - Status: NOT STARTED

- [ ] **M-07: Desktop Documents Page — Implement Upload** Static empty-state page. Add file picker, upload to R2 via presigned URL, document list with status pipeline.
  - Files: `apps/desktop/src/pages/documents/documents.tsx`
  - Owner: ____________
  - Status: NOT STARTED

- [ ] **M-08: Desktop Reports Page — Implement Generation** Static cards. Wire to `trpc.reports.*` procedures for P&L, Balance Sheet, Trial Balance.
  - Files: `apps/desktop/src/pages/reports/reports.tsx`
  - Owner: ____________
  - Status: NOT STARTED

- [ ] **M-09: Desktop Entity Commands — Implement Tauri Backend** All 3 `entity.rs` commands are TODOs. Implement entity fetch from API, local caching, and switching.
  - Files: `apps/desktop/src-tauri/src/commands/entity.rs`
  - Owner: ____________
  - Status: NOT STARTED

- [ ] **M-10: Initialize Vault Client** `vault.ts` is implemented but `initVault()` is never called at startup. Either initialize or remove dead code.
  - Files: `packages/db/lib/vault.ts`, `apps/web/lib/trpc/server.ts`
  - Owner: ____________
  - Status: NOT STARTED

- [ ] **M-11: Fix Mobile Journal Create `periodId`** Hardcoded UUID `"00000000-0000-0000-0000-000000000013"` instead of fetching current open period.
  - Files: `apps/mobile/app/(modules)/journal/create.tsx`
  - Owner: ____________
  - Status: NOT STARTED

- [ ] **M-12: Remove Plaintext Password from Seed Output** `console.log('demo@xenboox.com (password: demo1234)')` in seed.
  - Files: `packages/db/seed/index.ts`
  - Owner: ____________
  - Status: NOT STARTED

- [ ] **M-13: Fix Test Setup — Remove Supabase References** `vitest setup.ts` references `NEXT_PUBLIC_SUPABUSE_URL`. Supabase is not in the stack. Remove dead code.
  - Files: `apps/web/src/test/setup.ts`
  - Owner: ____________
  - Status: NOT STARTED

- [ ] **M-14: Desktop Add Dialog Error Handling** None of the 5 desktop add dialogs have `onError` handlers. Mutation errors silently fail.
  - Files: `apps/desktop/src/pages/*/add-*-dialog.tsx` (5 files)
  - Owner: ____________
  - Status: NOT STARTED

- [ ] **M-15: Desktop COA Page — Wire Real Data** Shows journal entry counts instead of actual chart of accounts structure. Wire to `trpc.coa.*`.
  - Files: `apps/desktop/src/pages/coa/coa.tsx`
  - Owner: ____________
  - Status: NOT STARTED

---

## LOW — Polish & Technical Debt (7)

- [ ] **L-01: Update DATABASE.md** Schema documentation is ~70% accurate. 9+ tables undocumented. Enums differ between docs and code. Sync with actual Drizzle schema.
  - Files: `DATABASE.md`
  - Owner: ____________
  - Status: NOT STARTED

- [ ] **L-02: Mobile tRPC Client — Fix `any` Typing** `createTRPCReact<any>()`. Create a shared API types package or generate types from the app router.
  - Files: `apps/mobile/lib/trpc.ts`, `packages/api/` (new)
  - Owner: ____________
  - Status: NOT STARTED

- [ ] **L-03: Desktop `lib.rs` / `main.rs` Consolidation** Both define a `run()` function. Remove duplication — keep one entry point.
  - Files: `apps/desktop/src-tauri/src/main.rs`, `apps/desktop/src-tauri/src/lib.rs`
  - Owner: ____________
  - Status: NOT STARTED

- [ ] **L-04: Pre-commit Hooks** No husky, no lint-staged. Add pre-commit hooks that run lint + typecheck.
  - Files: `.husky/pre-commit`, `package.json` (root)
  - Owner: ____________
  - Status: NOT STARTED

- [ ] **L-05: Agent Orchestrator `as any` Casts** 5 call sites cast `getAgentGraph` returns to work around TS2590. Refactor to eliminate union type depth issue.
  - Files: `packages/agents/core/orchestrator.ts`, `packages/agents/tier1/cfo-agent/nodes.ts`
  - Owner: ____________
  - Status: NOT STARTED

- [ ] **L-06: Desktop Warehouse Add Dialog** "Add Warehouse" button exists but has no dialog wired.
  - Files: `apps/desktop/src/pages/inventory/warehouses.tsx`
  - Owner: ____________
  - Status: NOT STARTED

- [ ] **L-07: Mobile Auth Token Refresh** No token expiration handling. Tokens live forever until manual logout.
  - Files: `apps/mobile/lib/auth.ts`, `apps/mobile/app/_layout.tsx`
  - Owner: ____________
  - Status: NOT STARTED

---

## Summary

| Severity | Count | Resolved | Remaining |
|----------|-------|----------|-----------|
| CRITICAL | 4 | 0 | 4 |
| HIGH | 10 | 0 | 10 |
| MEDIUM | 15 | 0 | 15 |
| LOW | 7 | 0 | 7 |
| **TOTAL** | **36** | **0** | **36** |

---

## Resolution Phases

### Phase 1 — Security & Credentials (Day 1)
C-01, H-07, H-08, M-12, M-13

### Phase 2 — Type Safety & CI (Day 1-2)
C-02, C-03, L-04

### Phase 3 — Agent LLM Integration (Day 2-4)
C-04, L-05

### Phase 4 — Auth & Security Hardening (Day 3-4)
H-01, H-02, H-04, H-09, H-10, M-10

### Phase 5 — Frontend Production (Day 4-6)
H-05, H-06, M-03, M-05, M-14, M-15, L-06

### Phase 6 — Backend Completeness (Day 5-7)
M-01, M-02, M-04, M-06, M-07, M-08, M-11

### Phase 7 — Desktop & Mobile Polish (Day 7-8)
M-09, L-02, L-03, L-07

### Phase 8 — Testing (Day 8-10)
H-03

### Phase 9 — Documentation (Day 10)
L-01

---

*This file is the single source of truth for production readiness. Update after every resolution.*
