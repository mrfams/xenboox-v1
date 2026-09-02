# AGENTS.md — Xenboox Project Conventions

> Single source of truth for all AI agents working on Xenboox.
> Read this before every session. Follow it without exception.

---

## ⚠️ AI-NATIVE PLATFORM — WEB ONLY

**Xenboox is an AI-native accounting platform.** The AI handles the work. Humans make decisions. This is NOT a traditional SaaS page-per-function tool.

**Scope:** Only work on the web app (`apps/web/`). Mobile and Desktop have been removed from the repo.

- ✅ Only work in `apps/web/`, `packages/db/`, `packages/agents/`, `packages/ui/`, `packages/jobs/`
- ✅ Only run `pnpm dev --filter=web`, `pnpm typecheck --filter=web`, `pnpm test --filter=web`
- ❌ Do NOT create new SaaS-style pages (one page per function). The AI absorbs navigation.
- ❌ Do NOT add pages to the sidebar without user approval. The sidebar has 5 surfaces, not 40.

---

## Project Overview

Xenboox is an **AI-native, full-stack accounting platform for SMEs.** Specialized AI agents in a three-tier hierarchy handle the accounting work. Humans make decisions. The AI is the interface — users talk, the AI acts.

**The 5-Surface AI-Native Model:**

| Surface         | Purpose                                                                          |
| --------------- | -------------------------------------------------------------------------------- |
| Command Center  | Conversational AI interface — handles ALL create/update/approve actions via chat |
| Activity Hub    | Human-in-the-loop queue — surfaces ALL things needing human decision             |
| Financial Pulse | AI-narrated financial health — explains what numbers mean                        |
| Ledger          | The record of truth — when you need to look at the books directly                |
| Operations      | Money in, money out — AI manages cash flow, you approve                          |

**Tech Stack (Locked):**

- Frontend: Next.js 15 + TypeScript + Shadcn/ui + Tailwind
- API: tRPC
- Auth: Auth.js v5
- Database: Neon PostgreSQL
- ORM: Drizzle ORM
- Agent Framework: LangGraph (JS)
- LLM: Frontier & open-source frontier models (model-agnostic layer)
- Job Queue: Trigger.dev
- Storage: Cloudflare R2
- Email: Resend
- Deployment: Vercel
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
│   └── web/                    # Next.js 15 web platform (AI-native dashboard)
│       ├── app/                # App Router (routes)
│       │   └── dashboard/      # 5 surfaces + settings/help/audit-trail
│       ├── components/         # React components
│       │   ├── shared/ai-native/  # AI-native UI components
│       │   └── layout/         # Sidebar, top-nav, mobile nav
│       ├── lib/                # Utilities, tRPC context, hooks
│       └── public/             # Static assets
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

When starting a task, auto-load the relevant skill(s) from `.agents/skills/` based on task category. Skills are like employees — load the right one for the job, one at a time.

**📖 Full skill directory:** `.agents/skills/FIRE.md` — fire any employee by name or trigger.

### Skill Routing Rules

**Trigger phrases** → **Load this skill** (or say `fire [skill-name]`):

| Trigger Phrase                              | Skill to Load           | When to Use                 |
| ------------------------------------------- | ----------------------- | --------------------------- |
| "review code", "PR review", "check this"    | `review`                | Code quality review         |
| "security audit", "is this secure"          | `cso`                   | Security assessment         |
| "fix bug", "something's broken", "error"    | `diagnosing-bugs`       | Bug investigation           |
| "add feature", "new feature", "build"       | `tdd`                   | Test-driven development     |
| "architecture", "design", "how should we"   | `plan-eng-review`       | Architecture planning       |
| "what do users think", "validate"           | `office-hours`          | Product validation          |
| "is this ready", "QA"                       | `qa`                    | Quality assurance           |
| "migration", "schema change"                | `create-migration`      | Database changes            |
| "API endpoint", "new route"                 | `create-api-route`      | API development             |
| "new module", "new page"                    | `create-module`         | Module scaffolding          |
| "new agent", "AI agent"                     | `create-agent`          | Agent development           |
| "close month", "period close"               | `month-end-close`       | Month-end close             |
| "review design", "looks off"                | `design-critique`       | Design quality review       |
| "review copy", "check wording"              | `content-critique`      | Content quality review      |
| "product review", "is this right"           | `product-critique`      | Product quality review      |
| "marketing review", "convert"               | `marketing-critique`    | Marketing quality review    |
| "engineering review", "code quality"        | `engineering-critique`  | Engineering quality review  |
| "write blog", "content"                     | `blog-writer`           | Blog writing                |
| "SEO", "search ranking"                     | `seo-audit`             | SEO optimization            |
| "UX review", "user experience"              | `product-reviewer`      | UX quality review           |
| "fire [employee]", "put [employee] to work" | `fire-employee`         | Fix issues for one employee |
| "copy", "messaging"                         | `copywriter`            | Marketing copy              |
| "design", "UI"                              | `design-taste-frontend` | Visual design               |
| "run evals", "check agent scores"           | `eval-runner`           | Run agent eval suite        |
| "test coverage", "what's untested"          | `test-coverage`         | Analyze test gaps           |
| "agent eval", "golden dataset"              | `agent-eval`            | Create agent eval cases     |
| "TDD", "red green refactor"                 | `tdd`                   | Test-driven development     |

### Critique Skills (Quality Gates)

**Always load before shipping**:

| Department  | Critique Skill         | What It Reviews              |
| ----------- | ---------------------- | ---------------------------- |
| Engineering | `engineering-critique` | Code, architecture, security |
| Design      | `design-critique`      | Visual, UX, accessibility    |
| Content     | `content-critique`     | Copy, messaging, brand voice |
| Product     | `product-critique`     | Features, flows, value       |
| Marketing   | `marketing-critique`   | Conversion, SEO, positioning |

### How to Load

1. **One at a time** — Don't load all skills at once
2. **Match the trigger** — Use the table above to find the right skill
3. **Load via `skill` tool** — `skill(name="engineering-critique")`
4. **Or say `fire [name]`** — e.g. `fire engineering-critique`
5. **Apply the skill** — Follow its checklist and output format
6. **Move to next** — Only load next skill after finishing current

### Example Workflow

```
User: "Review this PR for the new invoice feature"

1. fire engineering-critique → Review code quality
2. fire design-critique → Review UI/UX
3. fire content-critique → Review copy
4. fire product-critique → Review feature value
5. Ship when all critiques pass
```

### Quick Critique Combos

| Scenario       | Firing Order                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------ |
| Pre-ship       | `engineering` → `design` → `content` → `product` → `marketing`                                   |
| Marketing page | `design` → `content` → `marketing` → `seo-audit`                                                 |
| New feature    | `product` → `engineering` → `design` → `qa`                                                      |
| Blog post      | `content` → `seo-audit` → `marketing`                                                            |
| Security       | `security-engineer` → `cso` → `engineering`                                                      |
| Pre-ship gate  | `eval-runner` → `test-coverage` → `engineering` → `design` → `content` → `product` → `marketing` |
| Agent dev      | `create-agent` → `tdd` → `eval-runner` → `agent-eval`                                            |

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
