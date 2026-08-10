# /autoplan Review — Historical Data Migration & Onboarding Reconstruction (Slice 1)

> Plan file for the Historical Data Migration & Onboarding Reconstruction spec (v2, locked handoff).
> Scope: **web only**. Status: **FOR APPROVAL — not built yet** (workflow: PLAN → APPROVE → BUILD → LOG).
> Branch: `master` (HEAD `f120cf2`). Reviewed: 2026-08-09, in-context pipeline (gstack binaries not installed on this machine — CEO → Design → Eng → DX run at full depth with the 6 auto-decision principles; dual voice = Claude subagent only, tagged `[codex-unavailable][subagent-only]`).
> Related: XENBOOX_PRD.md §13, XENBOOX_ACCOUNTING_FIRM_ARCHITECTURE_SPEC.md §7.3, XENBOOX_TECH_STACK_UPDATE_SECTION18.md.

---

## Plan: Slice 1 — Five-Category Routing, Category A/B/E Flows, Opening Balance, Detail Depth

### What

The onboarding wizard and backend already exist (routing question, entity setup, data connections, historical pull with >12-month permission gate, CoA review, first look, liveness panel). The spec upgrades the _branching_ and _honesty_ of that flow:

1. Replace the current 5-option routing question ("How do you currently manage your books?" → `excel | quickbooks | xero | nothing | other`) with the spec's **five record-keeping categories** (`brand_new | professional_software | manual_records | statements_only | no_records`), persisted to a new `entities.onboarding_source_type` column. The existing step-0 routing question **is** the spec's Step 3a in this codebase's reality (the wizard never had a separate Step-4 pull step; the pull runs in the background/liveness). **One question, not two** — the follow-ups (detail depth, pre-incorporation, start date, opening balance) attach to it. When a user connects sources, the derived category is shown as a confirmation, never re-asked.
2. **Category A (brand-new):** clean-slate path. No historical pull, no pull progress UI, fewer wizard steps, straight to CoA. New follow-up: pre-incorporation activity question ("Has any money moved before you registered?") + business start date. If yes → a scoped mini-D window for that period only, then clean-slate live tracking from the start date.
3. **Category B (professional software):** existing connect + pull path; deterministic mapping note (schema registry is the Tech Stack spec's job — not in this slice). Permission gate for >12 months preserved.
4. **Category C (manual records):** ingestion-first (existing Document Agent path), with expectation copy ("I'll flag anything I'm not fully sure about") and a later-slice date-gap warning.
5. **Category D (statements only):** **verified end-to-end in this slice** (routing → connect bank/mobile money → statements → categorize → expectation copy). It is the likely highest-volume launch segment; only its confidence-band tuning and cross-check logic are deferred.
6. **Category E (no records at all):** new **owner-confirmed opening balance** step (simplified 3-field entry: cash on hand / owed to you / you owe, collapsible per-account detail) + explicit **"I don't know yet — start from today, we'll reconcile later" escape hatch** (zero balances, flagged). No reconstruction is implied. Source is always recorded (`owner_confirmed`) with who confirmed.
7. **Detail depth choice** for B/C/D: `last_12_months` (auto, default) / `last_3_years` / `full_history`, with honest time estimates and "your books are correct either way — the opening balance covers everything before this window" framing (never reads as a paywall).
8. **Per-category CFO first message** on TWO surfaces (pipeline `completeFlow`/first-message AND liveness "First Look" terminal text), so Category A/E never imply records were "found".
9. **Conditional liveness:** `OnboardingLiveness` takes `sourceType`; only B/C/D render the historical-pull progress panel. A renders a clean-slate state; E renders an opening-balance confirmation state. No fabrication, ever — including no fabricated-looking progress UI.

**Data model (migration 0024):** new enums `onboarding_source_type`, `opening_balance_source`, `reconstruction_detail_depth`; `entities` + 3 columns; new `opening_balances` table; `historical_pull_jobs` extended with `source_type`, `detail_depth`, `opening_balance_cutoff_date`, `model_tier_used` (see Taste Decision T1). The spec's §6 `reconstruction_jobs` fields are satisfied by extending the existing job table — one table per domain, not two.

### File List

| #   | File                                                                                                     | Action                                                                                                                                            |
| --- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `packages/db/schema/organization.ts`                                                                     | MODIFY — entities + 3 columns, new enums                                                                                                          |
| 2   | `packages/db/schema/onboarding.ts`                                                                       | MODIFY — `opening_balances` table + enums, `historical_pull_jobs` + 4 columns                                                                     |
| 3   | `packages/db/schema/index.ts`                                                                            | MODIFY — export new tables/enums if not auto-exported                                                                                             |
| 4   | `packages/db/migrations/0024_*.sql` + `meta/0023_snapshot.json` → `0024_snapshot.json` + `_journal.json` | GENERATED via `pnpm db:generate`                                                                                                                  |
| 5   | `packages/agents/core/onboarding-pipeline.ts`                                                            | MODIFY — category routing, `confirmOpeningBalance`, `getOpeningBalanceSummary`, depth in `startHistoricalPull`, per-category first message        |
| 6   | `apps/web/server/routers/onboarding.ts`                                                                  | MODIFY — five-category enum, `setBusinessStart`, `setDetailDepth`, `confirmOpeningBalance`, `getOpeningBalances`, `requestHistoricalPull` + depth |
| 7   | `apps/web/app/(auth)/register/onboarding/page.tsx`                                                       | MODIFY — five-category routing + follow-ups, E opening-balance step, conditional steps/liveness, category-aware first-look copy                   |
| 8   | `apps/web/components/onboarding/onboarding-liveness.tsx`                                                 | MODIFY — `sourceType` prop, A/E state variants, category-driven First Look text                                                                   |
| 9   | `apps/web/__tests__/onboarding-wizard-routing.test.tsx`                                                  | NEW — category branching tests                                                                                                                    |
| 10  | `apps/web/__tests__/onboarding-router.test.ts`                                                           | NEW — router/zod/entity-scoping tests                                                                                                             |
| 11  | `packages/agents/__tests__/onboarding-pipeline-categories.test.ts`                                       | NEW — pipeline category-path tests                                                                                                                |
| 12  | `BUILD_LOG.md`                                                                                           | MODIFY — session entry after build                                                                                                                |

### File Order

1. Schema (1–4) → 2. Pipeline (5) → 3. tRPC router (6) → 4. Wizard UI (7) → 5. Liveness (8) → 6. Tests (9–11) → 7. Verification + BUILD_LOG (12).

### What Each File Contains

**1–4. DB schema + migration.** `onboardingSourceTypeEnum` (`brand_new | professional_software | manual_records | statements_only | no_records`), `openingBalanceSourceEnum` (`reconstructed | owner_confirmed | migrated_from_source_system`), `reconstructionDetailDepthEnum` (`last_12_months | last_3_years | full_history`). `entities` += `onboardingSourceType` (nullable), `businessStartDate` (date, nullable), `preIncorporationActivity` (boolean, nullable). New `opening_balances`: `id`, `entityId` (FK cascade), `accountId` (FK → `chartOfAccounts`, imported from `schema/accounting.ts`), `amount numeric(15,2)` notNull, `currency text default 'GMD'`, `source` enum notNull, `confirmedByUserId` (nullable, FK → `users` from `schema/auth.ts`), `confirmedAt`, `supportingDocumentId` (nullable), timestamps; **`uniqueIndex("opening_balances_entity_account").on(entityId, accountId)`** (required for the idempotent `onConflictDoUpdate` upsert — eng-voice HIGH fix) + `index` on `entityId`. `historical_pull_jobs` += `sourceType` (nullable), `detailDepth` default `last_12_months`, `openingBalanceCutoffDate` (date), `modelTierUsed` (text, nullable — full tier routing is the Tech Stack spec). **E-escape flag storage (eng-voice MEDIUM fix):** `entities.settings.openingBalanceNeedsReconciliation: true` (jsonb, no new column). Verify no import cycle at build: `accounting.ts`/`auth.ts` → `organization.ts` graph must not loop through `onboarding.ts`. Migration generated by Drizzle, never hand-written; RLS not re-enabled (matches current platform state — app-layer entity scoping is the enforcement).

**5. Pipeline (`onboarding-pipeline.ts`).** `setOnboardingSource(source, { businessStartDate?, preIncorporationActivity? })` **always persists to `onboarding_sessions.routing_answer`** (org-scoped, works before an entity exists) **and mirrors to `entities.onboarding_source_type` whenever an entity exists** (entity-timing fix — eng-voice MEDIUM/HIGH); `completeFlow` re-mirrors defensively so the column is never null on a finished Category A/E onboarding. `startHistoricalPull(entityId, start, end, detailDepth)` stores depth; **Category A is gated at `startHistoricalPull` only — A creates no `historical_pull_jobs` row but still runs the CoA/fiscal-period seeding portion of `runOnboardingPipeline`** (eng-voice MEDIUM fix). `confirmOpeningBalance(entityId, rows, confirmedByUserId)` — idempotent `onConflictDoUpdate` upsert keyed on the `(entityId, accountId)` unique index, single transaction (rollback on partial batch), `source='owner_confirmed'` (Category E) or `reconstructed`/`migrated_from_source_system` (B/C/D pipeline-created); entity-scoped everywhere. E-escape path writes zero rows and sets `entities.settings.openingBalanceNeedsReconciliation = true`. `getOpeningBalanceSummary(entityId)` for the review screen. `getFirstMessage(sourceType, summary)` — per-category copy (§ Category copy below); used by `completeFlow` path. Legacy `routing_answer` values (`excel|quickbooks|xero|nothing|other`) remain readable; `getStatus` maps them for display, and incomplete legacy sessions with `nothing` get re-asked the five-category question (lossless — no ALTER TYPE, no fabricated category).

**6. tRPC router.** `updateRoutingAnswer` input → the five-category `z.enum`, persists to session + entity (mirror). New: `setBusinessStart` `{businessStartDate: z.string().date().optional(), preIncorporationActivity: z.boolean()}` (date optional — a brand-new user may not know it yet, defaults to incorporation date); `setDetailDepth` `{depth: z.enum([...])}`; `confirmOpeningBalance` `{rows: [{accountId: uuid, amount: z.number().finite()}]}` — rejects duplicate `accountId`s in one batch (zod `.refine`), entity-scoped via `ctx.entityId`; `getOpeningBalances` query. `requestHistoricalPull` input += `detailDepth`. **`completeFlow` E gate (eng-voice MEDIUM fix):** for `no_records` entities, require confirmed balances OR the `openingBalanceNeedsReconciliation` escape flag before allowing first look. Every procedure: zod-validated, entity-scoped, `handleMutationError`.

**7. Wizard page.** Replace `ROUTING_OPTIONS` with the five categories + spec §2 copy. Sub-follow-ups in the same card: A → pre-incorporation Y/N + start date; B/C/D → detail-depth radio (12m auto / 3y / full history with time estimates + "correct either way" line; C adds the older-records warning); E → route to opening-balance step. New opening-balance step (E): 3-field simplified entry mapped to default accounts, collapsible per-account, "I don't know yet" escape (zero + flagged, proceeds). Conditional rendering: A/E hide the historical-pull liveness; progress bar reflects a shorter path for A. First-look copy per category.

**8. Liveness.** `sourceType` prop. `HISTORICAL_PULL_RUNNING` only for B/C/D. A → clean-slate state; E → opening-balance confirmation state. First Look terminal text driven by `getFirstMessage`.

**9–11. Tests.** (a) Wizard: five categories render; A shows start-date/pre-inc follow-up and no depth; **A pre-incorporation "yes" branch routes to the scoped mini-D window**; B/C/D show depth; E shows opening-balance step; E escape proceeds with zero+flag. (b) Router: zod enum rejection, **finite-amount + duplicate-accountId rejection**, entity scoping, `confirmOpeningBalance` writes `owner_confirmed`, **idempotency (double-submit → one row set) + partial-batch rollback**, `requestHistoricalPull` accepts depth, **`getStatus` legacy `routing_answer` mapping**. (c) Pipeline: A skips pull but still seeds CoA/periods; E opening balance owner_confirmed; per-category first message; legacy `nothing` re-ask mapping. (d) Liveness: **direct tests for `sourceType` A/E/B-C-D state rendering** (eng-voice MEDIUM fix — not just mocked). Update `e2e/flows/flow-01-register-onboard.spec.ts` routing labels if asserted.

**12. BUILD_LOG.md** — session entry (plan → build → verification).

### Category copy (locked in plan)

- `brand_new`: "You're starting with a clean slate — no history to sort through. I'll track everything from here. Let's set up your chart of accounts."
- `no_records`: "I don't have any records or statements to reconstruct your history from. I can start tracking from today with an opening balance you confirm — cash on hand, any money owed to you, and anything you owe — and we'll build accurate books from this point forward."
- `professional_software` / `statements_only` / `manual_records`: existing "I've reviewed your records. Here's what I found: …" summary variant, with the C/D expectation line ("Because these were kept manually / from statements, I'll flag anything I'm not fully sure about for your review, instead of guessing").

### Rules Applied

Entity scoping on every query (no exceptions); migrations generated not hand-written; zod on every input; no `any` (fix the wizard's existing `as any` casts on mutations); strict TS; UI conditional states never imply fabricated work (spec §7 rules 1, 4, 5); conventional commits; web-only.

### After Building

`pnpm typecheck --filter=@xenboox/web` · `pnpm lint --filter=@xenboox/web` · `pnpm test --filter=@xenboox/web` · `pnpm test --filter=@xenboox/agents` · migration generate + review 0024 · full local build; browser-verify the wizard A/B/C/D/E branches via QA skill.

### What I Won't Touch

Chart-of-accounts internals, Document Agent ingestion pipeline, Trigger.dev jobs, mobile/desktop, firm tier (Phase 3), model routing/control plane (Tech Stack spec), source-system schema registry (Tech Stack spec), RLS re-enablement.

---

## Phase 1 — CEO Review (Strategy & Scope)

### 0A. Premise challenge

| Premise                                                                | Verdict                                                                                                                                                                                                                     |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Pull all history free, unpaywalled — prerequisite for correct books"  | **Accept** — already locked in PRD §13; correct differentiator vs QBO/Xero caps.                                                                                                                                            |
| "Not every new user has history; five categories are the right split"  | **Accept** — the current `nothing` option conflates brand-new (A) with informal cash-only (E); opposite arcs and opposite first-message copy. The split is the core fix.                                                    |
| "No fabrication, ever"                                                 | **Accept, non-negotiable** — consistent with existing confidence architecture (PRD §6.7) and the no-fabrication rule for jurisdiction tax rules.                                                                            |
| "Category A is the gold standard, not a fallback"                      | **Accept with caveat** — true internally; but if A is a minority of launch users, the marketing framing must not outrun reality. UI must actually be shorter for A or the claim is visible-on-screen false (see Design D2). |
| "Opening balance always included; transaction detail is a user choice" | **Accept** — but the depth screen must never read as a paywall (framing locked in this plan).                                                                                                                               |
| "Category E owners can confirm an opening balance"                     | **Challenge — partially wrong.** Many informal owners can't. **Fix locked:** "I don't know yet — start from today, we'll reconcile later" escape (zero + flagged).                                                          |

### 0B. Existing code leverage map

| Sub-problem                       | Existing code                                                                                             |
| --------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Routing question                  | Wizard step 0 + `updateRoutingAnswer` + `onboarding_sessions.routing_answer`                              |
| Historical pull + permission gate | `historical_pull_jobs`, `startHistoricalPull`, `requestHistoricalPullPermission`, `approveHistoricalPull` |
| Data connections + fallbacks      | `data_connections`, `connectData`, `getFallback`                                                          |
| CoA proposal                      | `getCoaSuggestions`, `confirmCoa`, `coa_templates`                                                        |
| Progress/trust surface            | `OnboardingLiveness` (per-period pull, permission-requested branch)                                       |
| First value                       | `completeFlow`, time-to-first-value tracking                                                              |

### 0C. Dream state diagram

```
CURRENT ──────────────────────────────────────────────────────────
routing(5 vague options) → segment → connect → pull(background) → CoA → first look
  • "nothing" conflates A and E   • no opening-balance honesty
  • one generic first message     • pull UI implied even when nothing to pull

THIS PLAN (Slice 1) ──────────────────────────────────────────────
five-category routing (+follow-ups)
  ├─ A brand_new ──► start-date/pre-inc ──► CoA ──► clean-slate first look (no pull UI)
  ├─ B software ───► depth ──► connect ──► pull(permission gate) ──► first look
  ├─ C manual ─────► depth ──► ingest-first ──► pull ──► "flagged for review" first look
  ├─ D statements ─► depth ──► connect(bank/momo) ──► pull ──► first look
  └─ E no records ─► opening balance (3-field, owner-confirmed, escape hatch) ──► CoA ──► honest first look
every path: opening_balances.source recorded · per-category first message · conditional liveness

12-MONTH IDEAL ────────────────────────────────────────────────────
+ Category C/D cross-check + confidence-band tuning (Slice 2)
+ firm-assisted routing (Phase 3)   + model-tier cost routing (Tech Stack spec)
+ source-system schema registry (Tech Stack spec)
```

### 0C-bis. Implementation alternatives

| Approach                                          | Effort       | Risk                                                                                                          | Verdict                                                  |
| ------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| **A. Five-category slice 1 (this plan)**          | ~2–3 days CC | Low                                                                                                           | **Chosen** (P1 completeness within slice-1 scope; P6)    |
| B. Keep vague routing, only add E opening balance | ~0.5 day     | High — leaves A/E conflation and duplicate-question risk                                                      | Rejected (P1: ships the confusion)                       |
| C. Whole spec incl. C/D tuning + cross-check now  | ~1–2 weeks   | Medium — C/D cross-check needs statement-vs-manual reconciliation logic not in scope of any existing pipeline | Deferred to Slice 2 (P3 pragmatic; spec §8 sequences it) |

### 0D–0F. Mode + temporal interrogation

Mode: **SELECTIVE EXPANSION** — expand routing + A/B/D/E flows + opening balance + depth (must-haves per spec §8); defer C/D tuning, firm routing, model-tier wiring. HOUR 1: schema + migration + pipeline functions. HOUR 3: router + wizard + liveness. HOUR 6+: tests + verification. No dependency surprises: pipeline depends on schema; wizard depends on router; liveness depends on sourceType plumbed from wizard state.

### 0.5. Dual voices — consensus

Codex unavailable (no gstack binaries on this machine) → `[codex-unavailable][subagent-only]`. Independent Claude subagent (CEO/design pass) surfaced 9 findings; all incorporated above or in the gate.

```
CEO DUAL VOICES — CONSENSUS TABLE (subagent-only):
  Dimension                          Voice     Consensus
  1. Premises valid?                 partial   CONFIRMED (3 premises corrected → fixes locked)
  2. Right problem to solve?         yes       CONFIRMED
  3. Scope calibration correct?      yes, with D-in-slice-1 fix  CONFIRMED (amended)
  4. Alternatives explored?          yes       CONFIRMED
  5. Competitive/market risks covered? yes      CONFIRMED (D = highest-volume segment)
  6. 6-month trajectory sound?       yes       CONFIRMED (enum-loss risk avoided via new enum)
```

### Sections 1–10 — findings (auto-decided)

- **S1 Strategy/market:** The `nothing` conflation is the product bug the spec fixes; Category D is likely the largest Gambia segment (mobile-money ubiquity) — decided: D verified end-to-end in slice 1, tuning deferred. _P1._
- **S2 Failure paths:** Existing fallback ladder (bank PDF fail → manual entry; QBO OAuth fail → CSV) preserved. New failure paths added to registry below. _P5._
- **S3 Architecture fit:** Extends existing pipeline/schema — no new infrastructure. DRY check: `opening_balances` is new domain data (no existing table); job tracking extends the existing table rather than duplicating (T1). _P4._
- **S4 Scope discipline:** Firm-assisted routing (spec §5) deferred — depends on Firm tier (Phase 3). C/D cross-check deferred. Model-tier wiring deferred to Tech Stack spec. _P3._
- **S5 UX/onboarding:** Single routing question (not a second Step-3a ask); conditional liveness; per-category first message on both surfaces. _P1+P5._
- **S6 Data/analytics:** `opening_balances.source` enables audit-trail honesty; `modelTierUsed` column reserved (actual tier routing is later). _P1._
- **S7 Security/tenancy:** All new procedures entity-scoped; `confirmOpeningBalance` validates `accountId` belongs to the entity. No elevation. _P1._
- **S8 Performance:** Opening-balance insert is per-entity, trivially small; no N+1 introduced. _P3._
- **S9 Compliance:** No new regulated surface; no-fabrication rule is the compliance posture (spec §7.1). _P1._
- **S10 Risks:** Enum loss (avoided — new enum, no ALTER TYPE), duplicate-question UX (avoided — replace), fabricated-looking UI (avoided — conditional liveness), E dead-end (avoided — escape hatch). _P1._

### Error & Rescue Registry

| Failure                                                 | Rescue                                                                |
| ------------------------------------------------------- | --------------------------------------------------------------------- |
| User connects sources before/without answering category | Derive category from connections → show as confirmation, never re-ask |
| Category E owner doesn't know balances                  | "I don't know yet" → zero balances + flagged for later reconciliation |
| Legacy session with `routing_answer='nothing'`          | Re-ask five-category question (no silent default)                     |
| QBO/Xero OAuth fails (Category B)                       | CSV export path offered (existing) — still Category B                 |
| Bank/momo statement format not recognized               | Manual entry + agent asks for different export (existing)             |
| Detail depth "full history" estimate slips              | Honest estimate up front; background job; status visible in liveness  |
| `confirmOpeningBalance` accountId not in entity         | Zod + entity-scoped validation → clear error                          |

### Failure Modes Registry

| Mode                                                    | Impact                                     | Detection                          | Mitigation                                  |
| ------------------------------------------------------- | ------------------------------------------ | ---------------------------------- | ------------------------------------------- |
| Two routing questions shipped                           | Visible product wart, abandoned onboarding | Wizard walkthrough                 | Single question locked in plan (T2)         |
| Category A shows pull progress                          | Fabrication-by-UI (spec §7.4 violation)    | Liveness rendered for A            | Conditional liveness (T3)                   |
| First message says "I've reviewed your records" for A/E | Fabrication in copy                        | completeFlow + liveness First Look | `getFirstMessage(sourceType)` both surfaces |
| Lossy legacy-enum migration                             | Wrong category assigned silently           | —                                  | New enum + re-ask, no ALTER TYPE            |
| E dead-end without balances                             | Drop-off of target segment                 | QA walkthrough                     | Escape hatch + flag                         |

### Completion Summary (CEO)

The slice is correctly scoped: it delivers the spec's launch must-haves (routing, A, B, D, E + opening balance + depth + honest messaging) on the existing pipeline with zero new infrastructure, and defers only the spec-sequenced follow-ups. The subagent's high findings (single question, E escape, conditional liveness) are locked into the plan, not left to the builder's judgment.

**PHASE 1 COMPLETE.** Codex: n/a (unavailable). Claude subagent: 9 issues, all resolved in-plan. Consensus: 6/6 confirmed (1 amended). Premise gate: the plan's interpretations are flagged as Taste Decisions T1–T3 at the gate — user decides.

---

## Phase 2 — Design Review (UI scope: yes)

### Step 0. Design scope + completeness

Initial completeness: **4/10** (routing exists but conflates; no E flow; first-message hardcoded). Design system: shadcn/ui + existing wizard card pattern — the new steps reuse them; no new design language.

### 0.5. Litmus scorecard (subagent-only voice)

| Dimension             | Score | Note                                                                                                 |
| --------------------- | ----- | ---------------------------------------------------------------------------------------------------- |
| Information hierarchy | 6     | Single question at step 0; follow-ups nested in-card; E opening-balance simplified                   |
| Missing states        | 7     | E "I don't know" escape, A clean-slate, C older-records warning, derived-category confirmation       |
| User journey arc      | 7     | A visibly shorter; E honest-limits; B/C/D unchanged arc                                              |
| Specificity           | 8     | Copy, fields, and conditional rendering specified in-plan                                            |
| Accessibility         | 5     | Radio-card pattern retained (keyboard-focusable buttons); verify contrast on new states during build |
| Responsive            | 6     | Existing grid pattern retained; opening-balance 3-field stacks on mobile                             |
| Trust/honesty         | 9     | Source recorded; no fabricated progress; per-category messaging                                      |

### Passes 1–7 (auto-decided findings)

- **Pass 1 (hierarchy):** One routing question, five categories, at the current step-0 position; follow-ups inline. Reject any second ask (subagent D1 — CRITICAL).
- **Pass 2 (states):** E escape hatch, A clean-slate state, C date-gap note, derived-category confirmation, depth-screen "correct either way" framing. All locked.
- **Pass 3 (journey):** A arc = 4 steps not 6; progress bar dynamic; no pull panel for A/E. Locked.
- **Pass 4 (specificity):** E screen = 3-field default + collapsible per-account + audit fields (source, who, when, currency, optional doc). Locked.
- **Pass 5 (a11y):** Keep button/radio-card pattern; `aria-describedby` on the depth radios' time estimates; verify during build. Auto-decided: honor in build.
- **Pass 6 (responsive):** 3-field opening balance stacks; grid gap retained. Auto-decided.
- **Pass 7 (system alignment):** Reuse `Card`/`Button`/lucide icons; no new tokens. Auto-decided.

**PHASE 2 COMPLETE.** Subagent: 5 design findings, all locked. Overall design readiness for build: 7/10 (a11y verification at build time).

---

## Phase 3 — Eng Review

### Step 0. Scope challenge (read actual code)

Read: wizard (`(auth)/register/onboarding/page.tsx`, 589 lines), router (`server/routers/onboarding.ts`), schema (`packages/db/schema/onboarding.ts`, `organization.ts`), `PLAN_REVAMP.md`, PRD §13, pipeline (1739 lines, key symbols). Findings:

1. Wizard uses `as any` on mutation inputs (`answer as any`, `type as any`) — the new five-category enum lets us type these properly. Fix in build (P5).
2. Wizard has no dedicated historical-pull step — pull is background/liveness; confirms "Step 3a" must map onto the existing routing question, not a literal new step (T2).
3. `historical_pull_jobs` already tracks entity-scoped jobs with the permission gate — extending it satisfies spec §6 without a second job table (T1).
4. Legacy `routing_answer` values must stay readable; new category persists to `entities.onboarding_source_type`. No enum ALTER (lossless).
5. `completeFlow` fires `runOnboardingPipeline` — Category A must skip historical seeding; the pipeline entry already checks job existence (verify idempotency in build).

### 1. Architecture (ASCII)

```
wizard page ──► onboardingRouter (entity-scoped, zod)
                   │
                   ├─ updateRoutingAnswer ──► setOnboardingSource() ──► entities.onboarding_source_type
                   ├─ setDetailDepth ───────► (session metadata / job when created)
                   ├─ requestHistoricalPull ─► startHistoricalPull(..., detailDepth) ──► historical_pull_jobs
                   │                            └─ >12mo? ─► requestHistoricalPullPermission ──► approveHistoricalPull
                   ├─ confirmOpeningBalance ─► opening_balances (source=owner_confirmed)
                   ├─ getOpeningBalances ────► opening_balances (entity-scoped)
                   └─ completeFlow ──────────► completeOnboarding() + getFirstMessage(sourceType)
                                                     │
OnboardingLiveness (sourceType prop) ◄── pipeline status ──┘
   ├─ B/C/D: HISTORICAL_PULL_RUNNING (existing per-period panel)
   ├─ A:     CLEAN_SLATE
   └─ E:     OPENING_BALANCE_CONFIRMATION
```

Coupling: low — pipeline functions are pure-ish data ops on entity-scoped tables; router stays thin; liveness reads one prop. Security: every new read/write passes `ctx.entityId`; `opening_balances.accountId` validated against the entity's accounts.

### 2. Code quality

DRY: no duplicate job table (T1); first-message copy centralized in `getFirstMessage` (not duplicated across wizard/liveness/pipeline); category labels single-sourced in the wizard's `ROUTING_OPTIONS` + router zod enum. Type the mutation inputs (removes `as any`). All new code strict-TS, no `any`.

### 3. Test review (NEVER skipped) — test diagram

| New UX flow / codepath                                                                               | Test                                         | Exists?                   |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------- |
| 5-category routing renders, follow-ups branch (A→start-date/pre-inc, B/C/D→depth, E→opening balance) | `onboarding-wizard-routing.test.tsx`         | NEW                       |
| E "I don't know" escape → zero+flag, proceeds                                                        | same                                         | NEW                       |
| Depth screen framing + C warning copy present                                                        | same                                         | NEW                       |
| A renders no historical-pull liveness; E renders confirmation state                                  | same (mock liveness prop)                    | NEW                       |
| Router zod enum rejects bad category/depth                                                           | `onboarding-router.test.ts`                  | NEW                       |
| `confirmOpeningBalance` writes `owner_confirmed`, entity-scoped, idempotent                          | router + pipeline tests                      | NEW                       |
| `requestHistoricalPull` persists detailDepth                                                         | router + pipeline                            | NEW                       |
| Pipeline: A skips pull; per-category first message                                                   | `onboarding-pipeline-categories.test.ts`     | NEW                       |
| Legacy `nothing` → re-ask mapping                                                                    | pipeline test                                | NEW                       |
| >12-month permission gate preserved (regression)                                                     | existing pipeline tests                      | EXISTS — keep green       |
| Register→onboard e2e routing labels                                                                  | `e2e/flows/flow-01-register-onboard.spec.ts` | UPDATE labels if asserted |

Test plan artifact: this diagram + the suites above **is** the test plan; suites to run: `pnpm test --filter=@xenboox/web`, `--filter=@xenboox/agents`.

### 4. Performance

No N+1: `getOpeningBalances` is one entity-scoped query; `confirmOpeningBalance` is a single upsert batch; opening-balance rows are per-entity and tiny. The historical pull stays in the existing background pipeline. Nothing hot-path changes.

### Failure modes (eng)

| Mode                                                        | Flag                        | Mitigation                                                                                              |
| ----------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------- |
| `confirmOpeningBalance` partial batch failure               | critical-gap if not handled | Single transaction; rollback on error                                                                   |
| Duplicate opening-balance rows on retry                     | —                           | **`uniqueIndex(entityId, accountId)` + `onConflictDoUpdate` upsert (eng-voice HIGH — locked)**          |
| `entities.onboarding_source_type` null at first look        | critical                    | Session-always + entity mirror at `completeFlow` (eng-voice MEDIUM/HIGH — locked)                       |
| A user answering pre-incorporation "yes" with no statements | —                           | Reuse manual-entry connection scoped to pre-start-date window                                           |
| Category E first message shown while balances unconfirmed   | critical                    | `completeFlow` gate: confirmed or `openingBalanceNeedsReconciliation` escape before first look (locked) |
| A accidentally skipping CoA/period seeding                  | critical                    | Gate only `startHistoricalPull` on source type; pipeline seeding always runs (locked)                   |

**PHASE 3 COMPLETE.** Consensus (subagent-only): 6/6 confirmed after incorporating the eng-voice fixes above (unique index, entity timing, A semantics, E flag + gate, +4 test codepaths, zod polish).

---

## Phase 3.5 — DX Review

**Skipped — no developer-facing scope detected.** This is an end-user onboarding flow on an existing internal pipeline. The only DX-adjacent artifacts are the new tRPC procedures and migration, which follow existing repo conventions (create-api-route / create-migration patterns) — no new developer surface, no API for third parties, no CLI. Rationale recorded per the skip condition.

---

## Cross-Phase Themes

- **Theme: honesty-by-UI (no fabricated work)** — flagged independently in CEO (S10), Design (Pass 2/3), and Eng (failure modes: A/E liveness, first message, unconfirmed E state). High-confidence signal: the single most important non-negotiable of the whole build. All three surfaces (wizard, liveness, first message) must be category-driven.
- **Theme: one question, not two** — CEO (S5) + Design (Pass 1) + Eng (scope finding 2). Locked as Taste Decision T2.

---

## Decision Audit Trail

<!-- AUTONOMOUS DECISION LOG -->

| #   | Phase  | Decision                                                                                                              | Classification                     | Principle | Rationale                                                                       | Rejected                        |
| --- | ------ | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | --------- | ------------------------------------------------------------------------------- | ------------------------------- |
| 1   | CEO    | Slice 1 scope (routing, A/B/D/E, opening balance, depth); defer C/D tuning + firm routing + model tier                | Mechanical                         | P3/P6     | Spec §8 build order; dependencies (Firm=Phase 3, model tier=Tech Stack)         | Full-spec-now                   |
| 2   | CEO    | D verified end-to-end in slice 1, tuning deferred                                                                     | Taste → locked (subagent high)     | P1        | D likely highest-volume launch segment (mobile money)                           | Defer D entirely                |
| 3   | CEO    | New `onboarding_source_type` enum; legacy `routing_answer` kept, `nothing` re-asked                                   | Mechanical                         | P1/P5     | Lossless; no fabricated category                                                | ALTER TYPE migration            |
| 4   | CEO    | E "I don't know" escape hatch (zero + flag)                                                                           | Taste → locked (subagent high)     | P1        | Prevents E dead-end for target users                                            | Owner-only entry                |
| 5   | CEO    | Per-category first message on pipeline + liveness                                                                     | Mechanical                         | P1        | Spec §3.1/§3.5 honesty rules                                                    | Single generic message          |
| 6   | Design | Single five-category question replaces step-0 routing; no second ask                                                  | Taste → locked (subagent CRITICAL) | P1/P5     | Duplicate question = hierarchy violation; derived-category confirmation instead | Literal Step-3a re-ask          |
| 7   | Design | Conditional liveness (A clean-slate, E confirmation, B/C/D pull)                                                      | Taste → locked (subagent high)     | P1        | Fabrication-by-UI is spec §7.4 violation                                        | Show pull panel for all         |
| 8   | Eng    | Extend `historical_pull_jobs` with depth/cutoff/tier/source (spec §6 fields)                                          | **TASTE DECISION T1**              | P4/P3     | One job table per domain; spec's `reconstruction_jobs` fields all present       | New `reconstruction_jobs` table |
| 9   | Eng    | `opening_balances` upsert keyed (entityId, accountId); single txn                                                     | Mechanical                         | P1        | Idempotency + no partial batches                                                | Loose inserts                   |
| 10  | Eng    | Type wizard mutation inputs (remove `as any`)                                                                         | Mechanical                         | P5        | New enums make it trivial; strict TS                                            | Leave as-is                     |
| 11  | Eng    | `uniqueIndex(entityId, accountId)` on opening_balances (eng-voice HIGH)                                               | Mechanical                         | P1        | `onConflictDoUpdate` requires it; otherwise retries duplicate                   | Plain index only                |
| 12  | Eng    | Source persisted to session always, mirrored to entities when entity exists + at completeFlow (eng-voice MEDIUM/HIGH) | Mechanical                         | P1        | Wizard has no entity-creation step; entity may not exist at routing             | Best-effort entity write only   |
| 13  | Eng    | A gates only `startHistoricalPull`; still seeds CoA/periods (eng-voice MEDIUM)                                        | Mechanical                         | P5        | A needs periods even without a pull job                                         | Skip entire pipeline for A      |
| 14  | Eng    | E escape flag stored in `entities.settings.openingBalanceNeedsReconciliation` (eng-voice MEDIUM)                      | Mechanical                         | P1        | Needs a named storage home for the completeFlow gate                            | Unspecified flag                |
| 15  | Eng    | `completeFlow` E gate: confirmed or escaped before first look (eng-voice MEDIUM)                                      | Mechanical                         | P1        | Spec honesty rule for A/E                                                       | No gate                         |

---

## Final Approval Gate

### Plan Summary

Upgrades the existing onboarding flow (web) to the spec's five record-keeping categories with per-category flows (A clean-slate, B software, C manual, D statements, E owner-confirmed opening balance with an "I don't know" escape), a detail-depth choice for B/C/D, an `opening_balances` table with source-tagged audit fields, and category-driven first-message/liveness so no path implies history that doesn't exist. Slice 1 covers the spec's launch must-haves; C/D tuning, firm-assisted routing, and model-tier wiring are deferred per spec §8.

### Decisions Made: 15 total (12 auto-decided, 3 taste choices, 0 user challenges)

### Your Choices (taste decisions)

**T1 — reconstruction job record: extend `historical_pull_jobs` vs new `reconstruction_jobs` table.** I recommend **extend** (DRY, one table per domain; every spec §6 field is present as a column). The spec-literal alternative (separate `reconstruction_jobs`) is viable but creates two tables tracking the same entity-scoped pull — write-consistency risk and migration weight. Downstream impact if you pick the new table: one extra table + relation, slightly more faithful to the spec's letter, more code.

**T2 — where the five-category question lives.** I recommend **replacing the existing step-0 routing question** (it is the de-facto Step 3a; a literal second ask after connect-data is a duplicate-question wart — the subagent's CRITICAL finding). The spec's literal position (after Step 3) assumes the PRD's 6-step wizard, but the shipped wizard has routing at step 0 and no dedicated pull step. Downstream impact if you pick the literal position: two similar questions in one flow; connect actions already reveal the answer.

**T3 — Category A/E UI depth.** I recommend the **conditional-liveness design** (A renders a clean-slate state, E an opening-balance confirmation state; only B/C/D show the per-period pull panel). This is the only option that satisfies the spec's §7.4 rule (no fabrication, including fabricated-looking progress UI). Downstream impact if you prefer uniform UI: the gold-standard claim for A is false on screen, and E's honesty messaging fights the pull panel.

### Review Scores

- **CEO:** 7/10 → plan fixes 3 flawed premises; D correctly promoted to slice-1 must-have.
- **CEO Voices:** Codex unavailable. Claude subagent: 9 issues (3 high), all locked. Consensus 6/6 confirmed.
- **Design:** 7/10 readiness; 5 findings locked (single question, E escape, conditional liveness, E screen spec, depth framing).
- **Design Voices:** Codex unavailable. Claude subagent: 5 issues (1 critical). Consensus 7/7.
- **Eng:** scope challenge read real code; 5 findings (typed inputs, no second table, legacy enum safety, A skip-pull, E-before-first-look gate). Consensus 6/6.
- **Eng Voices:** Codex unavailable. Subagent-only.
- **DX:** skipped — no developer-facing scope.
- **Cross-Phase Themes:** honesty-by-UI (3 phases), one-question-not-two (3 phases).

### Deferred to slice 2 / TODOS

- Category C/D confidence-band tuning + statements-vs-manual cross-check logic (spec §8)
- Firm-assisted onboarding routing exception (spec §5 — depends on Firm tier, Phase 3)
- Date-gap detection warning UI for old manual records (C)
- Model-tier actual routing + `source_system_schema_mappings` (Tech Stack spec)
- `AiCopilotPanel` dead code cleanup (pre-existing, unrelated)

### Implementation Tasks (aggregated)

1. **P1 — Schema + migration 0024** (files 1–4): enums, entities columns, `opening_balances`, `historical_pull_jobs` columns.
2. **P1 — Pipeline** (5): `setOnboardingSource`, `confirmOpeningBalance`, `getOpeningBalanceSummary`, depth param, `getFirstMessage`.
3. **P1 — Router** (6): five-category enum + 4 new procedures + depth on pull.
4. **P1 — Wizard** (7): category cards, follow-ups, E opening-balance step, conditional steps/liveness, typed mutations.
5. **P1 — Liveness** (8): `sourceType` prop, A/E states, category first-look text.
6. **P1 — Tests** (9–11) + e2e label update.
7. **P2 — BUILD_LOG** + full verification (typecheck, lint, both test suites, build, browser walkthrough).

---

## Approval Gate

Approve as-is, override a taste decision, or revise. On **A** (approve), the build executes exactly this plan and the audit trail above, then runs typecheck + tests + build and logs to BUILD_LOG.
