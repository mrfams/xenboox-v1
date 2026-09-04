# Pipeline 6 — Sub-Part E: Jobs / Edge Cases + Verification Loop

**Scope:** jobs and cross-surface seams around Expenses, then a full verification
loop over the pipeline (expense↔bill model collision, claim states, runtime
module-load integrity).

---

## 🔴 CRITICAL (4)

### E1 — Bills and Expenses share `invoices_ap` with NO discriminator (double-approval seam)

**Finding.** Operations has two live tabs — **Bills** (pay-later: vendor bills,
`bills.ts`/`ap.ts`) and **Expenses** (pay-now: recorded expenses + claims,
`expenses.ts`) — but **both scan the entire `invoices_ap` table with identical
status heuristics and no type marker**. Expenses always write `notes`
(description), so _every recorded expense also surfaced in Bills as "Pending
Approval"_, and every vendor bill surfaced in the Expenses tab. Two tabs, two
approval paths, same rows → double-posting risk and confusing UX.

**Root cause.** No `record_type` column exists; expenses are stamped with an
`EXP-` number prefix at write time, but nothing enforced or scoped on it.

**Fix (deterministic, zero-migration).** The `EXP-` prefix is the reserved
partition key:

1. **expenses.ts** — every table scan now filters `like(invoiceNumber, "EXP-%")`
   (all 21 `invoicesAp` sites incl. joins + conditions arrays).
2. **bills.ts / ap.ts** — every bills/payables scan now excludes
   `notLike(invoiceNumber, "EXP-%")`.
3. **Write-time reservation** — `createInvoice` (ap.ts) rejects a bill numbered
   under the reserved `EXP-` prefix; the AP agent ingest path guards it too
   (namespacing guidance, not "invalid vendor number").
4. **Cross-consumers** — automation recurring-bill suggestions and
   `ap-invoice-narrative` counts exclude expense rows; the reminders (AP
   overdue) job excludes `pending` expense rows so an unapproved expense can
   never be flipped to `overdue` (which would brick `approveExpense`, which
   requires `pending`).
5. Inbox/hub `listApprovals` only surfaces JEs + escalations — no cross-approval
   path there (verified).

**Regression tests.** E1 partition invariants added to `ap-record-layer.test.ts`
(source assertions over both routers + expenses.ts).

### E2 — Systemic: builder-level `.superRefine()` chains crash the ENTIRE tRPC tree at module load

**Finding.** Six procedures chained `.superRefine(...)` **after** `.input(...)`:

- `ap.ts` — `createPO`, `createInvoice`, `updateInvoice`
- `ar.ts` — `createInvoice`, `updateInvoice`
- `expenses.ts` — `createExpense`

tRPC v11's procedure builder has **no `.superRefine` method** (verified against
`@trpc/server@11.18.0` and empirically). Router construction runs at module
scope, so importing `_app.ts` — i.e. **any** tRPC call — threw
`TypeError: ...input(...).superRefine is not a function`, taking the whole API
down. Masked because the campaign's tests are static source-reads that never
import routers; the `expense-claims-router` canary (which imports `_app`) was
the only runtime-import test and had been red since the P3/P4 hardening commits.

**Fix.** Moved every `.superRefine` callback **inside** the zod schema:
`.input(z.object({...}).superRefine(cb))` — 6 sites across the 3 routers.

**Verification.** `expense-claims-router.test.ts` now imports `_app` and runs
(4 tests) — the entire router tree evaluates cleanly, proving no other
builder-level `.superRefine` lurks anywhere.

### E3 — Stale `?? "GMD"` currency fallbacks across 10 routers

**Finding.** 62 display/format fallbacks defaulted to `entityCurrency ?? "GMD"`,
while the schema default, the entity context, and the other fallback sites all
default to `"USD"`. GMD is a legacy seed artifact; any context missing
`entityCurrency` would format money in the wrong currency. P6-A reintroduced
several in `expenses.ts`, tripping the pre-existing `expenses-entityCtx` test.

**Fix.** Swept all 62 sites to `?? "USD"` across `ap`, `banking`, `bills`,
`customers`, `expenses`, `invoicing`, `journal`, `reconciliation`, `reports`,
`transactions`. The entityCtx test regex also bridged a template-literal
interpolation (`currency} ${...total ?? "0"`) as a false "currency fallback";
tightened to assert the real invariant: no `?? "GMD"` anywhere in the router.

### E4 — Cross-layer import: agents package reached into the app (`tax-install`)

**Finding.** `packages/agents/core/tool-registry.ts` dynamic-imported
`@/server/lib/tax-install` (an app-layer module) via the app-only `@/` alias.
Resolvable only when consumed from the web app; any standalone agents-package
build/test failed to transform the tool registry.

**Fix (layering).** Moved the single `installPresetsForEntity` implementation
into `packages/agents/core/tax-install.ts` (exports via `@xenboox/agents`); the
web `apps/web/server/lib/tax-install.ts` is now a thin re-export so
`tax-config`/`onboarding` imports are untouched; the tool registry imports it
in-package. The claims canary (whole-`_app` import) is now green.

---

## 🟡 OTHER FIXES (verification loop)

- **Books-first claim reimbursement** — `expense-claims-router` happy-path test
  rewrote to assert the honest guarantee: with no open fiscal period the router
  refuses to record a payment (no `insert`/`update` before the JE exists).
  The full posting happy-path needs a real DB (DB-gated suites).

---

## ✅ Suite Status (working tree)

| Suite                                                                                   | Result                                                                                                                                                                                                                                                                         |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ap-record-layer + expense + entityCtx + claims + approval-race + reconciliation + aging | **113 passed**                                                                                                                                                                                                                                                                 |
| jobs (reminders change)                                                                 | **25 passed**                                                                                                                                                                                                                                                                  |
| agents (ap-agent guard, tool-registry)                                                  | green                                                                                                                                                                                                                                                                          |
| Full `__tests__` regression                                                             | **0 new failures** — the 20 failing files (tenant-cache, webhook-dedup, payment-links, chat-stream-route, RLS DB-layer, dependency-audit, UI content-assertions…) fail **identically at HEAD** — pre-existing, unrelated to P6 (candidate for a dedicated sweep after P7–P12). |
