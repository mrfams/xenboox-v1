// ─── Daily Close Pipeline ─────────────────────────────────────────────────
//
// Runs the same agent hierarchy as month-end close, but scoped to a single day.
// Designed for continuous reconciliation — agents work daily, humans approve exceptions.

import { langfuse } from "./langfuse";
import { getAgentGraph } from "./orchestrator";
import type { AgentState } from "./orchestrator";
import { createAuditEntry } from "./state";
import { db } from "@xenboox/db";
import { dailyCloseRuns } from "@xenboox/db/schema/daily-close";
import { eq } from "drizzle-orm";

export interface DailyCloseParams {
  entityId: string;
  entityName: string;
  currency: string;
  closeDate: string; // YYYY-MM-DD
  userId?: string;
}

export interface AgentStepResult {
  confidence: number;
  result: unknown;
  errors: string[];
}

export interface ReconciliationResult {
  matchedCount?: number;
  unmatchedCount?: number;
}

export interface MobileMoneyResult {
  matchedCount?: number;
  discrepancies?: Array<{ amount: number; description: string }>;
}

export interface CashResult {
  discrepancy?: { amount: number };
}

export interface ControllerResult {
  rejectedEntries?: Array<{ id: string; description: string }>;
}

export interface CategorizeResult {
  categorizedCount?: number;
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
      const r = reconResult.result as ReconciliationResult;
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
      const r = mmResult.result as MobileMoneyResult;
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
      const r = cashResult.result as CashResult;
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
      const r = controllerResult.result as ControllerResult;
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

    // ── Step 5: Document Agent — auto-categorize new transactions ──
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

    if (categorizeResult.result) {
      const r = categorizeResult.result as CategorizeResult;
      if (r.categorizedCount > 0) {
        autoMatched += r.categorizedCount;
        transactionsProcessed += r.categorizedCount;
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
        exceptions: [
          { type: "pipeline_error", description: msg, agentId: "orchestrator", confidence: 0 },
        ],
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
      exceptions: [
        { type: "pipeline_error", description: msg, agentId: "orchestrator", confidence: 0 },
      ],
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
  
