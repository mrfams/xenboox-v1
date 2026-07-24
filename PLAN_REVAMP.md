# Autoplan — Onboarding Pipeline Build Plan

## What We're Building

The Onboarding Pipeline (Pipeline 6 of 6) transforms the signup-to-first-value journey from ~12 minutes to a guided, failure-resilient flow. Built on top of the existing pipeline at `packages/agents/core/onboarding-pipeline.ts`.

## File List

### 1. Database Schema (`packages/db/schema/onboarding.ts` — NEW)

- `onboardingSessions` table (org_id, current_step, status, routing_answer, tt_first_value_seconds)
- `dataConnections` table (entity_id, type, status, records_processed, failure_reason)
- `historicalPullJobs` table (entity_id, date_range, status, permission_gate)
- `coaTemplates` table (segment, country, account_list)

### 2. DB Barrel Export (`packages/db/schema/index.ts` — MODIFY)

- Add `export * from "./onboarding"`

### 3. Onboarding Pipeline (`packages/agents/core/onboarding-pipeline.ts` — MODIFY)

- Add `runOnboardingSession()` — orchestrates the full 6-step flow
- Add `getOnboardingStatus()` — returns current step + progress
- Add `updateRoutingAnswer()` — stores user's bookkeeping answer
- Add `createDataConnection()` — creates + tracks connection attempts
- Add `requestHistoricalPullPermission()` — the ONE human gate
- Add `completeOnboarding()` — logs time-to-first-value

### 4. tRPC Onboarding Router (`apps/web/server/routers/onboarding.ts` — NEW)

- `getStatus` — publicProcedure, returns current onboarding state
- `updateRoutingAnswer` — publicProcedure, stores routing answer
- `createEntity` — publicProcedure, extends registration
- `connectData` — publicProcedure, creates data connection
- `requestHistoricalPull` — protectedProcedure, requests permission
- `approveHistoricalPull` — protectedProcedure, grants permission
- `completeFlow` — protectedProcedure, finalizes onboarding

### 5. Router Registration (`apps/web/server/routers/_app.ts` — MODIFY)

- Add onboarding router

### 6. Onboarding Wizard UI (`apps/web/components/onboarding/onboarding-wizard.tsx` — NEW)

- Step 1: Routing question ("How do you manage your books?")
- Step 2: Entity setup (business info)
- Step 3: Data Connection Hub (bank, mobile money, upload)
- Step 4: Historical pull (background progress)
- Step 5: Chart of Accounts preview + confirm
- Step 6: First Look — activation moment

### 7. Onboarding Page (`apps/web/app/(auth)/register/onboarding/` — NEW)

- Multi-step onboarding wizard page

### 8. Updated Register Form (`apps/web/components/auth/register-form.tsx` — MODIFY)

- Add routing question after organization name

## Build Order

1. DB schema first (no dependencies)
2. Pipeline agent (depends on schema)
3. tRPC router (depends on pipeline)
4. UI components (depends on router)
5. Registration form update (depends on router)

## Verification

- pnpm typecheck
- pnpm test --filter=@xenboox/web
- pnpm test --filter=@xenboox/agents
- pnpm lint
