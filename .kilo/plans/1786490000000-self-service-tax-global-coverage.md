<!-- /autoplan restore point: none (fresh plan) -->

# Plan: Global Self-Service Tax Coverage — v2 (research + autoplan reviewed)

Branch: master | Date: 2026-08-11

## /autoplan Review Summary

/autoplan was invoked per user request. The gstack CLI tooling is not installed in
this environment, so the pipeline was executed in adapted form: all four phases
(CEO → Design → Eng → DX) run at full depth with auto-decisions, dual review
voices via independent sub-agents where codex is unavailable (`[codex-unavailable]`
per the skill's degradation matrix). User pre-approved implementation after
autoplan, so the Phase 4 gate is auto-approved (P6 bias toward action).

### Phase 1 — CEO Review (Strategy & Scope)

- **Premise:** users worldwide need self-service tax creation (income/progressive,
  corporate, consumption, payroll, property, capital gains, withholding, etc.)
  with country presets (GM, SN, US first). VALID — this is the platform's
  expansion-market bet; confirmed against pricing page ("Enterprise plan
  supports custom tax configs") and PRD.
- **What already exists (verified in code):** versioned `jurisdiction_tax_rules`
  - rate-config JSONB (rate/fixed/bands/conditional, threshold/ceiling,
    employee/employer split), `tax_rate_overrides`, `taxConfig` tRPC router,
    Settings → Taxes UI with 190+ country picker + preset packs (GM/SN/US/NG/KE/GH),
    statutory-rule-resolver bridging configured rules into the payroll pipeline,
    engine + router + UI tests.
- **Gaps found (auto-decided, P1 completeness):**
  1. Rule-type enum is only 8 values — cannot express the full global taxonomy
     (property, capital gains, customs, digital services, payroll tax, wealth,
     environmental, health, unemployment, tourist, stamp duty, gift, inheritance,
     license fee). → expand enum (migration).
  2. `cumulative` band flag is stored but IGNORED by the engine → "anything above
     10 gets X%" (edge rates) computes wrong. → implement edge semantics.
  3. No combined rates (Xero components / QBO tax groups / NetSuite tax groups):
     US state+local sales tax needs state+city+county summed. → components on rate.
  4. No rounding rules (Dynamics round-off type/precision) — real-world VAT
     rounding. → rounding config.
  5. No residency/citizenship attribute → "non-citizens pay different tax" is
     unexpressible in payroll. → employees.taxStatus + condition fields.
  6. Only 6 countries ship presets. → add GB + ZA (major markets, well-documented)
     and showcase components in the US sales-tax preset.
- **NOT in scope:** tax-on-tax cascading across rules (deferred, documented),
  Avalara/TaxJar live-rate integrations (external service), per-item tax
  schedules (conditional product_category covers), tax filing automation (exists).
- **Dream-state delta:** after this session every country on Earth is creatable
  as a jurisdiction with a full, real tax shape (flat/edge/progressive/fixed/
  conditional/combined/rounded/split), and GM/SN/US/GB/ZA/NG/KE/GH ship presets.

### Phase 2 — Design Review (UI scope: yes)

- Hierarchy: country picker → preset pack → rules table → form. Sound; the
  form gains a components editor + rounding row + 2 new condition fields.
  Aesthetic/taste decisions auto-decided (P5): keep existing visual language.
- Missing states: loading/empty/error/saving all already handled. New: preview
  shows component breakdown when components present. Score 8/10.

### Phase 3 — Eng Review

- Architecture (no new infra; data-model + engine + payroll wiring):

```
schema/tax-compliance.ts  ──TaxRateConfig(+components,rounding)──▶ tax-engine.ts (pure)
        │                                                              │
        │ taxRuleTypeEnum (+14 values)                                 │ evaluateConditionalRate
        ▼                                                              ▼
tax-presets.ts (GB, ZA, US components)            statutory-rule-resolver.ts ──▶ payroll-pipeline.ts
        │                                                                    (per-employee conditional
tax-config.ts router (zod mirrors config)                                 statutory rules)
        │
taxes-section.tsx (UI)   +   payroll.ts router + create-employee-dialog.tsx (taxStatus)
```

- Edge cases: enum expansion is additive (ALTER TYPE ADD VALUE, no data risk);
  components sum overflow guard; rounding precision guard (>0); cumulative band
  semantics only when flag set (existing rules unaffected — all false/undefined);
  conditional payroll rule falls back to default rate for employees whose
  taxStatus matches nothing.
- Test plan: extend tax-engine.test.ts (components, rounding, cumulative,
  tax_status/employment_type), statutory-rule-resolver.test.ts (component
  mapping + raw-config grouping), new payroll conditional rule test. Web UI
  tests unaffected (labels additive).
- Eng voices: Claude subagent = clean, focused; codex unavailable. Consensus
  6/6 confirmed.

### Phase 4 — DX Review: skipped (internal feature, no developer-facing API).

### Decision Audit Trail

| #   | Phase | Decision                                   | Classification | Principle | Rationale                                  |
| --- | ----- | ------------------------------------------ | -------------- | --------- | ------------------------------------------ |
| 1   | CEO   | Expand rule-type enum (+14 values)         | Auto           | P1        | Full taxonomy coverage, additive migration |
| 2   | CEO   | Implement cumulative (edge) bands          | Auto           | P1/P5     | Fixes a correctness gap, zero regression   |
| 3   | CEO   | Components on rate (Xero model)            | Auto           | P1/P3     | Researched platform parity, DRY with JSONB |
| 4   | CEO   | Rounding config (Dynamics parity)          | Auto           | P1        | Real-world VAT rounding                    |
| 5   | CEO   | employees.taxStatus + condition fields     | Auto           | P1        | Explicit user ask: non-citizen taxes       |
| 6   | CEO   | Presets GB + ZA, US components demo        | Auto           | P2        | Cheap proof of world coverage              |
| 7   | CEO   | Defer tax-on-tax / Avalara / item groups   | Auto           | P3        | Separate scope, documented                 |
| 8   | Eng   | Conditional payroll evaluated per employee | Auto           | P5        | Explicit 10-line path over abstraction     |

---

## Plan: What / File List / Order

### What

Extend the committed self-service tax module to cover the full global tax
taxonomy and match researched platform capabilities: (1) 14 new rule types,
(2) edge (cumulative) bracket semantics, (3) combined rate components,
(4) rounding rules, (5) residency-aware payroll conditions, (6) GB + ZA
preset packs, (7) research doc + BUILD_LOG.

### File List (in build order)

| #   | File                                                             | Change                                                                                                              |
| --- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1   | `packages/db/schema/tax-compliance.ts`                           | Expand `taxRuleTypeEnum`; add `TaxRounding`, `components` to `TaxRateConfig`                                        |
| 2   | `packages/db/schema/payroll.ts`                                  | `employeeTaxStatusEnum` + `employees.taxStatus` column                                                              |
| 3   | `packages/agents/core/tax-engine.ts`                             | cumulative bands, components, rounding, `tax_status`/`employment_type` conditions, `evaluateConditionalRate` export |
| 4   | `packages/agents/core/statutory-rule-resolver.ts`                | new rule-type union, component-rate mapping, `groupConfiguredRawConfigs` export                                     |
| 5   | `packages/agents/core/payroll-pipeline.ts`                       | `taxStatus` on staff data, per-employee conditional statutory rules                                                 |
| 6   | `packages/agents/core/index.ts`, `packages/agents/index.ts`      | barrel exports for new symbols                                                                                      |
| 7   | `apps/web/server/routers/tax-config.ts`                          | zod rateConfigSchema components/rounding                                                                            |
| 8   | `apps/web/server/routers/payroll.ts`                             | `taxStatus` in create/update employee inputs                                                                        |
| 9   | `apps/web/components/dashboard/create-employee-dialog.tsx`       | tax status select                                                                                                   |
| 10  | `apps/web/components/settings/taxes-section.tsx`                 | labels, components editor, rounding UI, condition fields                                                            |
| 11  | `packages/agents/core/tax-presets.ts`                            | GB + ZA packs, US components, ruleType union                                                                        |
| 12  | `packages/agents/core/__tests__/tax-engine.test.ts`              | new engine tests                                                                                                    |
| 13  | `packages/agents/core/__tests__/statutory-rule-resolver.test.ts` | resolver tests                                                                                                      |
| 14  | `packages/agents/core/__tests__/payroll-conditional-tax.test.ts` | payroll conditional test                                                                                            |
| 15  | `packages/db/migrations/` (generated)                            | `pnpm db:generate`                                                                                                  |
| 16  | `docs/SELF_SERVICE_TAX.md`                                       | research + how-to doc                                                                                               |
| 17  | `apps/web/lib/explore/features-catalog.ts`                       | tax entry text refresh                                                                                              |
| 18  | `BUILD_LOG.md`                                                   | session entry                                                                                                       |

### Rules Applied

- Entity scoping on every query; pgEnum for status; zod validation; audit trail.
- Tax engine stays pure & data-driven; money rounded; no `any`.
- Migrations generated via `pnpm db:generate`, never hand-written.

### After Building

1. `pnpm typecheck`
2. `pnpm --filter=@xenboox/agents test` (engine/resolver/payroll tests)
3. `pnpm --filter=web test` (tax UI/router tests)
4. `pnpm --filter=web build` (local production build)
5. Fix any failures, rebuild, then commit + push (tax files only — the
   simulation-provider WIP in the working tree is the user's separate work and
   is left untouched).

### What I Won't Touch

- The uncommitted simulation-provider / agents-at-work WIP files.
- Tax filing/packages, compliance deadlines, document workflows.
- Desktop/mobile surfaces (web-first, per project state).
