# Continuous Close — Implementation Plan

> **For agentic workers:** Use `fire tdd` or `fire executing-plans` to implement this plan task-by-task.

**Goal:** Replace monthly batch close with daily AI-native auto-reconciliation. Agents work continuously — humans only approve exceptions.

**Architecture:** A Trigger.dev cron job runs daily at 2 AM. It triggers the same agent hierarchy used for month-end close, but scoped to a single day. Results stream to the Financial Pulse surface. Only exceptions surface to the Activity Hub for human decision.

**Tech Stack:** Trigger.dev (cron), LangGraph (agents), tRPC (API), Next.js (dashboard)

**Spec:** `docs/agents/cfo-agent.md`, `AGENTS.md` (agent communication pattern)

---

## What Exists Today

| Component | Status | File |
|-----------|--------|------|
| Month-end close job | ✅ Basic | `packages/jobs/month-end-close.ts` |
| Bank feed auto-sync | ✅ Every 6h | `packages/jobs/bank-feed-auto-sync.ts` |
| CFO orchestration | ✅ Full | `packages/agents/core/orchestrator.ts` |
| Close pipeline | ✅ Full | `packages/agents/core/close-pipeline.ts` |
| Agent hierarchy | ✅ All 19 wired | Phase 6 complete |
| Financial Pulse UI | ✅ Built | `apps/web/app/dashboard/financial-pulse/` |

## What's Missing

| Component | Priority | Description |
|-----------|----------|-------------|
| Daily close pipeline | P0 | Run agents daily, not just at month-end |
| Daily close Trigger.dev job | P0 | Cron job that triggers daily close |
| Close status tracking | P0 | DB table for daily close state |
| Exception surfacing | P0 | Only show anomalies to humans |
| Daily close UI | P1 | Show close status on Financial Pulse |
| Auto-categorization | P1 | Agent categorizes new transactions |
| Anomaly detection | P1 | Flag unusual patterns in real-time |

---

## Task 1: Create Daily Close State Table

**Files:**
- Create: `packages/db/schema/daily-close.ts`
- Modify: `packages/db/schema/index.ts`

Track daily close state per entity per day.

- [ ] **Step 1: Create schema**

```typescript
// packages/db/schema/daily-close.ts
import { pgTable, text, timestamp, numeric, boolean, jsonb, uuid } from "drizzle-orm/pg-core";

export const dailyCloseRuns = pgTable("daily_close_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityId: text("entity_id").notNull(),
  closeDate: text("close_date").notNull(), // YYYY-MM-DD
  
  // Status tracking
  status: text("status").notNull().default("pending"), 
  // pending | in_progress | completed | failed | exception
  
  // Agent results
  bankReconciliationStatus: text("bank_reconciliation_status"), 
  // pending | complete | exception
  cashCountStatus: text("cash_count_status"),
  mobileMoneyStatus: text("mobile_money_status"),
  transactionCategorizationStatus: text("transaction_categorization_status"),
  
  // Metrics
  transactionsProcessed: numeric("transactions_processed").default("0"),
  anomaliesDetected: numeric("anomalies_detected").default("0"),
  autoMatched: numeric("auto_matched").default("0"),
  needsHumanReview: numeric("needs_human_review").default("0"),
  
  // Agent outputs
  agentResults: jsonb("agent_results"), // Full agent output for audit
  exceptions: jsonb("exceptions"), // Items needing human decision
  
  // Confidence
  overallConfidence: numeric("overall_confidence"),
  
  // Timestamps
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

- [ ] **Step 2: Add to schema index**

```typescript
export * from "./daily-close";
```

- [ ] **Step 3: Generate migration**

```bash
pnpm db:generate
```

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(db): add daily_close_runs table for continuous close tracking"
```

---

## Task 2: Create Daily Close Pipeline

**Files:**
- Create: `packages/agents/core/daily-close-pipeline.ts`

The core pipeline that runs the daily close. Reuses existing agent hierarchy.

- [ ] **Step 1: Create the pipeline**

```typescript
// packages/agents/core/daily-close-pipeline.ts
import { langfuse } from "./langfuse";
import { getAgentGraph } from "./orchestrator";
import type { AgentState } from "./orchestrator";
import { createAuditEntry } from "./state";
import { db } from "@xenboox/db";
import { dailyCloseRuns } from "@xenboox/db/schema/daily-close";
import { eq, and } from "drizzle-orm";

export interface DailyCloseParams {
  entityId: string;
  entityName: string;
  currency: string;
  closeDate: string; // YYYY-MM-DD
  userId?: string;
}

export interface DailyCloseResult {
  success: boolean;
  closeDate: string;
  transactionsProcessed: number;
  anomaliesDetected: number;
  autoMatched: number;
  needsHumanReview: number;
  exceptions: Array<{
    type: string;
    description: string;
    agentId: string;
    confidence: number;
  }>;
  overallConfidence: number;
  duration: number;
}

export async function runDailyClose(
  params: DailyCloseParams,
): Promise<DailyCloseResult> {
  const startTime = Date.now();
  const trace = await langfuse.trace({
    name: "daily-close-pipeline",
    metadata: {
      entityId: params.entityId,
      closeDate: params.closeDate,
    },
  });

  // Create tracking record
  const [run] = await db
    .insert(dailyCloseRuns)
    .values({
      entityId: params.entityId,
      closeDate: params.closeDate,
      status: "in_progress",
      startedAt: new Date(),
    })
    .returning();

  const exceptions: DailyCloseResult["exceptions"] = [];
  let transactionsProcessed = 0;
  let anomaliesDetected = 0;
  let autoMatched = 0;
  let needsHumanReview = 0;

  try {
    // ── Step 1: Reconciliation Agent — match today's bank transactions ──
    const reconResult = await runAgentStep({
      agentId: "reconciliation",
      operationType: "match_transactions",
      entityId: params.entityId,
      entityName: params.entityName,
      currency: params.currency,
      input: { date: params.closeDate, autoMatch: true },
      trace,
      stepName: "reconciliation",
    });

    if (reconResult.result) {
      const r = reconResult.result as any;
      autoMatched += r.matchedCount ?? 0;
      transactionsProcessed += (r.matchedCount ?? 0) + (r.unmatchedCount ?? 0);
      if (r.unmatchedCount > 0) {
        anomaliesDetected += r.unmatchedCount;
        needsHumanReview += r.unmatchedCount;
        exceptions.push({
          type: "unmatched_transactions",
          description: `${r.unmatchedCount} bank transactions could not be auto-matched`,
          agentId: "reconciliation",
          confidence: reconResult.confidence,
        });
      }
    }

    // ── Step 2: Mobile Money Agent — reconcile MM transactions ──
    const mmResult = await runAgentStep({
      agentId: "mobile_money",
      operationType: "mm_reconcile",
      entityId: params.entityId,
      entityName: params.entityName,
      currency: params.currency,
      input: { date: params.closeDate },
      trace,
      stepName: "mobile_money",
    });

    if (mmResult.result) {
      const r = mmResult.result as any;
      autoMatched += r.matchedCount ?? 0;
      if (r.discrepancies?.length > 0) {
        anomaliesDetected += r.discrepancies.length;
        needsHumanReview += r.discrepancies.length;
        exceptions.push({
          type: "mm_discrepancy",
          description: `${r.discrepancies.length} mobile money discrepancies detected`,
          agentId: "mobile_money",
          confidence: mmResult.confidence,
        });
      }
    }

    // ── Step 3: Cash Agent — verify cash counts ──
    const cashResult = await runAgentStep({
      agentId: "cash",
      operationType: "cash_count",
      entityId: params.entityId,
      entityName: params.entityName,
      currency: params.currency,
      input: { date: params.closeDate },
      trace,
      stepName: "cash",
    });

    if (cashResult.result) {
      const r = cashResult.result as any;
      if (r.discrepancy) {
        anomaliesDetected++;
        needsHumanReview++;
        exceptions.push({
          type: "cash_discrepancy",
          description: `Cash count discrepancy: ${r.discrepancy.amount}`,
          agentId: "cash",
          confidence: cashResult.confidence,
        });
      }
    }

    // ── Step 4: Controller Agent — validate all entries ──
    const controllerResult = await runAgentStep({
      agentId: "controller",
      operationType: "review_entries",
      entityId: params.entityId,
      entityName: params.entityName,
      currency: params.currency,
      input: { date: params.closeDate },
      trace,
      stepName: "controller",
    });

    if (controllerResult.result) {
      const r = controllerResult.result as any;
      if (r.rejectedEntries?.length > 0) {
        anomaliesDetected += r.rejectedEntries.length;
        needsHumanReview += r.rejectedEntries.length;
        exceptions.push({
          type: "rejected_entries",
          description: `${r.rejectedEntries.length} journal entries rejected by Controller`,
          agentId: "controller",
          confidence: controllerResult.confidence,
        });
      }
    }

    // ── Calculate overall confidence ──
    const confidences = [
      reconResult.confidence,
      mmResult.confidence,
      cashResult.confidence,
      controllerResult.confidence,
    ].filter((c) => c > 0);

    const overallConfidence =
      confidences.length > 0
        ? confidences.reduce((a, b) => a + b, 0) / confidences.length
        : 0;

    const success = exceptions.length === 0;

    // Update tracking record
    await db
      .update(dailyCloseRuns)
      .set({
        status: success ? "completed" : "exception",
        bankReconciliationStatus: "complete",
        cashCountStatus: "complete",
        mobileMoneyStatus: "complete",
        transactionCategorizationStatus: "complete",
        transactionsProcessed: transactionsProcessed.toString(),
        anomaliesDetected: anomaliesDetected.toString(),
        autoMatched: autoMatched.toString(),
        needsHumanReview: needsHumanReview.toString(),
        agentResults: {
          reconciliation: reconResult,
          mobileMoney: mmResult,
          cash: cashResult,
          controller: controllerResult,
        },
        exceptions,
        overallConfidence: overallConfidence.toString(),
        completedAt: new Date(),
      })
      .where(eq(dailyCloseRuns.id, run.id));

    await trace.update({
      output: {
        success,
        transactionsProcessed,
        anomaliesDetected,
        autoMatched,
        needsHumanReview,
        overallConfidence,
      },
    });

    return {
      success,
      closeDate: params.closeDate,
      transactionsProcessed,
      anomaliesDetected,
      autoMatched,
      needsHumanReview,
      exceptions,
      overallConfidence,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);

    await db
      .update(dailyCloseRuns)
      .set({
        status: "failed",
        exceptions: [{ type: "pipeline_error", description: msg, agentId: "orchestrator", confidence: 0 }],
        completedAt: new Date(),
      })
      .where(eq(dailyCloseRuns.id, run.id));

    await trace.update({ output: { error: msg } });

    return {
      success: false,
      closeDate: params.closeDate,
      transactionsProcessed,
      anomaliesDetected,
      autoMatched,
      needsHumanReview,
      exceptions: [{ type: "pipeline_error", description: msg, agentId: "orchestrator", confidence: 0 }],
      overallConfidence: 0,
      duration: Date.now() - startTime,
    };
  }
}

// ─── Helper: Run a single agent step ──────────────────────────────────────

async function runAgentStep(params: {
  agentId: string;
  operationType: string;
  entityId: string;
  entityName: string;
  currency: string;
  input: Record<string, unknown>;
  trace: any;
  stepName: string;
}): Promise<{
  confidence: number;
  result: unknown;
  errors: string[];
}> {
  const span = await langfuse.span({
    parent: params.trace,
    name: `daily-close-${params.stepName}`,
  });

  try {
    const graph = await getAgentGraph(params.agentId as any);
    const state: AgentState = {
      entityId: params.entityId,
      entityName: params.entityName,
      currency: params.currency,
      currentOperation: {
        type: params.operationType,
        status: "processing",
        input: params.input,
        output: null,
        error: null,
      },
    };

    const result = await graph.invoke(state);

    await span.update({
      output: {
        confidence: (result as any).confidence ?? 0,
        hasResult: !!(result as any).result,
      },
    });

    return {
      confidence: (result as any).confidence ?? 0,
      result: (result as any).result ?? null,
      errors: (result as any).errors ?? [],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);

    await span.update({ output: { error: msg } });

    return {
      confidence: 0,
      result: null,
      errors: [msg],
    };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git commit -m "feat(agents): add daily close pipeline for continuous reconciliation"
```

---

## Task 3: Create Trigger.dev Daily Close Job

**Files:**
- Create: `packages/jobs/daily-close.ts`
- Modify: `packages/jobs/index.ts`

Cron job that runs daily at 2 AM for all active entities.

- [ ] **Step 1: Create the job**

```typescript
// packages/jobs/daily-close.ts
import { task, logger } from "@trigger.dev/sdk";
import { dlqOnFailure } from "./lib/dlq";
import { db } from "@xenboox/db";
import { entities, dailyCloseRuns } from "@xenboox/db/schema";
import { eq, and, lte } from "drizzle-orm";
import { runDailyClose } from "@xenboox/agents/core/daily-close-pipeline";

export const processDailyClose = task({
  id: "process-daily-close",
  maxDuration: 600, // 10 minutes max
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 10_000,
    maxTimeoutInMs: 60_000,
  },
  queue: {
    concurrencyLimit: 1,
  },

  onFailure: dlqOnFailure<{ triggeredAt: string }>({
    task: "process-daily-close",
    type: "data_validation",
    severity: "high",
    title: () => "Daily close pipeline failed",
  }),

  run: async (payload: { triggeredAt?: string }) => {
    const triggeredAt = payload.triggeredAt ?? new Date().toISOString();
    const closeDate = new Date(triggeredAt).toISOString().split("T")[0]!;
    
    logger.info("Starting daily close pipeline", { closeDate });

    // 1. Get all active entities
    const activeEntities = await db.query.entities.findMany({
      where: eq(entities.status, "active"),
    });

    logger.info("Found active entities", { count: activeEntities.length });

    if (activeEntities.length === 0) {
      return { success: true, entitiesProcessed: 0 };
    }

    // 2. Check if today's close already ran (idempotency)
    const existingRuns = await db.query.dailyCloseRuns.findMany({
      where: and(
        eq(dailyCloseRuns.closeDate, closeDate),
      ),
    });

    const processedEntityIds = new Set(existingRuns.map(r => r.entityId));
    const entitiesToProcess = activeEntities.filter(e => !processedEntityIds.has(e.id));

    if (entitiesToProcess.length === 0) {
      logger.info("All entities already processed for today", { closeDate });
      return { success: true, entitiesProcessed: 0, skipped: activeEntities.length };
    }

    // 3. Run daily close for each entity
    let succeeded = 0;
    let failed = 0;
    const results: Array<{ entityId: string; success: boolean; exceptions: number }> = [];

    for (const entity of entitiesToProcess) {
      try {
        const result = await runDailyClose({
          entityId: entity.id,
          entityName: entity.name,
          currency: entity.baseCurrency ?? "GMD",
          closeDate,
        });

        results.push({
          entityId: entity.id,
          success: result.success,
          exceptions: result.exceptions.length,
        });

        if (result.success) {
          succeeded++;
        } else {
          failed++;
        }

        logger.info("Daily close completed for entity", {
          entityId: entity.id,
          success: result.success,
          transactionsProcessed: result.transactionsProcessed,
          anomaliesDetected: result.anomaliesDetected,
        });
      } catch (error) {
        failed++;
        const msg = error instanceof Error ? error.message : String(error);
        results.push({
          entityId: entity.id,
          success: false,
          exceptions: 1,
        });
        logger.error("Daily close failed for entity", {
          entityId: entity.id,
          error: msg,
        });
      }
    }

    logger.info("Daily close pipeline completed", {
      closeDate,
      totalEntities: activeEntities.length,
      processed: entitiesToProcess.length,
      succeeded,
      failed,
    });

    return {
      success: failed === 0,
      closeDate,
      entitiesProcessed: entitiesToProcess.length,
      succeeded,
      failed,
      results,
    };
  },
});
```

- [ ] **Step 2: Export from index.ts**

```typescript
export { processDailyClose } from "./daily-close";
```

- [ ] **Step 3: Register cron schedule**

In Trigger.dev dashboard, schedule `process-daily-close` to run daily at 2 AM UTC.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(jobs): add daily close Trigger.dev cron job"
```

---

## Task 4: Add Daily Close API Route

**Files:**
- Create/Modify: `apps/web/server/routers/daily-close.ts`

tRPC router for querying daily close status.

- [ ] **Step 1: Create router**

```typescript
// apps/web/server/routers/daily-close.ts
import { router, protectedProcedure } from "../trpc";
import { db } from "@xenboox/db";
import { dailyCloseRuns } from "@xenboox/db/schema/daily-close";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

export const dailyCloseRouter = router({
  // Get today's close status
  getToday: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date().toISOString().split("T")[0]!;
    const runs = await db.query.dailyCloseRuns.findMany({
      where: and(
        eq(dailyCloseRuns.entityId, ctx.entityId),
        eq(dailyCloseRuns.closeDate, today),
      ),
    });
    return runs[0] ?? null;
  }),

  // Get close history
  getHistory: protectedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(90).default(30),
      }),
    )
    .query(async ({ ctx, input }) => {
      const runs = await db.query.dailyCloseRuns.findMany({
        where: eq(dailyCloseRuns.entityId, ctx.entityId),
        orderBy: [desc(dailyCloseRuns.closeDate)],
        limit: input.days,
      });
      return runs;
    }),

  // Get exceptions needing human review
  getExceptions: protectedProcedure.query(async ({ ctx }) => {
    const runs = await db.query.dailyCloseRuns.findMany({
      where: and(
        eq(dailyCloseRuns.entityId, ctx.entityId),
        eq(dailyCloseRuns.status, "exception"),
      ),
      orderBy: [desc(dailyCloseRuns.createdAt)],
      limit: 20,
    });
    return runs;
  }),

  // Trigger manual daily close
  triggerManual: protectedProcedure.mutation(async ({ ctx }) => {
    // Trigger the daily close job manually
    const { processDailyClose } = await import("@xenboox/jobs");
    // In production, this would trigger via Trigger.dev client
    // For now, run directly
    const result = await runDailyClose({
      entityId: ctx.entityId,
      entityName: ctx.entityName,
      currency: ctx.currency,
      closeDate: new Date().toISOString().split("T")[0]!,
    });
    return result;
  }),
});
```

- [ ] **Step 2: Add to app router**

```typescript
// In apps/web/server/routers/_app.ts
import { dailyCloseRouter } from "./daily-close";

export const appRouter = router({
  // ... existing routers
  dailyClose: dailyCloseRouter,
});
```

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(api): add daily close tRPC router for status and exceptions"
```

---

## Task 5: Add Daily Close Status to Financial Pulse

**Files:**
- Modify: `apps/web/app/dashboard/financial-pulse/page.tsx`

Show daily close status on the Financial Pulse surface.

- [ ] **Step 1: Add daily close status card**

Add a "Daily Close" section to the Financial Pulse page showing:
- Today's close status (completed/exception/pending)
- Transactions processed
- Auto-matched vs needs review
- Exception count with link to Activity Hub

- [ ] **Step 2: Add close history chart**

Show a 30-day bar chart of daily close results:
- Green: completed with 0 exceptions
- Yellow: completed with exceptions
- Red: failed

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(dashboard): add daily close status to Financial Pulse"
```

---

## Task 6: Wire Exceptions to Activity Hub

**Files:**
- Modify: `apps/web/components/dashboard/activity-hub.tsx`

Daily close exceptions should surface in the Activity Hub for human decision.

- [ ] **Step 1: Query daily close exceptions**

When the Activity Hub loads, query `dailyCloseRuns` with status `exception` and surface each exception as an activity item.

- [ ] **Step 2: Add approve/reject actions**

For each exception, add:
- "Approve" — marks the exception as resolved, keeps the transaction as-is
- "Fix" — opens the relevant agent to re-process
- "Ignore" — dismisses the exception

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(dashboard): wire daily close exceptions to Activity Hub"
```

---

## Task 7: Add Auto-Categorization Agent Step

**Files:**
- Modify: `packages/agents/core/daily-close-pipeline.ts`

After bank sync, automatically categorize new transactions using the Document Agent or a lightweight classifier.

- [ ] **Step 1: Add categorization step to pipeline**

After reconciliation, run the Document Agent to categorize any uncategorized transactions:

```typescript
// Step 5: Auto-categorize new transactions
const categorizeResult = await runAgentStep({
  agentId: "document",
  operationType: "document_classify",
  entityId: params.entityId,
  entityName: params.entityName,
  currency: params.currency,
  input: { date: params.closeDate, uncategorizedOnly: true },
  trace,
  stepName: "categorize",
});
```

- [ ] **Step 2: Commit**

```bash
git commit -m "feat(agents): add auto-categorization to daily close pipeline"
```

---

## Task 8: Verify and Push

- [ ] **Step 1: Verify schema generates**

```bash
pnpm db:generate
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm typecheck
```

- [ ] **Step 3: Verify eval datasets still valid**

```bash
cd packages/agents && node -e "const fs=require('fs'),yaml=require('yaml'),path=require('path');const dir=path.join(__dirname,'datasets');const files=fs.readdirSync(dir).filter(f=>f.endsWith('-golden.yaml'));let t=0;for(const f of files){const p=yaml.parse(fs.readFileSync(path.join(dir,f),'utf8'));t+=(p.cases||[]).length;}console.log(t+' cases valid');"
```

- [ ] **Step 4: Update BUILD_LOG.md**

- [ ] **Step 5: Commit and push**

```bash
git add -A && git commit -m "feat: continuous close — daily AI-native auto-reconciliation" && git push
```

---

## Verification Checklist

After all tasks:

- [ ] Daily close table created and migrated
- [ ] Daily close pipeline runs agents in sequence
- [ ] Trigger.dev cron job scheduled for 2 AM daily
- [ ] tRPC router exposes close status and exceptions
- [ ] Financial Pulse shows daily close status
- [ ] Activity Hub surfaces exceptions for human decision
- [ ] Auto-categorization runs on new transactions
- [ ] Idempotent — running twice doesn't duplicate work
- [ ] All agent failures handled gracefully
- [ ] BUILD_LOG.md updated
