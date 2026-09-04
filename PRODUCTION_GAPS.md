# PRODUCTION GAPS — Deep Research 2026-09-04

> **Source:** 3 parallel audits (Security / Engineering / Product+Design) on `C:\Users\asano\Desktop\xenboox` — read of `middleware.ts`, `lib/auth/*`, `lib/trpc/server.ts`, `packages/db/*`, `apps/web/app/dashboard/*` (74 routes), `components/shared/ai-native/*`, `components/layout/*`, `__tests__/*`, `.env`, `next.config.ts`, `vercel.json`. All items file:line evidenced.
> **Purpose:** Single source for *what still blocks prod-grade*. Scope = **web only** (`apps/web`, `packages/db`, `packages/agents`, `packages/ui`, `packages/jobs`) per `AGENTS.md`.
> **Fixed this week:** `neon-http db.transaction` shim (`packages/db/index.ts:9`), `ar.createInvoice` 500 compensation (`ar.ts:206`), idle hard-expiry (`edge.ts:55` + `middleware.ts:221` + `session-expiry-provider.tsx:38`) — verified `b0128d6` + `95a50b6`.

## How to Use

| Marker | Meaning |
|--------|---------|
| `[ ]` | Not started |
| `[~]` | In progress |
| `[x]` | Verified fixed (with commit) |
| `SKIPPED: reason` | Intentionally not fixing |

**Rules:** 1) Mark `[~]` before start. 2) Mark `[x]` only after `typecheck + test + manual` verification. 3) Add `BLOCKED: reason` if blocked. 4) Keep this file as ledger — update on every gap fix.

---

## 1. Critical Blockers (P0) — Ship Stopper

- [ ] **P0-1 RLS is app-layer only on neon-http** — `packages/db/index.ts:1` uses `neon-http`; `setRlsContext()` (`lib/trpc/server.ts:133`) `SET LOCAL` silently no-ops. `FORCE RLS` (`0006_enable_rls.sql`) is defense-in-depth only for TCP/WebSocket. Primary is `entityScopingMiddleware` (`server.ts:249`). Documented `DATABASE.md:1657` as `USE_RLS` deferred. *Decision needed:* move to `neon-serverless Pool` **or** sign exception. **Critical / Security**
- [ ] **P0-2 Hardcoded `GMD` display** — 14 sites ignore `ctx.entityCurrency` (`server.ts:305`). USD/XOF invoices show wrong symbol. `journal.ts:459,591`, `ap.ts:340,558`, `ar.ts:778`, `banking.ts:390`. **Critical / Financial**
- [x] **P0-3 Deletes missing `entityId` scope** — `delete().where(eq(id))` can delete cross-entity on race, even though prior check exists. `ar.ts:588,635,679` (`customers`, `salesInvoices`, `paymentsAr`), `ap.ts:1563,1707` (`suppliers`, `paymentsAp`). Fix: `where(and(eq(id), eq(entityId, ctx.entityId!)))`. **High / Security** — fixed `ar.ts:588,635,679` + `ap.ts:1563,1665,1707` (and tx deletes), verified `idor-rls-sweep 69 passed` 2026-09-04
- [ ] **P0-4 RBAC sweep red** — `__tests__/rbac-sweep.test.ts:2 FAILED` — 3 unprotected procedures + 4 unmounted routers (e.g., `announcements`). **High / Security**
- [ ] **P0-5 A11y sweep red** — `__tests__/a11y-static.test.ts:23 FAILED` — missing `aria-label`, table `scope=col`. **High / A11y**
- [ ] **P0-6 Neon transaction not atomic** — `packages/db/index.ts:32` fallback `cb(_db)` without atomicity; `journal.ts:1189` `Promise.all(insert lines)` can half-persist entry. **High / Data integrity**

## 2. Security Debt (P1)

- [ ] **P1-1 Field encryption not wired** — `packages/db/lib/field-encryption/service.ts:20` ready but not used in `payroll/treasury/AP/AR`; `users.twoFactorSecret`/`bankAccounts.accountNumber` (`schema/treasury.ts:69`) plaintext. `ROADTOPRODUCTION.md:586` deferred backfill. **High**
- [ ] **P1-2 Admin TOTP fallback downgrade** — `lib/admin/totp.ts:58` returns raw payload if it *looks* base32 ≥16 — allows attacker to store plaintext in `admin_users.totp_secret_encrypted`. **High**
- [ ] **P1-3 Dead SQLi helper** — `packages/db/schema/security.ts:51` string-interp `set_config('...'+JSON.stringify)` — unused (real path `server.ts:137` uses `sql` param) but copy-paste risk. **High**
- [ ] **P1-4 Admin idle divergence** — `lib/auth/admin.ts:174` uses 60 m while `admin-edge.ts:70` uses 4 h (`admin/session.ts:1`). Server kills admin 3 h early → flip-flop 401s. **Medium**
- [ ] **P1-5 Lockout race** — `lib/auth/index.ts:220` `newAttempts = old+1` then `update` non-atomic; concurrent brute-force can skip `LOCKOUT_THRESHOLD=5`. Use `sql failed=failed+1`. **Medium**
- [ ] **P1-6 Weak admin TOTP KDF** — `lib/admin/totp.ts:17` `sha256(AUTH_SECRET+":admin-totp")` vs field-encryption `PBKDF2 100k` (`packages/db/lib/encryption.ts:29`). **Low**
- [x] **P1-7 Logger redaction** — `lib/logger.ts:60` redacts secrets + `__tests__/logger-redaction.test.ts:19` — **verified 2026-09-04**
- [x] **P1-8 Middleware idle fixed** — `edge.ts:55` + `middleware.ts:221` hard-expiry — **b0128d6 2026-09-04**
- [x] **P1-9 DB transaction 500 fixed** — `packages/db/index.ts:9` shim + `ar.ts:206` compensation — **95a50b6 2026-09-04**

## 3. Engineering Debt (P1-P2)

- [ ] **P2-1 `any` casts 15+ files** — `server.ts:481` `role as any`, `banking.ts:2283`, `automation-studio.ts:93` `(a:any)`, `data-import-export.ts:336`, `models/telemetry.ts:140`. Hides invalid module/action. **Medium**
- [ ] **P2-2 `throw new Error` not `TRPCError`** — `banking.ts:622,1085`, `ap.ts:861` leak as `500` not `404`. **Medium**
- [ ] **P2-3 `parseFloat` money math** — `ar.ts:172`, `journal.ts:104` on `decimal(12,2)` — use `Decimal.js`/minor units. **Medium**
- [ ] **P2-4 N+1 serial RTTs** — `journal.ts:82` 5 counts, `ap.ts:38` 10 sums, `journal.ts:1370` 6 counts — parallelize `Promise.all`. **Low**
- [ ] **P2-5 Turbo filter typo** — `AGENTS.md:79` `pnpm dev --filter=web` vs actual `@xenboox/web` → `turbo No package web`. **Medium** (doc drift)
- [ ] **P2-6 Drizzle skew** — `drizzle-orm 0.45.2` vs override `0.44.2`. **Medium**
- [ ] **P2-7 `console.warn` in prod packages** — `models/telemetry.ts:127` — use `logger`. **Low**
- [x] **P2-8 Batched N+1 fixed** — `banking.ts:138`, `ap.ts:271`, `ar.ts:254` — **verified 2026-09-04**
- [x] **P2-9 Idempotency + rate-limit plan-aware** — `server.ts:605,757` — **verified 2026-09-04**

## 4. AI-Native 5-Surface Drift (P1)

> `AGENTS.md` — 5 surfaces only: Command Center, Activity Hub, Financial Pulse, Ledger, Operations.

- [ ] **P1-10 Legacy duplicates** — `legacy/ledger`, `legacy/financial-pulse`, `legacy/activity-hub` + `ai-sidebar.tsx:224` `LegacySection` shows **10 items to demo@xenboox.com**. Delete or flag-gate. **High**
- [ ] **P1-11 SaaS wrappers** — `operations/customers|vendors|invoices|bills|banking/page.tsx:11` still exist alongside `operations/page.tsx:56` tab absorption. 301 to `?tab=` or delete. **High**
- [ ] **P1-12 Extra surfaces** — `donor-reporting/page.tsx:1`, `knowledge/page.tsx:54`, `knowledge-graph`, `ingestion`, `qbr`, `referrals`, `auto-approve`, `audit-trail` — 7 beyond 5. Absorb into tabs or `app/(dev)/`. **Medium**
- [ ] **P1-13 Hidden inspector leak** — `dashboard/hidden/page.tsx:28` iframe 8 routes at `/dashboard/hidden` — move to `app/(dev)/`. **Medium**
- [ ] **P1-14 Command Center creep** — `dashboard/page.tsx:184` embeds `GettingStartedChecklist+ProactiveBriefing+MissionsBoard` as widgets inside chat-first surface. **High**

## 5. Design System & Amateur Hardcodes (P1-P2)

- [ ] **P2-8 Tokens bypassed ~40 sites** — `shared/ai-native/confidence-badge.tsx:18` `emerald-500`, `alert-card.tsx:24` `bg-red-500/[0.03]`, `ai-proactive-alert.tsx:48`, `ai-autofill-indicator.tsx:112` `bg-emerald-100`, `ai-batch-processor.tsx:117` `bg-emerald-50`, `badge-variants.ts:7`, `workspace/task-cards.tsx:76`, `rich-responses.tsx:63` — breaks dark. Codemod to `balanced-green/error-clay/attention-amber/signal-indigo` (`globals.css:11`, `tailwind.config.cjs:124`). **High / Amateur**
- [ ] **P2-9 Two AI kits** — `shared/ai-native/*` vs `ai-native-v2/*` (`AgentStream`, `CommandBar` not exported from shared). Single source. **Low**
- [ ] **P2-10 Card/radius drift** — `p-4` vs `p-6` vs `px-3 py-2.5` 5 paddings, `--radius 0.375rem` vs `rounded-xl` vs `calc(2rem…)` 3 radii, `w-[260px]` no `hidden md:flex` `hidden/page.tsx:130`. Enforce `Card`/`ModulePageShell`. **Medium / Amateur**

## 6. Accessibility (P0-P1)

- [ ] **P0-7 Text 9-11 px** — 120+ `text-[9px]` `page.tsx:631`, `sidebar.tsx:255` — below 12 px WCAG 1.4.8 fail. **High / Amateur**
- [ ] **P0-8 Touch <24 px** — `ai-autofill-indicator.tsx:43` `p-0.5 h-3 w-3` (~12 px) — **High** WCAG 2.5.8 (44 px rec).
- [ ] **P1-15 `globals.css:428` hides scrollbars** `[data-dashboard] * scrollbar-width:none` — harms WCAG 2.1. **Low**
- [ ] **P1-16 Missing `aria-*`** — `ledger/page.tsx:187` placeholder no `aria-describedby`, `activity-hub/page.tsx:752` `role=listbox` on `<button>` invalid, `top-nav.tsx:304` badge no `aria-live`. **Medium**

## 7. UX Edge Cases (P1)

- [ ] **P1-17 Offline no banner** — `lib/offline.ts:5` `useOfflineSync` never rendered in `dashboard/layout.tsx:212` — infinite spinners. **High**
- [ ] **P1-18 Generic errors** — `activity-hub/error.tsx:14` 8 identical, leak `error.message`, no correlation ID. **Medium / Amateur**
- [ ] **P1-19 Missing retry** — `financial-pulse/page.tsx:373` + `1161` `ExchangeRatesStrip` null no skeleton. **Medium**
- [ ] **P1-20 Empty states no CTA** — `activity-hub/page.tsx:726` `Queue clear` same for all filters, no `Ask CFO` CTA; `ledger/page.tsx:413` no `Create` CTA. **Medium**
- [ ] **P1-21 Skeletons inconsistent** — `operations/loading 3` vs `ledger 5` vs `pulse 4` — **Low**
- [ ] **P1-22 Onboarding two wizards** — `app/onboarding/page.tsx:167` (no validation, only `trackEvent`) + `components/onboarding/onboarding-wizard.tsx:948` dashboard modal — not synced, skip no confirm — **High / Amateur**

## 8. Verification & Next Sprint

| Group | Open | Fixed | Total |
|-------|------|-------|-------|
| P0 Blockers | 6 | 0 (in this file) | 6 |
| Security P1 | 6 | 3 | 9 |
| Engineering | 7 | 2 | 9 |
| 5-Surface | 5 | 0 | 5 |
| Design/Tokens | 3 | 0 | 3 |
| A11y | 4 | 0 | 4 |
| UX Edge | 6 | 0 | 6 |
| **Total** | **37** | **5** | **42** |

**Suggested order (1-2 week sprint):**
1. P0-2, P0-3, P0-4, P0-5 (financial + deletes + gates)
2. P0-1 decision + P1-4/5/6 (auth)
3. P1-10→14 (surface cleanup) + P2-8 (token codemod) — parallel design track
4. P0-7/8, P1-17, P1-22 (a11y + offline + onboarding)

> Update this file with `[~]`/`[x]` + commit hash on every fix. Source of truth for `AGENTS.md` Build Workflow LOG step.

*Generated from deep audit 2026-09-04 — file:line verified, no guessing.*
