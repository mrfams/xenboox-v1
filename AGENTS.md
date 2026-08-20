# AGENTS.md — Xenboox Project Conventions

> Single source of truth for all AI agents working on Xenboox.
> Read this before every session. Follow it without exception.

---

## ⚠️ WEB-ONLY DEVELOPMENT ACTIVE

**All agents MUST only work on the web app (`apps/web/`).** Mobile (`apps/mobile/`) and Desktop (`apps/desktop/`) are explicitly out of scope until further notice.

- ❌ Do NOT create, modify, or reference files in `apps/mobile/` or `apps/desktop/`
- ❌ Do NOT install mobile or desktop dependencies
- ❌ Do NOT run builds, tests, or typechecks for mobile/desktop
- ✅ Only work in `apps/web/`, `packages/db/`, `packages/agents/`, `packages/ui/`, `packages/jobs/`
- ✅ Only run `pnpm dev --filter=web`, `pnpm typecheck --filter=web`, `pnpm test --filter=web`

This applies to ALL sessions until explicitly changed by the user.

---

## Project Overview

Xenboox is an AI-native, full-stack accounting platform. 19 agents in a three-tier hierarchy. 20 modules. **Currently web-only** — mobile and desktop are out of scope.

**Tech Stack (Locked):**

- Web Frontend: Next.js 15 + TypeScript + Shadcn/ui + Tailwind
- Mobile Frontend: React Native (Expo) + TypeScript + NativeWind
- Desktop Frontend: Tauri (Rust backend + React/Shadcn webview)
- API: tRPC
- Auth: Auth.js v5
- Database: Neon PostgreSQL
- ORM: Drizzle ORM
- Agent Framework: LangGraph (JS)
- LLM: Claude Sonnet 4.6 + Haiku 4.5
- Job Queue: Trigger.dev
- Storage: Cloudflare R2
- Email: Resend
- Deployment: Vercel (web), App Store + Google Play (mobile), .msi + .dmg (desktop)
- Observability: LangFuse

---

## Monorepo Structure

```
xenboox/
├── AGENTS.md
├── ARCHITECTURE.md
├── DATABASE.md
├── XENBOOX_PRD.md
├── apps/
│   ├── web/                    # Next.js 15 web platform
│   │   ├── app/                # App Router (routes)
│   │   ├── components/         # React components
│   │   ├── lib/                # Utilities, tRPC context
│   │   └── public/             # Static assets
│   ├── mobile/                 # React Native (Expo) mobile app
│   │   ├── app/                # Expo Router screens
│   │   ├── components/         # React Native components
│   │   ├── lib/                # Utilities, tRPC client
│   │   └── assets/             # Icons, splash screens
│   └── desktop/                # Tauri desktop app
│       ├── src-tauri/          # Rust backend
│       │   ├── src/            # Rust source
│       │   ├── Cargo.toml      # Rust dependencies
│       │   └── tauri.conf.json # Tauri config
│       └── src/                # React frontend (shared with web)
├── packages/
│   ├── agents/                 # LangGraph agent definitions
│   │   ├── core/               # Shared agent utilities
│   │   ├── tier1/              # CFO Agent
│   │   ├── tier2/              # Controller, Treasury, Payroll Manager, Compliance
│   │   ├── tier3/              # Worker agents
│   │   └── platform/           # Reporting, Budget, Analytics, Document
│   ├── db/                     # Drizzle schema + migrations
│   │   ├── schema/             # Table definitions
│   │   ├── migrations/         # Generated migrations
│   │   └── seed/               # Seed data
│   ├── ui/                     # Shared Shadcn components
│   └── config/                 # Shared TypeScript, ESLint configs
├── docs/
│   ├── agents/                 # Detailed agent specifications
│   └── decisions/              # Architecture Decision Records (ADRs)
└── skills/                     # Opencode skills for build tasks
```

---

## Commands

```bash
# Setup (first time or new clone)
pnpm setup                   # Interactive env provisioning wizard

# Development
pnpm dev                      # Start all apps in dev mode
pnpm dev --filter=web          # Start only web app
pnpm dev --filter=agents       # Start agent dev server

# Database
pnpm db:generate              # Generate Drizzle migration
pnpm db:migrate               # Run migrations
pnpm db:push                  # Push schema changes (dev only)
pnpm db:seed                  # Seed database
pnpm db:studio                # Drizzle Studio (visual DB browser)

# Building
pnpm build                    # Build all packages
pnpm build --filter=web       # Build web app only

# Testing
pnpm test                     # Run all tests
pnpm test --filter=agents     # Run agent tests only
pnpm test:eval                # Run agent evaluation suite

# Linting & Types
pnpm lint                     # ESLint all packages
pnpm typecheck                # TypeScript check all packages
```

---

## Code Conventions

### TypeScript

- Strict mode always. No `any` types.
- Prefer `type` over `interface` for new code.
- Use `zod` for all runtime validation.
- File naming: `kebab-case.ts` for utilities, `PascalCase.tsx` for components.

### React / Next.js

- App Router only. No Pages Router.
- Server Components by default. `"use client"` only when needed.
- Colocate components with their route.
- Use `React Server Actions` for mutations where tRPC isn't needed.

### Database (Drizzle)

- All tables have `id` (uuid), `createdAt`, `updatedAt`.
- Every financial table has `entityId` — entity scoping is non-negotiable.
- Use `pgEnum` for status fields, never raw strings.
- Migrations are generated, never hand-written.
- Row-level security enforced at the database layer.

### Agent Code (LangGraph)

- Each agent is a LangGraph `StateGraph`.
- Agents communicate through typed state, not direct function calls.
- Every agent output includes a `confidence` field (0-1).
- Every agent action is logged to LangFuse.
- Use `haiku` for worker tasks, `sonnet` for management/strategic.
- Never hardcode entity context — always receive via state.

### API (tRPC)

- All procedures are authenticated.
- Entity scoping applied at the middleware layer.
- Use `protectedProcedure` for auth + entity scope.
- Input validation with zod on every procedure.

### Git

- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`
- One logical change per commit.
- Never commit secrets, keys, or credentials.
- Branch naming: `feat/module-name`, `fix/issue-description`

---

## Entity Scoping Rule

**Every database query must be scoped to an entity_id.**

This is the most important architectural rule. No exceptions.

```typescript
// CORRECT
const invoices = await db.query.invoices.findMany({
  where: eq(invoices.entityId, entityId),
});

// WRONG — never do this
const invoices = await db.query.invoices.findMany();
```

---

## Agent Communication Pattern

```
Human → CFO Agent (strategic)
            ↓
    Department Heads (management)
            ↓
    Worker Agents (execution)
            ↓
    Ledger Agent (final posting — single point of entry)
```

- Workers never talk to each other directly.
- Workers report to their department head.
- Department heads report to CFO Agent.
- CFO Agent is the only agent that talks to humans.
- Ledger Agent is the only agent that posts to the general ledger.

---

## Error Handling

- Agents flag uncertainty, never guess.
- Confidence below 0.7 → escalate to supervisor agent.
- Confidence below 0.4 → escalate to human.
- All errors logged with full context.
- User-facing errors are plain English, never stack traces.

---

## Security Rules

- Never log or expose API keys, secrets, or tokens.
- Never store plaintext passwords.
- All financial data encrypted at rest (AES-256).
- All data in transit encrypted (TLS 1.3).
- Entity isolation enforced at database level, not just application level.
- Audit trail for every action — who, what, when, why, confidence.

---

## Build Workflow

Every session follows this workflow. No exceptions.

### Steps

1. **PLAN** → Agent proposes what and how. User reviews.
2. **APPROVE** → User accepts, requests changes, or rejects.
3. **BUILD** → Agent executes the approved plan. No deviations.
4. **LOG** → Agent updates BUILD_LOG.md.

### PLAN Format (mandatory)

Every plan MUST include ALL of these sections. No shortcuts.

```
## Plan: [Title]

### What
[Exact description of what will be built/changed]

### File List
[Exact files to create or modify, with path]

### File Order
[Build order if files depend on each other]

### What Each File Contains
[Table or list: file → contents]

### Rules Applied
[Specific rules/conventions followed]

### After Building
[Verification steps: typecheck, test, generate, etc.]

### What I Won't Touch
[Scope boundaries]
```

### Rules

- **NEVER ask "want to proceed?" without a complete PLAN above it.**
- **NEVER build without user typing "approved" or equivalent approval.**
- Never execute without approval
- Never deviate from the approved plan mid-build
- If something changes during build, stop and re-propose
- Every session ends with BUILD_LOG.md updated
- If the plan is trivial (< 3 files, no dependencies), a short plan is acceptable but MUST still include what, files, and verification.

---

---

## Skill Auto-Loading

When starting a task, auto-load the relevant skill(s) from `.agents/skills/` based on task category:

| Task Category               | Skill(s) to Load                                        | Source       |
| --------------------------- | ------------------------------------------------------- | ------------ |
| **Code review / PR review** | `review`, `code-review`                                 | gstack, Matt |
| **Bug diagnosis**           | `diagnosing-bugs`                                       | Matt         |
| **New feature (TDD)**       | `tdd`                                                   | Matt         |
| **Architecture / planning** | `plan-eng-review`, `domain-modeling`, `grill-with-docs` | gstack, Matt |
| **Security audit**          | `cso`                                                   | gstack       |
| **QA testing**              | `qa`                                                    | gstack       |
| **Product questioning**     | `office-hours`                                          | gstack       |
| **Agent work**              | `agent-eval`                                            | xenboox      |
| **Database migration**      | `create-migration`                                      | xenboox      |
| **New API route**           | `create-api-route`                                      | xenboox      |
| **New module**              | `create-module`                                         | xenboox      |
| **New agent**               | `create-agent`                                          | xenboox      |
| **Month-end close**         | `month-end-close`                                       | xenboox      |

Load the skill via the `skill` tool before starting work. For multi-category tasks, load all relevant skills.

---

## When Working on This Codebase

1. **Auto-load relevant skills** — See Skill Auto-Loading section above. Load skills at session start based on task category.
2. **Follow the Build Workflow** — Plan, Approve, Build, Log. Every time.
3. **Read BUILD_LOG.md first** — check what exists, what's next, and what's blocked.
4. Read ARCHITECTURE.md for design decisions.
5. Read DATABASE.md for schema details.
6. Read the relevant agent spec in docs/agents/ before modifying agent code.
7. Run `pnpm typecheck` and `pnpm lint` before committing.
8. Run `pnpm test` if tests exist for the area you're changing.
9. Follow the entity scoping rule — always.
10. Keep the PRD as the source of truth for product decisions.
11. **Update BUILD_LOG.md when done** — add a session entry, update module status, note next steps.
