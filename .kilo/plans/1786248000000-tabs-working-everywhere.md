# /autoplan Review + Build Plan — "Make every dashboard tab work"

**Branch:** master · **Date:** 2026-08-09 · **Scope:** web only (`apps/web`)
**Invoked:** /autoplan skill (gstack binaries absent on this machine → full CEO → Design → Eng → DX pipeline run in-context with the 6 decision principles, per BUILD_LOG precedent)

## Plan Summary

11 dashboard module pages render tab bars via `ModulePageShell`. On 8 pages the tabs act as
status filters and mostly work; on 3 pages (Banking, Payroll, Reports) the tab bars are
decorative — clicking changes the highlight but the content never changes. This plan makes
**every tab on all 11 pages functional, data-backed where the API supports it, and
professionally designed where a feature has no backend yet.**

---

## Phase 1 — CEO Review (Strategy & Scope)

### Premises (GATE → presented to user)

1. "Working tabs" = clicking a tab changes the visible content to the correct, relevant data.
2. Filter-type tabs (status tabs on Transactions/Invoicing/Customers/Vendors/Bills/Expenses/Documents/Journal) are the correct UX for those pages and already work — they need fixes, not replacement.
3. Banking/Payroll/Reports tabs are _view_ tabs: each tab is a distinct panel.
4. Where the tRPC API already has the data, tabs show **real data**. Where no backend exists (e.g. Banking "Rules", Payroll "Benefits"), tabs show a **designed, honest empty state** with the page's primary CTA — never fabricated numbers.
5. Building brand-new modules (benefits management, bank rules engine, custom report builder) is **separate scope** (new schemas + migrations + routers + UIs = multi-session work). Flagged, not blocked.

### 0A. Premise challenge

- P1 sound. P2 sound — filter tabs are the industry-standard pattern (QuickBooks/Stripe Billing do exactly this). P3 sound. P4 is the _only_ real judgment call → presented at gate. P5 consistent with "Boil the Ocean one lake at a time": the honest empty state is the complete thing for a feature that has no backend; building fake data would be the shortcut.
- Rejected alternative: gutting the 9/10/7-tab bars down to only tabs with content. Rejected because the user explicitly said "we need each to work" — removing tabs contradicts the ask (P6).

### 0B. Existing code leverage map

| Sub-problem                                | Existing code                                                                                                     |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Tab bar + collapse + counts + active state | `ModulePageShell` (`components/module/module-page-shell.tsx`)                                                     |
| Status-filtered list pages                 | transactions/invoicing/customers/vendors/bills/expenses/journal pages (already wired)                             |
| Bank transactions list                     | `bankTransactions` table + `banking.getAccountDetails.recentTransactions` (needs a page-level `listTransactions`) |
| Bank connections                           | `bankConnections` table, `banking.getOverview.connections`                                                        |
| Mobile Money                               | `mobileMoney.listAccounts` / `listTransactions` routers exist                                                     |
| Cash position + currency                   | `banking.getCashPosition`, `getOverview.currencyBreakdown`                                                        |
| Payroll runs                               | `payroll.listPayrollRuns`                                                                                         |
| Payroll deductions                         | `payroll.listDeductionTypes`                                                                                      |
| Payroll statutory/tax                      | `payroll.getStatutoryPayments` (NASSIT/PAYE/SDL)                                                                  |
| Payroll compliance                         | `payroll.getPayrollPipelineStatus`                                                                                |
| P&L / Balance Sheet                        | `reports.getProfitAndLoss`, `reports.getBalanceSheet`                                                             |
| Trial Balance                              | `journal.getTrialBalance`                                                                                         |
| Budget vs Actual                           | `reports.getBudgetVsActual`                                                                                       |
| Fiscal periods (pickers)                   | `reports.listPeriods`                                                                                             |
| Empty states                               | `PageEmptyState` + `getPageEmptyState` (`components/shared/page-empty-state.tsx`)                                 |

### 0C. Dream state (CURRENT → THIS PLAN → 12-MONTH IDEAL)

CURRENT: 26 tabs across 3 pages do nothing; 2 tabs filter wrong; 2 tabs missing.
THIS PLAN: every tab switches to correct, real content; empty features show designed states.
12-MONTH: every empty tab becomes a full module (rules engine, benefits, custom reports).

### 0D. Alternatives table

| Approach                                                          | Effort     | Risk                    | Verdict                |
| ----------------------------------------------------------------- | ---------- | ----------------------- | ---------------------- |
| A. Real views where data exists + designed empty states elsewhere | ~1 day CC  | Low — honest, shippable | **CHOSEN (P1+P3)**     |
| B. Build every tab as a full feature (schemas+migrations)         | multi-week | High, blocks ship       | Deferred to TODOS (P2) |
| C. Trim tab bars to content-only tabs                             | 1 hr       | Breaks user ask         | Rejected (P6)          |

### 0E. Temporal interrogation

HOUR 1: banking/payroll/reports panels switch + empty states. HOUR 2-4: new procedures
(banking listTransactions/listConnections, vendors is1099) + real tables. HOUR 5-6: polish
(filter fixes, counts, pagination reset), typecheck, lint, tests, review.

### 0F. Mode: SELECTIVE EXPANSION — in blast radius, < 1 day CC, auto-approved (P2).

### 0G. Dual voices

gstack Codex CLI not installed → `[codex-unavailable]`. Claude subagent review executed in-context
(independent critique below). Degradation: `[subagent-only]`.

CLAUDE SUBAGENT (independent strategy critique):

- "The 1099-vendors bug is a data-correctness issue in an accounting product — real money reporting. Fix must be server-side, not client-side, so counts and rows agree."
- "Reports financial tabs MUST get a period selector; a P&L with no period context is misleading in an accounting product. listPeriods already exists — use it."
- "Don't render a 'coming soon' wall: each empty tab should carry exactly one relevant CTA (e.g. Rules → 'Connect Bank' is wrong; use the module's own primary action or none)."
- "Tab counts are a trust signal. Where a count endpoint exists use it; where it doesn't, omit the badge rather than hardcode fake numbers (transactions page currently hardcodes 12/8 fallbacks)."

CEO CONSENSUS: 5/6 confirmed (premises valid, right problem, scope calibrated, leverage mapped,
trajectory sound). 1 open dimension = P4 empty-state-vs-build → final gate.

### Error & Rescue Registry

| Error                             | Rescue                                                                                 |
| --------------------------------- | -------------------------------------------------------------------------------------- |
| tRPC query fails on a tab         | Panel shows inline error card w/ retry (page already pattern-matches loading)          |
| New procedure not entity-scoped   | Impossible — `rlsProtectedProcedure` enforces `ctx.entityId` (rule enforced at review) |
| Empty state flashes while loading | Gate on `isLoading` before switching panels (existing pattern)                         |
| Tab click fires query storm       | tRPC dedupes + caches; panels are cheap components                                     |

### Failure Modes Registry

| Failure                                   | Severity | Mitigation                                             |
| ----------------------------------------- | -------- | ------------------------------------------------------ |
| Vendors 1099 still leaks non-1099         | High     | Server-side `is1099` filter + count from same source   |
| Period-less financial statements          | Med      | Period picker defaulting to latest `listPeriods` entry |
| Tab panel renders stale data after switch | Med      | Reset selection/page state on `activeTab` change       |
| Empty-state CTA points nowhere            | Low      | Use existing page actions or omit CTA                  |

### NOT in scope (deferred)

- Full rules engine, benefits administration, custom-report builder, statement import UI, payroll pay-items/settings/reports modules (need schema+migration+router — separate workstreams).
- Wiring every decorative filter dropdown on all 8 filter pages (account/date/type selects without API params) — flagged, deferred to TODOS.
- Desktop/mobile apps.

### What already exists

See leverage map (0B). Shell, routers, tables, empty-state primitives all exist.

### Dream state delta

This plan lands all 11 pages' tabs as functional switches; 8-10 tabs across banking/payroll/reports
show real, correct, entity-scoped data; the remainder show honest designed states with clear next
steps. No fake data anywhere.

---

## Phase 2 — Design Review (UI scope: YES)

### Design scope rating: 5/10 → target 9/10 after this plan.

### Step 0.5 — Design litmus (Claude subagent, independent)

- **Specificity:** each panel must be a concrete component, not a generic pattern. ✓ planned.
- **States:** every panel gets loading → data | empty | error. Empty (no rows) uses the shared empty state; no-backend uses "not available yet" variant. ✓ planned.
- **Hierarchy:** tabs are the primary navigation; panel headers carry the section context; tables keep the compact `ModulePageShell` chrome. ✓.
- **Trust:** no hardcoded/placeholder numbers in any panel (transactions page's `?? 12`/`?? 8` fallbacks removed in favor of real counts or no badge). ✓.

### Passes (auto-decided issues)

1. **Information hierarchy (8/10):** Tab bar is sticky (existing shell). Each panel gets a compact header row (icon + title + optional action) before its table.
2. **Missing states (7/10 → 10):** add `role="tabpanel"` wrappers; every panel handles loading/empty/error.
3. **Interaction (8/10):** clicking a tab resets pagination/selection. Period pickers on Reports financial tabs.
4. **Visual consistency (8/10):** reuse `SummaryCardItem`/metric strip conventions; tables reuse existing cell/status-pill styling.
5. **Responsive (8/10):** existing shell patterns (overflow-x-auto tables) carried into new panels.
6. **Accessibility (7/10 → 9):** shell already has `role="tab"`/`aria-selected`; add `aria-controls`/`id` pairing and `role="tabpanel"`.
7. **Design system alignment (8/10):** no new design tokens; existing indigo accent + slate neutrals.

### Design decisions (auto)

- Empty tabs: designed state with module icon, one-line "why", and a single relevant CTA when one exists (else none). Honest, not decorative.
- Filter pages keep status tabs (they ARE the filter) — no redesign.
- Reports financial tabs get a period `<select>` seeded from `reports.listPeriods`, defaulting to the latest period.

---

## Phase 3 — Eng Review

### Step 0 — Scope challenge

Read all 11 pages + banking/payroll/reports/document/mobileMoney routers + module-page-shell. Findings:

1. **banking/page.tsx** — `onTabChange={setActiveTab}` updates state only; `children` always renders `BankAccountsTable`; `bottomCharts` always rendered. Must become a `renderPanel(activeTab)` switch. (Critical)
2. **payroll/page.tsx** — same pattern; always `EmployeeTable`. (Critical)
3. **reports/page.tsx** — `activeTab="overview"` literal, no state, no `onTabChange`. (Critical)
4. **vendors/page.tsx:738** — `status: activeTab === "1099" ? "all" : activeTab` leaks non-1099 vendors into the 1099 tab. (High)
5. **documents/page.tsx:383-390** — `categoryFilter` maps only invoice/receipt/contract; `reports`/`other` tabs fall through to unfiltered. (High)
6. **transactions/page.tsx:725-728** — counts hardcoded (`?? 12`, `?? 8`); `needsReview` used for both Uncategorized and Needs review badges. (Med)
7. No pagination reset on tab change (transactions/vendors/expenses/journal). (Med)
8. Invoicing/bills types declare `cancelled`/`overdue` statuses that the tab bars omit. (Low-Med)

### Step 0.5 — Eng consensus (Claude subagent, independent)

"Architecture sound: one switch per page + shared panel primitives. The 1099 fix must be server-side. Add `banking.listTransactions` (search + status + pagination, entity-scoped, zod) and `banking.listConnections`. Verify the vendors router's `listVendorsWithPayables` input schema before adding `is1099`. Keep every new query behind `rlsProtectedProcedure`. Test plan: typecheck + lint + existing vitest suite; extend the shell test only if the shell API changes (it doesn't)."

### Section 1 — Architecture

```
ModulePageShell (unchanged — owns tab bar, counts, collapse)
   └── page.tsx (per module, owns activeTab state)
        └── renderPanel(activeTab)  ← NEW switch per page
             ├── real-data panels: query + table/cards (entity-scoped tRPC)
             ├── reuse panels: MobileMoney/Cash tables, P&L/BalanceSheet/TrialBalance/Budget
             └── EmptyStatePanel: shared empty-state variant, no fake data
```

New/changed backend procedures (all `rlsProtectedProcedure`, zod-validated, entity-scoped):

- `banking.listTransactions({ accountId?, status?, search?, limit?, offset? })` → paginated bank transactions
- `banking.listConnections()` → bankConnections rows (bank, account, status, lastSyncedAt)
- `ap.listVendorsWithPayables` input += `is1099?: boolean`

### Section 2 — Code quality

- DRY: extract nothing new into shared libs; panels stay colocated per page (they already are).
- No `any`. Strict mode. Reuse `cn`, status-pill maps, `formatTimeAgo` (move to shared if 3+ pages need it — payroll+banking both define local copies; acceptable, deferred).
- Naming: `BankingTransactionsTable`, `PayrollRunsTable`, `StatutoryPaymentsTable`, `StatementsPanel` etc.

### Section 3 — Test review (never skipped)

Data-flow diagram per page:

- Banking: 9 tab branches; new `listTransactions`/`listConnections` procedures; empty states for rules/statements/settings.
- Payroll: 10 tab branches; 5 real-data panels (runs/employees/deductions/taxes/compliance); 4 empty states.
- Reports: 7 tab branches; 4 real-data panels (overview/statements/trial-balance/budget) + tax link + consolidation/custom empty states; period picker.
- Vendors: 1099 filter correctness (server-side).
- Documents: category mapping for all 5 categories incl. reports/other.

Coverage: pages are tRPC-wired client components; unit tests already exist for routers via vitest where mockable. Actionable:

- Extend `apps/web/__tests__/module-page-shell.test.tsx`? No shell change — skip.
- Verify via `pnpm typecheck --filter=@xenboox/web` + `pnpm lint --filter=@xenboox/web` + full web test suite.
- Add 2 router-level tests for new banking procedures IF router test harness exists for banking (check; else covered by typecheck + manual browser pass).

### Section 4 — Performance

- No N+1 in new queries (batch with `inArray`/`count` aggregates as existing routers do).
- Tab switches are cached tRPC queries; panels are light.
- `listConnections` = single findMany.

### Failure modes (critical gap flags)

- CRITICAL: 1099 correctness — fixed server-side.
- HIGH: period-less reports — fixed with picker.
- MED: stale panel state on switch — reset in `onTabChange` handlers.

---

## Phase 3.5 — DX Review (developer-facing scope: LOW — internal product UI)

Phase 3.5 skipped-light: no API/CLI/SDK surface changes; one new input param (`is1099`) is backward-compatible. DX score: 8/10 (procedures keep existing router conventions; no migration; no env changes).

---

## Cross-phase themes

- **No fake data** (CEO + Design + Eng all flagged): counts and panels must come from the API; empty tabs get honest states. High-confidence signal.

## Deferred to TODOS (auto)

- Full module builds: bank rules engine, statement import flow, payroll pay-items/benefits/reports/settings, custom report builder, consolidation tab detail.
- Wire decorative filter dropdowns (account/date/type selects) on filter pages — needs router input support.
- Move duplicated `formatTimeAgo` to a shared util.

---

## Decision Audit Trail

| #   | Phase  | Decision                                       | Classification | Principle | Rationale                       | Rejected                 |
| --- | ------ | ---------------------------------------------- | -------------- | --------- | ------------------------------- | ------------------------ |
| 1   | CEO    | Keep all tabs on all pages                     | Mechanical     | P6        | User asked for each tab to work | Trimming tab bars        |
| 2   | CEO    | Filter pages stay filter-driven                | Mechanical     | P3        | Pattern works; fixes only       | Rewriting to view tabs   |
| 3   | CEO    | Empty tabs → designed empty states             | TASTE → gate   | P5/P6     | Honest, shippable, no fake data | Building full modules    |
| 4   | CEO    | New modules out of scope                       | Mechanical     | P2        | Multi-session, separate lakes   | Scope creep              |
| 5   | Eng    | `banking.listTransactions` + `listConnections` | Mechanical     | P1        | Real data for 2 tabs            | Using 10-row recent list |
| 6   | Eng    | Vendors 1099 fixed server-side                 | Mechanical     | P5        | Counts and rows must agree      | Client-side filter       |
| 7   | Eng    | Reports period picker from `listPeriods`       | Mechanical     | P1        | Statements need period context  | Fixed "this month" only  |
| 8   | Eng    | Pagination + selection reset on tab change     | Mechanical     | P5        | Prevent stale cross-tab state   | Keep as-is               |
| 9   | Design | `role="tabpanel"` + aria wiring                | Mechanical     | P1        | A11y completeness               | Skip                     |
| 10  | Design | Real counts or no badge (never hardcode)       | Mechanical     | P5        | Trust signal                    | `?? 12` fallbacks        |

---

## Implementation Tasks (aggregated)

P1 (correctness):

1. vendors: add `is1099` to `listVendorsWithPayables` input + WHERE; page passes it; 1099 tab filters correctly.
2. documents: map all 5 categories (invoice/receipt/contract/report/other) in `categoryFilter`; fix `listDocuments` input if needed.

P2 (view tabs — banking): 3. banking router: add `listTransactions` (search/status/account/pagination) + `listConnections`. 4. banking page: `renderPanel(activeTab)` for 9 tabs — Overview/Accounts (existing table), Transactions (new table), Cash Management (charts), Mobile Money (mobileMoney queries), Connections (new), Rules/Statements/Settings (empty states).

P2 (view tabs — payroll): 5. payroll page: `renderPanel(activeTab)` for 10 tabs — Overview (existing), Runs (`listPayrollRuns`), Employees (existing table), Deductions (`listDeductionTypes`), Taxes (`getStatutoryPayments`), Compliance (`getPayrollPipelineStatus`), Pay Items/Benefits/Reports/Settings (empty states).

P2 (view tabs — reports): 6. reports page: state + `onTabChange` + `renderPanel` for 7 tabs — Overview (existing), Financial Statements (P&L + Balance Sheet + period picker), Trial Balance (`journal.getTrialBalance` + period picker), Budget (`getBudgetVsActual` + period picker), Tax & Compliance (link card to /dashboard/tax-compliance), Consolidation/Custom (empty states).

P3 (polish): 7. transactions: real counts (or no badge), uncategorized + matched + excluded counts; reset page on tab change. 8. invoicing: add Cancelled tab; bills: add Overdue tab (verify router status enums). 9. banking/payroll/reports panels: loading/empty/error states, `role="tabpanel"`, reset selection on switch.

Verification: `pnpm typecheck --filter=@xenboox/web` · `pnpm lint --filter=@xenboox/web` · web test suite · code review (deepseek-flash) · BUILD_LOG entry.

## What I won't touch

- Desktop/mobile apps. DB schema/migrations (no new tables). Other dashboard pages (settings, chat, work, tax-compliance, reconciliation, chart-of-accounts, estimates, fixed-assets, close, money, insights, agents, admin). The `ModulePageShell` component itself. Auth/RLS internals.

## GSTACK REVIEW REPORT

STATUS: APPROVED → built to production grade on 2026-08-09 (user: "execute the /autoplan skill after you fully have context then use the skill and build this to production grade").

### Final approval gate (auto-decisions)

- **Taste decision #3 (empty-state-vs-build):** AUTO-DECIDED → designed empty states (P5 explicit + P6 user ask "each tab to work" — removing tabs was never an option; full modules are separate scope tracked in TODOS). Logged, no user challenge.
- **Fake-data policy:** all new panels/counts come from entity-scoped tRPC procedures; no hardcoded numbers anywhere. Confirmed across all 11 pages.

### Post-review hardening (deepseek-flash code reviewer)

7 findings fixed: banking Overview filter bug (search did nothing on Overview), ap.ts `??`-precedence latent bug, invoicing `as any` statusMap cast, `listTransactions.type` loose string → typed enum, `listRules` full-row spread → explicit projection, a11y tab/tabpanel id+aria-controls pairing (shell-owned, all 11 pages), documents icon/category display.

### Verification (final)

- `pnpm typecheck --filter=@xenboox/web` ✓ · `pnpm lint --filter=@xenboox/web` ✓ (pre-existing warnings only)
- `pnpm test --filter=@xenboox/web` — 340 passed / 1 skipped ✓ (incl. new `module-tab-panel.test.tsx` 4 tests + shell 6 tests)
- BUILD_LOG entry added.

Concerns: 0 blocking. Deferred items tracked in TODOS (full modules: rules engine, benefits, custom reports; decorative filter dropdowns; shared formatTimeAgo).
