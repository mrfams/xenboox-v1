import { task, logger } from "@trigger.dev/sdk";
import { dlqOnFailure } from "./lib/dlq";
import { db, notifyEntityUsers } from "@xenboox/db";
import { fiscalPeriods, entities } from "@xenboox/db/schema";
import { eq, and } from "drizzle-orm";
import { executeClosePipeline } from "@xenboox/agents";

// ─── Month-End Close (N15 — CONVERGED) ──────────────────────────────────────
//
// Batch 2/3 convergence decision: there is ONE close implementation —
// `executeClosePipeline` (packages/agents/core/close-pipeline.ts). This job
// previously duplicated the flow with DIFFERENT semantics (no TrustGuard, no
// trial-balance snapshot, JE dates stamped with `new Date()` instead of the
// period end, depreciation posted outside the validated path). The duplicate
// is deleted; the job now:
//   1. resolves the period + entity,
//   2. delegates to executeClosePipeline with a scheduled-job timeout budget,
//   3. surfaces closeState.status honestly — completed → notify; awaiting_human
//      or failed → throw so Trigger.dev retries and the DLQ captures it,
//   4. sends the deduped "books closed" notification on success only.

export const processMonthEndClose = task({
  id: "process-month-end-close",
  maxDuration: 600,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 5_000,
    maxTimeoutInMs: 60_000,
  },
  queue: {
    concurrencyLimit: 1,
  },

  onFailure: dlqOnFailure<{
    entityId: string;
    month: number;
    year: number;
    userId: string;
  }>({
    task: "process-month-end-close",
    type: "review",
    severity: "critical",
    title: (p) => `Month-end close failed: ${p.month}/${p.year}`,
    entityIdFrom: (p) => p.entityId,
  }),

  run: async (payload: {
    entityId: string;
    month: number;
    year: number;
    userId: string;
  }) => {
    const { entityId, month, year, userId } = payload;

    logger.info("Starting month-end close (via close pipeline)", {
      entityId,
      month,
      year,
    });

    // 1. Find the fiscal period
    const [period] = await db
      .select()
      .from(fiscalPeriods)
      .where(
        and(
          eq(fiscalPeriods.entityId, entityId),
          eq(fiscalPeriods.year, year),
          eq(fiscalPeriods.month, month),
        ),
      )
      .limit(1);

    if (!period) {
      throw new Error(`Fiscal period not found for ${year}-${month}`);
    }

    if (period.status === "closed") {
      logger.warn("Period already closed", { periodId: period.id });
      return {
        success: true,
        message: "Period already closed",
        periodId: period.id,
      };
    }

    // 2. Entity display fields the pipeline requires
    const [entity] = await db
      .select({ name: entities.name, currency: entities.currency })
      .from(entities)
      .where(eq(entities.id, entityId))
      .limit(1);

    if (!entity) {
      throw new Error(`Entity not found for close: ${entityId}`);
    }

    // 3. Delegate to the ONE close implementation. Timeout budget sized to
    // this job's maxDuration (600s) with headroom for Trigger.dev overhead.
    const { closeState, durationMs } = await executeClosePipeline({
      entityId,
      entityName: entity.name,
      currency: entity.currency,
      periodId: period.id,
      userId,
      triggerSource: "scheduled",
      timeoutConfig: {
        maxExecutionMs: 480_000,
        maxStepExecutionMs: 90_000,
      },
    });

    logger.info("Close pipeline finished", {
      entityId,
      periodId: period.id,
      status: closeState.status,
      durationMs,
      errors: closeState.errors,
    });

    // 4. Honest outcome mapping — never claim success the pipeline didn't earn.
    if (closeState.status === "completed") {
      await notifyEntityUsers(db, {
        entityId,
        type: "month_end_close",
        priority: "high",
        title: `Books closed for ${year}-${String(month).padStart(2, "0")}`,
        body: "The month-end close completed and the period is now closed. Run reports to see final figures.",
        data: { periodId: period.id },
        dedupeDataField: "periodId",
      }).catch((err: unknown) => {
        logger.error("Failed to send close notification", {
          entityId,
          periodId: period.id,
          err: err instanceof Error ? err.message : String(err),
        });
      });

      return {
        success: true,
        periodId: period.id,
        status: closeState.status,
        durationMs,
      };
    }

    // awaiting_human / failed / running(timeout) — surface the pipeline's own
    // errors so the retry lands in the DLQ with real context, not a generic
    // "close failed".
    throw new Error(
      `Close ended with status "${closeState.status}": ${
        closeState.errors.join(" | ") || "no error detail recorded"
      }`,
    );
  },
});
