# PRODUCTION_PLAN.md — Engineering Execution Plan

> CTO-level strategy + Architect-level design + Senior Engineer execution tasks.
> Resolves all 36 gaps from ENTERPRISE_GAP.md.
> Written: 2026-07-16 | Target: Production-grade in 10 working days.

---

## Executive Summary

Xenboox has a solid architectural foundation — 18 LangGraph agents, 20 tRPC routers, 3 client surfaces, comprehensive DB schema. But it's running on deterministic logic pretending to be AI, has zero test coverage on critical security paths, no CI/CD, committed credentials, and several placeholder pages.

This plan resolves every gap in 9 phases over 10 days, ordered by blast radius: security first, then correctness, then completeness, then polish.

---

## Phase 1 — Security & Credentials (Day 1)

**Goal:** Eliminate all active security vulnerabilities before touching anything else.

### 1A. Rotate Committed Credentials [C-01]

**Technical approach:**
1. Generate new Neon database password via Neon console
2. Generate new `AUTH_SECRET` via `openssl rand -base64 32`
3. Update `apps/web/.env` with new values (this file should never be committed)
4. Add `apps/web/.env` to `.gitignore` explicitly (verify it's there)
5. Scrub git history using BFG Repo-Cleaner:
   ```bash
   bfg --replace-text passwords.txt  # passwords.txt contains old values
   git reflog expire --expire=now --all && git gc --prune=now --aggressive
   ```
6. Force push and ensure all team members re-clone
7. Create `.env.local` as the local dev file (never committed)
8. Verify Vercel env vars are set correctly (not from .env)

**Verification:** `git log --all --diff-filter=A -- "*.env"` returns nothing after scrub.

### 1B. Tighten CSP Headers [H-07]

**Technical approach:**
1. Next.js requires `unsafe-inline` for styled-components and inline styles — keep for `style-src` only
2. Remove `unsafe-eval` from `script-src` entirely
3. Add nonce-based CSP for inline scripts using Next.js `nonce` prop:
   ```typescript
   // middleware.ts — generate per-request nonce
   const nonce = crypto.randomBytes(16).toString('base64')
   // Pass via header, read in layout.tsx
   ```
4. Add `strict-dynamic` to `script-src` so dynamically loaded scripts inherit the nonce
5. Keep `'self'` as the base domain allowlist

**Files:** `apps/web/lib/security/headers.ts`, `apps/web/middleware.ts`, `apps/web/app/layout.tsx`

**Verification:** Run Lighthouse security audit. CSP violations in console = not done.

### 1C. CSRF Protection [H-08]

**Technical approach:**
Auth.js v5 uses JWT strategy with `SameSite: lax` cookies. Combined with tRPC's JSON POST body parsing, CSRF risk is low. But for financial data, we add defense-in-depth:

1. Implement double-submit cookie pattern:
   - Generate random CSRF token on login
   - Store in `SameSite: strict` cookie (separate from auth cookie)
   - Require `X-CSRF-Token` header on all mutation requests
   - Middleware validates header matches cookie value
2. Alternative (simpler): Use `Origin`/`Referer` header validation in middleware

**Recommendation:** Start with Origin validation (lower effort, high value). Add full CSRF tokens only if we need cross-origin support later.

**Files:** `apps/web/middleware.ts`

### 1D. Remove Seed Password Logging [M-12]

Replace `console.log` with a placeholder:
```typescript
console.log('Demo credentials: see seed documentation or run with --show-credentials flag')
```

**Files:** `packages/db/seed/index.ts`

### 1E. Fix Test Setup Supabase References [M-13]

Remove `NEXT_PUBLIC_SUPABUSE_URL` and `NEXT_PUBLIC_SUPABASE_KEY` from test setup. Replace with actual Xenboox env vars or remove entirely.

**Files:** `apps/web/src/test/setup.ts`

---

## Phase 2 — Type Safety & CI/CD (Day 1-2)

**Goal:** Make the codebase self-validating. Every push gets linted, typechecked, and tested before it can reach production.

### 2A. Fix `@ts-nocheck` on 16 Router Files [C-02]

**Root cause analysis:**
drizzle-orm resolves to two different copies in the pnpm store because `@xenboox/db` and `apps/web` have different transitive dependency trees. The `eq()` / `and()` / `desc()` functions come from different drizzle-orm instances, causing type incompatibility.

**Technical approach (3 options, ranked by preference):**

**Option A — pnpm catalog (recommended):**
pnpm 9.12+ supports `catalogs` in `pnpm-workspace.yaml`. Force all packages to use the same drizzle-orm version:
```yaml
# pnpm-workspace.yaml
catalogs:
  default:
    drizzle-orm: ^0.38.0
```

**Option B — Workspace protocol:**
Pin drizzle-orm to root `package.json` with `pnpm.overrides` (pnpm 9.12 supports this in root package.json, not workspace yaml):
```json
{
  "pnpm": {
    "overrides": {
      "drizzle-orm": "0.38.0"
    }
  }
}
```

**Option C — Shared types package:**
Create `packages/types/` that re-exports drizzle query types. All routers import from there. Most work, cleanest long-term.

**Execution:**
1. Try Option A first — add catalog entry, run `pnpm install`
2. If that fails, try Option B
3. Remove all `@ts-nocheck` comments from router files
4. Fix any type errors that surface (expect 5-15 based on the earlier 23-error fix session)
5. Verify with `pnpm typecheck`

**Verification:** `grep -r "@ts-nocheck" apps/web/server/routers/` returns zero matches.

### 2B. CI/CD Pipeline [C-03]

**Technical approach:**
```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build

  preview:
    needs: quality
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

  deploy:
    needs: quality
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

**Verification:** Open a PR, see checks run automatically.

### 2C. Pre-commit Hooks [L-04]

```bash
pnpm add -Dw husky lint-staged
npx husky init
```

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": ["pnpm lint --fix", "pnpm typecheck"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

```bash
# .husky/pre-commit
pnpm lint-staged
```

**Verification:** Make a change with a type error, commit is blocked.

---

## Phase 3 — Agent LLM Integration (Day 2-4)

**Goal:** Make the AI agents actually intelligent. This is the core product differentiator.

### 3A. Wire Real LLM Calls into Agents [C-04]

**Current state:** 18 agents with full StateGraph definitions, system prompts, tools, and DB operations — but zero LLM calls. Every decision is made by regex or hardcoded rules.

**Architecture:**

```
Agent Node receives input
    ↓
Build prompt from system prompt + state context
    ↓
callLLM() with prompt + tools
    ↓
Parse LLM response (structured output or tool calls)
    ↓
Update state with result + confidence
    ↓
Next node
```

**Execution order (by impact):**

**Wave 1 — CFO Agent (strategic, highest visibility):**
1. `cfo-agent/nodes.ts` — `classifyInstruction` node: Replace regex with LLM classification
2. `cfo-agent/nodes.ts` — `routeToDepartment` node: LLM decides which department head to invoke
3. `cfo-agent/nodes.ts` — `generateSummary` node: LLM produces plain-English financial summaries
4. Use Sonnet 4.6 for all CFO decisions (complex reasoning)

**Wave 2 — Management Layer (4 agents):**
1. `controller-agent/nodes.ts` — Review journal entries with LLM reasoning
2. `treasury-agent/nodes.ts` — Cash position analysis, reconciliation review
3. `payroll-manager-agent/nodes.ts` — Payroll validation with jurisdiction awareness
4. `compliance-agent/nodes.ts` — Filing deadline assessment, risk evaluation
5. Use Sonnet 4.6 for management decisions

**Wave 3 — Worker Layer (10 agents):**
1. `ledger-agent/nodes.ts` — Keep deterministic (double-entry is math, not opinion)
2. `ap-agent/nodes.ts` — LLM for invoice categorization, supplier matching
3. `ar-agent/nodes.ts` — LLM for payment matching, aging analysis
4. `reconciliation-agent/nodes.ts` — LLM for transaction matching (multi-factor)
5. `cash-agent/nodes.ts` — Keep mostly deterministic (discrepancy detection is rules-based)
6. `mobile-money-agent/nodes.ts` — LLM for statement parsing, fee categorization
7. `payroll-worker-agent/nodes.ts` — Keep deterministic (tax math is rules-based)
8. Use Haiku 4.5 for worker tasks (cost-effective, fast)

**Wave 4 — Platform Agents (4 agents):**
1. `reporting-agent/nodes.ts` — LLM for narrative summaries, plain-English explanations
2. `budget-agent/nodes.ts` — LLM for variance analysis explanations
3. `analytics-agent/nodes.ts` — LLM for anomaly interpretation, trend descriptions
4. `document-agent/nodes.ts` — LLM for document classification, data extraction
5. Use Haiku 4.5 for routine, Sonnet for complex

**Implementation pattern (per node):**
```typescript
// Before (deterministic):
const classifyInstruction = (state: CFOState) => {
  const category = state.userMessage.toLowerCase().match(/profit|loss|income/)
    ? 'reporting' : state.userMessage.match(/pay|salary/)
    ? 'payroll' : 'general'
  return { category, confidence: 0.5 }
}

// After (LLM-powered):
const classifyInstruction = async (state: CFOState) => {
  const result = await callLLM({
    model: 'haiku',
    system: prompts.classifyInstruction,
    prompt: `Classify this user instruction: "${state.userMessage}"`,
    tools: [reportingTool, payrollTool, apTool, arTool, treasuryTool],
    trace: { name: 'cfo-classify', entityId: state.entityId }
  })
  return {
    category: result.toolCalls[0]?.name || 'general',
    confidence: result.confidence,
    reasoning: result.reasoning
  }
}
```

**Key constraints:**
- Every LLM call must be traced via LangFuse (already integrated in `callLLM()`)
- Every LLM output must include `confidence` field
- Confidence < 0.7 → escalate to supervisor
- Confidence < 0.4 → escalate to human
- Never let LLM touch double-entry math or constraint validation

**Verification:** Send a test message through the CFO agent, verify it reaches the correct department via LLM classification (not regex). Check LangFuse traces.

### 3B. Fix Orchestrator `as any` Casts [L-05]

**Root cause:** `getAgentGraph()` returns a union of 18 compiled graph types. TypeScript can't represent a union that deep (TS2590).

**Technical approach:**
1. Create a common `AgentGraph` interface that all compiled graphs implement:
   ```typescript
   interface AgentGraph {
     invoke(state: any): Promise<any>
     stream(state: any): AsyncGenerator<any>
     compile(): any
   }
   ```
2. Cast the return of `getAgentGraph()` to `AgentGraph` once at the call site
3. Remove all 5 `as any` casts

**Files:** `packages/agents/core/orchestrator.ts`, `packages/agents/tier1/cfo-agent/nodes.ts`

---

## Phase 4 — Auth & Security Hardening (Day 3-4)

**Goal:** Complete all authentication, authorization, and data protection paths.

### 4A. Enable RLS in Production [H-01]

**Technical approach:**
Neon HTTP driver doesn't support session variables. Two options:

**Option A — Switch to WebSocket (recommended):**
1. Use `@neondatabase/serverless` with WebSocket support:
   ```typescript
   import { neonConfig, Pool } from '@neondatabase/serverless'
   import ws from 'ws'
   neonConfig.webSocketConstructor = ws
   const pool = new Pool({ connectionString: process.env.DATABASE_URL })
   ```
2. In Drizzle, use the pool instead of neon HTTP:
   ```typescript
   import { drizzle } from 'drizzle-orm/node-postgres'
   const db = drizzle(pool)
   ```
3. Before each query, set session variable:
   ```typescript
   await pool.query(`SET app.current_entity_id = $1`, [entityId])
   ```
4. This enables RLS policies to actually work

**Option B — Keep HTTP, rely on app-level scoping:**
Application-level entity scoping in tRPC middleware is already correct and comprehensive. RLS is defense-in-depth. Document that RLS is "ready but inactive until WebSocket mode is enabled."

**Recommendation:** Option B for now (lower risk, app-level scoping is solid). Option A in Phase 2 when we have time to test thoroughly.

### 4B. Register Manual Migrations [H-02]

Add entries to `packages/db/migrations/meta/_journal.json`:
```json
{
  "version": "6",
  "when": 1721088000000,
  "tag": "0006_enable_rls",
  "breakpoints": true
},
{
  "version": "7",
  "when": 1721088001000,
  "tag": "0007_idempotency_keys",
  "breakpoints": true
},
{
  "version": "8",
  "when": 1721088002000,
  "tag": "0008_security_fields",
  "breakpoints": true
}
```

**Verification:** `drizzle-kit migrate` shows all migrations as applied.

### 4C. Wire Password Reset Email [H-04]

1. Uncomment the Resend email call in `auth.ts:124`
2. Create a React Email template for password reset:
   ```typescript
   // apps/web/lib/email/templates/password-reset.tsx
   export function PasswordResetEmail({ resetUrl, userName }) { ... }
   ```
3. Create `/reset-password` page with token validation form
4. Create `/forgot-password` page with email submission form
5. Add rate limiting on password reset requests (max 3 per hour per email)

**Files:** `apps/web/server/routers/auth.ts`, `apps/web/app/(auth)/forgot-password/page.tsx` (new), `apps/web/app/(auth)/reset-password/page.tsx` (new)

### 4D. Client-Side Idempotency Key Generation [H-09]

Create a tRPC middleware that auto-generates idempotency keys for mutation procedures:

```typescript
// apps/web/lib/trpc/idempotency.ts
import { nanoid } from 'nanoid'

export function withIdempotencyKey() {
  return {
    headers: () => ({
      'x-idempotency-key': nanoid(32)
    })
  }
}
```

Apply to all financial mutation hooks:
```typescript
const createInvoice = trpc.ap.createInvoice.useMutation({
  ...withIdempotencyKey()
})
```

### 4E. Add `mutateProcedure` to Remaining Mutations [H-10]

Change these procedures from `protectedProcedure` to `mutateProcedure`:
- `paymentsAp.create` in `ap.ts`
- `paymentsAr.create` in `ar.ts`
- `fixedAssets.disposeAsset` in `fixedAssets.ts`
- `inventory.createTransaction` in `inventory.ts`

### 4F. Initialize or Remove Vault Client [M-10]

**Decision needed:** Are we using HashiCorp Vault in production?

**If yes:** Initialize at app startup:
```typescript
// apps/web/lib/trpc/server.ts
import { initVault } from '@xenboox/db/lib/vault'
await initVault({ endpoint: process.env.VAULT_ENDPOINT })
```

**If no:** Remove `vault.ts` and `encryption.ts` Vault integration. Keep the AES-256-GCM utility for field-level encryption but use env-based keys instead of Vault.

**Recommendation:** Remove Vault for MVP. Revisit when scaling to multi-region.

---

## Phase 5 — Frontend Production (Day 4-6)

**Goal:** Every page is real, every route has loading states, every error is handled.

### 5A. Route-Level Loading States [H-05]

Create `loading.tsx` for every dashboard route group:

```
apps/web/app/(dashboard)/loading.tsx              # Dashboard skeleton
apps/web/app/(dashboard)/ap/loading.tsx           # AP skeleton
apps/web/app/(dashboard)/ar/loading.tsx           # AR skeleton
apps/web/app/(dashboard)/journal/loading.tsx      # Journal skeleton
apps/web/app/(dashboard)/treasury/loading.tsx     # Treasury skeleton
apps/web/app/(dashboard)/cash/loading.tsx         # Cash skeleton
apps/web/app/(dashboard)/payroll/loading.tsx      # Payroll skeleton
apps/web/app/(dashboard)/fixed-assets/loading.tsx # Fixed Assets skeleton
apps/web/app/(dashboard)/inventory/loading.tsx    # Inventory skeleton
apps/web/app/(dashboard)/reports/loading.tsx      # Reports skeleton
apps/web/app/(dashboard)/documents/loading.tsx    # Documents skeleton
apps/web/app/(dashboard)/settings/loading.tsx     # Settings skeleton
apps/web/app/(dashboard)/chat/loading.tsx         # Chat skeleton
```

Pattern:
```tsx
export default function Loading() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-48" />        {/* Page title */}
      <div className="grid grid-cols-4 gap-4">  {/* Stat cards */}
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-lg" />  {/* Table/content */}
    </div>
  )
}
```

### 5B. Custom 404 Page [H-06]

```tsx
// apps/web/app/not-found.tsx
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
        <p className="mt-4 text-lg text-muted-foreground">Page not found</p>
        <Button asChild className="mt-6">
          <Link href="/dashboard">Return to Dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
```

### 5C. Fix Dashboard Toast [M-03]

Replace the mock toast in `dashboard/page.tsx`:
```typescript
// Before:
const toast = { error: (msg) => console.warn(msg) }

// After:
import { toast } from 'sonner'
// (just use the real toast — no wrapper needed)
```

### 5D. Build Settings Page [M-05]

Implement three sections:
1. **Account** — Change password form (calls `auth.changePassword` procedure)
2. **Notifications** — Email notification toggles (store in user settings JSONB)
3. **Security** — Active sessions list, revoke session, 2FA setup (future)

### 5E. Desktop Add Dialog Error Handling [M-14]

Add `onError` to all 5 desktop add dialogs:
```typescript
const createSupplier = trpc.ap.createSupplier.useMutation({
  onSuccess: () => { /* close dialog, refetch */ },
  onError: (error) => { toast.error(error.message) }  // ADD THIS
})
```

### 5F. Desktop COA Page — Real Data [M-15]

Wire to `trpc.coa.listAccounts` and render actual account hierarchy with type/subtype grouping.

---

## Phase 6 — Backend Completeness (Day 5-7)

**Goal:** Every router sends real notifications, every page shows real data.

### 6A. Fix Hardcoded Email Recipients [M-01]

In `fixedAssets.ts` and `inventory.ts`, replace `"admin@xenboox.com"` with:
```typescript
const ownerAccess = await db.query.userEntityAccess.findFirst({
  where: and(
    eq(userEntityAccess.entityId, entityId),
    eq(userEntityAccess.role, 'owner')
  ),
  with: { user: true }
})
const recipientEmail = ownerAccess?.user?.email ?? 'admin@xenboox.com'
```

### 6B. Structured Logging [M-02]

Install Pino:
```bash
pnpm add pino pino-pretty
```

Create logger:
```typescript
// apps/web/lib/logger.ts
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty' }
    : undefined,
  base: { service: 'xenboox-web' }
})

export function createRequestLogger(requestId: string) {
  return logger.child({ requestId })
}
```

Add request ID middleware:
```typescript
// middleware.ts
import { nanoid } from 'nanoid'
const requestId = nanoid()
response.headers.set('x-request-id', requestId)
```

Replace all `console.log/warn/error` with `logger.info/warn/error` across routers.

### 6C. Wire Chat File Upload [M-04]

Implement the presigned URL flow:
1. Client requests presigned upload URL from `document.getUploadUrl`
2. Client uploads file directly to R2 via presigned URL
3. Client confirms upload with `chat.addAttachment`
4. Server creates document record and links to conversation

### 6D. Desktop Treasury — Real Data [M-06]

Replace hardcoded mock data with `trpc.treasury.listBankAccounts` query.

### 6E. Desktop Documents — Implement Upload [M-07]

1. Add file picker using `<input type="file">` or Tauri file dialog
2. Upload to R2 via presigned URL
3. Show document list with status pipeline (Detected → Processing → Extracted → Synced → Done)

### 6F. Desktop Reports — Implement Generation [M-08]

Wire the 6 report cards to actual tRPC procedures:
- P&L → `trpc.reports.getProfitAndLoss`
- Balance Sheet → `trpc.reports.getBalanceSheet`
- Trial Balance → `trpc.journal.getTrialBalance`
- Others → mark as "Coming Soon" honestly (not as working cards)

### 6G. Fix Mobile Journal Create `periodId` [M-11]

Query current open period from `trpc.fiscal.listPeriods` and auto-select the current open period.

---

## Phase 7 — Desktop & Mobile Polish (Day 7-8)

**Goal:** All three surfaces are production-quality.

### 7A. Desktop Entity Commands [M-09]

Implement in Tauri Rust backend:
1. `get_entities()` — Fetch from API via `reqwest`, cache in SQLite
2. `get_current_entity()` — Read from `local_settings` table
3. `switch_entity()` — Update `local_settings`, invalidate cache

### 7B. Mobile tRPC Types [L-02]

Create `packages/api/` package:
1. Export the `AppRouter` type from `apps/web/server/routers/_app.ts`
2. Mobile imports: `import type { AppRouter } from '@xenboox/api'`
3. Replace `createTRPCReact<any>()` with `createTRPCReact<AppRouter>()`

### 7C. Desktop Entry Point Consolidation [L-03]

Remove `lib.rs` duplicate. Keep `main.rs` as the single entry point with the logger init.

### 7D. Mobile Token Refresh [L-07]

Implement token expiration check in `AuthGate`:
```typescript
// On mount, decode JWT and check expiry
const payload = JSON.parse(atob(token.split('.')[1]))
if (payload.exp * 1000 < Date.now()) {
  clearAuth()
  redirect to login
}
```

Add refresh token flow when Auth.js v5 session callback is available.

---

## Phase 8 — Testing (Day 8-10)

**Goal:** Critical paths have automated test coverage. No regressions reach production.

### 8A. Auth Tests [H-03]

```typescript
// apps/web/__tests__/auth.test.ts
describe('Authentication', () => {
  test('register creates user + org + entity + access')
  test('register rejects duplicate email')
  test('register rejects short password')
  test('login succeeds with correct credentials')
  test('login fails with wrong password')
  test('login increments failed attempts')
  test('login locks account after 5 failures')
  test('login rejects locked account')
  test('password reset generates token')
  test('password reset token expires after 1 hour')
  test('session expires after 24 hours')
})
```

### 8B. Entity Scoping Tests [H-03]

```typescript
// apps/web/__tests__/entity-scoping.test.ts
describe('Entity Scoping', () => {
  test('query returns only current entity data')
  test('query rejects request without entity header')
  test('query rejects user without access to entity')
  test('mutation scoped to correct entity')
  test('user cannot access另一个 entity data via direct ID')
  test('entity switch updates session scope')
})
```

### 8C. Financial Mutation Tests [H-03]

```typescript
// apps/web/__tests__/financial-mutations.test.ts
describe('Financial Mutations', () => {
  test('AP invoice creation posts journal entry')
  test('AP payment updates invoice amount_paid')
  test('AR invoice creation posts journal entry')
  test('AR payment updates invoice amount_received')
  test('Journal entry enforces double-entry balance')
  test('Journal entry rejects unbalanced entries')
  test('Idempotency key prevents duplicate mutations')
  test('Audit log created for every financial mutation')
})
```

### 8D. Input Validation Tests [H-03]

```typescript
// apps/web/__tests__/validation.test.ts
describe('Input Validation', () => {
  test('rejects invalid UUID format')
  test('rejects empty required fields')
  test('rejects amounts exceeding numeric(15,2)')
  test('rejects invalid enum values')
  test('sanitizes HTML in text inputs')
  test('enforces max string lengths')
})
```

### 8E. Agent Tests (Expand Existing)

Add integration tests that actually invoke agents with mock LLM responses:
```typescript
// packages/agents/__tests__/cfo-integration.test.ts
describe('CFO Agent Integration', () => {
  test('classifies reporting instruction via LLM')
  test('routes to correct department')
  test('escalates low-confidence classification')
  test('generates plain-English summary')
})
```

---

## Phase 9 — Documentation (Day 10)

### 9A. Sync DATABASE.md [L-01]

Rebuild DATABASE.md from the actual Drizzle schema:
1. Read all `packages/db/schema/*.ts` files
2. Generate markdown tables for every table, every column, every enum
3. Include Drizzle relation definitions
4. Include actual migration history
5. Remove stale information (e.g., `receipts_ar` table that doesn't exist in code)

---

## Resource Estimates

| Phase | Effort | Risk | Dependencies |
|-------|--------|------|-------------|
| 1 — Security | 0.5 days | Low | None |
| 2 — Type Safety & CI | 1 day | Medium | None |
| 3 — Agent LLM | 2 days | High | Anthropic API key |
| 4 — Auth Hardening | 1 day | Medium | None |
| 5 — Frontend Production | 1.5 days | Low | Phase 2 |
| 6 — Backend Completeness | 1.5 days | Low | None |
| 7 — Desktop/Mobile Polish | 1 day | Low | None |
| 8 — Testing | 2 days | Medium | Phase 3 (for agent tests) |
| 9 — Documentation | 0.5 days | Low | All phases |
| **Total** | **~10 days** | | |

---

## Definition of Done

Production-ready means:
- [ ] Zero committed credentials
- [ ] TypeScript checking enabled on all files (no `@ts-nocheck`)
- [ ] CI/CD pipeline runs lint + typecheck + test on every PR
- [ ] Agents call real LLMs with confidence-based escalation
- [ ] RLS enabled or explicitly documented as app-level only
- [ ] All migrations tracked in Drizzle journal
- [ ] Password reset email works end-to-end
- [ ] Loading skeletons on all routes
- [ ] Custom 404 page
- [ ] CSP headers tightened
- [ ] CSRF protection in place
- [ ] Idempotency keys generated client-side
- [ ] Structured logging with request IDs
- [ ] All placeholder/mock pages replaced with real data
- [ ] All error handlers wired in add/create dialogs
- [ ] Test coverage >80% on auth + entity scoping + financial mutations
- [ ] DATABASE.md matches actual schema
- [ ] Mobile tRPC client properly typed

---

*This plan is the engineering source of truth. Update status in ENTERPRISE_GAP.md as items are completed.*
