# ARCHITECTURE.md — Xenboox Technical Architecture

> Architecture decisions, patterns, and conventions for the Xenboox platform.
> Every engineer (human or AI) must understand these before writing code.

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTS                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │   Web    │  │  Mobile  │  │ Desktop  │                 │
│  │ Next.js  │  │ React    │  │  Tauri   │                 │
│  │  15 App  │  │ Native   │  │ (Rust+React)│              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                 │
│       │              │              │                       │
└───────┼──────────────┼──────────────┼───────────────────────┘
        │              │              │
        ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│                     API LAYER                               │
│  ┌──────────────────────────────────────────────────┐      │
│  │              tRPC Router                          │      │
│  │  protectedProcedure → auth + entity scoping       │      │
│  └──────────────────────────────────────────────────┘      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │ Auth.js  │  │  Next.js │  │ Trigger  │                 │
│  │   v5     │  │  Server  │  │   .dev   │                 │
│  │          │  │ Actions  │  │  Jobs    │                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
└─────────────────────────────────────────────────────────────┘
        │              │              │
        ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATA LAYER                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Neon    │  │  Drizzle │  │ Cloudflare│  │ LangFuse │  │
│  │ Postgres │  │   ORM    │  │    R2     │  │  (obs)   │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│                   AGENT LAYER                               │
│  ┌──────────────────────────────────────────────────┐      │
│  │           LangGraph StateGraph Runtime            │      │
│  │                                                   │      │
│  │  Tier 1: CFO Agent                               │      │
│  │  Tier 2: Controller │ Treasury │ Payroll │ Comp  │      │
│  │  Tier 3: Ledger │ AP │ AR │ Recon │ Cash │ ...  │      │
│  │  Platform: Reporting │ Budget │ Analytics │ Doc   │      │
│  └──────────────────────────────────────────────────┘      │
│                                                             │
│  LLM: Claude Sonnet 4.6 (strategic) + Haiku 4.5 (worker)  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Monorepo Architecture

**Package Manager:** pnpm (workspaces)

```
xenboox/
├── apps/
│   ├── web/                        # Next.js 15 web platform
│   │   ├── app/                    # App Router
│   │   │   ├── (auth)/             # Auth routes (login, register)
│   │   │   ├── (dashboard)/        # Dashboard routes (main app)
│   │   │   ├── api/                # API routes (tRPC handler)
│   │   │   └── layout.tsx          # Root layout
│   │   ├── components/             # React components
│   │   │   ├── ui/                 # Shadcn components (re-exported)
│   │   │   ├── dashboard/          # Dashboard components
│   │   │   ├── auth/               # Auth components
│   │   │   └── shared/             # Shared components
│   │   ├── lib/                    # Utilities
│   │   │   ├── trpc/               # tRPC client setup
│   │   │   ├── auth/               # Auth configuration
│   │   │   ├── db/                 # Database client
│   │   │   └── utils.ts            # Shared utilities
│   │   └── public/                 # Static assets
│   │
│   ├── mobile/                     # React Native (Expo) mobile app
│   │   ├── app/                    # Expo Router screens
│   │   │   ├── (auth)/             # Auth screens
│   │   │   ├── (tabs)/             # Tab navigator screens
│   │   │   └── _layout.tsx         # Root layout
│   │   ├── components/             # React Native components
│   │   ├── lib/                    # Utilities
│   │   │   ├── trpc/               # tRPC client (shared API)
│   │   │   ├── auth/               # Expo Auth Session
│   │   │   └── utils.ts            # Shared utilities
│   │   └── assets/                 # Icons, splash screens
│   │
│   └── desktop/                    # Tauri desktop app
│       ├── src-tauri/              # Rust backend
│       │   ├── src/                # Rust source (main.rs, commands/)
│       │   ├── Cargo.toml          # Rust dependencies
│       │   └── tauri.conf.json     # Tauri config
│       └── src/                    # React frontend (shared components with web)
│           ├── app/                # Tauri-specific routes
│           ├── components/         # Shared + desktop-specific components
│           └── lib/                # Shared utilities
│
├── packages/
│   ├── agents/                     # LangGraph agent definitions
│   │   ├── core/                   # Shared agent utilities
│   │   │   ├── state.ts            # Base state schemas
│   │   │   ├── prompts.ts          # Shared prompt templates
│   │   │   ├── tools.ts            # Shared agent tools
│   │   │   ├── eval.ts             # Evaluation framework
│   │   │   └── langfuse.ts         # LangFuse integration
│   │   ├── tier1/                  # CFO Agent
│   │   │   └── cfo-agent/
│   │   │       ├── graph.ts        # StateGraph definition
│   │   │       ├── state.ts        # State schema
│   │   │       ├── nodes.ts        # Graph nodes
│   │   │       ├── tools.ts        # Agent-specific tools
│   │   │       └── prompts.ts      # System prompts
│   │   ├── tier2/                  # Department heads
│   │   │   ├── controller-agent/
│   │   │   ├── treasury-agent/
│   │   │   ├── payroll-manager-agent/
│   │   │   └── compliance-agent/
│   │   ├── tier3/                  # Worker agents
│   │   │   ├── ledger-agent/
│   │   │   ├── ap-agent/
│   │   │   ├── ar-agent/
│   │   │   ├── reconciliation-agent/
│   │   │   ├── cash-agent/
│   │   │   ├── mobile-money-agent/
│   │   │   └── payroll-worker-agent/
│   │   └── platform/               # Cross-cutting agents
│   │       ├── reporting-agent/
│   │       ├── budget-agent/
│   │       ├── analytics-agent/
│   │       └── document-agent/
│   │
│   ├── db/                         # Drizzle ORM
│   │   ├── schema/                 # Table definitions
│   │   │   ├── auth.ts             # Auth tables (users, accounts, sessions)
│   │   │   ├── organization.ts     # Organizations, entities
│   │   │   ├── accounting.ts       # GL, journal entries, accounts
│   │   │   ├── ap-ar.ts            # AP, AR, invoices
│   │   │   ├── treasury.ts         # Bank accounts, reconciliation
│   │   │   ├── cash.ts             # Cash, imprest
│   │   │   ├── mobile-money.ts     # Mobile money accounts/transactions
│   │   │   ├── tax.ts              # Tax records
│   │   │   ├── documents.ts        # Document storage metadata
│   │   │   └── audit.ts            # Audit trail
│   │   ├── migrations/             # Generated by Drizzle
│   │   ├── seed/                   # Seed data
│   │   │   ├── chart-of-accounts/  # CoA templates by market
│   │   │   └── test-data/          # Test fixtures
│   │   ├── drizzle.config.ts       # Drizzle config
│   │   └── index.ts                # Database client export
│   │
│   ├── ui/                         # Shared Shadcn components
│   │   ├── src/
│   │   │   ├── components/         # Component library
│   │   │   └── lib/                # Component utilities
│   │   └── package.json
│   │
│   └── config/                     # Shared configs
│       ├── typescript/             # tsconfig.json
│       ├── eslint/                 # eslint config
│       └── tailwind/               # tailwind config
│
├── docs/
│   ├── agents/                     # Detailed agent specifications
│   │   ├── cfo-agent.md
│   │   ├── controller-agent.md
│   │   ├── treasury-agent.md
│   │   ├── ledger-agent.md
│   │   └── ...
│   └── decisions/                  # Architecture Decision Records
│       ├── ADR-001-monorepo.md
│       ├── ADR-002-langgraph.md
│       └── ...
│
├── skills/                         # Opencode skills
│   ├── create-agent.md
│   ├── create-module.md
│   ├── create-api-route.md
│   ├── create-migration.md
│   └── ...
│
├── AGENTS.md                       # Project conventions
├── ARCHITECTURE.md                 # This file
├── DATABASE.md                     # Database schema reference
├── XENBOOX_PRD.md                  # Product requirements
├── package.json                    # Root package.json
├── pnpm-workspace.yaml             # pnpm workspace config
├── turbo.json                      # Turborepo config
├── tsconfig.json                   # Root tsconfig
└── .env.example                    # Environment variables template
```

---

## 3. Authentication & Authorization

### Auth.js v5 Configuration

```typescript
// apps/web/lib/auth/index.ts
import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter" // or custom Drizzle adapter

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    // Email/password
    // Google OAuth
    // (Future: Microsoft, Apple)
  ],
  callbacks: {
    authorized: async ({ auth }) => {
      return !!auth  // Require auth for all routes by default
    }
  }
})
```

### Entity Scoping Middleware

Every tRPC procedure goes through entity scoping:

```typescript
// packages/db/middleware/entity-scoping.ts
import { middleware } from "./trpc"
import { TRPCError } from "@trpc/server"

export const entityScoped = middleware(async ({ ctx, next }) => {
  const entityId = ctx.entityId  // From request header or session

  if (!entityId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Entity ID is required"
    })
  }

  // Verify user has access to this entity
  const access = await db.query.userEntityAccess.findFirst({
    where: and(
      eq(userEntityAccess.userId, ctx.session.user.id),
      eq(userEntityAccess.entityId, entityId)
    )
  })

  if (!access) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this entity"
    })
  }

  return next({
    ctx: {
      ...ctx,
      entityId,
      entityRole: access.role
    }
  })
})
```

### Role Hierarchy

```
Organization Owner
  └── Organization Admin
        └── Entity: Finance Director
              └── Entity: Accountant
                    └── Entity: Payroll Officer
                          └── Entity: Cashier
                                └── Entity: Department Manager
                                      └── Entity: Employee
                                            └── Entity: External Auditor (read-only)
```

---

## 4. API Layer (tRPC)

### Router Structure

```typescript
// apps/web/app/api/trpc/[trpc]/route.ts
import { appRouter } from "@/server/routers/_app"

export { handlers as GET, handlers as POST } from "@/app/api/trpc/[trpc]/route"
```

### Protected Procedure Pattern

```typescript
// Every procedure: authenticated + entity-scoped
const protectedProcedure = t.procedure
  .use(authMiddleware)
  .use(entityScoped)

// Usage in routers
export const invoiceRouter = router({
  list: protectedProcedure
    .input(z.object({ entityId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return db.query.invoices.findMany({
        where: eq(invoices.entityId, ctx.entityId),  // Always scoped
        orderBy: desc(invoices.createdAt)
      })
    }),

  create: protectedProcedure
    .input(invoiceCreateSchema)
    .mutation(async ({ ctx, input }) => {
      // Create invoice, post to ledger via agent
    })
})
```

---

## 5. Database Design Principles

### Entity Scoping (Non-Negotiable)

Every financial table has `entity_id`. Every query is scoped. No exceptions.

```sql
-- Every table pattern:
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id),
  -- ... domain columns ...
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row-level security
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY entity_isolation ON invoices
  USING (entity_id = current_setting('app.current_entity_id')::UUID);
```

### Audit Trail Pattern

Every mutation logs to the audit table:

```typescript
// After any write operation
await db.insert(auditLog).values({
  entityId: ctx.entityId,
  userId: ctx.session.user.id,
  action: "invoice.created",
  entityType: "invoice",
  entityId: invoice.id,
  changes: { /* before/after diff */ },
  agentId: null,  // or agent identifier if agent-initiated
  confidence: null,
  metadata: {}
})
```

### Migration Strategy

1. Write schema in Drizzle
2. Run `pnpm db:generate` to create migration SQL
3. Review the generated SQL
4. Run `pnpm db:migrate` to apply
5. Never hand-write migrations

---

## 6. Agent Architecture (LangGraph)

### StateGraph Pattern

Each agent is a LangGraph `StateGraph` with typed state:

```typescript
// packages/agents/tier3/ledger-agent/graph.ts
import { StateGraph, Annotation } from "@langchain/langgraph"

const LedgerState = Annotation.Root({
  // Input
  entityId: Annotation<string>,
  journalEntry: Annotation<JournalEntry>,
  sourceAgent: Annotation<string>,

  // Processing
  validationErrors: Annotation<string[]>({
    reducer: (curr, prev) => [...curr, ...prev],
    default: () => []
  }),

  // Output
  posted: Annotation<boolean>,
  confidence: Annotation<number>,
  auditTrail: Annotation<AuditEntry[]>({
    reducer: (curr, prev) => [...curr, ...prev],
    default: () => []
  })
})

const graph = new StateGraph(LedgerState)
  .addNode("validate", validateJournalEntry)
  .addNode("checkDoubleEntry", checkDoubleEntry)
  .addNode("post", postToLedger)
  .addNode("logAudit", logAuditTrail)
  .addEdge("validate", "checkDoubleEntry")
  .addConditionalEdges("checkDoubleEntry", (state) => {
    if (state.validationErrors.length > 0) return "escalate"
    return "post"
  })
  .addEdge("post", "logAudit")
  .addEdge("logAudit", "__end__")
  .addEdge("__start__", "validate")
  .compile()
```

### Agent Tool Pattern

Agents use tools to interact with the database and external services:

```typescript
// packages/agents/core/tools.ts
import { tool } from "@langchain/core/tools"
import { z } from "zod"

export const postJournalEntry = tool(
  async ({ entityId, entries, description, reference }) => {
    // Validate double-entry
    const totalDebit = entries.reduce((sum, e) => sum + (e.debit || 0), 0)
    const totalCredit = entries.reduce((sum, e) => sum + (e.credit || 0), 0)

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return { success: false, error: "Debits do not equal credits" }
    }

    // Post to database
    const journalEntry = await db.insert(journalEntries).values({
      entityId,
      description,
      reference,
      entries,
      postedBy: "ledger-agent",
      confidence: 1.0  // Ledger agent is always certain (deterministic)
    }).returning()

    return { success: true, journalEntryId: journalEntry.id }
  },
  {
    name: "post_journal_entry",
    description: "Post a double-entry journal entry to the general ledger",
    schema: z.object({
      entityId: z.string().uuid(),
      entries: z.array(z.object({
        accountId: z.string().uuid(),
        debit: z.number().optional(),
        credit: z.number().optional(),
        description: z.string().optional()
      })),
      description: z.string(),
      reference: z.string().optional()
    })
  }
)
```

### Confidence System

Every agent output carries a confidence score:

```typescript
type AgentOutput = {
  result: unknown
  confidence: number      // 0.0 - 1.0
  reasoning: string       // Plain-English explanation
  escalatedTo?: string    // Who to escalate to if below threshold
  auditTrail: AuditEntry[]
}

// Thresholds:
// >= 0.7: Proceed normally
// 0.4 - 0.7: Flag to supervisor agent
// < 0.4: Escalate to human
```

### Agent Invocation Flow

```
1. Trigger (event, schedule, or human request)
   │
2. CFO Agent receives instruction
   │
3. CFO Agent routes to appropriate department head
   │
4. Department head assigns to worker agent(s)
   │
5. Worker agent executes, produces output with confidence
   │
6. Department head reviews output
   │
   ├── Confidence >= 0.7 → Approve and post
   ├── Confidence 0.4-0.7 → Request worker to re-evaluate
   └── Confidence < 0.4 → Escalate to CFO Agent → Human
   │
7. Ledger Agent posts final journal entry
   │
8. Audit trail logged to LangFuse + database
```

---

## 7. File Upload & Document Processing

### Upload Flow

```
1. Client uploads file (PDF, image, Excel, CSV)
   │
2. Upload to Cloudflare R2
   │
3. Trigger.dev job triggered
   │
4. Document Agent processes:
   ├── PDF: text extraction → OCR fallback (Tesseract → Claude Vision)
   ├── Image: OCR via Claude Vision API
   ├── Excel: parse workbook structure
   ├── CSV: parse with column detection
   └── Word: extract tables and text
   │
5. Structured data extracted
   │
6. Routed to appropriate agent (AP, AR, etc.)
   │
7. Agent processes and posts to ledger
```

### R2 Storage Structure

```
xenboox-uploads/
├── {org-id}/
│   └── {entity-id}/
│       ├── invoices/
│       ├── receipts/
│       ├── bank-statements/
│       ├── contracts/
│       └── payroll/
```

---

## 8. Job Queue (Trigger.dev)

### Long-Running Agent Workflows

Trigger.dev handles anything that can't complete in an API route timeout:

```typescript
// Trigger.dev task definition
export const processMonthEndClose = task({
  maxDuration: 300,  // 5 minutes max
  retry: { maxAttempts: 3 },

  run: async (payload: { entityId: string; month: number; year: number }) => {
    const { entityId, month, year } = payload

    // 1. Run all worker agents
    const ledgerStatus = await runLedgerClose(entityId, month, year)
    const reconStatus = await runReconciliationClose(entityId, month, year)
    const cashStatus = await runCashClose(entityId, month, year)

    // 2. Controller Agent reviews
    const controllerReview = await controllerAgent.review({
      entityId, month, year,
      ledgerStatus, reconStatus, cashStatus
    })

    // 3. If all clear, trigger reporting
    if (controllerReview.confidence >= 0.7) {
      await triggerTask("generate-close-report", {
        entityId, month, year
      })
    }

    return controllerReview
  }
})
```

---

## 9. Multi-Currency Architecture

### Exchange Rate Pipeline

```
1. Daily cron job pulls rates from ECB
   │
2. Store in exchange_rates table with timestamp
   │
3. On any foreign currency transaction:
   ├── Look up rate for transaction date
   ├── Store: original_amount, original_currency, rate, base_amount
   └── If rate unavailable → use previous day's rate + flag
   │
4. Month-end: calculate realized and unrealized FX gains/losses
   │
5. Post to ledger via Ledger Agent
```

---

## 10. Observability (LangFuse)

### Every Agent Action Logged

```typescript
import { langfuse } from "./langfuse"

// In every agent node:
await langfuse.trace({
  name: "ledger-agent-validate",
  metadata: {
    entityId,
    agentType: "ledger",
    tier: 3,
    confidence: output.confidence
  },
  input: journalEntry,
  output: validationResult
})

// In every human escalation:
await langfuse.event({
  name: "escalation",
  metadata: {
    fromAgent: "ledger-agent",
    toAgent: "controller-agent",
    reason: "confidence below threshold",
    confidence: 0.35
  }
})
```

---

## 11. Deployment Architecture

```
┌─────────────────────────────────────────────┐
│                 VERCEL                       │
│  ┌─────────────────────────────────────┐    │
│  │          Next.js App                │    │
│  │  ┌──────────┐  ┌──────────────────┐ │    │
│  │  │  Web UI  │  │  tRPC API Routes │ │    │
│  │  └──────────┘  └──────────────────┘ │    │
│  │  ┌──────────────────────────────────┐│    │
│  │  │     Server Actions (mutations)   ││    │
│  │  └──────────────────────────────────┘│    │
│  └─────────────────────────────────────┘    │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────┼──────────────────────────┐
│          NEON    │   CLOUDFLARE             │
│  ┌──────────┐   │   ┌──────────┐           │
│  │ Postgres │   │   │    R2    │           │
│  │ (RLS on) │   │   │ (files)  │           │
│  └──────────┘   │   └──────────┘           │
└─────────────────┼──────────────────────────┘
                  │
┌─────────────────┼──────────────────────────┐
│       TRIGGER.DEV  │     LANGFUSE          │
│  ┌──────────────┐  │  ┌──────────────────┐ │
│  │  Job Queue   │  │  │  Observability   │ │
│  │  (agents)    │  │  │  (traces, evals) │ │
│  └──────────────┘  │  └──────────────────┘ │
└────────────────────┴────────────────────────┘
```

---

## 12. Environment Variables

```bash
# Database
DATABASE_URL=                    # Neon PostgreSQL connection string

# Auth
AUTH_SECRET=                     # Auth.js secret
AUTH_GOOGLE_ID=                  # Google OAuth client ID
AUTH_GOOGLE_SECRET=              # Google OAuth client secret

# LLM
ANTHROPIC_API_KEY=              # Claude API key

# Storage
R2_ACCOUNT_ID=                  # Cloudflare account ID
R2_ACCESS_KEY_ID=               # R2 access key
R2_SECRET_ACCESS_KEY=           # R2 secret key
R2_BUCKET_NAME=                 # R2 bucket name

# Email
RESEND_API_KEY=                 # Resend API key

# Observability
LANGFUSE_PUBLIC_KEY=            # LangFuse public key
LANGFUSE_SECRET_KEY=            # LangFuse secret key
LANGFUSE_BASE_URL=              # LangFuse instance URL

# Trigger.dev
TRIGGER_SECRET_KEY=             # Trigger.dev secret key

# App
NEXT_PUBLIC_APP_URL=            # App URL
NODE_ENV=                       # development | production
```

---

## 13. Key Architectural Decisions

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Monorepo | pnpm workspaces + Turborepo | Shared code between apps, type safety, atomic commits |
| API | tRPC | End-to-end type safety with Next.js, no code generation needed |
| ORM | Drizzle | Type-safe, SQL-like API, good Neon support, lightweight |
| Agent Framework | LangGraph | Stateful graph maps to three-tier hierarchy, native HITL |
| Job Queue | Trigger.dev | Long-running agent workflows, Vercel-native integration |
| Desktop | Tauri | Rust backend for file processing, lean security model |
| LLM | Claude Sonnet + Haiku | Sonnet for complex reasoning, Haiku for cost-effective worker tasks |
| Observability | LangFuse | Open source, self-hostable, purpose-built for LLM apps |
| Storage | Cloudflare R2 | S3-compatible, no egress fees, global edge |

---

## 14. Error Handling Patterns

### Application Errors

```typescript
// tRPC error handling
throw new TRPCError({
  code: "BAD_REQUEST",
  message: "Invoice amount must be positive"
})

// Agent error handling — flag, don't guess
return {
  result: null,
  confidence: 0.2,
  reasoning: "Unable to match this invoice to any purchase order. Manual review needed.",
  escalatedTo: "controller-agent"
}
```

### User-Facing Errors

```typescript
// Never show stack traces to users
// Always plain English
{
  error: "We couldn't process this invoice. The amount doesn't match the purchase order. Please review and confirm.",
  action: "Review the invoice details and update the amount, or contact your finance director."
}
```

---

*Last updated: July 2026*
*Reference: XENBOOX_PRD.md for product decisions*
