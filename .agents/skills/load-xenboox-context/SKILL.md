---
name: load-xenboox-context
description: Loads full project context for the Xenboox accounting platform. Use at the start of EVERY session working on the Xenboox codebase to understand the product, architecture, modules, agents, conventions, and current build state.
license: MIT
metadata:
  author: xenboox
  category: onboarding
---

## What Xenboox Is

Xenboox is an AI-native, full-stack accounting platform built for SMEs worldwide. A workforce of 19 AI agents — organized in a three-tier hierarchy — handles every accounting function autonomously. Humans manage and approve. Agents execute.

**Core promise:** "Your entire accounting department, running autonomously. Agents do the work. You make the decisions that matter."

**Launch market:** The Gambia. Expansion: Nigeria, Ghana, Senegal, Kenya.

**What makes it different:** Not a tool you operate — a workforce that operates itself. Built natively for SME needs: mobile money as first-class rail, cash/imprest management, local tax regimes. 20 modules covering every accounting function. Web, mobile, and desktop surfaces.

> **⚠️ WEB-ONLY DEVELOPMENT ACTIVE** — All work must be in `apps/web/`, `packages/db/`, `packages/agents/`, `packages/ui/`, `packages/jobs/`. Do NOT touch `apps/mobile/` or `apps/desktop/`.

---

## The Twenty Modules

| #   | Module              | #   | Module                  |
| --- | ------------------- | --- | ----------------------- |
| 1   | General Ledger      | 11  | Inventory               |
| 2   | Bank Reconciliation | 12  | Budgeting               |
| 3   | Accounts Payable    | 13  | Financial Reporting     |
| 4   | Accounts Receivable | 14  | Tax Compliance          |
| 5   | Cash and Imprest    | 15  | Donor & Grant Reporting |
| 6   | Mobile Money        | 16  | Audit Preparation       |
| 7   | Payroll             | 17  | Multi-Entity & Branch   |
| 8   | Invoicing           | 18  | Multi-Currency          |
| 9   | Expense Management  | 19  | Document Management     |
| 10  | Fixed Assets        | 20  | Analytics & Insights    |

---

## The Three-Tier Agent Hierarchy

```
HUMAN (Owner / Finance Director)
                |
        ╔═══════════════════╗
          CFO AGENT (Tier 1)
          Strategic Orchestrator
        ╚═══════════════════╝
                |
   ┌────────────┼────────────┬────────────┐
CONTROLLER    TREASURY    PAYROLL MGR   COMPLIANCE
  (Tier 2)     (Tier 2)     (Tier 2)     (Tier 2)
   |              |             |            |
 ┌─┴──┐      ┌──┴──┐          |         ┌──┴──┐
Ledger AP   Recon  Cash    Payroll      Tax   Audit
 AP    AR   Mobile Money   Worker
 Asset
 Inventory

Platform (report to CFO directly): Reporting, Budget, Analytics, Document
```

**19 agents total. 11 built (Phase 5 complete). Phase 6 next: orchestration wiring.**

---

## Tech Stack (Locked)

| Layer           | Technology                                         |
| --------------- | -------------------------------------------------- |
| Frontend        | Next.js 15 + TypeScript + Shadcn/ui + Tailwind     |
| API             | tRPC                                               |
| Auth            | Auth.js v5                                         |
| Database        | Neon PostgreSQL                                    |
| ORM             | Drizzle ORM                                        |
| Agent Framework | LangGraph (JS)                                     |
| LLM             | Claude Sonnet 4.6 (strategic) + Haiku 4.5 (worker) |
| Job Queue       | Trigger.dev                                        |
| Storage         | Cloudflare R2                                      |
| Email           | Resend                                             |
| Deployment      | Vercel                                             |
| Observability   | LangFuse                                           |

---

## Top Rules (Never Break These)

1. **Entity scoping** — Every database query MUST be scoped to `entityId`. No exceptions. No unscoped `findMany()`.
2. **Confidence scores** — Every agent output includes a `confidence` field (0-1). Below 0.6 → escalate to human. 0.6-0.79 → escalate to supervisor. ≥ 0.8 → proceed.
3. **Double-entry** — Debits must always equal credits. Ledger Agent is the single point of entry to the GL.
4. **No `any` types** — Strict TypeScript always. Use `zod` for runtime validation.
5. **Build workflow** — PLAN → APPROVE → BUILD → LOG. Never build without approval. Never skip BUILD_LOG.md update.

---

## Current Build State

**Read `BUILD_LOG.md` for current state.** It is the single source of truth for:

- What phase we're in
- What files exist
- What's been built
- What's next
- What's blocked

Do NOT rely on this skill for build state — always read the log.

---

## Code Patterns (Prevent Hallucination)

### Agent Structure — Every Agent Has 6 Files

```
packages/agents/{tier}/{agent-name}/
├── index.ts    # Public exports
├── graph.ts    # StateGraph definition + compile()
├── state.ts    # Annotation.Root({...}) state schema
├── nodes.ts    # Graph node functions (async, receive state, return updates)
├── tools.ts    # DB queries, calculations, validations
└── prompts.ts  # System prompt builder
```

### Router Structure — tRPC with Entity Scoping

```typescript
// Every procedure: authenticated + entity-scoped
const protectedProcedure = t.procedure.use(authMiddleware).use(entityScoped);

// Usage
export const myRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.query.table.findMany({
      where: eq(table.entityId, ctx.entityId), // ALWAYS scoped
    });
  }),
});
```

### Confidence Thresholds

```
< 0.6   →  Escalate to human
0.6-0.79 →  Escalate to supervisor agent (Tier N → Tier N+1)
≥ 0.8   →  Proceed normally
```

### State Pattern — LangGraph Annotation.Root

```typescript
const AgentState = Annotation.Root({
  entityId: Annotation<string>,
  entityName: Annotation<string>,
  currency: Annotation<string>,
  currentOperation: Annotation<{
    type: string;
    status: string;
    input: unknown;
    output: unknown;
    error: string | null;
  } | null>,
  result: Annotation<unknown>,
  confidence: Annotation<number>,
  reasoning: Annotation<string>,
  auditTrail: Annotation<AuditEntry[]>({
    reducer: (curr, prev) => [...curr, ...prev],
    default: () => [],
  }),
  errors: Annotation<string[]>({
    reducer: (curr, prev) => [...curr, ...prev],
    default: () => [],
  }),
});
```

---

## File Reading Guide

### Tier 0 — Always Read (Every Session)

| File                                       | Purpose                                        |
| ------------------------------------------ | ---------------------------------------------- |
| `BUILD_LOG.md`                             | Current state, what exists, what's next        |
| `packages/agents/core/index.ts`            | Agent barrel exports — what's available        |
| `packages/agents/core/orchestrator.ts`     | Agent dispatch logic                           |
| `packages/agents/core/state.ts`            | BaseAgentState, AuditEntry, AgentMessage types |
| `packages/db/schema/index.ts`              | All tables and enums (barrel export)           |
| `packages/agents/tier1/cfo-agent/state.ts` | CFO state — hierarchy root                     |

### Tier 1 — Read by Domain

| Task Domain                 | Files to Read                                                                                             |
| --------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Agent work**              | `tier1/cfo-agent/{graph,nodes}.ts`, `tier2/controller-agent/{graph,nodes,state}.ts`, all `tier*/index.ts` |
| **API/tRPC work**           | `apps/web/lib/trpc/server.ts`, `apps/web/server/routers/_app.ts`, relevant router file                    |
| **Database work**           | `packages/db/schema/*.ts` (all 9 domain files), `packages/db/index.ts`                                    |
| **Frontend work**           | `apps/web/app/(dashboard)/layout.tsx`, `apps/web/components/layout/sidebar.tsx`, relevant page            |
| **Orchestration (Phase 6)** | All `tier*/graph.ts` files, all agent `state.ts` files, `core/orchestrator.ts`                            |
| **New agent**               | `docs/agents/{agent-name}.md`, existing agent as template (copy 6-file structure)                         |
| **New module**              | `skills/create-module.md`, `skills/create-api-route.md`                                                   |

### Tier 2 — Reference On Demand

| File               | When to Read                                                      |
| ------------------ | ----------------------------------------------------------------- |
| `XENBOOX_PRD.md`   | Product decisions, feature scope, pricing, market questions       |
| `ARCHITECTURE.md`  | Architecture patterns, deployment, error handling, multi-currency |
| `DATABASE.md`      | Full SQL schema, column types, relationships                      |
| `docs/agents/*.md` | Agent-specific spec details                                       |
| `AGENTS.md`        | Full conventions list (this skill summarizes the top 5)           |
| Agent `tools.ts`   | Agent-specific DB query patterns                                  |
| Agent `prompts.ts` | Agent system prompt content                                       |

---

## Quick Reference: Existing Agents (Phase 5 Complete)

| Agent           | Tier     | Directory                      | Nodes                                                                                                     |
| --------------- | -------- | ------------------------------ | --------------------------------------------------------------------------------------------------------- |
| CFO             | 1        | `tier1/cfo-agent/`             | classify, route, answer, initiate_close, collect_status, process_escalation, summary, escalate            |
| Controller      | 2        | `tier2/controller-agent/`      | parse, review_entries, review_trial_balance, run_close_checklist, escalate                                |
| Treasury        | 2        | `tier2/treasury-agent/`        | parse, get_cash_position, run_reconciliation, generate_daily_report, escalate                             |
| Payroll Manager | 2        | `tier2/payroll-manager-agent/` | parse, process_payroll, validate_payroll, close_confirmation, escalate                                    |
| Compliance      | 2        | `tier2/compliance-agent/`      | parse, tax_review, filing_status, close_confirmation, escalate                                            |
| Ledger          | 3        | `tier3/ledger-agent/`          | parse, validate_entry, post_entry, trial_balance, escalate                                                |
| AP              | 3        | `tier3/ap-agent/`              | parse, process_invoice, aging_report, payment_schedule, escalate                                          |
| AR              | 3        | `tier3/ar-agent/`              | parse, aging_report, overdue_alerts, match_payment, escalate                                              |
| Asset           | 3        | `tier3/asset-agent/`           | parse, calculate_depreciation, register_asset, asset_register, escalate                                   |
| Inventory       | 3        | `tier3/inventory-agent/`       | parse, calculate_cogs, valuation_adjustment, inventory_summary, escalate                                  |
| Reporting       | platform | `platform/reporting-agent/`    | parse, generate_profit_loss, generate_balance_sheet, generate_trial_balance, generate_narrative, escalate |

**None of these agents call each other yet. Phase 6 wires the hierarchy.**
